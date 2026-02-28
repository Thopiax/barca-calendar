# ⚽ Barça Calendar

Never miss a Barça match. Subscribe to a single URL from your phone's calendar app and get native notifications 3 hours before kickoff.

```
Phone Calendar App (polls every ~4-24h)
        │
        ▼
  GET /api/calendar.ics
        │
        ▼
  Vercel Serverless Function
        │
        ├─ Fetch from football-data.org v4
        ├─ Transform → iCalendar (.ics)
        └─ Return with VALARM (3h before)
```

No database. No cron. No framework. Zero production dependencies.

Your calendar app's periodic polling IS the trigger. Vercel's CDN caches responses for 1 hour — so the upstream API is only hit once/hour regardless of how many subscribers poll.

## What you get

- **Upcoming matches** for the next 60 days with 3-hour pre-match alerts
- **Recent results** from the last 7 days with final scores
- Home/away context in every event title (`Barça vs Real Madrid` or `Real Madrid vs Barça`)
- Competition name, matchday, and venue in the event description
- La Liga + Champions League coverage

## Subscribe

Deploy your own instance (see below), then subscribe using your deployment URL:

```
https://<your-project>.vercel.app/api/calendar.ics
```

- **iPhone:** Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste URL
- **Google Calendar:** Other calendars (+) → From URL → paste URL (refreshes every ~12-24h)
- **Any app** that supports iCalendar subscriptions (Outlook, Fantastical, etc.) → paste URL

## Self-hosting

Want to deploy your own instance (or tweak the config)?

### 1. Get an API key

Register for free at [football-data.org](https://www.football-data.org/client/register).

### 2. Deploy

```bash
npm install
npx vercel --prod
```

Then set the environment variable in Vercel → Project Settings → Environment Variables:

| Variable | Description |
|---|---|
| `FOOTBALL_DATA_API_KEY` | Your football-data.org API key |

Your calendar URL will be `https://<your-project>.vercel.app/api/calendar.ics`.

## Development

```bash
npm install
FOOTBALL_DATA_API_KEY=your_key npx vercel dev
curl localhost:3000/api/calendar.ics
```

## Project structure

```
barca-calendar/
├── api/
│   └── calendar.ics.ts    # Vercel serverless handler
├── src/
│   ├── config.ts           # Team ID, alarm timing, lookback/forward windows
│   ├── football-data.ts    # Typed API client for football-data.org v4
│   └── ics-builder.ts      # Match → RFC 5545 iCalendar transformer
├── vercel.json
├── tsconfig.json
└── package.json
```

## How it works

1. Calendar app sends `GET /api/calendar.ics`
2. Vercel CDN serves cached response if fresh (< 1 hour old)
3. On cache miss, the function calls `football-data.org/v4/teams/81/matches` for scheduled + recent matches
4. Matches are transformed into RFC 5545 VEVENT entries with `VALARM` triggers set to 3 hours before kickoff
5. The full VCALENDAR is returned with `Content-Type: text/calendar`

The 1-hour CDN cache (`s-maxage=3600`) is the "poor man's cron" — it keeps the free-tier API rate limit safe (10 req/min) even if thousands of calendars subscribe.

## Limitations

- **Copa del Rey** is not covered (not available on football-data.org's free tier)
- Match times may shift — the calendar reflects whatever football-data.org has at fetch time
- Google Calendar's slow refresh (~12-24h) means last-minute schedule changes may not appear in time

## Tech stack

TypeScript on Vercel Serverless Functions. No runtime dependencies — just `fetch` and string concatenation.

## License

MIT
