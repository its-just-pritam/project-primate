# Username and password sign-in

The app authenticates accounts from the existing `User` sheet. It keeps columns A:E and adds these headers in F:I when the first person signs up:

| Column | Header | Value |
| --- | --- | --- |
| F | Email | A unique sign-in email; this is the login name |
| G | Password Hash | Salted `scrypt` hash |
| H | First Name | User's first name |
| I | Last Name | User's last name |

Each account uses one row. Columns A:E continue to hold that account's full name, weight, height, workouts per week, and avatar. Sign-up is open and asks for first name, last name, email, and password. Email and full name must be unique because existing food, workout, and plan rows identify their owner by full name. Those records are filtered by the account name in their existing User column. Recipes and ingredients remain shared catalog data.

The sign-up form creates a salted `scrypt` hash and saves it in column G. For manually provisioned accounts, generate a hash locally with `node scripts/generate-password-hash.mjs` and paste it into column G. Never put a password itself in the sheet.

Set `AUTH_SECRET` in `.env.local` and in the deployment's server environment. Generate a value with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Keep the same secret across deployments so existing sessions remain valid until they expire. The sign-in cookie expires after seven days.

The server also needs the existing Google Sheets service-account credentials and permission to read and append rows in the `User` tab. New accounts start with blank body metrics and can fill those in from the Profile screen.
