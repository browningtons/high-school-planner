# Outreach Contact List Builder

Tooling that builds a small, targeted list of school contacts for the
counselor outreach campaign described in `MONETIZATION_PLAN.md`.

Data comes from public sources only: the federal NCES Common Core of Data
(every US public school — name, district, city, phone, website, enrollment,
location) and each school's own published staff/counseling directory pages.

## Workflow

```bash
# 1. Build the school list (defaults: Utah, within 40 miles of Ogden, max 150)
npm run outreach:list
npm run outreach:list -- --state UT --near 40.76,-111.89 --radius 25 --max 100

# 2. Enrich the top schools with published counseling/CTE/CE contacts
#    (processes 25 schools per run; re-run for the next batch)
npm run outreach:enrich -- --contact you@yourdomain.com

# 3. Generate the email sequence (Day 1 / Day 3 / Day 10 / pilot offer)
#    for every enriched contact — review before sending anything
npm run outreach:emails -- \
  --base-url https://your-deployed-planner.example \
  --from-name "Your Name" --from-title "Your Org" \
  --reply-email hello@try.yourdomain.com \
  --mailing-address "Street, City, ST ZIP"
```

The email step writes `outreach/emails/campaign.csv` (one row per email,
sorted by send date — mail-merge ready) plus a reviewable markdown file per
contact. Demo links automatically use the matching `?school=` preset so each
school sees its own branding. Nothing is sent automatically: review the
copy, fix anything that reads wrong, then send from your subdomain address
on the scheduled dates. Max 2 contacts per school by default
(`--per-school`), suppression list honored.

Both commands read/write `outreach/contacts.csv`. Re-running is safe:
existing rows, statuses, and manually edited fields are preserved.

`contacts.csv` and other generated data are **gitignored on purpose** —
never commit contact lists to the repo.

## contacts.csv lifecycle

Each row's `status` tracks where it is in the pipeline:

- `new` — school found in NCES data, not yet enriched
- `enriched` — a role-matched contact was found on the school's site
- `needs_manual` — staff page found (see `staff_page_url`) but no
  role-matched email; look it up by hand
- set `emailed`, `replied`, `pilot`, or `opted_out` yourself as the
  campaign progresses (the tools never overwrite non-`new` rows)

Contacts are role-filtered and ranked: Concurrent Enrollment / Early College
coordinators first, then CTE directors, counselors, assistant principals,
registrars. Generic addresses (webmaster, front office) are dropped.

## Suppression list

`outreach/suppression.csv` is honored by the enrichment step and must be
honored by every send. Add a row per opt-out:

```csv
type,value
email,someone@district.org
domain,district-that-said-no.org
```

## Ground rules (read before sending anything)

- **Volume**: this is a 50–150 contact campaign, not a blast. The tools cap
  batch sizes and rate-limit requests by design; keep it that way.
- **CAN-SPAM**: every email needs a truthful subject line, your real
  physical mailing address, a working unsubscribe, and opt-outs honored
  within 10 days (add them to `suppression.csv` immediately).
- **Sending domain**: send from a subdomain (e.g. `hello@try.yourdomain`)
  with SPF/DKIM/DMARC configured — never from your root domain.
- **One-strike rule**: if a district asks you to stop, suppress the whole
  domain and don't contact anyone there again.
- The enrichment fetcher identifies itself in its User-Agent (pass
  `--contact` so site owners can reach you) and only visits official school
  sites already on the list.
