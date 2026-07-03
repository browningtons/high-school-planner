#!/usr/bin/env node
// Build outreach/contacts.csv from the public NCES Common Core of Data
// (via the Urban Institute Education Data API — free, no key required).
//
// Usage:
//   npm run outreach:list                              # Utah HS within 40 mi of Ogden
//   npm run outreach:list -- --state UT --near 40.76,-111.89 --radius 25
//   npm run outreach:list -- --state UT --max 150
//   npm run outreach:list -- --input path/to/ccd.json  # offline / pre-downloaded data
//
// Options:
//   --state XX        Two-letter state (default UT)
//   --near LAT,LON    Center point for distance filter (default Ogden, UT)
//   --radius MILES    Keep schools within this distance (default 40; 0 = no filter)
//   --max N           Cap the list (default 150)
//   --year YYYY       CCD school year (default: tries 2023, 2022, 2021)
//   --input FILE      Read CCD records from a JSON file instead of the API
//   --out FILE        Output path (default outreach/contacts.csv)
//
// Existing rows in the output file are preserved: schools already present
// (matched by NCES id) keep their status/contact fields and are not duplicated.

import fs from 'node:fs';
import {
  CONTACT_COLUMNS,
  STATE_FIPS,
  haversineMiles,
  readCsvObjects,
  slugify,
  writeCsvObjects,
} from './lib.mjs';

const API_BASE = 'https://educationdata.urban.org/api/v1/schools/ccd/directory';
const DEFAULT_YEARS = [2023, 2022, 2021];
const OGDEN = { lat: 41.223, lon: -111.9738 };

function parseArgs(argv) {
  const args = {
    state: 'UT',
    near: OGDEN,
    radius: 40,
    max: 150,
    year: null,
    input: null,
    out: 'outreach/contacts.csv',
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => argv[++i];
    if (flag === '--state') args.state = next().toUpperCase();
    else if (flag === '--near') {
      const [lat, lon] = next().split(',').map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error('--near expects LAT,LON (e.g. 41.223,-111.974)');
      }
      args.near = { lat, lon };
    } else if (flag === '--radius') args.radius = Number(next());
    else if (flag === '--max') args.max = Number(next());
    else if (flag === '--year') args.year = Number(next());
    else if (flag === '--input') args.input = next();
    else if (flag === '--out') args.out = next();
    else throw new Error(`Unknown flag: ${flag}`);
  }
  return args;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchCcdRecords(fips, year) {
  // level 3 = high schools in CCD school_level coding
  let url = `${API_BASE}/${year}/?fips=${fips}&school_level=3&page=1`;
  const records = [];
  while (url) {
    process.stderr.write(`fetching ${url}\n`);
    const data = await fetchJson(url);
    records.push(...(data.results || []));
    url = data.next;
  }
  return records;
}

function normalizeRecord(r) {
  const lat = Number(r.latitude);
  const lon = Number(r.longitude);
  return {
    ncessch: String(r.ncessch ?? r.school_id ?? ''),
    school_name: r.school_name ?? '',
    district: r.lea_name ?? '',
    city: r.city_location ?? r.city_mailing ?? '',
    state: r.state_location ?? r.state_mailing ?? '',
    zip: r.zip_location ?? r.zip_mailing ?? '',
    phone: r.phone ?? '',
    website: r.website ?? r.url ?? '',
    enrollment: Number(r.enrollment ?? 0) || '',
    charter: r.charter === 1 || r.charter === '1' ? 'yes' : '',
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    // CCD school_status 1/3/8 are open-ish; anything explicitly closed (2) is dropped
    closed: Number(r.school_status) === 2,
    virtual: r.virtual === 1 || r.virtual === '1' || r.virtual === 'FULLVIRTUAL',
  };
}

async function main() {
  const args = parseArgs(process.argv);

  let raw;
  if (args.input) {
    const parsed = JSON.parse(fs.readFileSync(args.input, 'utf8'));
    raw = Array.isArray(parsed) ? parsed : parsed.results;
    if (!Array.isArray(raw)) throw new Error(`--input file must be a JSON array or {results: [...]}`);
  } else {
    const fips = STATE_FIPS[args.state];
    if (!fips) throw new Error(`Unknown state: ${args.state}`);
    const years = args.year ? [args.year] : DEFAULT_YEARS;
    let lastError;
    for (const year of years) {
      try {
        raw = await fetchCcdRecords(fips, year);
        if (raw.length > 0) { process.stderr.write(`using CCD year ${year}\n`); break; }
      } catch (err) {
        lastError = err;
        process.stderr.write(`year ${year} failed (${err.message}), trying earlier year...\n`);
      }
    }
    if (!raw || raw.length === 0) {
      throw new Error(`No CCD data retrieved. Last error: ${lastError?.message ?? 'empty result'}`);
    }
  }

  let schools = raw.map(normalizeRecord).filter((s) => s.school_name && !s.closed && !s.virtual);

  if (args.radius > 0) {
    schools = schools
      .map((s) => ({
        ...s,
        distance_miles:
          s.lat !== null && s.lon !== null
            ? Math.round(haversineMiles(args.near.lat, args.near.lon, s.lat, s.lon) * 10) / 10
            : null,
      }))
      .filter((s) => s.distance_miles !== null && s.distance_miles <= args.radius);
  } else {
    schools = schools.map((s) => ({ ...s, distance_miles: '' }));
  }

  // Closer first; larger enrollment breaks ties (bigger class = bigger savings headline).
  schools.sort((a, b) => {
    const d = (a.distance_miles || 0) - (b.distance_miles || 0);
    if (d !== 0) return d;
    return (Number(b.enrollment) || 0) - (Number(a.enrollment) || 0);
  });
  schools = schools.slice(0, args.max);

  // Merge with any existing list so enrichment/status work is never clobbered.
  const existing = fs.existsSync(args.out) ? readCsvObjects(args.out).records : [];
  const existingIds = new Set(existing.map((r) => r.ncessch).filter(Boolean));

  const newRows = schools
    .filter((s) => !existingIds.has(s.ncessch))
    .map((s, i) => ({
      priority: existing.length + i + 1,
      status: 'new',
      school_name: s.school_name,
      district: s.district,
      city: s.city,
      state: s.state,
      zip: s.zip,
      enrollment: s.enrollment,
      phone: s.phone,
      website: s.website,
      distance_miles: s.distance_miles,
      demo_slug: slugify(s.school_name),
      ncessch: s.ncessch,
      staff_page_url: '',
      contact_name: '',
      contact_role: '',
      contact_email: '',
      email_source_url: '',
      notes: s.charter ? 'charter' : '',
    }));

  writeCsvObjects(args.out, [...existing, ...newRows], CONTACT_COLUMNS);
  process.stderr.write(
    `${args.out}: ${existing.length} existing rows kept, ${newRows.length} schools added ` +
    `(${schools.length} matched filters).\n` +
    `Next: npm run outreach:enrich  # finds counseling staff pages for the top schools\n`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
