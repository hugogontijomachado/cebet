# Exclusão automática de palpites não pagos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao encerrar as apostas (início do jogo), palpites não pagos são automaticamente excluídos — ocultos, sem valer pontos nem entrar no bolão —, de forma reversível, e a regra aparece em `/regras`.

**Architecture:** Nova coluna booleana `bets.excluded` (default `false`). A server action `closeBetting` marca `excluded=true` em quem não pagou; `setBetPaid(…, true)` desmarca (restaura). Toda contagem/pontuação/exibição passa a filtrar `excluded=false` na borda (server actions + `queries.ts` + `PredictionsTable`). A lógica pura (`pot.ts`, `scoring.ts`) não muda.

**Tech Stack:** Next.js 15 (App Router, RSC + server actions), Supabase (Postgres + Realtime, supabase-js), TypeScript, Vitest (só lógica pura), Tailwind.

## Global Constraints

- UI copy é **português brasileiro**.
- Toda mutação passa por server action com client service-role (`createAdmin`); leituras públicas usam o client anon. Nunca adicionar política de write anon.
- Schema: aplicar com Supabase MCP `apply_migration` **e** commitar o SQL em `supabase/migrations/`. Project ref `yjckvfwnjwpwpwkuvldx`.
- Coluna de ordem é `game_order` (`order` é reservado).
- `npm run build` é o type gate; rodar antes de cada commit que toca TS/TSX.
- Pontos são "congelados" na resolução; este plano não altera esse comportamento.
- Verificação de runtime: seed descartável com service-role contra o Supabase de produção (não há staging). **Nunca** tocar a temporada `status='active'`; usar temporada `status='closed'` e apagar tudo ao final.
- Migração nova: `supabase/migrations/0005_bet_excluded.sql` (segue 0001–0004).

---

### Task 1: Coluna `excluded` em `bets` + tipo

**Files:**
- Create: `supabase/migrations/0005_bet_excluded.sql`
- Modify: `src/lib/types.ts` (interface `Bet`, após `paid: boolean;`)
- Aplicar via Supabase MCP `apply_migration` (name: `bet_excluded`)

**Interfaces:**
- Produces: coluna `bets.excluded boolean NOT NULL DEFAULT false`; campo `Bet.excluded: boolean`.

- [ ] **Step 1: Escrever a migração**

`supabase/migrations/0005_bet_excluded.sql`:

```sql
-- Palpites não pagos são excluídos ao encerrar as apostas (início do jogo).
-- Soft-exclude: o registro permanece, mas é ocultado e ignorado na pontuação/bolão.
alter table bets add column excluded boolean not null default false;
```

- [ ] **Step 2: Aplicar a migração**

Aplicar com o Supabase MCP `apply_migration` (project ref `yjckvfwnjwpwpwkuvldx`, name `bet_excluded`, query = conteúdo do arquivo acima).

- [ ] **Step 3: Verificar que a coluna existe**

Via Supabase MCP `execute_sql`:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'bets' and column_name = 'excluded';
```

Expected: 1 linha — `excluded | boolean | NO | false`.

- [ ] **Step 4: Adicionar o campo ao tipo `Bet`**

Em `src/lib/types.ts`, na interface `Bet`, logo após `paid: boolean;`:

```ts
  excluded: boolean;
```

- [ ] **Step 5: Type gate**

Run: `npm run build`
Expected: build passa sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0005_bet_excluded.sql src/lib/types.ts
git commit -m "feat: add bets.excluded column for soft-excluding unpaid bets"
```

---

### Task 2: Server actions respeitam `excluded`

`closeBetting` exclui os não pagos; `setBetPaid(true)` restaura; `resolveGame` ignora excluídos na pontuação e na contagem do bolão.

**Files:**
- Modify: `src/app/actions/admin.ts` (`closeBetting` ~L102, `setBetPaid` ~L71, `resolveGame` ~L115)

**Interfaces:**
- Consumes: `bets.excluded` (Task 1).
- Produces: comportamento — após `closeBetting(gameId)`, todo bet do jogo com `paid=false` fica `excluded=true`; `setBetPaid(id, true)` grava `excluded=false`; `resolveGame` calcula pontos e conta o bolão só sobre `excluded=false`.

