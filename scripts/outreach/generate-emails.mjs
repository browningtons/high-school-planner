#!/usr/bin/env node
// Generate the outreach email sequence (Day 1 / Day 3 / Day 10 / pre-school
// pilot offer) for every enriched contact in outreach/contacts.csv.
//
// Produces:
//   outreach/emails/campaign.csv        one row per email to send (mail-merge ready)
//   outreach/emails/<school>--<who>.md  the full sequence per contact, for review
//
// Nothing is sent by this script — you review, then send from your own
// (subdomain) address. Every body includes the CAN-SPAM essentials: a real
// mailing address and an opt-out line. Opt-outs go in outreach/suppression.csv.
//
// Usage:
//   npm run outreach:emails -- \
//     --base-url https://planner.example.com \
//     --from-name "Paul B." --from-title "Golden Data" \
//     --reply-email hello@try.example.com \
//     --mailing-address "123 Main St, Ogden, UT 84401"
//
// Options:
//   --file FILE          Contacts CSV (default outreach/contacts.csv)
//   --out-dir DIR        Output directory (default outreach/emails)
//   --base-url URL       Deployed planner URL (default placeholder)
//   --start-date DATE    Day-1 send date, YYYY-MM-DD (default 2026-08-03)
//   --pilot-date DATE    Final pilot-offer send date (default 2026-08-17)
//   --per-school N       Max contacts per school (default 2)
//   --from-name/--from-title/--reply-email/--mailing-address  Sender fields

import fs from 'node:fs';
import path from 'node:path';
import {
  isSuppressed,
  loadSuppression,
  readCsvObjects,
  toCsv,
} from './lib.mjs';

// Average across the four pathways (33-50 credits) at $120/credit.
const AVG_SAVINGS_PER_STUDENT = 4800;

// contacts.csv demo_slug (from NCES names) → app SCHOOL_PRESETS slug.
const PRESET_SLUGS = {
  'ogden-high-school': 'ogden-high',
  'ben-lomond-high-school': 'ben-lomond',
  'weber-high-school': 'weber-high',
  'fremont-high-school': 'fremont-high',
  'bonneville-high-school': 'bonneville-high',
};

function parseArgs(argv) {
  const args = {
    file: 'outreach/contacts.csv',
    outDir: 'outreach/emails',
    baseUrl: '{{PLANNER_URL}}',
    startDate: '2026-08-03',
    pilotDate: '2026-08-17',
    perSchool: 2,
    fromName: '{{YOUR_NAME}}',
    fromTitle: '{{YOUR_TITLE_OR_ORG}}',
    replyEmail: '{{YOUR_EMAIL}}',
    mailingAddress: '{{YOUR_MAILING_ADDRESS}}',
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => argv[++i];
    if (flag === '--file') args.file = next();
    else if (flag === '--out-dir') args.outDir = next();
    else if (flag === '--base-url') args.baseUrl = next().replace(/\/+$/, '');
    else if (flag === '--start-date') args.startDate = next();
    else if (flag === '--pilot-date') args.pilotDate = next();
    else if (flag === '--per-school') args.perSchool = Number(next());
    else if (flag === '--from-name') args.fromName = next();
    else if (flag === '--from-title') args.fromTitle = next();
    else if (flag === '--reply-email') args.replyEmail = next();
    else if (flag === '--mailing-address') args.mailingAddress = next();
    else throw new Error(`Unknown flag: ${flag}`);
  }
  return args;
}

function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function demoUrl(baseUrl, demoSlug) {
  const preset = PRESET_SLUGS[demoSlug];
  return preset ? `${baseUrl}/?school=${preset}#draft` : `${baseUrl}/#draft`;
}

function roundClassSize(enrollment) {
  const perGrade = Number(enrollment) / 3;
  if (!Number.isFinite(perGrade) || perGrade <= 0) return 300;
  return Math.max(20, Math.round(perGrade / 10) * 10);
}

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

