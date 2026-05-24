# Roadmap

> One source of truth for what we're building and why. If a feature isn't here, it isn't planned.

## Strategic bet

**Nomad Card is the wedge.** Creator Profile is a depth feature for users who graduate from the wedge, not a co-equal product line.

Why:
- Linktree-shaped product for nomads — broader top-of-funnel than "indie hacker MRR display"
- Sharing "where I've been" has wider social pull than sharing revenue
- Lower data-entry friction → higher activation
- Indie creators are a natural upgrade path once they trust the platform

Implication: every NOW/NEXT item is judged against "does this make Nomad Card better for travelers". Creator Profile work waits until we have a real user base.

---

## NOW (0–6 weeks): turn the demo into a product

Five things. Nothing else ships until these do.

### N1. Supabase Auth (magic link + Google OAuth)
- **Hypothesis**: without auth, every other feature is built on sand — handles can be squatted, profiles can be impersonated, data can't be trusted.
- **Scope**: `@supabase/ssr`, login page, middleware-level auth gate on `/create`, `/create-card`, `/settings`, all mutating API routes.
- **Success metric**: 0 anonymous writes possible against the API. New user → magic link → profile created → can edit only their own data.
- **Dependencies**: none. This is the foundation.

### N2. Real RLS policies + remove `supabaseAdmin` from write paths
- **Hypothesis**: even with auth, today's API trusts `userId` from the request body. Server-side enforcement must live in the DB.
- **Scope**: rewrite policies in `supabase/schema.sql` to use `auth.uid()`. Refactor 8 mutating routes to use a session-scoped client. Keep `supabaseAdmin` only for legitimate admin operations (none yet).
- **Success metric**: pen-test — sending another user's `userId` in any API body returns 403/404, not 200.
- **Dependencies**: N1.

### N3. Handle protection
- **Hypothesis**: free first-come handle claim → impersonation and squatting from day one of any traction.
- **Scope**:
  - One handle per auth user, locked at first claim (rename costs nothing today — make it cost a 30-day cooldown)
  - Reserved list (top ~500 names + brand terms + reserved words like `admin`, `api`, `settings`)
  - Add `claimed_at` column for future grace-period claims
- **Success metric**: top 500 reserved handles return 409 on `POST /api/users`. Claimed handle cannot be released within 30 days.
- **Dependencies**: N1.

### N4. Shareable Nomad Card image (OG image + downloadable PNG)
- **Hypothesis**: the product has no viral loop without a thing to share. `satori` + `@resvg/resvg-js` are already installed but not wired up.
- **Scope**: `GET /api/og/[handle]` returning rendered PNG using satori, set as OG image in profile metadata, add a "Download card" button on the profile page.
- **Success metric**: profile share to X/iMessage renders a branded card preview. > 30% of profile creators trigger the download button within 7 days of creation (instrumented in N5b).
- **Dependencies**: none (can run parallel to N1–N3).

### N5. Cleanup: docs + production rate limit
- **5a**: collapse 7 markdown files in repo root into `README.md` + `ROADMAP.md` + `CHANGELOG.md`. ✅ (this PR)
- **5b**: replace in-memory rate-limit with Upstash Redis or Vercel KV. Current implementation does nothing in serverless (each cold instance starts at 0).
- **Hypothesis**: a product judged by its docs is judged badly today; in-memory rate limit invites the first scraper to take the API down.
- **Success metric**: a single doc tells a new dev how to run the project. `POST /api/users` from 50 IPs in 1 minute → at least 49 get 429.
- **Dependencies**: none.

---

## NEXT (6–12 weeks): look for PMF signal

Build only if NOW is done **and** at least one of these triggered:
- 100+ profiles created without active promotion
- A share image gets posted to social >50 times in a week
- Users start emailing asking for feature X (where X is on this list)

### Global nomad map (`/map`)
- **Hypothesis**: this is the discovery surface Linktree can't replicate, and it's both the SEO play and the "come back next week" reason.
- **Scope**: opt-in current city pin, world map with clustering, click → profile.
- **Success metric**: `/map` is the second-most-visited page in week 2 after `/{handle}` pages, and triggers >2 profile clicks per session.

### "Who's in {city}" pages
- **Hypothesis**: the product currently has no retention story — once a card is filled in, there's no reason to return. Discovery brings users back.
- **Scope**: dynamic pages `/in/{city}` listing opt-in nomads currently in that city. Indexable.
- **Success metric**: 20% of weekly active users visit a `/in/*` page; 5% of new signups come from organic search to `/in/*`.

### Passive city update via integration
- **Hypothesis**: a profile that updates itself is a profile that drives habit. Manual-only profiles go stale within 30 days.
- **Scope**: pick one — Strava location, Wise transaction country, GPS check-in via PWA. Whichever integrates fastest.
- **Success metric**: > 25% of weekly active users connect at least one source. Median profile staleness < 14 days for connected users.

### Moderation + abuse handling
- **Hypothesis**: any UGC product hits its first moderation incident within 4 weeks of real traffic.
- **Scope**: `report` button, soft-delete + admin queue, basic admin page behind auth + role check.
- **Success metric**: SLA on flagged content < 24h. No reactive incidents handled by SQL console.

### Embed widget
- **Hypothesis**: nomads will embed cards in personal sites and Notion if it takes 30 seconds. Each embed is an off-platform impression.
- **Scope**: `/embed/{handle}` iframe-friendly version, copy-paste snippet on profile page.
- **Success metric**: >100 embed views from non-`nomad.now` referrers per week.

---

## LATER (gated on PMF)

Don't start unless we have ≥500 weekly active users, retention > 25% in week 4, and clear signal on the relevant axis.

- **Creator Profile relaunch + Stripe integration** — gate: user requests for revenue display. Stripe-verified data only, no manual entry. Manual CSV import sunset.
- **PRO subscription** — custom themes, custom domain, embed without branding, advanced visualization. Gate: ≥10% of weekly actives complete an upgrade page view.
- **City scoring (cost / wifi / safety)** — use Nomad List API or community submissions. Gate: ≥20% of profiles list 5+ visited countries.
- **Affiliate tool recommendations** — gate: weekly site visits > 50k.

---

## Killed from previous roadmap

These were in `README.md`; explicit kill rationale so they don't crawl back:

| Item | Why killed |
|---|---|
| Team collaboration / multi-person projects | No team users. Speculative. |
| Recommendation algorithm for similar creators | Needs scale we don't have; not a wedge. |
| Personal website hosting / resume features | Scope creep into different product. |
| Real-time notifications, new follower alerts | No social graph yet. Premature. |
| Product Hunt / GitHub auto-import | Over-integration before user demand exists. |
| "Nomad Network" social network vision | Belongs in vision doc, not roadmap. Goal not feature. |
| Tag system (Remote Designer, Visa Runner, etc.) | Vanity feature with no usage hypothesis. Revisit after NEXT if users ask. |
| Email notifications, in-app notifications | No event worth notifying about yet. |

---

## Process notes

- **One in-progress milestone at a time.** No starting NEXT until NOW closes.
- **Every new roadmap entry must have**: hypothesis, success metric, dependency. If a request can't articulate these three, it's a wish, not a plan.
- **Updates go in `CHANGELOG.md`**, not by editing the success metric retroactively.
