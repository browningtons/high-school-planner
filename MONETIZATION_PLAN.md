# Monetization & School Outreach Plan

Goal: turn the High School Planner into a paid tool for schools with a
low-touch sales motion — counselor-led demos, a roster-scale "auto-draft"
proof of value, and a small, well-targeted email campaign to school
decision-makers.

---

## 1. Where the architecture stands today

**What exists**

- Single-page React 19 + TypeScript + Vite app; static deploy to Vercel.
- All app logic, course data, and pathway definitions live in `src/App.tsx`
  (~3,500 lines). One school's catalog is hardcoded.
- All state persists in `localStorage` — no backend, no accounts, no server.
- Counselor-facing UI already exists: counselor setup checklist, meeting-prep
  playbook, family-meeting talking points, PDF export, share links.
- A tuition-savings hook is already in the product ("Save up to $5,400").
- `onboarding/` has a denormalized single-CSV template + data dictionary for
  school admins, and `scripts/generate-onboarding-csv.mjs` generates it —
  but the app does not import that CSV yet.

**What the counselor/roster vision requires but doesn't exist**

1. **Roster import** — no way to load a list of students.
2. **Auto-draft engine** — the "fantasy basketball" batch assignment
   (student → pathway → 4-year plan) is not implemented; the app plans one
   student at a time, interactively.
3. **Aggregate dashboard** — no view of a whole class: total projected
   savings, pathway distribution, concurrent-enrollment seat demand.
4. **Configurable school data** — catalog is baked into `App.tsx`, so every
   new school currently means a code change. The CSV template is the right
   idea; the app needs to consume it.
5. **Persistence/accounts** — needed eventually for real deployments, but
   NOT needed for the demo or pilot (see the FERPA point below).

**The accidental superpower: browser-only is a feature**

Because nothing leaves the browser, a counselor can load a real roster and
no student data ever touches your servers. For K-12 sales this is a
first-meeting differentiator: no FERPA data-sharing agreement is needed to
*pilot* the tool, which removes the single biggest procurement blocker for
a small vendor. Lead with it. (A hosted multi-user version later will need a
student-data-privacy agreement — most states use the NDPA standard contract —
but that's a Phase 4 problem, after there's revenue.)

---

## 2. Monetization models, ranked

