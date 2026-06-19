# Bolão CEMEP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an office score-prediction pool ("bolão") web app where anyone bets a match score from their phone, points and a money pot accumulate across a season, and a winner is celebrated live.

**Architecture:** Next.js (App Router) on Vercel + Supabase (Postgres + Realtime). All writes go through server actions using the Supabase service-role key (server-only). The browser uses the anon key for public reads and Realtime subscriptions. Pure business logic (scoring, pot accumulation) lives in dependency-free modules unit-tested with Vitest.

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript (strict), Tailwind CSS v3.4, `@supabase/supabase-js` + `@supabase/ssr`, `canvas-confetti`, Vitest.

## Global Constraints

- Next.js App Router with TypeScript `strict: true`. All UI copy in **Brazilian Portuguese**.
- Exactly **one** season with `status = 'active'` at a time.
- Default bet value: **5.00** (`bet_value`, editable per season).
- Points (highest applicable level only): exact placar = **5**, winner + goal-difference = **3**, winner/draw only = **2**, one team's goals right = **1**, none = **0**.
- The Supabase **service-role key is server-only** — never in a `NEXT_PUBLIC_*` var, never imported into a client component. All mutations happen in `'use server'` actions.
- **Country flags only** in v1, rendered as emoji from ISO codes — **no external CDN / image host** (CSP-safe, offline-safe).
- Other people's predictions stay **hidden until the game is `resolved`** (only bettor names show live).
- Design follows `DESIGN.md` tokens (violet-midnight canvas, electric lime, hot pink). Dark canvas for the "arena" (home), light canvas for dense surfaces (leaderboard, admin).
- Money is **calculated and displayed only** — no real payment processing.

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, postcss.config.mjs,
  tailwind.config.ts, vitest.config.ts, .env.local.example, .gitignore
supabase/migrations/0001_init.sql        -- schema, RLS, realtime publication
src/lib/types.ts                          -- shared row/types
src/lib/scoring.ts (+ scoring.test.ts)    -- pure: computePoints, isExact, outcome
src/lib/pot.ts (+ pot.test.ts)            -- pure: carriedBetCount, computePot
src/lib/flags.ts (+ flags.test.ts)        -- pure: flagEmoji, COUNTRIES
src/lib/money.ts                          -- pure: formatBRL
src/lib/supabase/client.ts                -- browser anon client (realtime/reads)
src/lib/supabase/server-read.ts           -- server anon client (RSC reads)
src/lib/supabase/admin.ts                 -- server service-role client (mutations)
src/lib/admin-auth.ts                     -- PIN cookie set/verify
src/lib/queries.ts                        -- read helpers + pot wiring
src/app/actions/bets.ts                   -- placeBet server action
src/app/actions/admin.ts                  -- admin server actions
src/app/globals.css
src/app/layout.tsx                        -- fonts + shell
src/app/page.tsx                          -- current game (arena)
src/app/temporada/page.tsx                -- leaderboard
src/app/admin/page.tsx                    -- admin panel (PIN-gated)
src/components/Flag.tsx                    -- emoji flag span
src/components/FlagPicker.tsx              -- country <select>
src/components/MatchCard.tsx               -- teams + flags + score
src/components/PotDisplay.tsx              -- accumulated pot
src/components/BetForm.tsx                 -- name pick + score (client)
src/components/LiveBettors.tsx             -- live names (client, realtime)
src/components/WinnerCelebration.tsx       -- confetti overlay (client, realtime)
src/components/Leaderboard.tsx             -- ranking table
src/components/admin/*                     -- admin sub-forms (client)
```

---

## Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.local.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: a runnable Next.js app and a working `npm test` (Vitest).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "bolao-cemep",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.45.0",
    "canvas-confetti": "^1.9.3",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.6.4",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create config files**

`next.config.ts`:
```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

`postcss.config.mjs`:
```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

`.gitignore`:
```
node_modules
.next
.env.local
*.tsbuildinfo
next-env.d.ts
```

`.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PIN=1234
ADMIN_COOKIE_SECRET=change-me-to-a-long-random-string
```

- [ ] **Step 4: Create minimal app shell**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`:
```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bolão CEMEP",
  description: "Bolão de placares da empresa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return <main>Bolão CEMEP</main>;
}
```

- [ ] **Step 5: Install and verify**

Run: `npm install && npm run build && npm test`
Expected: build succeeds; Vitest reports "No test files found" (exit 0 is fine at this stage) or passes. `npm run dev` serves at http://localhost:3000.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

## Task 2: Design tokens (Tailwind theme + fonts)

**Files:**
- Create: `tailwind.config.ts`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

**Interfaces:**
- Produces: Tailwind utilities `bg-canvas`, `bg-night`, `bg-paper`, `text-ink`, `text-lime`, `bg-lime`, `text-pink`, color `primary`, plus CSS vars `--font-display`, `--font-ui` available app-wide.

- [ ] **Step 1: Create `tailwind.config.ts`** (tokens copied from `DESIGN.md`)

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#150f23",
        "ink-deep": "#1f1633",
        ink: "#1f1633",
        canvas: "#1f1633",       // surface-canvas-dark
        night: "#150f23",        // surface-night
        paper: "#ffffff",        // surface-canvas-light
        lime: "#c2ef4e",
        pink: "#fa7faa",
        "violet-link": "#6a5fc1",
        "violet-deep": "#422082",
        "violet-mid": "#79628c",
        "hairline-violet": "#362d59",
        "hairline-cool": "#cfcfdb",
        "hairline-cloud": "#e5e7eb",
      },
      borderRadius: {
        xs: "4px", sm: "6px", md: "8px", lg: "10px",
        xl: "12px", xxl: "18px",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Wire Google fonts in `layout.tsx`** (Rubik for UI, Space Grotesk as the display substitute named in `DESIGN.md`)

Replace the body of `src/app/layout.tsx`:
```tsx
import "./globals.css";
import type { Metadata } from "next";
import { Rubik, Space_Grotesk } from "next/font/google";

const ui = Rubik({ subsets: ["latin"], variable: "--font-ui" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Bolão CEMEP",
  description: "Bolão de placares da empresa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${ui.variable} ${display.variable}`}>
      <body className="font-ui bg-canvas text-white antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: design tokens and fonts from DESIGN.md"
```

---

## Task 3: Scoring logic (TDD)

**Files:**
- Create: `src/lib/scoring.ts`, `src/lib/scoring.test.ts`

**Interfaces:**
- Produces:
  - `interface Score { a: number; b: number }`
  - `const POINTS = { exact: 5, winnerAndDiff: 3, winnerOnly: 2, oneTeam: 1, none: 0 }`
  - `outcome(s: Score): "A" | "B" | "DRAW"`
  - `isExact(pred: Score, result: Score): boolean`
  - `computePoints(pred: Score, result: Score): number`

- [ ] **Step 1: Write the failing test** — `src/lib/scoring.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { computePoints, isExact, outcome, POINTS } from "./scoring";

describe("outcome", () => {
  it("classifies wins and draws", () => {
    expect(outcome({ a: 2, b: 1 })).toBe("A");
    expect(outcome({ a: 0, b: 3 })).toBe("B");
    expect(outcome({ a: 1, b: 1 })).toBe("DRAW");
  });
});

describe("computePoints", () => {
  const result = { a: 2, b: 1 };
  it("exact placar -> 5", () => {
    expect(computePoints({ a: 2, b: 1 }, result)).toBe(POINTS.exact);
  });
  it("winner + same goal difference (not exact) -> 3", () => {
    expect(computePoints({ a: 3, b: 2 }, result)).toBe(POINTS.winnerAndDiff);
  });
  it("winner only -> 2", () => {
    expect(computePoints({ a: 4, b: 0 }, result)).toBe(POINTS.winnerOnly);
  });
  it("one team's goals right, wrong outcome -> 1", () => {
    // predicts B wins 0x1? result A wins; b matches (1) -> 1
    expect(computePoints({ a: 0, b: 1 }, result)).toBe(POINTS.oneTeam);
  });
  it("nothing right -> 0", () => {
    expect(computePoints({ a: 0, b: 5 }, result)).toBe(POINTS.none);
  });
  it("draw predicted for a draw, wrong score -> 3 (same outcome + diff 0)", () => {
    expect(computePoints({ a: 3, b: 3 }, { a: 1, b: 1 })).toBe(POINTS.winnerAndDiff);
  });
  it("isExact only true for identical score", () => {
    expect(isExact({ a: 2, b: 1 }, result)).toBe(true);
    expect(isExact({ a: 1, b: 2 }, result)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/scoring.test.ts`
Expected: FAIL — cannot find module `./scoring`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/scoring.ts`

```typescript
export interface Score {
  a: number;
  b: number;
}

export const POINTS = {
  exact: 5,
  winnerAndDiff: 3,
  winnerOnly: 2,
  oneTeam: 1,
  none: 0,
} as const;

export function outcome(s: Score): "A" | "B" | "DRAW" {
  if (s.a > s.b) return "A";
  if (s.a < s.b) return "B";
  return "DRAW";
}

export function isExact(pred: Score, result: Score): boolean {
  return pred.a === result.a && pred.b === result.b;
}

export function computePoints(pred: Score, result: Score): number {
  if (isExact(pred, result)) return POINTS.exact;
  const sameOutcome = outcome(pred) === outcome(result);
  const sameDiff = pred.a - pred.b === result.a - result.b;
  if (sameOutcome && sameDiff) return POINTS.winnerAndDiff;
  if (sameOutcome) return POINTS.winnerOnly;
  if (pred.a === result.a || pred.b === result.b) return POINTS.oneTeam;
  return POINTS.none;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/scoring.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat: score points calculation (TDD)"
```

---

## Task 4: Pot accumulation logic (TDD)

**Files:**
- Create: `src/lib/pot.ts`, `src/lib/pot.test.ts`

**Interfaces:**
- Produces:
  - `interface GameBetSummary { betCount: number; hadExactWinner: boolean }`
  - `carriedBetCount(resolved: GameBetSummary[]): number` — bets carried since last exact winner
  - `computePot(betValue: number, carried: number, currentBetCount: number): number`

- [ ] **Step 1: Write the failing test** — `src/lib/pot.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { carriedBetCount, computePot } from "./pot";

describe("carriedBetCount", () => {
  it("is 0 with no games", () => {
    expect(carriedBetCount([])).toBe(0);
  });
  it("accumulates bets across games with no exact winner", () => {
    expect(carriedBetCount([
      { betCount: 10, hadExactWinner: false },
      { betCount: 12, hadExactWinner: false },
    ])).toBe(22);
  });
  it("resets after a game with an exact winner", () => {
    expect(carriedBetCount([
      { betCount: 10, hadExactWinner: false },
      { betCount: 12, hadExactWinner: true },  // winner took 22 bets-worth
      { betCount: 8, hadExactWinner: false },
    ])).toBe(8);
  });
});

describe("computePot", () => {
  it("pot = betValue * (carried + current)", () => {
    expect(computePot(5, 22, 8)).toBe(150);
  });
  it("pot with nothing carried", () => {
    expect(computePot(5, 0, 10)).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pot.test.ts`
Expected: FAIL — cannot find module `./pot`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/pot.ts`

```typescript
export interface GameBetSummary {
  betCount: number;
  hadExactWinner: boolean;
}

/** Bets carried into the next game (reset to 0 whenever a game had an exact winner). */
export function carriedBetCount(resolved: GameBetSummary[]): number {
  let running = 0;
  for (const g of resolved) {
    running += g.betCount;
    if (g.hadExactWinner) running = 0;
  }
  return running;
}