function buildSequence(contact, args) {
  const first = (contact.contact_name || '').split(/\s+/)[0] || 'there';
  const school = contact.school_name;
  const classSize = roundClassSize(contact.enrollment);
  const savings = money(classSize * AVG_SAVINGS_PER_STUDENT);
  const url = demoUrl(args.baseUrl, contact.demo_slug);

  const signature = [
    args.fromName,
    args.fromTitle,
    args.replyEmail,
    args.mailingAddress,
    '',
    `If you'd rather not hear from me, reply "unsubscribe" and I won't email again.`,
  ].join('\n');

  return [
    {
      key: 'day1-demo',
      sendDate: args.startDate,
      subject: `A course-planning demo built with ${school}'s pathways`,
      body: `Hi ${first},

I built a free planning tool that shows ${school} students how to leave high school with most of an associate degree already earned — and what that saves their families.

Here's a demo themed for ${school}: ${url}
(Click "Use sample roster," then "Run the draft" — it plans a whole incoming class at once.)

Would you take two minutes and tell me what it gets wrong for your students? I'm collecting honest counselor feedback before the year starts — this isn't a sales pitch.

${signature}`,
    },
    {
      key: 'day3-savings',
      sendDate: addDays(args.startDate, 2),
      subject: `What ~${classSize} students could save on tuition`,
      body: `Hi ${first},

Quick follow-up with the number that matters: for an incoming class of roughly ${classSize} students, the pathways in the demo add up to about ${savings} in avoided tuition, at $120/credit concurrent-enrollment rates.

The per-student math is all visible here: ${url}

If those assumptions look off for ${school}, I'd genuinely like to know where.

${signature}`,
    },
    {
      key: 'day10-sections',
      sendDate: addDays(args.startDate, 9),
      subject: `The master-schedule side: sections, not just savings`,
      body: `Hi ${first},

Same tool, different lens: when the demo drafts a class onto pathways, it also totals how many sections of each course that creates — how many CE English or AP Geography sections you'd need to staff in each grade.

${url} — the "Section planning" table appears right after you run the draft.

If scheduling isn't your desk, is there someone at ${school} who'd want this view?

${signature}`,
    },
    {
      key: 'pilot-offer',
      sendDate: args.pilotDate,
      subject: `Free pilot for ${school} this semester?`,
      body: `Hi ${first},

School's about to start, so this is my last note. I'm running a free pilot this semester for a handful of schools: I load your actual course catalog and pathway list myself, and your counselors get the planner plus the class-draft view for registration season. It takes about 20 minutes of your time to set up.

Interested? Reply and I'll take it from there. If not, no hard feelings — thanks for reading this far.

${signature}`,
    },
  ];
}

function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.file)) {
    throw new Error(`${args.file} not found — run "npm run outreach:list" and "npm run outreach:enrich" first.`);
  }
  const suppression = loadSuppression('outreach/suppression.csv');
  const { records } = readCsvObjects(args.file);

  const perSchoolCount = new Map();
  const seen = new Set();
  const contacts = records.filter((r) => {
    if (r.status !== 'enriched' || !r.contact_email) return false;
    if (seen.has(r.contact_email)) return false;
    if (isSuppressed(r.contact_email, suppression)) return false;
    const n = perSchoolCount.get(r.ncessch) ?? 0;
    if (n >= args.perSchool) return false;
    perSchoolCount.set(r.ncessch, n + 1);
    seen.add(r.contact_email);
    return true;
  });

  if (contacts.length === 0) {
    process.stderr.write('No enriched contacts to write emails for.\n');
    return;
  }

  fs.mkdirSync(args.outDir, { recursive: true });
  const campaignRows = [];

  for (const contact of contacts) {
    const sequence = buildSequence(contact, args);
    for (const email of sequence) {
      campaignRows.push({
        send_date: email.sendDate,
        to_email: contact.contact_email,
        to_name: contact.contact_name,
        role: contact.contact_role,
        school: contact.school_name,
        email_key: email.key,
        subject: email.subject,
        body: email.body,
      });
    }

    const local = contact.contact_email.split('@')[0];
    const mdPath = path.join(args.outDir, `${contact.demo_slug}--${local}.md`);
    const md = [
      `# ${contact.school_name} — ${contact.contact_name || contact.contact_email} (${contact.contact_role || 'no role'})`,
      '',
      `To: ${contact.contact_email}`,
      `Source: ${contact.email_source_url}`,
      '',
      ...sequence.flatMap((e) => [
        `---`,
        '',
        `## ${e.key} — send ${e.sendDate}`,
        '',
        `**Subject:** ${e.subject}`,
        '',
        e.body,
        '',
      ]),
    ].join('\n');
    fs.writeFileSync(mdPath, md);
  }

  campaignRows.sort((a, b) => a.send_date.localeCompare(b.send_date));
  fs.writeFileSync(
    path.join(args.outDir, 'campaign.csv'),
    toCsv(campaignRows, ['send_date', 'to_email', 'to_name', 'role', 'school', 'email_key', 'subject', 'body']),
  );

  const placeholders = [args.baseUrl, args.fromName, args.fromTitle, args.replyEmail, args.mailingAddress]
    .filter((v) => /\{\{.*\}\}/.test(v));
  process.stderr.write(
    `Wrote ${campaignRows.length} emails for ${contacts.length} contacts to ${args.outDir}/\n` +
    `Review the .md files, then send via your mail-merge tool using campaign.csv.\n`,
  );
  if (placeholders.length > 0) {
    process.stderr.write(
      `WARNING: unfilled placeholders remain (${placeholders.join(', ')}).\n` +
      `Pass --base-url, --from-name, --from-title, --reply-email, --mailing-address before sending.\n`,
    );
  }
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
