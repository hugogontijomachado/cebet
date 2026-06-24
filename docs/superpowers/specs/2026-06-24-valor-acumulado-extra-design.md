# Valor acumulado extra por jogo

**Data:** 2026-06-24

## Problema

O bolão acumulado hoje é puramente derivado das apostas:
`bolão = valor_da_aposta × (apostas acumuladas + apostas do jogo atual)`.
O admin precisa poder injetar um **valor acumulado extra** (em dinheiro) no jogo
atual — por exemplo uma sobra de temporada anterior ou uma contribuição avulsa.
Esse valor deve ser somado ao bolão das apostas e o número exibido na tela deve
ser a soma (apostas + extra).

## Decisão de comportamento

O extra **acumula junto com o bolão** (mesma regra do pot de apostas):

- Se o jogo for resolvido **com acertador exato**, o extra entra no prêmio pago.
- Se o jogo for resolvido **sem vencedor**, o extra **passa para o próximo jogo**
  junto com as apostas acumuladas.
- O acúmulo (apostas e extra) **zera após qualquer jogo com acertador exato** —
  exatamente a regra já existente em `carriedBetCount`.

## Modelo de dados

Nova coluna em `games`:

```sql
alter table games add column extra_pot numeric not null default 0;
```

- Migration `supabase/migrations/0006_extra_pot.sql` + aplicar via Supabase MCP.
- `src/lib/types.ts`: adicionar `extra_pot: number` em `Game`.
- Valores numéricos do Postgres podem voltar como string → sempre `Number(...)`.

## Lógica pura (`src/lib/pot.ts`)

As apostas continuam baseadas em **contagem**; o extra é **dinheiro bruto**. O
acumulador do extra espelha `carriedBetCount` (mesma regra de reset) e o
`computePot` passa a dobrar como soma final:

```ts
export interface GameBetSummary {
  betCount: number;
  hadExactWinner: boolean;
  extraPot?: number; // extra em dinheiro definido pelo admin para o jogo
}

// dinheiro extra carregado para o próximo jogo (zera após acertador exato)
export function carriedExtra(resolved: GameBetSummary[]): number;

// parâmetros extra com default 0 → call sites e testes existentes seguem válidos
export function computePot(
  betValue: number,
  carried: number,
  currentBetCount: number,
  carriedExtra?: number,
  currentExtra?: number,
): number; // betValue * (carried + currentBetCount) + carriedExtra + currentExtra
```

Os testes existentes (`computePot(5,22,8) === 150`) continuam passando.

## Leituras (`src/lib/queries.ts`)

- `getResolvedSummaries`: passa a selecionar `extra_pot` e preencher `extraPot`.
- `getCurrentPot`: soma `carriedExtra(summaries)` + `extra_pot` do jogo atual —
  **apenas quando o jogo ainda não está resolvido** (mesmo guard que já existe
  para `currentBetCount`, para não contar o extra duas vezes).
- `getSeasonChampion`: o prêmio remanescente inclui `carriedExtra(summaries)`.

## Resolução (`src/app/actions/admin.ts` → `resolveGame`)

Faz o snapshot do extra dentro de `pot_amount`, para que o prêmio (`WonPot`) e o
acúmulo fiquem corretos:

```ts
const pot = computePot(
  Number(season!.bet_value),
  carriedBetCount(priorSummaries),
  rows.length,
  carriedExtra(priorSummaries),
  Number(game.extra_pot),
);
```

## Ação de admin + UI

- Nova action `setExtraPot(gameId, amount)`: `requireAdmin()`, validar que
  `amount` é finito e `>= 0`, atualizar `games.extra_pot`, `revalidatePath("/")`
  e `revalidatePath("/admin")`.
- Novo client component `ExtraPotControl` (em `AdminControls.tsx`): input
  numérico em R$ (`step=0.01`) pré-preenchido com o `extra_pot` atual + botão
  "Salvar acúmulo extra", exibido na seção **"Jogo atual"** do admin enquanto o
  jogo não estiver resolvido.
- `PotDisplay` não muda — já mostra o valor somado sob "Bolão acumulado".

## Testes

Estender `src/lib/pot.test.ts`:

- `carriedExtra`: vazio → 0; acumula entre jogos; zera após acertador exato.
- `computePot` com os parâmetros de extra.

## Fora de escopo (YAGNI)

- Apenas o **jogo atual** no admin (sem editar extra de jogos passados).
- Sem UI de detalhamento (apostas vs extra) — só a soma.
