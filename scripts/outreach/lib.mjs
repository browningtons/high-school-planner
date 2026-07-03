// Shared helpers for the outreach contact-list tools.

import fs from 'node:fs';
import path from 'node:path';

export const CONTACT_COLUMNS = [
  'priority',
  'status',
  'school_name',
  'district',
  'city',
  'state',
  'zip',
  'enrollment',
  'phone',
  'website',
  'distance_miles',
  'demo_slug',
  'ncessch',
  'staff_page_url',
  'contact_name',
  'contact_role',
  'contact_email',
  'email_source_url',
  'notes',
];

export function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows, columns) {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(row[c])).join(','));
  }
  return lines.join('\n') + '\n';
}

// Minimal CSV parser: handles quoted fields, embedded commas/newlines.
export function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export function readCsvObjects(filePath) {
  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  if (rows.length === 0) return { columns: [], records: [] };
  const columns = rows[0];
  const records = rows.slice(1).map((r) => {
    const obj = {};
    columns.forEach((c, i) => { obj[c] = r[i] ?? ''; });
    return obj;
  });
  return { columns, records };
}

export function writeCsvObjects(filePath, records, columns) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, toCsv(records, columns));
}

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function loadSuppression(filePath) {
  const emails = new Set();
  const domains = new Set();
  if (!fs.existsSync(filePath)) return { emails, domains };
  const { records } = readCsvObjects(filePath);
  for (const r of records) {
    const v = (r.value || '').trim().toLowerCase();
    if (!v) continue;
    if ((r.type || '').trim().toLowerCase() === 'domain') domains.add(v.replace(/^@/, ''));
    else emails.add(v);
  }
  return { emails, domains };
}

export function isSuppressed(email, suppression) {
  const e = email.toLowerCase();
  if (suppression.emails.has(e)) return true;
  const domain = e.split('@')[1] || '';
  return suppression.domains.has(domain);
}

// FIPS codes for --state lookups.
export const STATE_FIPS = {
  AL: 1, AK: 2, AZ: 4, AR: 5, CA: 6, CO: 8, CT: 9, DE: 10, DC: 11, FL: 12,
  GA: 13, HI: 15, ID: 16, IL: 17, IN: 18, IA: 19, KS: 20, KY: 21, LA: 22,
  ME: 23, MD: 24, MA: 25, MI: 26, MN: 27, MS: 28, MO: 29, MT: 30, NE: 31,
  NV: 32, NH: 33, NJ: 34, NM: 35, NY: 36, NC: 37, ND: 38, OH: 39, OK: 40,
  OR: 41, PA: 42, RI: 44, SC: 45, SD: 46, TN: 47, TX: 48, UT: 49, VT: 50,
  VA: 51, WA: 53, WV: 54, WI: 55, WY: 56,
};
