# High School Planner

A React + TypeScript planning tool for turning a dense high-school course catalog into a clear associate-degree roadmap.

The app helps a student or family compare pathway options, understand how AP/IB/concurrent-enrollment credits count, and see what is still missing before graduation. It is also used as a public Golden Data case-study example: [goldendata.app](https://goldendata.app/) links to it as a before/after demonstration of making a complicated decision surface easier to act on.

## What It Does

- Shows pathway roadmaps for Technology & Engineering, Health Sciences, Business & Humanities, and Social Studies.
- Tracks progress toward a 60-credit associate-degree target.
- Separates concurrent-enrollment, AP, IB, and additional course credit.
- Surfaces general-education category coverage and cultural-competence requirements.
- Tracks AP/IB exam pass status so credit is not counted prematurely.
- Includes counselor/advisor contact context.
- Supports family sharing, PDF export, and link-copy flows.
- Includes an onboarding CSV generator for pathway import/demo prep.
- Draft Day counselor demo (`/#draft`): load an incoming-class roster CSV and
  auto-draft every student into a pathway, with class-level tuition savings and
  section/seat-demand planning. Works with `?school=` presets for branded demos.

## Local Setup

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Scripts

```bash
npm run dev             # start Vite dev server
npm run dev:client      # alias for the client dev server
npm run build           # type-check and production build
npm run preview         # preview production build locally
npm run lint            # run ESLint
npm run onboarding:csv  # generate onboarding/pathway CSV artifact
```

## Project Structure

```text
src/App.tsx             # app shell, pathway logic, export flows
src/schoolData.ts       # course catalog, pathways, school presets (shared data)
src/DraftDay.tsx        # Draft Day counselor demo (roster auto-draft dashboard)
src/draftEngine.ts      # roster parsing + batch pathway assignment engine
scripts/                # CSV generation helpers + outreach list builder
onboarding/             # onboarding artifacts
outreach/               # outreach contact-list workflow (see outreach/README.md)
public/                 # static assets
ONBOARDING_V1_SPEC.md   # onboarding/data import specification
```

## Deployment

This repo is set up for static deployment from the Vite build output. The public demo is linked from the Golden Data site as an example of transforming policy/document complexity into a usable planning interface.

## Quality Checks

Run these before publishing changes:

```bash
npm run lint
npm run build
```

## Notes

The course and advisor data are demo-oriented and should be reviewed against the current school, district, and university catalog before being used for official advising.
