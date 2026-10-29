# Username and password sign-in

Accounts live in the backend's `app_user` table. Sign-up is open and asks for first name, last name, email, and password. Email and full name are unique, case-insensitively. Recipes, packaged foods, meals, workouts, plans, and the Garmin connection all belong to an account. Ingredients are a shared catalog.

Passwords are stored as salted `scrypt` hashes in the format `<salt hex>:<digest hex>`, using Node's `crypto.scrypt` defaults (N=16384, r=8, p=1, 64-byte key). Hashes created by the Google Sheets version of the app therefore keep working after migration. For a manually provisioned account, generate a hash locally with `node scripts/generate-password-hash.mjs` and store it in `app_user.password_hash`. Never store a password itself.

## Sessions

1. The Next.js app forwards sign-up and login to the backend. If the backend accepts them, the app issues an HMAC-signed `primate_session` cookie (see `lib/authSession.ts`). The cookie expires after seven days.
2. API routes forward the cookie's value to the backend as `Authorization: Bearer <token>`.
3. The backend verifies the signature and expiry with the same secret and resolves the account by email.

Set `AUTH_SECRET` to the same value in the Next.js app (`.env.local`) and in the backend's environment. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Keep it stable across deployments so existing sessions remain valid until they expire.