/** Money pot at stake right now. */
export function computePot(betValue: number, carried: number, currentBetCount: number): number {
  return betValue * (carried + currentBetCount);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pot.ts src/lib/pot.test.ts
git commit -m "feat: pot accumulation logic (TDD)"
```

---

## Task 5: Flags + money formatting (TDD)

**Files:**
- Create: `src/lib/flags.ts`, `src/lib/flags.test.ts`, `src/lib/money.ts`

**Interfaces:**
- Produces:
  - `flagEmoji(code: string): string` — ISO-3166 alpha-2 → regional-indicator emoji
  - `COUNTRIES: { code: string; name: string }[]` — curated list, PT-BR names
  - `formatBRL(value: number): string` — e.g. `"R$ 150,00"`

- [ ] **Step 1: Write the failing test** — `src/lib/flags.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { flagEmoji, COUNTRIES } from "./flags";

describe("flagEmoji", () => {
  it("converts BR to the Brazil flag", () => {
    expect(flagEmoji("BR")).toBe("🇧🇷");
  });
  it("is case-insensitive", () => {
    expect(flagEmoji("ar")).toBe("🇦🇷");
  });
});

describe("COUNTRIES", () => {
  it("has unique 2-letter codes and includes Brazil", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("BR");
    expect(codes.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/flags.test.ts`
Expected: FAIL — cannot find module `./flags`.

- [ ] **Step 3: Write implementation** — `src/lib/flags.ts`

```typescript
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Curated team list (national teams). Extend freely. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "BR", name: "Brasil" },
  { code: "AR", name: "Argentina" },
  { code: "UY", name: "Uruguai" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colômbia" },
  { code: "PE", name: "Peru" },
  { code: "PY", name: "Paraguai" },
  { code: "EC", name: "Equador" },
  { code: "BO", name: "Bolívia" },
  { code: "VE", name: "Venezuela" },
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Espanha" },
  { code: "FR", name: "França" },
  { code: "DE", name: "Alemanha" },
  { code: "IT", name: "Itália" },
  { code: "GB", name: "Inglaterra" },
  { code: "NL", name: "Holanda" },
  { code: "BE", name: "Bélgica" },
  { code: "HR", name: "Croácia" },
  { code: "RS", name: "Sérvia" },
  { code: "CH", name: "Suíça" },
  { code: "PL", name: "Polônia" },
  { code: "US", name: "Estados Unidos" },
  { code: "MX", name: "México" },
  { code: "CA", name: "Canadá" },
  { code: "JP", name: "Japão" },
  { code: "KR", name: "Coreia do Sul" },
  { code: "AU", name: "Austrália" },
  { code: "MA", name: "Marrocos" },
  { code: "SN", name: "Senegal" },
  { code: "GH", name: "Gana" },
  { code: "CM", name: "Camarões" },
  { code: "NG", name: "Nigéria" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/flags.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `src/lib/money.ts`** (no separate test; trivial, exercised by UI)

```typescript
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/flags.ts src/lib/flags.test.ts src/lib/money.ts
git commit -m "feat: country flags and BRL formatting"
```

---

## Task 6: Database schema, RLS, and shared types

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/types.ts`

**Interfaces:**
- Produces: `Season`, `Participant`, `Game`, `GameStatus`, `Bet` TS types matching the tables. SQL note: `order` is reserved → column is **`game_order`**; co-winners are derived from `bets`, so games store a boolean **`had_exact_winner`** (no single winner FK).

- [ ] **Step 1: Write the migration** — `supabase/migrations/0001_init.sql`

```sql
-- Bolão CEMEP schema
create extension if not exists "pgcrypto";

create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bet_value numeric(10,2) not null default 5.00,
  status text not null default 'active' check (status in ('active','closed')),
  champion_participant_id uuid,
  created_at timestamptz not null default now()
);

-- At most one active season at a time.
create unique index one_active_season on seasons (status) where status = 'active';

create table participants (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Same person identified case-insensitively within a season.
create unique index uniq_participant_name on participants (season_id, lower(btrim(name)));

create table games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  game_order int not null,
  team_a_name text not null,
  team_a_flag text not null,
  team_b_name text not null,
  team_b_flag text not null,
  status text not null default 'open' check (status in ('open','closed','resolved')),
  result_a int,
  result_b int,
  had_exact_winner boolean not null default false,
  pot_amount numeric(10,2),
  created_at timestamptz not null default now()
);

create index games_season_order on games (season_id, game_order);

create table bets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  pred_a int not null check (pred_a >= 0),
  pred_b int not null check (pred_b >= 0),
  points int,
  created_at timestamptz not null default now(),
  unique (game_id, participant_id)
);

-- Row Level Security: public can READ everything; all writes go through
-- server actions using the service-role key (which bypasses RLS).
alter table seasons      enable row level security;
alter table participants enable row level security;
alter table games        enable row level security;
alter table bets         enable row level security;

create policy "public read seasons"      on seasons      for select using (true);
create policy "public read participants" on participants for select using (true);
create policy "public read games"        on games        for select using (true);
create policy "public read bets"         on bets         for select using (true);

-- Realtime: broadcast row changes to subscribed clients.
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table bets;
alter publication supabase_realtime add table seasons;
```

- [ ] **Step 2: Create shared types** — `src/lib/types.ts`

```typescript
export type Uuid = string;
export type GameStatus = "open" | "closed" | "resolved";

export interface Season {
  id: Uuid;
  name: string;
  bet_value: number;
  status: "active" | "closed";
  champion_participant_id: Uuid | null;
  created_at: string;
}

export interface Participant {
  id: Uuid;
  season_id: Uuid;
  name: string;
  created_at: string;
}

export interface Game {
  id: Uuid;
  season_id: Uuid;
  game_order: number;
  team_a_name: string;
  team_a_flag: string;
  team_b_name: string;
  team_b_flag: string;
  status: GameStatus;
  result_a: number | null;
  result_b: number | null;
  had_exact_winner: boolean;
  pot_amount: number | null;
  created_at: string;
}

export interface Bet {
  id: Uuid;
  game_id: Uuid;
  participant_id: Uuid;
  pred_a: number;
  pred_b: number;
  points: number | null;
  created_at: string;
}
```

- [ ] **Step 3: Apply the migration to your Supabase project**

Apply `supabase/migrations/0001_init.sql` via the Supabase Dashboard → SQL Editor (paste & run), or `supabase db push` if using the CLI. Verify the 4 tables and the `one_active_season` index exist under Database → Tables.

- [ ] **Step 4: Verify types compile**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_init.sql src/lib/types.ts
git commit -m "feat: database schema, RLS, and shared types"
```

---

## Task 7: Supabase clients (browser, server-read, admin)

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server-read.ts`, `src/lib/supabase/admin.ts`

**Interfaces:**
- Produces:
  - `createBrowserSupabase()` → anon client for client components (reads + Realtime).
  - `createServerRead()` → anon client for Server Components (public reads).
  - `createAdmin()` → **server-only** service-role client for mutations.

- [ ] **Step 1: Browser client** — `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Server read client** — `src/lib/supabase/server-read.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

/** Anon client for Server Components: public reads only (RLS allows select). */
export function createServerRead() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
```

- [ ] **Step 3: Admin client** — `src/lib/supabase/admin.ts`

```typescript
import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client — server only. Bypasses RLS. Never import in a client component. */
export function createAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
```

- [ ] **Step 4: Add the `server-only` dependency**

Run: `npm install server-only`
Expected: package added; importing `admin.ts` from a client component will now fail the build (the guard we want).

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: supabase browser, server-read, and admin clients"
```

---

## Task 8: Read queries + pot wiring

**Files:**
- Create: `src/lib/queries.ts`

**Interfaces:**
- Consumes: `createServerRead` (Task 7); `carriedBetCount`, `computePot` (Task 4); types (Task 6).
- Produces:
  - `getActiveSeason(): Promise<Season | null>`
  - `getCurrentGame(seasonId: Uuid): Promise<Game | null>` (highest `game_order`)
  - `getParticipants(seasonId: Uuid): Promise<Participant[]>`
  - `getBettorNames(gameId: Uuid): Promise<string[]>` (names only — predictions stay hidden)
  - `getBetsForGame(gameId: Uuid): Promise<Bet[]>` (used post-resolution)
  - `getResolvedSummaries(seasonId: Uuid): Promise<GameBetSummary[]>` (ordered)
  - `getCurrentPot(season: Season, currentGame: Game | null): Promise<number>`
  - `LeaderRow { participant: Participant; points: number; exactWins: number }`
  - `getLeaderboard(seasonId: Uuid): Promise<LeaderRow[]>` (desc by points)
  - `getResolvedGamesWithWinners(seasonId): Promise<{ game: Game; winners: string[] }[]>`

- [ ] **Step 1: Write `src/lib/queries.ts`**

```typescript
import { createServerRead } from "./supabase/server-read";
import { carriedBetCount, computePot, type GameBetSummary } from "./pot";
import { isExact } from "./scoring";
import type { Season, Game, Participant, Bet, Uuid } from "./types";

export async function getActiveSeason(): Promise<Season | null> {
  const sb = createServerRead();
  const { data } = await sb.from("seasons").select("*").eq("status", "active").maybeSingle();
  return (data as Season) ?? null;
}

export async function getCurrentGame(seasonId: Uuid): Promise<Game | null> {
  const sb = createServerRead();
  const { data } = await sb
    .from("games").select("*").eq("season_id", seasonId)
    .order("game_order", { ascending: false }).limit(1).maybeSingle();
  return (data as Game) ?? null;
}

export async function getParticipants(seasonId: Uuid): Promise<Participant[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("participants").select("*").eq("season_id", seasonId).order("name");
  return (data as Participant[]) ?? [];
}

export async function getBettorNames(gameId: Uuid): Promise<string[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("bets").select("participant_id, participants(name)").eq("game_id", gameId);
  type Row = { participants: { name: string } | null };
  return ((data as Row[]) ?? []).map((r) => r.participants?.name ?? "").filter(Boolean);
}

export async function getBetsForGame(gameId: Uuid): Promise<Bet[]> {
  const sb = createServerRead();
  const { data } = await sb.from("bets").select("*").eq("game_id", gameId);
  return (data as Bet[]) ?? [];
}

export async function getResolvedSummaries(seasonId: Uuid): Promise<GameBetSummary[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("games")
    .select("had_exact_winner, bets(count)")
    .eq("season_id", seasonId).eq("status", "resolved")
    .order("game_order", { ascending: true });
  type Row = { had_exact_winner: boolean; bets: { count: number }[] };
  return ((data as Row[]) ?? []).map((g) => ({
    betCount: g.bets?.[0]?.count ?? 0,
    hadExactWinner: g.had_exact_winner,
  }));
}

export async function getCurrentPot(season: Season, currentGame: Game | null): Promise<number> {
  const summaries = await getResolvedSummaries(season.id);
  // If the latest game is still resolved, it is already counted in summaries;
  // an open/closed current game contributes its live bet count.
  let currentBetCount = 0;
  if (currentGame && currentGame.status !== "resolved") {
    const sb = createServerRead();
    const { count } = await sb
      .from("bets").select("*", { count: "exact", head: true })
      .eq("game_id", currentGame.id);
    currentBetCount = count ?? 0;
  }
  return computePot(Number(season.bet_value), carriedBetCount(summaries), currentBetCount);
}

export interface LeaderRow {
  participant: Participant;
  points: number;
  exactWins: number;
}

export async function getLeaderboard(seasonId: Uuid): Promise<LeaderRow[]> {
  const sb = createServerRead();
  const participants = await getParticipants(seasonId);
  const { data } = await sb
    .from("bets")
    .select("participant_id, pred_a, pred_b, points, games!inner(season_id, status, result_a, result_b)")
    .eq("games.season_id", seasonId).eq("games.status", "resolved");
  type Row = {
    participant_id: Uuid; pred_a: number; pred_b: number; points: number | null;
    games: { result_a: number | null; result_b: number | null };
  };
  const rows = (data as Row[]) ?? [];
  const byId = new Map<Uuid, LeaderRow>();
  for (const p of participants) byId.set(p.id, { participant: p, points: 0, exactWins: 0 });
  for (const r of rows) {
    const entry = byId.get(r.participant_id);
    if (!entry) continue;
    entry.points += r.points ?? 0;
    if (r.games.result_a != null && r.games.result_b != null &&
        isExact({ a: r.pred_a, b: r.pred_b }, { a: r.games.result_a, b: r.games.result_b })) {
      entry.exactWins += 1;
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.points - a.points || a.participant.name.localeCompare(b.participant.name),
  );
}

export async function getResolvedGamesWithWinners(
  seasonId: Uuid,
): Promise<{ game: Game; winners: string[] }[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("games").select("*").eq("season_id", seasonId).eq("status", "resolved")
    .order("game_order", { ascending: false });
  const games = (data as Game[]) ?? [];
  const out: { game: Game; winners: string[] }[] = [];
  for (const g of games) {
    let winners: string[] = [];
    if (g.had_exact_winner && g.result_a != null && g.result_b != null) {
      const { data: bd } = await sb
        .from("bets").select("pred_a, pred_b, participants(name)").eq("game_id", g.id);
      type BRow = { pred_a: number; pred_b: number; participants: { name: string } | null };
      winners = ((bd as BRow[]) ?? [])
        .filter((b) => b.pred_a === g.result_a && b.pred_b === g.result_b)
        .map((b) => b.participants?.name ?? "").filter(Boolean);
    }
    out.push({ game: g, winners });
  }
  return out;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds (functions unused so far — that's fine).

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: read queries and pot wiring"
```

---

## Task 9: Admin authentication (PIN cookie)

**Files:**
- Create: `src/lib/admin-auth.ts`

**Interfaces:**
- Consumes: env `ADMIN_PIN`, `ADMIN_COOKIE_SECRET`.
- Produces:
  - `adminToken(): string` — deterministic hash of PIN+secret
  - `verifyPinAndSetCookie(pin: string): Promise<boolean>` — sets `bolao_admin` httpOnly cookie on success
  - `isAdmin(): Promise<boolean>` — reads cookie, compares to token
  - `requireAdmin(): Promise<void>` — throws `"NAO_AUTORIZADO"` if not admin

- [ ] **Step 1: Write `src/lib/admin-auth.ts`**

```typescript
import "server-only";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

const COOKIE = "bolao_admin";

export function adminToken(): string {
  return createHmac("sha256", process.env.ADMIN_COOKIE_SECRET!)
    .update(process.env.ADMIN_PIN!)
    .digest("hex");
}

export async function verifyPinAndSetCookie(pin: string): Promise<boolean> {
  if (pin !== process.env.ADMIN_PIN) return false;
  const store = await cookies();
  store.set(COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE)?.value === adminToken();
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("NAO_AUTORIZADO");
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin-auth.ts
git commit -m "feat: PIN-based admin auth via signed cookie"
```

---

## Task 10: Bet server action

**Files:**
- Create: `src/app/actions/bets.ts`

**Interfaces:**
- Consumes: `createAdmin` (Task 7).
- Produces: `placeBet(input)` where
  `input = { seasonId: Uuid; gameId: Uuid; participantId?: Uuid; newName?: string; predA: number; predB: number }`
  returns `{ ok: true } | { ok: false; error: string }`.

- [ ] **Step 1: Write `src/app/actions/bets.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createAdmin } from "@/lib/supabase/admin";
import type { Uuid } from "@/lib/types";

interface PlaceBetInput {
  seasonId: Uuid;
  gameId: Uuid;
  participantId?: Uuid;
  newName?: string;
  predA: number;
  predB: number;
}

type Result = { ok: true } | { ok: false; error: string };

export async function placeBet(input: PlaceBetInput): Promise<Result> {
  const { seasonId, gameId, participantId, newName, predA, predB } = input;

  if (!Number.isInteger(predA) || !Number.isInteger(predB) || predA < 0 || predB < 0) {
    return { ok: false, error: "Placar inválido." };
  }

  const sb = createAdmin();

  // Game must be open.
  const { data: game } = await sb.from("games").select("status").eq("id", gameId).maybeSingle();
  if (!game) return { ok: false, error: "Jogo não encontrado." };
  if (game.status !== "open") return { ok: false, error: "Os palpites deste jogo já foram encerrados." };

  // Resolve participant: existing id, or get-or-create by name.
  let pid = participantId ?? null;
  if (!pid) {
    const name = (newName ?? "").trim();
    if (!name) return { ok: false, error: "Informe seu nome." };
    const { data: existing } = await sb
      .from("participants").select("id").eq("season_id", seasonId)
      .ilike("name", name).maybeSingle();
    if (existing) {
      pid = existing.id as Uuid;
    } else {
      const { data: created, error } = await sb
        .from("participants").insert({ season_id: seasonId, name }).select("id").single();
      if (error || !created) return { ok: false, error: "Não foi possível cadastrar o nome." };
      pid = created.id as Uuid;
    }
  }

  const { error } = await sb
    .from("bets")
    .upsert(
      { game_id: gameId, participant_id: pid, pred_a: predA, pred_b: predB, points: null },
      { onConflict: "game_id,participant_id" },
    );
  if (error) return { ok: false, error: "Não foi possível salvar o palpite." };

  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/bets.ts
git commit -m "feat: placeBet server action with get-or-create participant"
```

---

## Task 11: Admin server actions

**Files:**
- Create: `src/app/actions/admin.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `verifyPinAndSetCookie` (Task 9); `createAdmin` (Task 7); `createServerRead` (Task 7); `computePoints`, `isExact` (Task 3); `carriedBetCount`, `computePot` (Task 4); `getResolvedSummaries`, `getLeaderboard` (Task 8).
- Produces:
  - `loginAdmin(formData: FormData)` — verifies PIN, redirects to `/admin`
  - `createSeason(formData: FormData)` — name + betValue
  - `createGame(formData: FormData)` — team names + flags; next `game_order`
  - `closeBetting(gameId: Uuid)`
  - `resolveGame(gameId: Uuid, resultA: number, resultB: number)`
  - `closeSeason(seasonId: Uuid)`

- [ ] **Step 1: Write `src/app/actions/admin.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdmin } from "@/lib/supabase/admin";
import { createServerRead } from "@/lib/supabase/server-read";
import { requireAdmin, verifyPinAndSetCookie } from "@/lib/admin-auth";
import { computePoints } from "@/lib/scoring";
import { carriedBetCount, computePot } from "@/lib/pot";
import { getResolvedSummaries, getLeaderboard } from "@/lib/queries";
import type { Uuid } from "@/lib/types";

export async function loginAdmin(formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  const ok = await verifyPinAndSetCookie(pin);
  if (!ok) redirect("/admin?erro=1");
  redirect("/admin");
}

export async function createSeason(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const betValue = Number(formData.get("betValue") ?? 5);
  if (!name) return;
  const sb = createAdmin();
  await sb.from("seasons").insert({ name, bet_value: betValue, status: "active" });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createGame(formData: FormData) {
  await requireAdmin();
  const sb = createAdmin();
  const seasonId = String(formData.get("seasonId"));
  const { data: last } = await sb
    .from("games").select("game_order").eq("season_id", seasonId)
    .order("game_order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (last?.game_order ?? 0) + 1;
  await sb.from("games").insert({
    season_id: seasonId,
    game_order: nextOrder,
    team_a_name: String(formData.get("teamAName") ?? "").trim(),
    team_a_flag: String(formData.get("teamAFlag") ?? ""),
    team_b_name: String(formData.get("teamBName") ?? "").trim(),
    team_b_flag: String(formData.get("teamBFlag") ?? ""),
    status: "open",
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function closeBetting(gameId: Uuid) {
  await requireAdmin();
  const sb = createAdmin();
  await sb.from("games").update({ status: "closed" }).eq("id", gameId).eq("status", "open");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function resolveGame(gameId: Uuid, resultA: number, resultB: number) {
  await requireAdmin();
  if (!Number.isInteger(resultA) || !Number.isInteger(resultB) || resultA < 0 || resultB < 0) return;
  const sb = createAdmin();

  const { data: game } = await sb.from("games").select("*").eq("id", gameId).maybeSingle();
  if (!game || game.status !== "closed") return;

  const { data: bets } = await sb
    .from("bets").select("id, pred_a, pred_b").eq("game_id", gameId);
  const rows = (bets as { id: string; pred_a: number; pred_b: number }[]) ?? [];

  let hadExact = false;
  for (const b of rows) {
    const pts = computePoints({ a: b.pred_a, b: b.pred_b }, { a: resultA, b: resultB });
    if (pts === 5) hadExact = true;
    await sb.from("bets").update({ points: pts }).eq("id", b.id);
  }

  // Pot at stake = carried bets (from prior resolved games) + this game's bets.
  const priorSummaries = await getResolvedSummaries(game.season_id);
  const { data: season } = await sb
    .from("seasons").select("bet_value").eq("id", game.season_id).single();
  const pot = computePot(
    Number(season!.bet_value),
    carriedBetCount(priorSummaries),
    rows.length,
  );

  await sb.from("games").update({
    status: "resolved",
    result_a: resultA,
    result_b: resultB,
    had_exact_winner: hadExact,
    pot_amount: pot,
  }).eq("id", gameId);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/temporada");
}

export async function closeSeason(seasonId: Uuid) {
  await requireAdmin();
  const sb = createAdmin();
  const board = await getLeaderboard(seasonId);
  const champion = board[0]?.participant.id ?? null;
  await sb.from("seasons")
    .update({ status: "closed", champion_participant_id: champion })
    .eq("id", seasonId);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/temporada");
}
```

> Note: the unused `createServerRead` import above is intentionally removed if your linter complains — `getResolvedSummaries`/`getLeaderboard` already use the read client internally.

- [ ] **Step 2: Remove the unused import**

Delete the `import { createServerRead } ...` line from `src/app/actions/admin.ts` (it is not used directly).

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat: admin server actions (season/game lifecycle + resolution)"
```

---

## Task 12: Presentational components (Flag, MatchCard, PotDisplay)

**Files:**
- Create: `src/components/Flag.tsx`, `src/components/MatchCard.tsx`, `src/components/PotDisplay.tsx`

**Interfaces:**
- Consumes: `flagEmoji` (Task 5), `formatBRL` (Task 5), `Game` (Task 6).
- Produces:
  - `<Flag code={string} className? />`
  - `<MatchCard game={Game} />` — shows flags, names, and (if resolved) the score
  - `<PotDisplay value={number} />`

- [ ] **Step 1: `src/components/Flag.tsx`**

```tsx
import { flagEmoji } from "@/lib/flags";

export function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span role="img" aria-label={code} className={className}>
      {flagEmoji(code)}
    </span>
  );
}
```

- [ ] **Step 2: `src/components/MatchCard.tsx`**

```tsx
import type { Game } from "@/lib/types";
import { Flag } from "./Flag";

export function MatchCard({ game }: { game: Game }) {
  const resolved = game.status === "resolved";
  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10">
      <Team name={game.team_a_name} flag={game.team_a_flag} />
      <div className="text-center font-display">
        {resolved ? (
          <div className="text-5xl font-bold">
            {game.result_a} <span className="text-violet-mid">x</span> {game.result_b}
          </div>
        ) : (
          <div className="text-3xl text-violet-mid">×</div>
        )}
        {resolved && <div className="mt-1 text-xs uppercase tracking-wider text-lime">resultado final</div>}
      </div>
      <Team name={game.team_b_name} flag={game.team_b_flag} />
    </div>
  );
}

function Team({ name, flag }: { name: string; flag: string }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2 sm:w-32">
      <Flag code={flag} className="text-6xl drop-shadow sm:text-7xl" />
      <div className="text-center font-display text-lg leading-tight">{name}</div>
    </div>
  );
}
```

- [ ] **Step 3: `src/components/PotDisplay.tsx`**

```tsx
import { formatBRL } from "@/lib/money";

export function PotDisplay({ value }: { value: number }) {
  return (
    <div className="inline-flex flex-col items-center rounded-xl bg-night px-8 py-4 ring-1 ring-hairline-violet">
      <span className="text-xs uppercase tracking-widest text-violet-mid">Bolão acumulado</span>
      <span className="font-display text-4xl font-bold text-lime">{formatBRL(value)}</span>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/Flag.tsx src/components/MatchCard.tsx src/components/PotDisplay.tsx
git commit -m "feat: Flag, MatchCard, PotDisplay components"
```

---

## Task 13: Bet form + live bettors (client + Realtime)

**Files:**
- Create: `src/components/BetForm.tsx`, `src/components/LiveBettors.tsx`

**Interfaces:**
- Consumes: `placeBet` (Task 10); `createBrowserSupabase` (Task 7); `Participant` (Task 6).
- Produces:
  - `<BetForm seasonId gameId participants disabled />`
  - `<LiveBettors gameId initialNames />` — subscribes to Realtime `bets` inserts

- [ ] **Step 1: `src/components/BetForm.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { placeBet } from "@/app/actions/bets";
import type { Participant, Uuid } from "@/lib/types";

export function BetForm({
  seasonId, gameId, participants, disabled,
}: {
  seasonId: Uuid; gameId: Uuid; participants: Participant[]; disabled: boolean;
}) {
  const [mode, setMode] = useState<"existing" | "new">(participants.length ? "existing" : "new");
  const [participantId, setParticipantId] = useState<string>(participants[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [predA, setPredA] = useState("");
  const [predB, setPredB] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (disabled) {
    return <p className="text-center text-violet-mid">Os palpites deste jogo foram encerrados.</p>;
  }

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await placeBet({
        seasonId, gameId,
        participantId: mode === "existing" ? (participantId as Uuid) : undefined,
        newName: mode === "new" ? newName : undefined,
        predA: Number(predA), predB: Number(predB),
      });
      setMsg(res.ok ? "Palpite registrado! 🎯" : res.error);
      if (res.ok && mode === "new") { setNewName(""); }
    });
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-violet-mid">Quem é você?</span>
        {participants.length > 0 && (
          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === "existing"} onChange={() => setMode("existing")} />
            <select
              className="flex-1 rounded-sm bg-paper px-3 py-2 text-ink"
              value={participantId} onChange={(e) => setParticipantId(e.target.value)}
              onFocus={() => setMode("existing")}
            >
              {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />
          <input
            className="flex-1 rounded-sm bg-paper px-3 py-2 text-ink"
            placeholder="Sou novo: meu nome"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onFocus={() => setMode("new")}
          />
        </label>
      </div>

      <div className="flex items-center justify-center gap-3">
        <input
          inputMode="numeric" className="w-16 rounded-sm bg-paper px-3 py-2 text-center text-2xl text-ink"
          value={predA} onChange={(e) => setPredA(e.target.value.replace(/\D/g, ""))} placeholder="0"
        />
        <span className="text-2xl text-violet-mid">x</span>
        <input
          inputMode="numeric" className="w-16 rounded-sm bg-paper px-3 py-2 text-center text-2xl text-ink"
          value={predB} onChange={(e) => setPredB(e.target.value.replace(/\D/g, ""))} placeholder="0"
        />
      </div>

      <button
        onClick={submit} disabled={pending || predA === "" || predB === ""}
        className="rounded-md bg-white px-4 py-3 font-ui text-sm font-bold uppercase tracking-wide text-ink-deep disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Enviar palpite"}
      </button>
      {msg && <p className="text-center text-sm text-lime">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/LiveBettors.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Uuid } from "@/lib/types";

export function LiveBettors({ gameId, initialNames }: { gameId: Uuid; initialNames: string[] }) {
  const [count, setCount] = useState(initialNames.length);
  const [names, setNames] = useState<string[]>(initialNames);

  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`bets-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bets", filter: `game_id=eq.${gameId}` },
        async () => {
          // A bet landed; refetch the name list (predictions stay hidden).
          const { data } = await sb
            .from("bets").select("participants(name)").eq("game_id", gameId);
          type Row = { participants: { name: string } | null };
          const next = ((data as Row[]) ?? []).map((r) => r.participants?.name ?? "").filter(Boolean);
          setNames(next); setCount(next.length);
        },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [gameId]);

  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-widest text-violet-mid">{count} palpite(s)</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {names.map((n, i) => (
          <span key={`${n}-${i}`} className="rounded-xs bg-night px-2 py-1 text-sm">{n}</span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/BetForm.tsx src/components/LiveBettors.tsx
git commit -m "feat: bet form and live bettor list (realtime)"
```

---

## Task 14: Winner celebration (confetti + Realtime)

**Files:**
- Create: `src/components/WinnerCelebration.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabase` (Task 7); `canvas-confetti`; `Game` (Task 6).
- Produces: `<WinnerCelebration gameId initialStatus winners />` — fires confetti when the game transitions to `resolved` (live for everyone), shows winner banner or "Acumulou!".

- [ ] **Step 1: `src/components/WinnerCelebration.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { GameStatus, Uuid } from "@/lib/types";

export function WinnerCelebration({
  gameId, initialStatus, winners,
}: {
  gameId: Uuid; initialStatus: GameStatus; winners: string[];
}) {
  const [show, setShow] = useState(false);
  const [resolvedWinners, setResolvedWinners] = useState<string[]>(winners);
  const fired = useRef(false);

  // If we loaded an already-resolved game, show banner (no auto-confetti spam).
  useEffect(() => {
    if (initialStatus === "resolved") setShow(true);
  }, [initialStatus]);

  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        async (payload) => {
          const next = payload.new as { status: GameStatus; had_exact_winner: boolean; result_a: number; result_b: number };
          if (next.status === "resolved" && !fired.current) {
            fired.current = true;
            if (next.had_exact_winner) {
              const { data } = await sb
                .from("bets").select("pred_a, pred_b, participants(name)").eq("game_id", gameId);
              type Row = { pred_a: number; pred_b: number; participants: { name: string } | null };
              setResolvedWinners(((data as Row[]) ?? [])
                .filter((b) => b.pred_a === next.result_a && b.pred_b === next.result_b)
                .map((b) => b.participants?.name ?? "").filter(Boolean));
            } else {
              setResolvedWinners([]);
            }
            setShow(true);
            burst();
          }
        },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [gameId]);

  if (!show) return null;

  return (
    <div className="rounded-xxl bg-night px-6 py-5 text-center ring-1 ring-hairline-violet">
      {resolvedWinners.length > 0 ? (
        <>
          <p className="text-xs uppercase tracking-widest text-violet-mid">Cravou o placar! 🎉</p>
          <p className="mt-1 font-display text-3xl font-bold text-lime">
            {resolvedWinners.join(" · ")}
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-2xl font-bold text-pink">Acumulou! 💰</p>
          <p className="mt-1 text-sm text-violet-mid">Ninguém cravou — o bolão segue acumulando.</p>
        </>
      )}
    </div>
  );
}

function burst() {
  const end = Date.now() + 1500;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 } });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/WinnerCelebration.tsx
git commit -m "feat: live winner celebration with confetti"
```

---

## Task 15: Home page (the arena)

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `getActiveSeason`, `getCurrentGame`, `getParticipants`, `getBettorNames`, `getCurrentPot`, `getResolvedGamesWithWinners` (Task 8); `MatchCard`, `PotDisplay` (Task 12); `BetForm`, `LiveBettors` (Task 13); `WinnerCelebration` (Task 14).

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import Link from "next/link";
import {
  getActiveSeason, getCurrentGame, getParticipants, getBettorNames,
  getCurrentPot, getResolvedGamesWithWinners,
} from "@/lib/queries";
import { MatchCard } from "@/components/MatchCard";
import { PotDisplay } from "@/components/PotDisplay";
import { BetForm } from "@/components/BetForm";
import { LiveBettors } from "@/components/LiveBettors";
import { WinnerCelebration } from "@/components/WinnerCelebration";

export const dynamic = "force-dynamic";

export default async function Home() {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-display text-4xl font-bold">Bolão CEMEP</h1>
        <p className="text-violet-mid">Nenhuma temporada ativa. Fale com o admin.</p>
        <Link href="/admin" className="text-sm text-lime underline">Área do admin</Link>
      </main>
    );
  }

  const game = await getCurrentGame(season.id);
  const pot = await getCurrentPot(season, game);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-4 py-10">
      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-violet-mid">{season.name}</p>
        <h1 className="font-display text-3xl font-bold">Bolão CEMEP</h1>
      </header>

      <PotDisplay value={pot} />

      {!game ? (
        <p className="text-violet-mid">Aguardando o próximo jogo…</p>
      ) : (
        <>
          <MatchCard game={game} />

          {game.status === "resolved" ? (
            <WinnerCelebration
              gameId={game.id}
              initialStatus={game.status}
              winners={(await getResolvedGamesWithWinners(season.id)).find((g) => g.game.id === game.id)?.winners ?? []}
            />
          ) : (
            <>
              <WinnerCelebration gameId={game.id} initialStatus={game.status} winners={[]} />
              <BetForm
                seasonId={season.id}
                gameId={game.id}
                participants={await getParticipants(season.id)}
                disabled={game.status !== "open"}
              />
              <LiveBettors gameId={game.id} initialNames={await getBettorNames(game.id)} />
            </>
          )}
        </>
      )}

      <Link href="/temporada" className="mt-4 text-sm text-lime underline">Ver tabela da temporada →</Link>
    </main>
  );
}
```

- [ ] **Step 2: Verify (needs env + DB)**

Set `.env.local` from `.env.local.example` with real Supabase values, then:
Run: `npm run dev`
Expected: home renders "Nenhuma temporada ativa" until a season is created in Task 16.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: home arena page (match, pot, bet, live, celebration)"
```

---

## Task 16: Admin page (PIN gate + lifecycle controls)

**Files:**
- Create: `src/app/admin/page.tsx`, `src/components/admin/AdminControls.tsx`

**Interfaces:**
- Consumes: `isAdmin` (Task 9); `loginAdmin`, `createSeason`, `createGame`, `closeBetting`, `resolveGame`, `closeSeason` (Task 11); `getActiveSeason`, `getCurrentGame`, `getLeaderboard` (Task 8); `FlagPicker`; `Game`, `Season`.
- Produces: `<FlagPicker name label defaultValue? />`; admin UI.

- [ ] **Step 1: `src/components/FlagPicker.tsx`**

```tsx
import { COUNTRIES, flagEmoji } from "@/lib/flags";

export function FlagPicker({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink">{label}</span>
      <select name={name} defaultValue={defaultValue ?? "BR"} className="rounded-sm border border-hairline-cool px-3 py-2 text-ink">
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{flagEmoji(c.code)} {c.name}</option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: `src/components/admin/AdminControls.tsx`** (client — wraps action buttons that need inputs)

```tsx
"use client";

import { useTransition } from "react";
import { closeBetting, resolveGame, closeSeason } from "@/app/actions/admin";
import type { Game, Uuid } from "@/lib/types";
import { useState } from "react";

export function GameControls({ game }: { game: Game }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [pending, start] = useTransition();

  if (game.status === "open") {
    return (
      <button
        onClick={() => start(() => closeBetting(game.id))}
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white"
      >
        Encerrar palpites
      </button>
    );
  }
  if (game.status === "closed") {
    return (
      <div className="flex items-center gap-2">
        <input inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))}
          className="w-14 rounded-sm border border-hairline-cool px-2 py-2 text-center text-ink" placeholder="A" />
        <span className="text-ink">x</span>
        <input inputMode="numeric" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ""))}
          className="w-14 rounded-sm border border-hairline-cool px-2 py-2 text-center text-ink" placeholder="B" />
        <button
          onClick={() => start(() => resolveGame(game.id, Number(a), Number(b)))}
          disabled={pending || a === "" || b === ""}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white disabled:opacity-50"
        >
          Lançar resultado
        </button>
      </div>
    );
  }
  return <span className="text-sm text-violet-mid">Resolvido: {game.result_a} x {game.result_b}</span>;
}