- [ ] **Step 1: `closeBetting` exclui os não pagos**

Substituir o corpo de `closeBetting` (em `src/app/actions/admin.ts`) por:

```ts
export async function closeBetting(gameId: Uuid) {
  await requireAdmin();
  const sb = createAdmin();
  // Closing betting kicks off the live score at 0x0 for the admin to update.
  const { data: closed } = await sb
    .from("games")
    .update({ status: "closed", live_a: 0, live_b: 0 })
    .eq("id", gameId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  // Só excluímos se a transição open→closed realmente aconteceu agora.
  if (closed) {
    await sb.from("bets").update({ excluded: true }).eq("game_id", gameId).eq("paid", false);
  }
  revalidatePath("/admin");
  revalidatePath("/");
}
```

- [ ] **Step 2: `setBetPaid` restaura ao marcar pago**

Substituir o corpo de `setBetPaid`:

```ts
export async function setBetPaid(betId: Uuid, paid: boolean) {
  await requireAdmin();
  const sb = createAdmin();
  // Pagar restaura um palpite excluído; despagar não re-exclui.
  const patch = paid ? { paid, excluded: false } : { paid };
  await sb.from("bets").update(patch).eq("id", betId);
  revalidatePath("/");
}
```

- [ ] **Step 3: `resolveGame` ignora excluídos**

Em `resolveGame`, na busca dos bets para pontuar, adicionar o filtro `.eq("excluded", false)`:

```ts
  const { data: bets } = await sb
    .from("bets")
    .select("id, pred_a, pred_b")
    .eq("game_id", gameId)
    .eq("excluded", false);
```

(O restante de `resolveGame` não muda: `rows.length` já passa a contar só os não-excluídos, e os excluídos ficam com `points = null`.)

- [ ] **Step 4: Type gate**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat: exclude unpaid bets at kickoff; restore on payment; skip excluded on resolve"
```

---

### Task 3: Leituras (`queries.ts`) ignoram excluídos

**Files:**
- Modify: `src/lib/queries.ts` — `BetView`, `getGameBets`, `getCurrentPot`, `getResolvedSummaries`, `getLeaderboard`

**Interfaces:**
- Consumes: `bets.excluded` (Task 1).
- Produces:
  - `BetView` ganha `excluded: boolean`.
  - `getGameBets(gameId)` retorna **todos** os bets (válidos + excluídos), cada um com `excluded`. (A filtragem para o público é responsabilidade do componente — Task 4.)
  - `getCurrentPot` / `getResolvedSummaries` / `getLeaderboard` contam/pontuam só `excluded=false`.

- [ ] **Step 1: `BetView` + `getGameBets` expõem `excluded`**

Em `src/lib/queries.ts`, na interface `BetView` adicionar o campo:

```ts
export interface BetView {
  id: Uuid;
  name: string;
  predA: number;
  predB: number;
  paid: boolean;
  excluded: boolean;
}
```

Em `getGameBets`, incluir `excluded` no select, no tipo `Row` e no objeto retornado:

```ts
export async function getGameBets(gameId: Uuid): Promise<BetView[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("bets")
    .select("id, pred_a, pred_b, paid, excluded, participants(name)")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });
  type Row = {
    id: Uuid;
    pred_a: number;
    pred_b: number;
    paid: boolean;
    excluded: boolean;
    participants: { name: string } | null;
  };
  return ((data as unknown as Row[]) ?? [])
    .map((r) => ({
      id: r.id,
      name: r.participants?.name ?? "",
      predA: r.pred_a,
      predB: r.pred_b,
      paid: r.paid,
      excluded: r.excluded,
    }))
    .filter((b) => b.name);
}
```

- [ ] **Step 2: `getCurrentPot` conta só não-excluídos**

No bloco que conta os bets do jogo atual, adicionar `.eq("excluded", false)`:

```ts
    const { count } = await sb
      .from("bets")
      .select("*", { count: "exact", head: true })
      .eq("game_id", currentGame.id)
      .eq("excluded", false);
