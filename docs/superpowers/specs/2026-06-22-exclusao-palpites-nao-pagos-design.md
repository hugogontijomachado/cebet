# Exclusão automática de palpites não pagos no início do jogo

**Data:** 2026-06-22
**Status:** aprovado, pronto para planejamento

## Problema

Hoje, ao encerrar as apostas (`closeBetting`), todos os palpites do jogo seguem
valendo — inclusive os de quem ainda não pagou. Quem não pagou continua na
classificação, conta para o bolão e pode até ganhar. A cobrança fica para depois
do apito (componente `PixWhenUnpaid`).

Queremos uma regra clara: **pagou antes do apito ou está fora**. Ao iniciar a
partida, palpites não pagos são automaticamente excluídos — não valem pontos nem
entram no bolão —, e essa regra precisa aparecer em `/regras`.

## Decisões tomadas

- **Soft-exclude, reversível.** O palpite não é apagado: ganha um estado
  `excluded`. Continua no banco, oculto e ignorado, mas restaurável.
- **Restaurar = marcar pago.** Se a pessoa pagar em cima da hora, o admin marca
  o palpite como pago e ele volta a valer (a própria ação limpa `excluded`).
- **Admin enxerga os excluídos** esmaecidos no fim da tabela, com o toggle de
  pagamento servindo de "restaurar". O público não os vê.

## Modelo de dados

Nova coluna em `bets`:

```sql
ALTER TABLE bets ADD COLUMN excluded boolean NOT NULL DEFAULT false;
```

- `default false` → jogos `open` nunca têm ninguém excluído; nenhum registro
  existente é afetado.
- Aplicar com o Supabase MCP (`apply_migration`) **e** commitar o SQL em
  `supabase/migrations/`.
- Refletir o campo em `Bet` (`src/lib/types.ts`).

## Comportamento

### Gatilho — `closeBetting(gameId)` (`src/app/actions/admin.ts`)

Além de `open → closed` + placar `0×0`, executar:

```sql
UPDATE bets SET excluded = true WHERE game_id = :gameId AND paid = false;
```

Palpites já pagos permanecem `excluded = false`.

### Reversão — `setBetPaid(betId, paid)`

Quando `paid = true`, gravar também `excluded = false` (pagar restaura).
Quando `paid = false`, não re-excluir (mantém `excluded` como está). Uma vez
restaurado, o palpite continua visível mesmo que o admin desmarque o pagamento —
caso de borda aceitável.

### O que "excluído" significa — ignorado em tudo que conta

| Local | Mudança |
|-------|---------|
| `getCurrentPot` (contagem do jogo atual) | contar só `excluded = false` |
| `getResolvedSummaries` (`bets(count)`) | contar só `excluded = false` |
| `resolveGame` (cálculo de pontos + `rows.length` do bolão) | buscar só `excluded = false`; excluídos ficam com `points = null` |
| `getLeaderboard` | ignorar bets `excluded` |
| Standings ao vivo (`PredictionsTable`) | fora da classificação e da contagem "Palpites · N" |

A lógica pura (`pot.ts`, `scoring.ts`) **não muda** — a exclusão é filtragem na
borda (queries e server actions). As funções continuam recebendo apenas os
palpites válidos.

> Nota de implementação: o `bets(count)` embutido em `getResolvedSummaries`
> precisa filtrar a tabela embutida por `excluded = false`. Verificar o
> comportamento exato do PostgREST com um seed throwaway antes de fechar.

### Exibição

`getGameBets` passa a retornar o flag `excluded` em cada `BetView`. Consumidores
decidem:

- **`PredictionsTable`**
  - Não-admin: filtra `excluded` fora (some da tabela, da contagem e da
    classificação).
  - Admin: mostra os válidos normalmente e, ao final, os excluídos esmaecidos /
    riscados, separados por um divisor "excluídos". O toggle ✅/❌ de pagamento
    funciona como "restaurar" (marcar pago → desexclui → o palpite reaparece na
    lista válida na próxima atualização realtime).
  - "Palpites · N" conta apenas os válidos.
  - A query de refetch realtime (inline no componente) também precisa trazer
    `excluded`.
- **`page.tsx` (home)** — `allPaid` passa a olhar só os não-excluídos. Após o
  apito, os não pagos viram excluídos e sobram só os pagos → `allPaid = true` →
  o `PixWhenUnpaid` de baixo se esconde sozinho, de forma consistente com a nova
  regra.
- **`/jogo/[id]`** — herda o mesmo comportamento de `PredictionsTable`
  (admin vê excluídos e pode restaurar; público não vê).

### Regras (`/regras`)

Nova seção, depois de "O bolão (dinheiro)":

> **Pagamento** — pague seu palpite **antes do apito inicial**. Quando o jogo
> começa, os palpites **não pagos são automaticamente excluídos**: não valem
> pontos nem entram no bolão. Se pagar em cima da hora, o palpite pode ser
> restaurado.

## Realtime

`closeBetting` faz um `UPDATE` em massa nos bets do jogo, o que dispara o canal
`postgres_changes` de `bets` que o `PredictionsTable` já escuta. O refetch
recarrega a lista com `excluded`, então os palpites não pagos somem da visão
pública ao vivo no momento do apito, sem refresh manual.

## Testes

- Lógica pura (`pot.test.ts`, `scoring.test.ts`) permanece válida — sem mudança
  de assinatura.
- Verificação de runtime via seed throwaway (service-role key), conforme
  `CLAUDE.md`: criar temporada `status='closed'` + jogo + participantes,
  exercitar `closeBetting` → conferir `excluded`, bolão e standings, exercitar
  restauração via `setBetPaid`, e apagar tudo ao final. Nunca tocar a temporada
  ativa.

## Fora de escopo (YAGNI)

- Nenhuma tela nova de gestão de excluídos — a reversão usa a UI de pagamento já
  existente.
- Sem histórico/auditoria de exclusões.
- Sem re-exclusão automática ao desmarcar pagamento.
```
