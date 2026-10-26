<p align="center">
  <img src="public/icon-192.png" alt="Platito logo" width="80" />
</p>

<h1 align="center">Platito</h1>

A mobile-first food, workout and nutrition tracker that uses **Google Sheets as its database**. Log meals built from your own recipes, track workouts, follow calorie-deficit plans, and watch your progress in charts.

Built with Next.js 14 (App Router), React 18, Tailwind CSS, Recharts and the Google Sheets API.

## Features

- **Today** – daily calorie budget, macro rings and the day's meal log. Every active plan appears as a swipeable card (earliest first), and the selected plan drives the budget.
- **Log meals** – pick a dish and portion; calories, macros and micronutrients are computed from your Recipe and Ingredients sheets. Meals can be deleted.
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
- A Google Cloud service account with the Sheets API enabled
- A Google Sheet shared with the service account's email (Editor access)

### Install and run

```bash
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

Open <http://localhost:3000>. The header badge shows **Google Sheets** when the connection is live, or **Local / Demo** when it falls back to sample data.

### Configuration

Set these in `.env.local`:

| Variable | Description |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Private key, with newlines written as `\n` |
| `GOOGLE_SHEET_ID` | ID from the sheet's URL |

Alternatively, place the service account's `credentials.json` in the project root. Both files are git-ignored. **Never commit credentials.**

## Sheet layout

Create these tabs with a header row in row 1:

| Tab | Columns |
| --- | --- |
| `Ingredients` | Name, Quantity, Unit, Calories, Protein, Carbs, Fat, Calcium, Iron, Potassium, Sodium, Vitamin C, Vitamin B12, Vitamin D |
| `Recipe` | Dish, Ingredient, Quantity (a multiple of the ingredient's base quantity) |
| `Food` | Dish, Portion, Timestamp, User |
| `Workouts` | Name, User, Created At UTC, Calories |
| `User` | Name, Weight (kg), Height (cm), Workouts per week, Avatar |
| `Plan` | Name, User, Target Weight, Resting Calories, Created At UTC (start date), Comment, Status |

## Project structure

```
app/            Next.js app router: page.tsx (main screen) and api/ routes
  api/          meals, workouts, recipes, plan, profile, status
components/     UI: BottomNav, PlanCarousel, ProfileScreen, TrendsView, ...
lib/            sheets.ts (all Google Sheets access)
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

- Meal and workout deletes remove the sheet row, after verifying the row still matches. Plans are soft-deleted through the `Status` column.
- Plan totals only count activity on or after the plan's start date.
- The `app/icon-mocks` and `app/export-mocks` directories are local-only prototypes and are git-ignored; they are not part of the deployed app.
- The Manrope font is loaded with `next/font/google`, so production builds need access to Google Fonts during compilation.
