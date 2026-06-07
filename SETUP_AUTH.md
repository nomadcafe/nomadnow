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

## 1b. Configure Resend as the SMTP sender (required for production)

Supabase's built-in email service is **test-only**: a shared ~2–4 emails/hour
global cap, sent from a shared domain that lands in spam. Login here is a magic
link (`signInWithOtp` in `app/login/page.tsx`), so if that email doesn't arrive,
nobody can sign in. Before any real traffic, point Supabase at a real SMTP
provider. We use [Resend](https://resend.com).

The app code does **not** send email itself — Supabase Auth does. Resend just
becomes the transport, so there are no code changes; this is pure config.

1. **Verify a sending domain in Resend**: Resend dashboard → **Domains → Add
   Domain** (e.g. `mail.<your-prod-domain>` or the apex). Add the SPF and DKIM
   DNS records it prints to your DNS provider and wait for them to verify. You
   cannot send from a domain you haven't verified.
2. **Create an API key**: Resend → **API Keys → Create**, with **Sending
   access**. Copy it.
3. **Enable custom SMTP in Supabase**: **Authentication → Emails → SMTP
   Settings → Enable Custom SMTP**, then fill:
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: the Resend API key from step 2
   - **Sender email**: an address on the domain you verified in step 1
     (e.g. `auth@mail.<your-prod-domain>`)
   - **Sender name**: e.g. `NomadNow`
4. **Save.** Magic-link and other auth emails now flow through Resend. Verify by
   triggering a login and confirming the email arrives (check Resend's **Logs**
   tab for delivery status).

Once custom SMTP is on, Supabase's internal rate limit no longer applies; tune
the per-hour cap under **Authentication → Rate Limits** if needed.

### Email template

Login uses `signInWithOtp`, which renders **two** Supabase templates depending
on the recipient: **Confirm signup** for a brand-new email, **Magic Link** for
an existing user. Paste the same copy into both (**Authentication → Emails →
Templates**) so new and returning users get an identical email. Supabase
templates are raw HTML with no per-user locale switching, so this is one neutral
English version matched to the site's tone.

**Subject**

```
Your Nomad.now sign-in link
```

**Body**

```html
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111827;">
  <tr><td style="padding: 8px 0 24px;">
    <span style="font-size: 18px; font-weight: 600;">Nomad.now</span>
  </td></tr>
  <tr><td>
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">Sign in.</h1>
    <p style="font-size: 15px; line-height: 1.5; color: #374151; margin: 0 0 24px;">
      Click the button below to sign in. The link works once and expires shortly.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; padding: 12px 28px; border-radius: 9999px;">
      Sign in
    </a>
    <p style="font-size: 13px; line-height: 1.5; color: #6b7280; margin: 24px 0 0;">
      If the button doesn't work, paste this link into your browser:<br />
      <a href="{{ .ConfirmationURL }}" style="color: #6b7280; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #9ca3af; margin: 24px 0 0;">
      Didn't request this? You can safely ignore this email.
    </p>
  </td></tr>
</table>
```

## 2. Apply the schema and migrations

In **SQL Editor**:

1. Paste and run `supabase/schema.sql` — creates all tables and the canonical RLS policies (`auth.uid()`-based writes, public reads).
2. Run any files in `supabase/migrations/` in numeric order. These add columns introduced after the initial schema.

RLS is included in `schema.sql`; no separate auth-policies migration is required.

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

# Optional — comma-separated Supabase auth user IDs allowed into /admin (the
# moderation console for suspending abusive cards). Empty/unset = nobody can
# moderate via the UI. Find your id: Supabase dashboard → Authentication →
# Users, or `select auth.uid()` while signed in.
ADMIN_USER_IDS=
```

## 7. Moderation (card takedown)

Abuse reports (anonymous, rate-limited) land in the `reports` table and ping the
operator via `notifyAbuseReport`. To review and act on them:

1. Put your Supabase auth user id in `ADMIN_USER_IDS` (above) and redeploy.
2. Visit `/admin` while signed in — it lists recent reports with one-click
   **Suspend / Unsuspend** per card.

Suspending flips `users.suspended` and **immediately** invalidates the profile
cache, so the card (and its links, OG image, and directory listing) stops
rendering within the request — no waiting out the ≤60s cache TTL. Non-admins
get a 404 on both `/admin` and `POST /api/admin/suspend`.

## What's still TODO (tracked in ROADMAP)

- Google / GitHub OAuth providers (currently magic link only).
- Handle reservation cooldown / rename mechanic (N3 partial).
- Optional: emit rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) on successful responses too — currently only set on 429s.
