# High School Planner

React + TypeScript planner for building an associate-degree-focused high school course roadmap.

## Features

- Roadmap by skill path (Technology, Health, Business, Social Studies)
- Degree progress dashboard (60 credits, Gen Ed categories, CE residency)
- AP/IB exam pass tracker (AP/IB credits only count after exam pass)

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Start frontend:
```bash
npm run dev
```

## Production Notes

- This repo deploys frontend to GitHub Pages (`.github/workflows/deploy.yml`).

## Scripts

- `npm run dev`: start Vite frontend
- `npm run dev:client`: start Vite frontend
- `npm run build`: type-check + production build
- `npm run lint`: run ESLint
