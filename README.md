<p align="center">
  <img src="public/icon-192.png" alt="Platito logo" width="80" />
</p>

<h1 align="center">Platito</h1>

A mobile-first food, workout and nutrition tracker backed by a **Kotlin service and PostgreSQL** (see [`primate-backend/`](primate-backend/README.md)). Log meals built from your own recipes, track workouts, follow calorie-deficit plans, and watch your progress in charts.

Built with Next.js 14 (App Router), React 18, Tailwind CSS and Recharts; the backend uses Kotlin, Spring Boot, PostgreSQL and Liquibase.

## Features

- **Today** – daily calorie budget, macro rings and the day's meal log. Every active plan appears as a swipeable card (earliest first), and the selected plan drives the budget.
- **Log meals** – pick a dish and portion; calories, macros and micronutrients are computed from your recipes and the ingredient catalog. Meals can be deleted.
- **Workouts** – log and delete workouts with calories burnt.
- **Recipes** – build dishes from ingredients, expand a dish for its ingredient and micronutrient breakdown, and edit a recipe's ingredients (recipes cannot be deleted).
- **Trends** – N-day average intake, macro and calorie charts, and deficit projections.
- **Plans** – create, edit and soft-delete plans, each with a target weight, resting calories, start date and optional comment. A plan is `ACTIVE` once its start date arrives, otherwise `INACTIVE`; deleted plans stay visible as `DELETED`.
- **Profile** – edit user details and manage plans.
- **Weekly export** – draft a shareable nutrition and activity report with seven-day trends, including calories consumed versus burned and estimated body-fat versus wet-muscle changes. Copy or share it, or open WhatsApp with the report prefilled for a recipient you choose.
- **Mobile navigation** – the bottom menu hides while scrolling down and returns while scrolling up; meal and workout submit buttons move with it.

## Getting started

### Prerequisites

- Node.js 18 or later
- JDK 21 and Docker (for the backend and its PostgreSQL database)

### Install and run

```bash
# 1. Backend and database (see primate-backend/README.md)
cd primate-backend && cp .env.example .env    # set AUTH_SECRET and GARMIN_API_KEY_ENCRYPTION_KEY
docker compose up --build -d
cd ..

# 2. Web app
npm install
cp .env.example .env.local            # same AUTH_SECRET; BACKEND_URL=http://localhost:8080
npm run dev
```

Open <http://localhost:3000>.

### Configuration

Set these in `.env.local`:

| Variable | Description |
| --- | --- |
| `AUTH_SECRET` | Signs session cookies; must match the backend's `AUTH_SECRET` |
| `BACKEND_URL` | Base URL of the Kotlin backend, default `http://localhost:8080` |

### Garmin Connect API queries

The app calls Garmin Connect's Personal API from the server. These `curl` examples show the same endpoints used by [`lib/garmin.ts`](lib/garmin.ts). Set `GARMIN_API_KEY` to the Personal API key configured for your Garmin integration; the token response should be kept private.

```bash
export GARMIN_API_KEY='your-garmin-personal-api-key'
export GARMIN_TOKEN="$(curl --silent --show-error --fail \
  --request POST 'https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token' \
  --header "Authorization: ApiKey ${GARMIN_API_KEY}" \
  --header 'Accept: */*')"
export GARMIN_DATE='2026-11-02'
```

Use the returned bearer token to query the endpoints the app uses:

```bash
# Daily health summary for one date (used by the Garmin dashboard)
curl --silent --show-error --fail \
  "https://personal.connectapi.garmin.com/usersummary-service/v2/dailysummaries?startDate=${GARMIN_DATE}&endDate=${GARMIN_DATE}" \
  --header "Authorization: Bearer ${GARMIN_TOKEN}" \
  --header 'Accept: application/json'

# Activity list; start and limit are pagination parameters (the app uses pages of 100)
curl --silent --show-error --fail \
  'https://personal.connectapi.garmin.com/activitylist-service/activities/search/activities?start=0&limit=100' \
  --header "Authorization: Bearer ${GARMIN_TOKEN}" \
  --header 'Accept: application/json'

# Activity detail (replace with an activityId from the activity list)
export GARMIN_ACTIVITY_ID='your-activity-id'
curl --silent --show-error --fail \
  "https://personal.connectapi.garmin.com/activity-service/activity/${GARMIN_ACTIVITY_ID}" \
  --header "Authorization: Bearer ${GARMIN_TOKEN}" \
  --header 'Accept: application/json'

# Sleep summaries over a date range
curl --silent --show-error --fail \
  "https://personal.connectapi.garmin.com/sleep-service/sleep/dailySleepSummariesByDate?startDate=${GARMIN_DATE}&endDate=${GARMIN_DATE}" \
  --header "Authorization: Bearer ${GARMIN_TOKEN}" \
  --header 'Accept: application/json'
```

The API key is sent only to Garmin's token endpoint; subsequent queries use the access token. Avoid sharing either credential or committing them to the repository.

Moving from the Google Sheets version? Run `scripts/export-sheets-to-sql.mjs` once. Steps are in [primate-backend/README.md](primate-backend/README.md#migrating-from-google-sheets).

## Project structure

```
app/            Next.js app router: page.tsx (main screen) and api/ routes
  api/          Thin proxies to the backend, plus login/signup cookie handling
primate-backend/ Kotlin + Spring Boot service: PostgreSQL, Liquibase, Garmin sync jobs
components/     UI: BottomNav, PlanCarousel, ProfileScreen, TrendsView, ...
lib/            backend.ts (backend client/proxy), authSession.ts, garminClient.ts
scripts/        Password hash helper and the one-off Sheets → SQL export
types/          Shared TypeScript types
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npx tsc --noEmit` | Type-check |

## Notes

- Meal and workout deletes check that the entry still matches what the client showed. Plans are soft-deleted.
- Plan totals only count activity on or after the plan's start date.
- Garmin data is synced by backend jobs; the browser never handles Garmin tokens.
- The `app/icon-mocks` and `app/export-mocks` directories are local-only prototypes and are git-ignored; they are not part of the deployed app.
- The Manrope font is loaded with `next/font/google`, so production builds need access to Google Fonts during compilation.
