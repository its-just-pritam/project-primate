# Backend requirements: resumable onboarding progress

## Background

The app's onboarding guide has 5 steps, in this order:

| Step | Task                  |
|------|-----------------------|
| 1    | Complete your profile |
| 2    | Add a new plan        |
| 3    | Add a recipe          |
| 4    | Log a meal            |
| 5    | Log a workout         |

Today the backend only stores whether onboarding is finished. `app_user.onboarding_step` is either 0 (not finished) or 1 (finished). `GET /api/onboarding` collapses any non-zero value to 1, and `POST /api/onboarding` always writes 1. So if a user leaves part-way through, they restart from step 1 next time.

The app should save progress after each step and pick up at the first unfinished step. For example, a user who finished steps 1 and 2 resumes at step 3.

## Data model

- `app_user.onboarding_step` (existing `SMALLINT NOT NULL DEFAULT 0` column) changes meaning. It becomes **the number of completed onboarding steps**, from 0 to 5:
  - `0`: nothing completed. This stays the default for new users.
  - `1`–`4`: that many steps completed. The user resumes at step `onboarding_step + 1`.
  - `5`: onboarding finished.
- No new column is needed.

## Migration

- Add Liquibase changeset `006-onboarding-progress.sql`, and register it in `db.changelog-master.yaml`.
- Run `UPDATE app_user SET onboarding_step = 5 WHERE onboarding_step = 1;`.
  - Under the old meaning, 1 = finished. Without this update, every user who already finished onboarding would be shown the guide again from step 2.
  - The update is safe because, before this change, no user can have partial progress stored.
- Optional: add a check constraint `onboarding_step BETWEEN 0 AND 5`.

## API

### `GET /api/onboarding` (authenticated)

- Response: `{ "step": <0-5> }`, the stored number of completed steps.
- No more collapsing values to 0 or 1. Any out-of-range value should be clamped to 0–5.

### `POST /api/onboarding` (authenticated)

- Request body (optional JSON): `{ "step": <1-5> }`, the number of steps the user has now completed.
- If the body or `step` is missing, treat it as `5` (finish onboarding). That keeps today's body-less calls working.
- Validation: if `step` is outside 1–5, return `400` with the standard error body, for example `"Onboarding step must be between 1 and 5."`.
- **Never move backwards.** Store `GREATEST(onboarding_step, step)`, so a late or repeated request can't erase progress. Example:

  ```sql
  UPDATE app_user SET onboarding_step = GREATEST(onboarding_step, :step), updated_at = now()
  WHERE id = :id
  RETURNING onboarding_step
  ```

- Response: `{ "success": true, "step": <stored value after the update> }`.

### Examples

| Stored before | Request body    | Stored after | Response `step` |
|---------------|-----------------|--------------|-----------------|
| 0             | `{ "step": 1 }` | 1            | 1               |
| 2             | `{ "step": 3 }` | 3            | 3               |
| 3             | `{ "step": 2 }` | 3            | 3               |
| 3             | *(no body)*     | 5            | 5               |
| any           | `{ "step": 0 }` | unchanged    | 400             |
| any           | `{ "step": 6 }` | unchanged    | 400             |

## Tests

Update `ApiIntegrationTest`. It currently expects `1` after a body-less `POST`. Cover these cases:

- A new user reads `0`.
- `POST {step: 1}`, then `POST {step: 2}`: reads `2`.
- `POST {step: 1}` after `2`: still `2`, so progress never goes down.
- A body-less `POST`: reads `5`.
- `step` of `0` or `6`: `400`.
- The migration turns an existing `1` into `5`.

## Rollout order

The backend change must ship **before** the app change, or together with it. If the new app runs against the old backend, every save is stored as `1`. Users who have finished would then see the guide again from step 2.

## Google Sheets mode (for reference)

The Sheets data path (`lib/sheets.ts`) is changed in the app itself, not the backend. It follows the same rules: the `Onboarding Step` column holds 0–5, and it never decreases. Existing Sheet rows holding `1` need changing to `5` by hand.
