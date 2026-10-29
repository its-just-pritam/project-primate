# Test users

Local testing accounts. Do not use these in production.

## Rocky Balboa

| Field      | Value                    |
|------------|--------------------------|
| First name | Rocky                    |
| Last name  | Balboa                   |
| Email      | rocky.balboa@example.com |
| Password   | Adrian-Yo-1976!          |

**Status:** registered in the Kotlin backend (PostgreSQL) on 2026-10-28. Requires `MIGRATE_TO_BACKEND=true`. Not present in the Google Sheet. To re-create it if the database is reset:

```sh
curl -s -X POST http://localhost:8080/api/auth/signup -H 'Content-Type: application/json' \
  -d '{"firstName":"Rocky","lastName":"Balboa","email":"rocky.balboa@example.com","password":"Adrian-Yo-1976!"}'
```

Log in with `{"username":"rocky.balboa@example.com","password":"Adrian-Yo-1976!"}` at `POST /api/auth/login`.
