# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Bolão CEMEP** — an office score-prediction pool. People bet a match score from their phone; points and a money pot accumulate across a **season**; a winner is celebrated live. Next.js (App Router) + Supabase (Postgres + Realtime), deployed on Vercel. All UI copy is Brazilian Portuguese.

## Commands

```bash
npm run dev            # local dev (http://localhost:3000)
npm run build          # production build + type-check (run before committing)
npm test               # Vitest (pure-logic unit tests)
npx vitest run src/lib/scoring.test.ts        # a single test file
npx vitest run -t "winner only"               # a single test by name
```

There is no separate lint/test CI gate; `npm run build` is the type gate. Tests cover only the pure logic in `src/lib` (`scoring`, `pot`, `flags`).

## Infrastructure

- **Supabase project ref:** `yjckvfwnjwpwpwkuvldx`. Apply schema changes with the Supabase **MCP** (`apply_migration`) and also commit the SQL to `supabase/migrations/`. `execute_sql` for ad-hoc reads/writes.
- **Vercel:** project `cebet`, team `hugogontijomachados-projects`. **Push to `main` auto-deploys to production.** Public URL: **https://cebet.vercel.app** (this canonical domain is public; the team-prefixed `*.vercel.app` deployment URLs return 401 due to Deployment Protection — don't mistake that for a broken deploy).
- **Env** (`.env.local`, gitignored; also set on Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret, `sb_secret_…`), `ADMIN_PIN`, `ADMIN_COOKIE_SECRET`.

## Architecture (the big picture)

**Three Supabase clients, by trust level** (`src/lib/supabase/`):
- `client.ts` — browser anon client, used in client components for reads + Realtime subscriptions.
- `server-read.ts` — anon client for Server Components (public reads only).
- `admin.ts` — **service-role** client, `import "server-only"`, used **only** inside `'use server'` actions for mutations.

**Security model:** RLS allows **public SELECT only**. There are no anon write policies — **every mutation goes through a server action using the service-role client** (`src/app/actions/{bets,admin}.ts`). Admin actions call `requireAdmin()` (`src/lib/admin-auth.ts`), which checks an HMAC cookie derived from `ADMIN_PIN` + `ADMIN_COOKIE_SECRET`. Anyone with the PIN is admin; bettors have no login (just a name).

**Domain model** (`src/lib/types.ts`, schema in `supabase/migrations/`):
- One **season** with `status='active'` at a time (enforced by a partial unique index). Holds `bet_value`, `pix_name`/`pix_key` (configurable PIX), and `champion_participant_id`.
- **participants** — open roster; identity is case-insensitive name unique per season.
- **games** — lifecycle `open → closed → resolved`. Note column is `game_order` (`order` is reserved). `live_a`/`live_b` = preliminary score during play; `result_a`/`result_b` = final score at resolution; `had_exact_winner` boolean (co-winners are **derived** from `bets`, not stored as a FK).
- **bets** — one per (game, participant), upsert-editable while open; `paid` flag; `points` filled at resolution.

**Pure logic (TDD, no DB) — the heart of the rules:**
- `scoring.ts`: `computePoints(pred, result)` → 5 (exact) / 3 (winner+goal-diff) / 2 (winner or draw) / 1 (one team's goals) / 0. Highest level wins.
- `pot.ts`: `carriedBetCount` accumulates bet counts across games and **resets after any game with an exact winner**; `computePot = betValue × (carried + current)`. The same function computes the live pot, the prize won, and the champion's leftover pot.

**Reads** are centralized in `src/lib/queries.ts` (active season, current game, leaderboard aggregation, pot wiring, champion, per-game bets). Supabase join results need `as unknown as` casts (the inferred type treats to-one joins as arrays).

**Realtime is how the UI stays live.** Client components subscribe to `postgres_changes` and refetch/recompute:
- `PredictionsTable` — listens to `bets` (insert/edit/delete/paid) **and** `games` (live score + resolution); ranks rows by points against the live score (or final result once resolved).
- `LiveScore` — admin updates the preliminary score; everyone sees it live.
- `WinnerCelebration` — fires confetti + synthesized fanfare (`sound.ts`, Web Audio, no asset) when a game resolves with a winner. Gated **once per device** via `localStorage` key `bolao_party_${gameId}`.
- `SeasonCloseWatcher` — `router.refresh()` when the season closes, so everyone lands on the champion screen.

**`src/app/page.tsx` (home) is the state orchestrator.** It derives flags from the current game and renders accordingly: `bettingOpen` (PIX at top; otherwise PIX moves to bottom and hides once `allPaid`), `liveActive`/resolved (standings table + score column), `justWon` (`WonPot` shows winner + prize instead of the R$0 pot). Other routes: `/temporada` (leaderboard + clickable game history), `/jogo/[id]` (per-game detail + payment management for past games), `/admin` (PIN-gated controls), `/regras` (rules).

## Conventions & gotchas

- **Editing/deleting a bet or its score after a game is `resolved` does NOT recompute leaderboard points** — points are snapshotted at resolution. Treat post-resolution edits as payment/cleanup only.
- **Flags** are country-code emoji (`flags.ts`), no external image host (CSP-/offline-safe). UK subdivisions (Scotland/England/Wales) use `GB-XXX` codes rendered as tag-sequence emoji.
- **No staging DB** — local dev shares the production Supabase. To verify runtime behavior, seed throwaway data with a short Node script using the service-role key, fetch `http://localhost:3000`, assert, then delete. Never disturb the live active season: use a temporary `status='closed'` season, or create+assert+delete the game fast, and always restore anything you mutate (e.g. season `pix_*`).
- Use the Supabase **MCP** for schema/data work over the CLI (the `supabase` CLI is not installed here).

## Source-of-truth docs

- `DESIGN.md` — visual design system (Sentri-inspired violet/lime tokens, mapped into `tailwind.config.ts`). Reference token names; don't paraphrase.
- `docs/superpowers/specs/2026-06-19-bolao-cemep-design.md` — product spec.
- `docs/superpowers/plans/2026-06-19-bolao-cemep.md` — original implementation plan.
- `README.md` — setup & deploy steps.
