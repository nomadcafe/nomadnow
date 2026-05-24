# Nomad.now

A profile platform for digital nomads. Share where you've been, where you are, and what you're building — at `nomad.now/yourhandle`.

> **Status: pre-alpha.** Auth and proper access control are being built (see [ROADMAP.md](./ROADMAP.md#now-06-weeks-turn-the-demo-into-a-product)). Do not put real data in a hosted deployment until N1 + N2 land.

## What it does

**Nomad Card** (primary) — a minimal public profile showing your role, current city, hometown, countries visited, work status, and up to 3 links.

**Creator Profile** (depth, for indie creators) — adds monthly revenue history, project list, and milestones. Data is manually entered today; a verified-via-Stripe relaunch is planned (see [ROADMAP LATER](./ROADMAP.md#later-gated-on-pmf)).

A single user picks one mode at signup via `profile_type` (`creator` | `nomad` | `both`). Both render at `nomad.now/{handle}`.

## Tech

- Next.js 15 (App Router) + React 19 + TypeScript
- Supabase (Postgres + Auth)
- Tailwind CSS, Recharts
- `satori` + `@resvg/resvg-js` for OG / share images (wiring in progress, see ROADMAP N4)

## Setup

```bash
npm install
cp .env.example .env.local  # fill in Supabase credentials
```

Required env vars:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Database:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. *(Optional)* Run `supabase/seed.sql` for demo data.

Run:

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Project layout

```
app/         Next.js App Router (pages + API routes)
components/  React components
lib/         Supabase clients, validation, errors, utilities
supabase/    schema.sql, seed.sql
types/       Database type definitions
```

## API surface

Public reads:

- `GET /api/profile/[handle]`
- `GET /api/users/check-handle?handle=...`
- `GET /api/export?handle=...`

Writes (will require auth — see ROADMAP N1/N2):

- `POST | PUT /api/users`
- `POST | PUT | DELETE /api/projects`
- `POST | PUT | DELETE /api/revenues`
- `POST | PUT | DELETE /api/milestones`
- `POST /api/nomad-links`
- `PUT /api/settings`
- `POST /api/social/report`
- `POST /api/import/csv`

CSV import format: `month,project,mrr,oneoff,currency` — dates in `YYYY-MM-DD`, amounts in dollars.

## Where to look next

- [ROADMAP.md](./ROADMAP.md) — what we're building, what we're not, and why.
- [CHANGELOG.md](./CHANGELOG.md) — what shipped.
- `supabase/schema.sql` — data model.

## License

MIT.