| # | Model | Price anchor | Why / why not |
|---|-------|--------------|----------------|
| 1 | **Per-school annual license** (counselor tool) | $990–$2,500 / school / yr | Simple, fits school purchasing (PO-able, under most principals' discretionary limit). One school saving students ~$5,400 each pays for itself with a single student. |
| 2 | **District license** | $5k–$15k / district / yr | Same product, bigger PO. Districts buy when 2+ schools already use it. |
| 3 | **Paid onboarding/setup** | $500–$1,500 one-time | You convert their course catalog into the CSV. Front-loads revenue, and an LLM-assisted catalog importer keeps your labor near zero. |
| 4 | **Concurrent-enrollment partner sponsorship** | Varies | Community colleges are funded per CE enrollment — your tool literally drives their revenue. A college's CE office sponsoring the tool for its feeder high schools is the most aligned buyer in this whole space, and they already have relationships with every counselor you want to reach. |
| 5 | **Free parent/student version** (B2C funnel) | Free | Not revenue — demand generation. Parents asking "why doesn't our school use this?" is bottom-up pressure that shortens the school sale. |

Recommended: **1 + 3 now, 4 in parallel, 2 later.** Skip charging parents;
the money and the low-effort motion are on the school side.

Reality check on timing: school budgets are set in spring. It is July —
the realistic goal for the August campaign is **free fall pilots** that
convert to paid licenses in the January–April budget window.

---

## 3. The killer demo: "Draft Day" (roster auto-selection)

This is the highest-leverage build. One artifact does the selling for you.

**What it is:** a Counselor Mode where an admin drops in a CSV of the
incoming class (works with just first name + optional interest column; fake
or de-identified data for demos) and the app:

1. Auto-drafts every student into a best-fit pathway and 4-year course plan
   (round-robin/snake assignment with capacity limits per CE section — the
   fantasy-draft framing is genuinely apt and demo-friendly).
2. Shows the class-level dashboard: **"Class of 2030: 312 students,
   $1.68M in projected tuition savings, 4,100 college credits."** That
   headline number is the sales pitch.
3. Shows CE seat demand per course — this is secretly the feature
   administrators care about most, because it answers "how many sections of
   CE Biology do I need to staff?" Master-schedule planning is a real pain
   point; savings-for-students is the heart, seat-forecasting is the budget
   justification.
4. Exports a per-student one-page PDF plan (already 80% built) and a
   class-level summary PDF for the principal.

**Build steps (order matters):**

- **3a. Extract school data from `App.tsx`** into a typed JSON config +
  loader that can also parse the existing onboarding CSV. This makes every
  new school a data file, not a code change, and unblocks per-district demos.
- **3b. Roster CSV import + auto-draft engine** (pure client-side function:
  students × pathways × capacity → assignments).
- **3c. Class dashboard + aggregate savings math + seat-demand table.**
- **3d. Per-district demo links**: `?school=ogden` style config loading, so
  every outreach email links to a demo already showing *their* school's
  pathway names. This is the single biggest reply-rate lever you have.

Estimated effort: 3a+3b are each a day or two of focused work; 3c/3d smaller.

---

## 4. Outreach: list building and the email campaign

### Who to email (in order of likely reply)

1. **Concurrent-enrollment / early-college coordinators** (district or
   school level) — this role owns exactly the problem you solve.
2. **CTE (Career & Technical Education) directors** — pathways are their
   language; CTE has dedicated state funding.
3. **School counselors** — the daily users; great champions, rarely the
   buyer. Ask for feedback, not money.
4. **Assistant principals over scheduling** — buyers of the seat-forecast.

### List building: use public directories, not a scraper

Don't build a crawler that harvests emails off the open web — it's the
slowest, dirtiest, most block-prone way to get this data, and "scraped"
lists are what spam filters and district IT are tuned to kill. The same
data is sitting in structured public sources:

- **NCES CCD** (public federal dataset): every US public school, district,
  address, phone — the spine of the list.
- **State DOE directories**: most states publish school/district staff
  directories, often as downloadable spreadsheets with roles and emails.
- **District websites**: counseling and CTE staff pages are public records
  and usually list names/emails; a small script (or an agent run) can fill
  gaps for the top-priority districts only.

Start with a **50–150 contact list within driving distance**, not thousands.
K-12 mail filters are brutal and district IT reports mass senders; 50
genuinely personalized emails will outperform 5,000 blasted ones and won't
torch your domain.

### Compliance guardrails (cheap to do, expensive to skip)

Cold B2B email to work addresses is legal under CAN-SPAM **if** every email
has: a truthful subject line, your real physical mailing address, a working
unsubscribe that's honored within 10 days, and accurate headers. Also:

- Send from a **subdomain** (e.g. `hello@try.goldendata.app`), never the
  root domain, so deliverability experiments can't hurt your main domain.
- Set up SPF/DKIM/DMARC before the first send; warm the address up.
- Suppress anyone who opts out, forever.

### The sequence (Day 1 / 3 / 10 / pre-school-start)

Your cadence instinct is right. Content plan:

- **Day 1 — the personalized demo.** 3 sentences. "I built a planning tool
  that shows [School]'s students how to graduate with an associate degree —
  here's a demo already loaded with your pathways: [per-district link].
  Would you look at it and tell me what's wrong with it?" Asking for
  *feedback* (not a sale) is the honest framing — you actually want it —
  and it's the ask counselors say yes to.
- **Day 3 — the number.** "For a class the size of yours (~N students),
  the plans in the demo add up to ~$X in tuition savings. Screenshot of the
  Draft Day dashboard."
- **Day 10 — the seat forecast.** "The same data tells you how many CE
  sections you'd need to staff. Here's [School]'s table." Different value
  prop, aimed at the scheduling brain.
- **~Aug 10 (before school starts) — the pilot offer.** "Counselors are
  back and registration adjustments are happening. Free pilot this
  semester, I'll load your catalog myself. 20 minutes to set up."

Counselors return late July / early August — Day 1 should land **the first
week of August**, not now (July emails go into a void).

### Low-touch automation (the "not do very much" part)

- A script builds the contact list from NCES + state directory downloads
  and emits `outreach/contacts.csv`.
- A generator produces the 4 emails per contact (merge fields: school name,
  pathway names, class size, demo link) as **Gmail drafts for your review**
  — you skim and hit send. After the first batch proves the templates,
  graduate to scheduled sends.
- Per-district demo links are generated from the same contact file.
- Replies land in your inbox; a weekly routine can summarize campaign state
  (sent / opened-link / replied) using unique demo-link visits as the
  signal — no tracking pixels needed.

---

## 5. Phased roadmap

| Phase | What | Outcome | Effort |
|-------|------|---------|--------|
| **1. Draft Day demo** (now → mid-July) | 3a–3d above | A demo that sells itself; per-district links | ~1 week |
| **2. Outreach kit** (mid-July) | Contact list builder, email templates, subdomain + SPF/DKIM, draft generator | 50–150 contacts, campaign ready | 2–3 days |
| **3. Campaign + pilots** (Aug 1 → Labor Day) | Send sequence, book 20-min pilot setups, load catalogs for responders | Target: 3–5 active pilots | Ongoing, low |
| **4. Convert** (Jan–Apr, budget season) | Pilot results one-pager ("your counselors ran N plans, $X projected savings"), license quote, NDPA + Supabase-backed accounts only when a district requires hosting | First paid POs | As needed |

**Success metrics:** reply rate on Day-1 email (target >10% at this level of
personalization), demo-link visits, pilots started, and — the one that
matters — plans actually created by counselors during pilots.

---

## 6. Honest risks

- **Schools buy slowly.** Even a great August pilot pays in spring. Plan
  cash-flow expectations accordingly; the CE-college sponsorship channel
  (model #4) is the hedge because colleges buy faster and year-round.
- **Data accuracy is the product.** A demo showing a wrong graduation
  requirement kills trust instantly. Every per-district demo needs a
  "demo data — verify against current catalog" banner (the README's
  disclaimer, surfaced in-app).
- **One-file architecture** will start fighting back at Phase 1. The
  data-extraction step (3a) is the refactor that pays for everything after.