export function CloseSeasonButton({ seasonId }: { seasonId: Uuid }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => { if (confirm("Encerrar a temporada e coroar o campeão?")) start(() => closeSeason(seasonId)); }}
      disabled={pending}
      className="rounded-md bg-pink px-4 py-2 text-sm font-bold uppercase text-ink-deep"
    >
      Encerrar temporada
    </button>
  );
}
```

- [ ] **Step 3: `src/app/admin/page.tsx`**

```tsx
import { isAdmin } from "@/lib/admin-auth";
import { loginAdmin, createSeason, createGame } from "@/app/actions/admin";
import { getActiveSeason, getCurrentGame } from "@/lib/queries";
import { FlagPicker } from "@/components/FlagPicker";
import { GameControls, CloseSeasonButton } from "@/components/admin/AdminControls";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  if (!(await isAdmin())) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 bg-paper p-8 text-ink">
        <h1 className="font-display text-2xl font-bold">Admin · Bolão CEMEP</h1>
        {erro && <p className="text-sm text-pink">PIN incorreto.</p>}
        <form action={loginAdmin} className="flex flex-col gap-3">
          <input name="pin" type="password" placeholder="PIN"
            className="rounded-sm border border-hairline-cool px-3 py-2" />
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white">Entrar</button>
        </form>
      </main>
    );
  }

  const season = await getActiveSeason();
  const game = season ? await getCurrentGame(season.id) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-paper p-8 text-ink">
      <h1 className="font-display text-2xl font-bold">Admin · Bolão CEMEP</h1>

      {!season ? (
        <section className="flex flex-col gap-3 rounded-xl border border-hairline-cloud p-5">
          <h2 className="font-display text-lg">Nova temporada</h2>
          <form action={createSeason} className="flex flex-col gap-3">
            <input name="name" placeholder="Nome da temporada" className="rounded-sm border border-hairline-cool px-3 py-2" />
            <label className="flex flex-col gap-1 text-sm">
              Valor por aposta (R$)
              <input name="betValue" type="number" step="0.01" defaultValue="5" className="rounded-sm border border-hairline-cool px-3 py-2" />
            </label>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white">Criar temporada</button>
          </form>
        </section>
      ) : (
        <>
          <section className="flex items-center justify-between rounded-xl border border-hairline-cloud p-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-violet-mid">Temporada ativa</p>
              <p className="font-display text-lg">{season.name} · R$ {Number(season.bet_value).toFixed(2)}/aposta</p>
            </div>
            <CloseSeasonButton seasonId={season.id} />
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-hairline-cloud p-5">
            <h2 className="font-display text-lg">Jogo atual</h2>
            {game && game.status !== "resolved" ? (
              <div className="flex flex-col gap-3">
                <p>{game.team_a_name} x {game.team_b_name} — <strong>{game.status}</strong></p>
                <GameControls game={game} />
              </div>
            ) : (
              <p className="text-violet-mid">Nenhum jogo em andamento. Cadastre o próximo abaixo.</p>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-hairline-cloud p-5">
            <h2 className="font-display text-lg">Novo jogo</h2>
            <form action={createGame} className="flex flex-col gap-3">
              <input type="hidden" name="seasonId" value={season.id} />
              <div className="grid grid-cols-2 gap-3">
                <input name="teamAName" placeholder="Time A" className="rounded-sm border border-hairline-cool px-3 py-2" />
                <input name="teamBName" placeholder="Time B" className="rounded-sm border border-hairline-cool px-3 py-2" />
                <FlagPicker name="teamAFlag" label="Bandeira A" />
                <FlagPicker name="teamBFlag" label="Bandeira B" />
              </div>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase text-white">Cadastrar jogo</button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 4: End-to-end manual test**

Run: `npm run dev`. Steps:
1. Visit `/admin`, enter PIN → create a season (R$ 5).
2. Create a game (Brasil x Argentina).
3. In another browser/incognito open `/` → place a bet; confirm the name appears live in the first window.
4. Back in `/admin`: "Encerrar palpites" → "Lançar resultado" 2x1.
5. Confirm `/` shows confetti + winner (or "Acumulou!") live, and `/temporada` updates.

Expected: each step behaves as described.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/AdminControls.tsx src/components/FlagPicker.tsx
git commit -m "feat: admin page with PIN gate and lifecycle controls"
```

---

## Task 17: Leaderboard page + README/deploy docs

**Files:**
- Create: `src/app/temporada/page.tsx`, `src/components/Leaderboard.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `getActiveSeason`, `getLeaderboard`, `getResolvedGamesWithWinners`, `getCurrentGame`, `getCurrentPot` (Task 8); `formatBRL` (Task 5); `MatchCard` (Task 12).

- [ ] **Step 1: `src/components/Leaderboard.tsx`**

```tsx
import type { LeaderRow } from "@/lib/queries";

export function Leaderboard({ rows, championId }: { rows: LeaderRow[]; championId: string | null }) {
  return (
    <table className="w-full border-collapse text-ink">
      <thead>
        <tr className="border-b border-hairline-cloud text-left text-xs uppercase tracking-widest text-violet-mid">
          <th className="py-2">#</th><th>Nome</th><th className="text-center">Cravadas</th><th className="text-right">Pontos</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.participant.id} className="border-b border-hairline-cloud">
            <td className="py-2">{i + 1}</td>
            <td>{r.participant.name}{r.participant.id === championId && " 👑"}</td>
            <td className="text-center">{r.exactWins}</td>
            <td className="text-right font-bold">{r.points}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={4} className="py-4 text-center text-violet-mid">Ainda sem pontos.</td></tr>
        )}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: `src/app/temporada/page.tsx`**

```tsx
import Link from "next/link";
import { getActiveSeason, getLeaderboard, getResolvedGamesWithWinners } from "@/lib/queries";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";

export const dynamic = "force-dynamic";

export default async function TemporadaPage() {
  const season = await getActiveSeason();
  if (!season) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 bg-paper p-8 text-ink">
        <p className="text-violet-mid">Nenhuma temporada ativa.</p>
        <Link href="/" className="text-sm text-violet-link underline">← Voltar</Link>
      </main>
    );
  }
  const rows = await getLeaderboard(season.id);
  const history = await getResolvedGamesWithWinners(season.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-paper p-6 text-ink">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{season.name}</h1>
        <Link href="/" className="text-sm text-violet-link underline">← Jogo atual</Link>
      </header>

      <section>
        <h2 className="mb-3 font-display text-lg">Classificação</h2>
        <Leaderboard rows={rows} championId={season.champion_participant_id} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg">Jogos</h2>
        {history.map(({ game, winners }) => (
          <div key={game.id} className="rounded-xl border border-hairline-cloud p-4">
            <div className="text-ink"><MatchCard game={game} /></div>
            <p className="mt-2 text-center text-sm text-violet-mid">
              {winners.length ? `Cravou: ${winners.join(", ")}` : "Acumulou"}
            </p>
          </div>
        ))}
        {history.length === 0 && <p className="text-violet-mid">Nenhum jogo encerrado ainda.</p>}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Write `README.md`** (setup + deploy)

````markdown
# Bolão CEMEP

App de bolão de placares da empresa. Next.js (App Router) + Supabase.

## Setup local

1. `npm install`
2. Crie um projeto no [Supabase](https://supabase.com) e rode `supabase/migrations/0001_init.sql` no SQL Editor.
3. Copie `.env.local.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (mesma página — **secreto**)
   - `ADMIN_PIN` (PIN do admin) e `ADMIN_COOKIE_SECRET` (string longa aleatória)
4. `npm run dev` → http://localhost:3000 (admin em `/admin`).

## Testes

`npm test` (Vitest) — cobre a lógica de pontos e do pote.

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Em Project → Settings → Environment Variables, adicione as 5 variáveis do `.env.local`.
3. Em Supabase → Database → Replication, confirme que `games`, `bets`, `seasons` estão na publicação `supabase_realtime` (já incluídos pela migration).
4. Deploy. Compartilhe o link; o admin opera em `/admin`.

## Como funciona

- Admin cria uma **temporada** (valor por aposta, padrão R$ 5) e cadastra **jogos**.
- Qualquer um palpita o placar pelo celular, escolhendo o nome na lista ou se cadastrando.
- Quem **crava o placar exato** leva o **bolão acumulado**; senão, o bolão acumula e todos somam **pontos por proximidade** (5/3/2/1).
- No fim da temporada, o **líder em pontos** é o campeão e leva o bolão restante.
````

- [ ] **Step 4: Verify**

Run: `npm run build && npm test`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/temporada/page.tsx src/components/Leaderboard.tsx README.md
git commit -m "feat: leaderboard page and project README"
```

---

## Self-Review Notes (verified against the spec)

- **Spec coverage:** season/bet-value (Task 6, 11); open roster + get-or-create (Task 10); single match w/ flags (Task 6, 12, 16); hidden predictions until resolved (Task 8 `getBettorNames`, Task 13); points 5/3/2/1/0 (Task 3); pot accumulation + reset + end-of-season carry (Task 4, 11, 8); exact winner + co-winners derived (Task 8, 14); champion at season close (Task 11); Realtime live bettors + winner animation (Task 13, 14); PIN admin + server-only service role (Task 7, 9, 11); leaderboard + history (Task 17); deploy/setup docs (Task 17). All covered.
- **Deviation from spec (noted):** bet inserts go through a **server action with the service-role key** (Task 10) rather than anon-key inserts with permissive RLS. RLS is therefore public-read-only — simpler and safer. Realtime still works because clients subscribe with the anon key to public-readable tables.
- **Type consistency:** `Score {a,b}`, `GameBetSummary {betCount,hadExactWinner}`, `Game.game_order`, `Game.had_exact_winner`, `LeaderRow {participant,points,exactWins}` used consistently across tasks. Column `order`→`game_order` and single-winner-FK→`had_exact_winner` boolean documented in Task 6.
- **Placeholder scan:** none — every code step is complete.
- **Draw-scoring nuance:** predicting any draw for a draw result yields 3 pts (same outcome + diff 0). This matches the spec's rule literally and is covered by an explicit test in Task 3; adjust `POINTS`/branch if undesired.
