#!/usr/bin/env node
// Enrich outreach/contacts.csv with each school's public counseling/staff
// directory page and the professional contacts published there.
//
// This is deliberately small-scale and polite: it only visits the official
// school websites already in the list, only follows counseling/staff-related
// links, waits between requests, identifies itself in the User-Agent, caps
// how many schools it touches per run, and honors outreach/suppression.csv.
//
// Usage:
//   npm run outreach:enrich                    # top 25 un-enriched schools
//   npm run outreach:enrich -- --max 10
//   npm run outreach:enrich -- --contact you@yourdomain.com
//
// Options:
//   --max N          Schools to process this run (default 25)
//   --file FILE      Contacts CSV (default outreach/contacts.csv)
//   --contact EMAIL  Contact address advertised in the User-Agent
//                    (default $OUTREACH_CONTACT or blank)
//   --delay MS       Delay between HTTP requests (default 1500, min 500)

import fs from 'node:fs';
import {
  CONTACT_COLUMNS,
  isSuppressed,
  loadSuppression,
  readCsvObjects,
  sleep,
  writeCsvObjects,
} from './lib.mjs';

const LINK_KEYWORDS = [
  { re: /concurrent|early.?college|dual.?(credit|enrollment)/i, score: 5 },
  { re: /counsel/i, score: 4 },
  { re: /student\s*services|advis[eo]/i, score: 3 },
  { re: /\bcte\b|career.*technical/i, score: 3 },
  { re: /staff\s*(directory|list)|our\s*(staff|team)|faculty/i, score: 2 },
  { re: /contact/i, score: 1 },
];

const ROLE_KEYWORDS = [
  { re: /concurrent\s*enrollment|early\s*college|dual\s*(credit|enrollment)/i, role: 'Concurrent Enrollment', score: 5 },
  { re: /\bcte\b|career\s*(and|&)?\s*technical/i, role: 'CTE', score: 4 },
  { re: /counselor|counseling/i, role: 'Counselor', score: 3 },
  { re: /assistant\s*principal|vice\s*principal/i, role: 'Assistant Principal', score: 2 },
  { re: /registrar|scheduling/i, role: 'Registrar/Scheduling', score: 1 },
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const JUNK_EMAIL_RE = /\.(png|jpe?g|gif|svg|webp)$|example\.|sentry\.|wixpress|schema\.org|@(2x|3x)\b/i;
const GENERIC_LOCAL_RE = /^(webmaster|postmaster|info|office|admin|support|no-?reply|frontdesk|reception|contact|help|feedback|communications)$/i;
const NAME_STOPWORDS = new Set([
  'Career', 'Center', 'School', 'High', 'Counseling', 'Counselor', 'Student',
  'Services', 'Office', 'District', 'Email', 'Staff', 'Department', 'College',
  'Enrollment', 'Coordinator', 'Director', 'Assistant', 'Principal', 'Academy',
  'Advisement', 'Concurrent', 'Technical', 'Education', 'Registrar', 'Contact',
  'Home', 'About', 'Welcome', 'Dual', 'Credit', 'Early',
]);
const MAX_CONTACTS_PER_SCHOOL = 5;
const MAX_PAGES_PER_SCHOOL = 4;

function parseArgs(argv) {
  const args = {
    max: 25,
    file: 'outreach/contacts.csv',
    contact: process.env.OUTREACH_CONTACT || '',
    delay: 1500,
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => argv[++i];
    if (flag === '--max') args.max = Number(next());
    else if (flag === '--file') args.file = next();
    else if (flag === '--contact') args.contact = next();
    else if (flag === '--delay') args.delay = Math.max(500, Number(next()));
    else throw new Error(`Unknown flag: ${flag}`);
  }
  return args;
}

function userAgent(contact) {
  const base = 'high-school-planner-outreach/1.0 (school contact research';
  return contact ? `${base}; ${contact})` : `${base})`;
}

async function fetchPage(url, ua) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': ua, accept: 'text/html' },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('html')) return null;
    return { finalUrl: res.url, html: await res.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      links.push({ url: new URL(href, baseUrl).toString(), text });
    } catch { /* invalid href */ }
  }
  return links;
}

function scoreLink(link) {
  let score = 0;
  const haystack = `${link.text} ${link.url}`;
  for (const { re, score: s } of LINK_KEYWORDS) {
    if (re.test(haystack)) score += s;
  }
  return score;
}