```

- [ ] **Step 3: `getResolvedSummaries` conta só não-excluídos**

Filtrar a contagem embutida pela coluna da tabela embutida:

```ts
export async function getResolvedSummaries(seasonId: Uuid): Promise<GameBetSummary[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("games")
    .select("had_exact_winner, bets(count)")
    .eq("season_id", seasonId)
    .eq("status", "resolved")
    .eq("bets.excluded", false)
    .order("game_order", { ascending: true });
  type Row = { had_exact_winner: boolean; bets: { count: number }[] };
  return ((data as Row[]) ?? []).map((g) => ({
    betCount: g.bets?.[0]?.count ?? 0,
    hadExactWinner: g.had_exact_winner,
  }));
}
```

> **Verificar na Task 6:** confirmar que `.eq("bets.excluded", false)` filtra a contagem embutida **sem** virar inner join (jogos resolvidos sem nenhum bet válido devem continuar aparecendo com `count = 0`). Se o PostgREST não filtrar o agregado como esperado, o fallback é trocar `bets(count)` por `bets(excluded)` e contar em JS: `betCount: (g.bets ?? []).filter((b) => !b.excluded).length`.

- [ ] **Step 4: `getLeaderboard` ignora excluídos**

Adicionar `.eq("excluded", false)` à query dos bets:

```ts
  const { data } = await sb
    .from("bets")
    .select(
      "participant_id, pred_a, pred_b, points, games!inner(season_id, status, result_a, result_b)",
    )
    .eq("games.season_id", seasonId)
    .eq("games.status", "resolved")
    .eq("excluded", false);
```

- [ ] **Step 5: Type gate**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: exclude excluded bets from pot, leaderboard, and bet views"
```

---

### Task 4: Exibição em `PredictionsTable` + `allPaid` da home

Público não vê excluídos; admin vê esmaecidos no fim, com ✅ servindo de "restaurar". `allPaid` da home passa a olhar só os não-excluídos.

**Files:**
- Modify: `src/components/PredictionsTable.tsx`
- Modify: `src/app/page.tsx:52` (cálculo de `allPaid`)

**Interfaces:**
- Consumes: `BetView.excluded` (Task 3).
- Produces: render — para não-admin, excluídos são omitidos da tabela, da contagem "Palpites · N" e da classificação; para admin, aparecem após um divisor "Excluídos (não pagos)", riscados/esmaecidos, com o toggle de pagamento ativo.

- [ ] **Step 1: Refetch realtime traz `excluded`**

No `useEffect` de `PredictionsTable`, dentro do handler do canal de `bets`, incluir `excluded` no select, no tipo `Row` e no objeto mapeado:

```ts
          const { data } = await sb
            .from("bets")
            .select("id, pred_a, pred_b, paid, excluded, participants(name)")
            .eq("game_id", gameId)
            .order("created_at", { ascending: true });
          type Row = {
            id: Uuid;
            pred_a: number;
            pred_b: number;
            paid: boolean;
            excluded: boolean;
            participants: { name: string } | null;
          };
          setBets(
            ((data as unknown as Row[]) ?? [])
              .map((r) => ({
                id: r.id,
                name: r.participants?.name ?? "",
                predA: r.pred_a,
                predB: r.pred_b,
                paid: r.paid,
                excluded: r.excluded,
              }))
              .filter((b) => b.name),
          );
```

- [ ] **Step 2: Separar válidos de excluídos e ranquear só os válidos**

No corpo do componente, após `const [bets, setBets] = ...` e antes do `score`/`ranked`, derivar as duas listas e usar `valid` no lugar de `bets` no cálculo de `rows`/contagem. Substituir o trecho que monta `rows`:

```ts
  // Excluídos (não pagos no apito) saem da classificação e da contagem pública.
  const valid = bets.filter((b) => !b.excluded);
  const excluded = bets.filter((b) => b.excluded);

  // Score the standings against: the final result if resolved, else the live (preliminary) score.
  const score = isResolved ? final : live;
  const ranked = score != null;

  const rows = valid.map((b) => ({
    bet: b,
    pts: ranked ? computePoints({ a: b.predA, b: b.predB }, score!) : null,
  }));
  if (ranked) {
    rows.sort((x, y) => (y.pts ?? 0) - (x.pts ?? 0) || x.bet.name.localeCompare(y.bet.name));
  }
```

- [ ] **Step 3: Contagem e estado vazio usam `valid`**

Trocar a contagem do cabeçalho e a condição de "vazio":

