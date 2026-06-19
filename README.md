# Bolão CEMEP

App de bolão de placares da empresa. Next.js (App Router) + Supabase.

## Setup local

1. `npm install`
2. Crie um projeto no [Supabase](https://supabase.com) e rode `supabase/migrations/0001_init.sql` no SQL Editor (ou já está aplicado no projeto vinculado).
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
