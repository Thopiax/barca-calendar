# Barça Calendar

A Vercel serverless function that serves an iCalendar (.ics) feed of FC Barcelona matches. Subscribe from your phone's calendar app and get notified 3 hours before kickoff.

## How it works

Your calendar app polls `GET /api/calendar.ics` periodically. The function fetches upcoming (and recent) Barça matches from [football-data.org](https://www.football-data.org/), transforms them into iCalendar format, and returns the `.ics` file. Vercel's CDN caches the response for 1 hour.

No database. No cron. No framework.

## Setup

### 1. Get an API key

Register at [football-data.org](https://www.football-data.org/client/register) for a free API key.

### 2. Deploy to Vercel

```bash
npm install
npx vercel --prod
```

Set the environment variable in Vercel dashboard → Project Settings → Environment Variables:

| Variable | Value |
|---|---|
| `FOOTBALL_DATA_API_KEY` | Your football-data.org API key |

### 3. Subscribe

**iPhone:** Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → enter your Vercel URL.

**Google Calendar:** Other calendars (+) → From URL → enter your Vercel URL.

The URL is: `https://<your-project>.vercel.app/api/calendar.ics`

## Development

```bash
npm install
FOOTBALL_DATA_API_KEY=your_key npx vercel dev
curl localhost:3000/api/calendar.ics
```

## Coverage

- La Liga (PD)
- Champions League (CL)
- Copa del Rey is **not** covered (football-data.org free tier limitation)

## Architecture

```
Phone Calendar App (polls every ~4-24h)
        │
        ▼
GET /api/calendar.ics
        │
        ▼
Vercel Serverless Function (TypeScript)
        │
        ├─ Fetch from football-data.org v4 API
        ├─ Transform matches → VEVENT entries
        └─ Return text/calendar with VALARM (3h before)
```
