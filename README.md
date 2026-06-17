# SlipSense

AI วิเคราะห์สุขภาพการเงินร้านค้า — ถ่ายรูปสลิปโอนเงิน AI อ่านและสรุปให้ทันที

## Tech Stack

- **Frontend:** Next.js 15 (React + TypeScript)
- **Backend:** Next.js API Routes
- **Database + Auth:** Supabase (PostgreSQL + Phone OTP + Storage)
- **ORM:** Drizzle
- **AI:** Anthropic Claude Sonnet 4.6 (server-side only)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Phone Auth** in Authentication → Providers
3. Run the SQL migration in `supabase/migrations/001_initial_schema.sql` via SQL Editor
4. Copy `.env.example` to `.env.local` and fill in your keys

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  (auth)/login/       — Phone OTP login
  (app)/              — Protected app pages
    dashboard/        — Financial summary
    upload/           — Slip upload
    review/[jobId]/   — Review AI extraction
    transactions/     — Transaction list
    analytics/        — Charts
    settings/         — Shop settings
  api/                — Backend API routes
lib/
  supabase/           — Supabase clients
  db/                 — Drizzle schema
  ai/                 — Claude prompts
  auth/               — Auth helpers
```

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables from `.env.example`
4. Deploy

## Demo Data

Use the "โหลดข้อมูลตัวอย่าง" button in Settings to seed demo transactions for pitch.