```tsx
      <p className="mb-2 text-center text-xs uppercase tracking-widest text-violet-mid">
        Palpites · {valid.length}
      </p>
```

e a condição do bloco da tabela passa de `bets.length === 0` para `valid.length === 0`:

```tsx
      {valid.length === 0 ? (
        <p className="text-center text-sm text-violet-mid">Ninguém palpitou ainda.</p>
      ) : (
```

- [ ] **Step 4: Renderizar os excluídos (só admin) após os válidos**

Dentro do `<tbody>`, após o `.map` das linhas válidas, acrescentar as linhas de excluídos só para admin. O `<tbody>` fica:

```tsx
          <tbody>
            {rows.map(({ bet, pts }) => (
              <BetRow key={bet.id} bet={bet} isAdmin={isAdmin} showPts={ranked} pts={pts} />
            ))}
            {isAdmin && excluded.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={ranked ? (isAdmin ? 5 : 4) : isAdmin ? 4 : 3}
                    className="pt-3 text-center text-[10px] uppercase tracking-widest text-violet-mid"
                  >
                    Excluídos (não pagos)
                  </td>
                </tr>
                {excluded.map((bet) => (
                  <BetRow
                    key={bet.id}
                    bet={bet}
                    isAdmin={isAdmin}
                    showPts={ranked}
                    pts={null}
                    excluded
                  />
                ))}
              </>
            )}
          </tbody>
```

- [ ] **Step 5: `BetRow` aceita `excluded` e estiliza a linha**

Adicionar a prop `excluded` (default `false`) à assinatura de `BetRow` e aplicar opacidade + riscado na linha. Atualizar a assinatura:

```tsx
function BetRow({
  bet,
  isAdmin,
  showPts,
  pts,
  excluded = false,
}: {
  bet: BetView;
  isAdmin: boolean;
  showPts: boolean;
  pts: number | null;
  excluded?: boolean;
}) {
```

e o `<tr>` raiz da `BetRow`:

```tsx
    <tr
      className={`border-b border-hairline-violet ${exact ? "bg-lime/10" : ""} ${
        excluded ? "text-violet-mid/60 line-through" : ""
      }`}
    >
```

(O toggle ✅/❌ continua o mesmo: clicar em ❌ de um excluído chama `setBetPaid(id, true)`, que restaura — Task 2.)

- [ ] **Step 6: `allPaid` da home olha só os não-excluídos**

Em `src/app/page.tsx`, trocar a linha 52:

```ts
  const allPaid =
    gameBets.some((b) => !b.excluded) && gameBets.every((b) => b.excluded || b.paid);
```

(Equivale a: existe ao menos um palpite válido e todos os válidos estão pagos → o `PixWhenUnpaid` de baixo se esconde.)

- [ ] **Step 7: Type gate**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 8: Commit**

```bash
git add src/components/PredictionsTable.tsx src/app/page.tsx
git commit -m "feat: hide excluded bets from public, show dimmed to admin with restore"
```

---

### Task 5: Regra em `/regras`

**Files:**
- Modify: `src/app/regras/page.tsx` (nova `<section>` após "O bolão (dinheiro)")

**Interfaces:**
- Consumes: nada novo.
- Produces: seção visível "Pagamento" explicando a exclusão.

- [ ] **Step 1: Adicionar a seção**

Em `src/app/regras/page.tsx`, inserir após a `<section>` "O bolão (dinheiro)" (a que termina antes de "Campeão da temporada"):

```tsx
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-lime">Pagamento</h2>
        <p className="text-white/90">
          Pague seu palpite <strong>antes do apito inicial</strong>. Quando o jogo começa, os
          palpites <strong>não pagos são automaticamente excluídos</strong>: não valem pontos nem
          entram no bolão. Se você pagar em cima da hora, o palpite pode ser{" "}
          <strong>restaurado</strong>.
        </p>
      </section>
```

- [ ] **Step 2: Type gate**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 3: Commit**

```bash
git add src/app/regras/page.tsx
git commit -m "docs: explain unpaid-bet exclusion rule in /regras"
```

---

### Task 6: Verificação de runtime (seed descartável)

Prova end-to-end no DB de produção, em temporada `status='closed'`, sem tocar a ativa. Testa o **código real** de leitura (`queries.ts`) e o comportamento do PostgREST com a contagem embutida filtrada.

