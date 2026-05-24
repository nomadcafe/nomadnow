# Deploy setup (one-time)

Steps to wire Supabase Auth + Upstash rate limit before the first production deploy.

## 1. Enable email auth in Supabase

In your Supabase project dashboard:

1. **Authentication → Providers → Email**: enable.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://<your-prod-domain>` (use `http://localhost:3000` for dev).
   - **Redirect URLs**: add both
     - `http://localhost:3000/auth/callback`
     - `https://<your-prod-domain>/auth/callback`
3. (Optional) **Authentication → Email Templates → Magic Link**: customize the email subject/body.

## 2. Run the RLS migration

In **SQL Editor**, paste and run the contents of:

```
supabase/migrations/0001_auth_and_rls.sql
```

This:
- Drops the old `USING (true)` placeholder policies.
- Installs real per-table policies enforcing `auth.uid() = user_id` on writes.
- Keeps public read on all profile-facing tables.

If you provisioned the DB after this change, `supabase/schema.sql` already includes the new policies, so the migration is a no-op for fresh installs (the `DROP POLICY IF EXISTS` calls are idempotent).

## 3. Migrate existing demo data (optional)

`supabase/seed.sql` inserts users with random UUIDs that do not exist in `auth.users`. These rows are still readable (public read policy) but **cannot be edited by anyone** — there is no `auth.uid()` that matches them.

Options:
- **Discard demo data**: `TRUNCATE users CASCADE` and re-seed only after creating real auth users.
- **Adopt demo data**: create an auth user, then `UPDATE users SET id = '<auth-uid>' WHERE handle = 'demo'`. Cascades will follow.
- **Leave as read-only fixtures**: fine for screenshots; just know nobody can claim those handles via the app.

## 4. Set up Upstash Redis (for rate limiting)

The API enforces a 100 req / 15 min sliding window per IP. The store has to be shared across serverless instances, so we use Upstash.

**Fastest path (Vercel marketplace)**:

1. In your Vercel project → **Storage → Create → Marketplace → Upstash → Redis**.
2. Pick the **free tier** (10k commands/day, more than enough for early-stage traffic).
3. Vercel auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as env vars across all environments. Nothing else to do.

**Manual path (any other host)**:

1. Sign up at [upstash.com](https://upstash.com) and create a Redis database.
2. From the database's **REST API** tab, copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Add both to your host's env vars.

**Local dev**: leave these vars unset. Rate limiting silently no-ops — see `lib/rate-limit.ts`. If you want to test rate-limit behavior locally, point at a real Upstash dev DB.

## 5. Verify

```bash
npm run build
npm run dev
```

Open http://localhost:3000/create-card — middleware should redirect you to `/login`.

Sign in with your email. After clicking the magic link, you should land back on `/create-card` and be able to claim a handle.

Smoke test the policies:

```bash
# Should return 401 (no session)
curl -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"handle":"impostor"}'

# Should return 401 even with someone else's userId — body field is ignored
curl -X PUT http://localhost:3000/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<some-other-uuid>","theme_color":"midnight"}'
```

Rate limit smoke test (only meaningful with Upstash configured):

```bash
for i in $(seq 1 110); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/users \
    -H 'Content-Type: application/json' \
    -d '{"handle":"x"}'
done | sort | uniq -c
# Expect ~100 of one status (401 from auth) then 10 of 429 (rate-limited).
```

## 6. Production env vars

Set these in Vercel / your host:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=https://<prod-domain>

# Optional — when present, API rate limiting becomes real.
# When absent, rate limiter no-ops (only do this on internal preview deploys).
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## What's still TODO (tracked in ROADMAP)

- Google / GitHub OAuth providers (currently magic link only).
- Handle reservation cooldown / rename mechanic (N3 partial).
- Optional: emit rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) on successful responses too — currently only set on 429s.
