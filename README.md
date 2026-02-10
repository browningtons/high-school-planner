# High School Planner

React + TypeScript planner for building an associate-degree-focused high school course roadmap.

## Features

- Roadmap by skill path (Technology, Health, Business, Social Studies)
- Degree progress dashboard (60 credits, Gen Ed categories, CE residency)
- AP/IB exam pass tracker (AP/IB credits only count after exam pass)
- Real PDF email delivery via backend API (Gmail SMTP)

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Copy env template:
```bash
cp .env.example .env
```

3. Fill in your `.env` values:
- `VITE_API_BASE_URL`: frontend target for email API
- `GMAIL_USER`: Gmail sender address
- `GMAIL_APP_PASSWORD`: 16-character Google App Password
- `EMAIL_FROM`: optional display name + sender (`"High School Planner <thegoldendata@gmail.com>"`)
- `EMAIL_REPLY_TO`: optional reply-to mailbox (for example `thegoldendata@gmail.com`)
- `ALLOWED_ORIGINS`: comma-separated frontend origins allowed to call API

4. Start API server (terminal 1):
```bash
npm run dev:server
```

5. Start frontend (terminal 2):
```bash
npm run dev
```

## Email API

- Endpoint: `POST /api/send-plan-email`
- Health: `GET /api/health`
- Server file: `server/email-api.js`

The frontend generates the PDF and posts it as base64 to the API. The API sends the email with the PDF as an attachment through Gmail SMTP.

## Gmail Setup (Required)

1. Enable 2-Step Verification on `thegoldendata@gmail.com`.
2. Create a Google App Password for "Mail".
3. Put that value in `.env` as `GMAIL_APP_PASSWORD`.
4. Set `GMAIL_USER=thegoldendata@gmail.com`.

## Production Notes

- This repo deploys frontend to GitHub Pages (`.github/workflows/deploy.yml`).
- GitHub Pages is static hosting, so the email API must be deployed separately (Render, Fly.io, Railway, VPS, etc).
- Set `VITE_API_BASE_URL` to that deployed API URL for production.
- A Render blueprint is included at `render.yaml`.

## Scripts

- `npm run dev`: start Vite frontend
- `npm run dev:client`: start Vite frontend
- `npm run dev:server`: start Node email API
- `npm run start:server`: start Node email API (production)
- `npm run build`: type-check + production build
- `npm run lint`: run ESLint