function htmlToLines(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/td|\/h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Names usually appear on the email's line or just above it (table rows,
// staff cards). Scan backward first, skipping title-cased non-name phrases.
function findName(lines, i) {
  for (const j of [i, i - 1, i - 2, i - 3, i + 1]) {
    if (j < 0 || j >= lines.length) continue;
    const text = lines[j].replace(EMAIL_RE, ' ');
    const re = /\b[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-zA-Z'-]+\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const words = m[0].split(/\s+/).map((w) => w.replace(/\.$/, ''));
      if (!words.some((w) => NAME_STOPWORDS.has(w))) return m[0];
    }
  }
  return '';
}

// Take the role from the nearest line so one row's title doesn't bleed into
// the next contact's. ROLE_KEYWORDS is ordered by priority within a line.
function findRole(lines, i) {
  for (const j of [i, i - 1, i + 1, i - 2, i + 2, i - 3, i + 3]) {
    if (j < 0 || j >= lines.length) continue;
    for (const { re, role, score } of ROLE_KEYWORDS) {
      if (re.test(lines[j])) return { role, score };
    }
  }
  return { role: '', score: 0 };
}

// Find published contacts on a page: emails plus the name/role text near them.
function extractContacts(html, pageUrl) {
  const contacts = new Map();

  const add = (email, name, role, score) => {
    email = email.toLowerCase();
    if (JUNK_EMAIL_RE.test(email)) return;
    if (GENERIC_LOCAL_RE.test(email.split('@')[0])) return;
    const prev = contacts.get(email);
    if (!prev || score > prev.score) {
      contacts.set(email, { email, name, role, score, source: pageUrl });
    }
  };

  // Surface mailto: addresses as visible text so the line-context pass sees
  // them — on table-based staff pages the email only exists in the href.
  const inlined = html.replace(
    /<a\b[^>]*href\s*=\s*["']mailto:([^"'?]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, email, inner) => `${inner} ${email} `,
  );

  const lines = htmlToLines(inlined);
  lines.forEach((line, i) => {
    const emails = line.match(EMAIL_RE);
    if (!emails) return;
    const { role, score } = findRole(lines, i);
    if (score === 0) return; // only role-matched contacts; skip generic inboxes
    const name = findName(lines, i);
    for (const email of emails) add(email, name, role, score);
  });

  return [...contacts.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONTACTS_PER_SCHOOL);
}

async function enrichSchool(row, args, suppression) {
  const ua = userAgent(args.contact);
  let website = row.website;
  if (!/^https?:\/\//i.test(website)) website = `https://${website}`;

  const home = await fetchPage(website, ua);
  if (!home) return { staffPage: '', contacts: [], note: 'website unreachable' };

  const candidates = extractLinks(home.html, home.finalUrl)
    .map((l) => ({ ...l, score: scoreLink(l) }))
    .filter((l) => l.score >= 2 && new URL(l.url).hostname.endsWith(new URL(home.finalUrl).hostname.replace(/^www\./, '')))
    .sort((a, b) => b.score - a.score);

  const seen = new Set();
  const pages = [{ url: home.finalUrl, html: home.html }];
  for (const link of candidates) {
    if (pages.length >= MAX_PAGES_PER_SCHOOL) break;
    const key = link.url.replace(/\/+$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    await sleep(args.delay);
    const page = await fetchPage(link.url, ua);
    if (page) pages.push({ url: page.finalUrl, html: page.html });
  }

  let best = { staffPage: '', contacts: [] };
  for (const page of pages) {
    const contacts = extractContacts(page.html, page.url).filter(
      (c) => !isSuppressed(c.email, suppression),
    );
    if (contacts.length > best.contacts.length) {
      best = { staffPage: page.url, contacts };
    }
  }
  if (!best.staffPage && candidates.length > 0) best.staffPage = candidates[0].url;
  return { ...best, note: best.contacts.length ? '' : 'no role-matched emails found; check staff page manually' };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.file)) {
    throw new Error(`${args.file} not found — run "npm run outreach:list" first.`);
  }
  const suppression = loadSuppression('outreach/suppression.csv');
  const { records } = readCsvObjects(args.file);

  const pending = records.filter((r) => r.status === 'new' && r.website);
  const batch = pending.slice(0, args.max);
  if (batch.length === 0) {
    process.stderr.write('Nothing to enrich: no rows with status=new and a website.\n');
    return;
  }
  process.stderr.write(`Enriching ${batch.length} schools (${pending.length} pending)...\n`);

  const output = [];
  for (const row of records) {
    if (!batch.includes(row)) { output.push(row); continue; }

    process.stderr.write(`- ${row.school_name}: `);
    const result = await enrichSchool(row, args, suppression);
    const { staffPage, contacts, note } = result;
    process.stderr.write(`${contacts.length} contact(s)\n`);

    if (contacts.length === 0) {
      output.push({ ...row, status: 'needs_manual', staff_page_url: staffPage, notes: [row.notes, note].filter(Boolean).join('; ') });
    } else {
      contacts.forEach((c, i) => {
        output.push({
          ...row,
          status: 'enriched',
          staff_page_url: staffPage,
          contact_name: c.name,
          contact_role: c.role,
          contact_email: c.email,
          email_source_url: c.source,
          notes: i === 0 ? row.notes : `${row.notes ? row.notes + '; ' : ''}additional contact`,
        });
      });
    }
    await sleep(args.delay);
  }

  writeCsvObjects(args.file, output, CONTACT_COLUMNS);
  const enriched = output.filter((r) => r.status === 'enriched').length;
  process.stderr.write(
    `Done. ${args.file} now has ${output.length} rows (${enriched} with contacts).\n` +
    `Re-run to process the next batch; rows already enriched are skipped.\n`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