**Files:**
- Create (temporário, **não commitar**): `scripts/verify-exclusion.mts`
- Delete ao final: `scripts/verify-exclusion.mts`

**Interfaces:**
- Consumes: `getGameBets`, `getCurrentPot`, `getResolvedSummaries`, `getLeaderboard` (Task 3); `bets.excluded` (Task 1).

- [ ] **Step 1: Escrever o script de verificação**

`scripts/verify-exclusion.mts` (usa service-role para semear/mutar e o client anon via as funções reais para ler):

```ts
import { createClient } from "@supabase/supabase-js";
import { getGameBets, getCurrentPot, getResolvedSummaries, getLeaderboard } from "../src/lib/queries";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error("FALHOU: " + msg);
  console.log("ok:", msg);
};

async function main() {
  // --- Seed: temporada CLOSED (nunca a ativa), 1 jogo OPEN, 3 participantes, 3 bets ---
  const { data: season } = await sb
    .from("seasons")
    .insert({ name: "VERIFY-EXCLUSION", bet_value: 5, status: "closed", pix_name: "x", pix_key: "x" })
    .select("id")
    .single();
  const seasonId = season!.id;

  const { data: game } = await sb
    .from("games")
    .insert({
      season_id: seasonId,
      game_order: 1,
      team_a_name: "A",
      team_a_flag: "BR",
      team_b_name: "B",
      team_b_flag: "AR",
      status: "open",
    })
    .select("*")
    .single();
  const gameId = game!.id;

  const names = ["PagouA", "PagouB", "NaoPagou"];
  const parts: Record<string, string> = {};
  for (const n of names) {
    const { data: p } = await sb
      .from("participants")
      .insert({ season_id: seasonId, name: n })
      .select("id")
      .single();
    parts[n] = p!.id;
  }
  // PagouA: 2x1 pago; PagouB: 1x1 pago; NaoPagou: 2x1 não pago
  await sb.from("bets").insert([
    { game_id: gameId, participant_id: parts["PagouA"], pred_a: 2, pred_b: 1, paid: true },
    { game_id: gameId, participant_id: parts["PagouB"], pred_a: 1, pred_b: 1, paid: true },
    { game_id: gameId, participant_id: parts["NaoPagou"], pred_a: 2, pred_b: 1, paid: false },
  ]);

  try {
    // --- Replica closeBetting: open->closed + exclui não pagos ---
    await sb.from("games").update({ status: "closed", live_a: 0, live_b: 0 }).eq("id", gameId);
    await sb.from("bets").update({ excluded: true }).eq("game_id", gameId).eq("paid", false);

    const closedGame = { ...game!, status: "closed", live_a: 0, live_b: 0 } as any;

    // getGameBets traz todos com o flag; só 1 excluído
    const view = await getGameBets(gameId);
    assert(view.length === 3, "getGameBets retorna os 3 bets");
    assert(view.filter((b) => b.excluded).length === 1, "exatamente 1 excluído");
    assert(view.find((b) => b.excluded)!.name === "NaoPagou", "o excluído é o NaoPagou");

    // Pot do jogo atual conta só os 2 válidos -> 5 * 2 = 10
    const pot = await getCurrentPot({ id: seasonId, bet_value: 5 } as any, closedGame);
    assert(pot === 10, `pot atual = 10 (veio ${pot})`);

    // --- Resolve 2x1: replica resolveGame ignorando excluídos ---
    // PagouA crava (5), PagouB ganha nível menor; NaoPagou está excluído (não pontua)
    await sb
      .from("bets")
      .update({ points: 5 })
      .eq("game_id", gameId)
      .eq("participant_id", parts["PagouA"]);
    await sb
      .from("bets")
      .update({ points: 2 })
      .eq("game_id", gameId)
      .eq("participant_id", parts["PagouB"]);
    await sb
      .from("games")
      .update({ status: "resolved", result_a: 2, result_b: 1, had_exact_winner: true, pot_amount: 10 })
      .eq("id", gameId);

    // getResolvedSummaries: conta só não-excluídos -> betCount = 2 (verifica filtro embutido)
    const summaries = await getResolvedSummaries(seasonId);
    assert(summaries.length === 1, "1 jogo resolvido nas summaries");
    assert(summaries[0].betCount === 2, `betCount = 2 ignorando excluído (veio ${summaries[0].betCount})`);
    assert(summaries[0].hadExactWinner === true, "hadExactWinner = true");

    // Leaderboard ignora o excluído: só PagouA(5) e PagouB(2) pontuam
    const board = await getLeaderboard(seasonId);
    const byName = Object.fromEntries(board.map((r) => [r.participant.name, r.points]));
    assert(byName["PagouA"] === 5, `PagouA = 5 (veio ${byName["PagouA"]})`);
    assert(byName["PagouB"] === 2, `PagouB = 2 (veio ${byName["PagouB"]})`);
    assert((byName["NaoPagou"] ?? 0) === 0, `NaoPagou = 0 (excluído) (veio ${byName["NaoPagou"]})`);

    // --- Restaurar: replica setBetPaid(true) -> excluded=false ---
    await sb
      .from("bets")
      .update({ paid: true, excluded: false })
      .eq("game_id", gameId)
      .eq("participant_id", parts["NaoPagou"]);
    const summariesAfter = await getResolvedSummaries(seasonId);
    assert(summariesAfter[0].betCount === 3, `após restaurar, betCount = 3 (veio ${summariesAfter[0].betCount})`);

    console.log("\nTODOS OS CHECKS PASSARAM");
  } finally {
    // --- Cleanup total ---
    await sb.from("bets").delete().eq("game_id", gameId);
    await sb.from("games").delete().eq("id", gameId);
    await sb.from("participants").delete().eq("season_id", seasonId);
    await sb.from("seasons").delete().eq("id", seasonId);
    console.log("limpeza concluída");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Rodar a verificação**

Run: `npx tsx --env-file=.env.local scripts/verify-exclusion.mts`
Expected: várias linhas `ok: …`, depois `TODOS OS CHECKS PASSARAM` e `limpeza concluída`. Sem erro.

> Se a asserção de `betCount = 2` falhar, o `.eq("bets.excluded", false)` não filtrou o agregado embutido — aplicar o fallback descrito na Task 3 Step 3 (`bets(excluded)` + filtro em JS), recompilar e rodar o script de novo.

- [ ] **Step 3: Confirmar que nada da temporada ativa foi tocado**

Via Supabase MCP `execute_sql`:

```sql
select count(*) as ativas from seasons where status = 'active';
select count(*) as lixo from seasons where name = 'VERIFY-EXCLUSION';
```

Expected: `lixo = 0` (cleanup ok); `ativas` igual ao que era antes (o script nunca cria/edita temporada ativa).

- [ ] **Step 4: Remover o script temporário**

```bash
rm scripts/verify-exclusion.mts
```

(Não há nada a commitar — o script nunca foi adicionado ao git.)

- [ ] **Step 5: Build final**

Run: `npm run build`
Expected: build passa.

---

## Self-Review

**Spec coverage:**
- Coluna `excluded` + tipo → Task 1. ✓
- Gatilho `closeBetting` exclui não pagos → Task 2 Step 1. ✓
- Reversão via `setBetPaid(true)` → Task 2 Step 2. ✓
- `resolveGame` ignora excluídos (pontos + bolão) → Task 2 Step 3. ✓
- Bolão: `getCurrentPot`, `getResolvedSummaries` → Task 3 Steps 2–3. ✓
- Leaderboard ignora excluídos → Task 3 Step 4. ✓
- Standings: público oculta, admin vê esmaecido + contagem só de válidos + refetch realtime → Task 4. ✓
- `allPaid`/PIX se esconde sozinho → Task 4 Step 6. ✓
- Regra em `/regras` → Task 5. ✓
- Verificação por seed descartável + checagem PostgREST embedded count → Task 6. ✓

**Placeholder scan:** Nenhum TBD/TODO; todo passo de código mostra o código.

**Type consistency:** `BetView.excluded` definido na Task 3 e consumido na Task 4; `Bet.excluded` na Task 1; `getGameBets/getCurrentPot/getResolvedSummaries/getLeaderboard` mantêm assinaturas atuais (só comportamento muda); `BetRow` ganha prop opcional `excluded?: boolean`. Consistente.
```
