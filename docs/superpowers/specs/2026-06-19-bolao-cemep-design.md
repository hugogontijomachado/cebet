# Bolão CEMEP — Design

**Data:** 2026-06-19
**Status:** Aprovado (aguardando revisão final do spec)

## Resumo

App web para o bolão de placares da empresa (CEMEP). As pessoas acessam por um
link no próprio celular, escolhem seu nome e palpitam o placar de uma partida.
Os jogos acontecem em sequência dentro de uma **temporada**, com uma tabela de
pontos que acumula e um **pote em dinheiro** que acumula até alguém cravar um
placar exato. Há um admin (protegido por PIN) que conduz os jogos. Tudo ao vivo,
com animação para o ganhador.

Fonte de verdade visual: `DESIGN.md` (linguagem "Sentri-inspired" — canvas
violeta midnight, accent lime, accent pink). Marca: CEMEP (logo em `docs/logo.png`,
gradiente azul-marinho/violeta, compatível com a paleta).

## Objetivos

- Qualquer pessoa palpita pelo celular, sem cadastro/login — só escolhe o nome.
- Visual atraente, com as **bandeiras** das equipes em destaque.
- Temporada com vários jogos: pontos acumulam, pote acumula.
- Apuração automática do ganhador do jogo e do campeão geral.
- Atualização **ao vivo** (palpites entrando, resultado/animação para todos juntos).
- Admin simples para conduzir tudo.
- Arquitetura ultra-simples de operar.

## Não-objetivos (v1)

- Escudos de clube / upload de imagem de bandeira (v1 usa bandeiras de país embutidas).
- Login/contas individuais por usuário.
- Múltiplas temporadas simultâneas (uma temporada ativa por vez).
- Pagamento/cobrança real do dinheiro (o app só *calcula e exibe* o pote).
- Rodada com várias partidas simultâneas no mesmo palpite (um jogo = uma partida).

## Stack & Arquitetura

- **Next.js (App Router) + TypeScript**, deploy na **Vercel**.
- **Supabase**: Postgres + Realtime.
  - Leituras públicas e **inserção de palpite** via *anon key* com RLS permissiva.
  - **Ações de admin** rodam no servidor (server actions) com a *service role key*,
    nunca exposta ao browser, liberadas por PIN.
- **Tailwind CSS**, com os tokens do `DESIGN.md` mapeados para o tema.
- **canvas-confetti** para a animação do ganhador.

### Decisão de arquitetura

Escolhida a abordagem com **Realtime** (vs. polling/refresh, vs. tela-única
localStorage). Justificativa: o usuário quer todos no próprio celular e uma
temporada com pontos acumulando — isso exige estado compartilhado online; e o
Realtime é o que entrega a sensação ao vivo (palpites entrando, animação do
vencedor disparando para todos ao mesmo tempo) com baixo custo operacional.

## Modelo de Dados (Postgres / Supabase)

### `seasons` (temporada)
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid (pk) | |
| `name` | text | ex: "Copa CEMEP 2026" |
| `bet_value` | numeric(10,2) | valor por aposta; padrão `5.00` |
| `status` | text | `active` \| `closed` |
| `champion_participant_id` | uuid (fk participants, null) | preenchido ao encerrar |
| `created_at` | timestamptz | |

Regra de negócio: no máximo **uma** temporada com `status = 'active'` por vez.

### `participants` (lista aberta)
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid (pk) | |
| `season_id` | uuid (fk seasons) | |
| `name` | text | exibido na lista |
| `created_at` | timestamptz | |

Identidade dentro da temporada por `(season_id, lower(trim(name)))` único — evita
duplicar a mesma pessoa. "Sou novo" cria um participant; jogos seguintes a pessoa
se escolhe na lista.

### `games` (jogo / partida)
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid (pk) | |
| `season_id` | uuid (fk seasons) | |
| `order` | int | ordem do jogo na temporada |
| `team_a_name` | text | |
| `team_a_flag` | text | código do país (ex: `BR`) → bandeira embutida |
| `team_b_name` | text | |
| `team_b_flag` | text | |
| `status` | text | `open` \| `closed` \| `resolved` |
| `result_a` | int (null) | placar real, preenchido na apuração |
| `result_b` | int (null) | |
| `exact_winner_id` | uuid (fk participants, null) | quem cravou (se houver) |
| `pot_amount` | numeric(10,2) (null) | foto do pote no momento da apuração |
| `created_at` | timestamptz | |

### `bets` (palpite)
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid (pk) | |
| `game_id` | uuid (fk games) | |
| `participant_id` | uuid (fk participants) | |
| `pred_a` | int | placar palpitado time A |
| `pred_b` | int | placar palpitado time B |
| `points` | int (null) | calculado na apuração |
| `created_at` | timestamptz | |

Único por `(game_id, participant_id)` — 1 palpite por pessoa por jogo, **editável
enquanto o jogo está `open`** (re-enviar sobrescreve via upsert).

### RLS (políticas)
- `SELECT` público em todas as tabelas.
- `INSERT`/`UPDATE` em `bets` permitido ao *anon* **somente** quando o jogo alvo
  está `open` (checado por policy que consulta `games.status`).
- `INSERT` em `participants` permitido ao *anon* (entrada "sou novo") na temporada ativa.
- Demais escritas (seasons, games, apuração) **somente** via service role no servidor.

## Regras de Negócio

### Pontuação por jogo (ajustável em config)
Avaliada na apuração comparando `(pred_a, pred_b)` com `(result_a, result_b)`:

1. **Placar exato** → **5 pts** e é o **ganhador do jogo** (leva o pote).
2. Acertou o **vencedor e o saldo de gols** (mas não o placar) → **3 pts**.
   - "saldo" = `pred_a - pred_b == result_a - result_b` com mesmo lado vencedor/empate.
3. Acertou **só o vencedor** (ou que foi empate) → **2 pts**.
4. Acertou o **número de gols de um dos times** → **1 pt**.
5. Nada → **0**.

A pessoa recebe o maior nível aplicável (não soma níveis). Os valores ficam numa
constante de config para fácil ajuste.

### Pote (dinheiro)
- `pote = bet_value × (nº de palpites acumulados desde o último ganhador exato)`,
  somando todos os jogos resolvidos sem ganhador exato + o jogo atual.
- **Cravou o placar exato:** ganhador leva o pote; ele zera e recomeça no próximo jogo.
- **Ninguém cravou:** pote **acumula** para o próximo jogo.
- Na apuração, grava-se `pot_amount` no jogo (foto histórica) e, se houve ganhador,
  o pote efetivamente "pago".
- **Fim da temporada** com pote ainda acumulado: o **campeão em pontos** leva o
  pote restante.

### Vencedores
- **Ganhador do jogo:** quem cravou o placar exato (pode haver mais de um — todos
  cravaram igual; nesse caso dividem o pote; exibidos juntos na animação).
- **Campeão geral (fim da temporada):** maior soma de `points` na temporada.
  Empate no topo → exibidos como co-campeões (dividem o pote restante).

## Telas & Fluxo

### `/` — Jogo atual (canvas violeta escuro — clima "arena")
- Partida em destaque: bandeiras grandes dos dois times + nomes.
- **Pote acumulado** em destaque (R$).
- Formulário de palpite:
  - Escolher o próprio nome na **lista** (radios/botões) **ou** "sou novo" + nome.
  - Digitar placar `[A] x [B]`.
  - Enviar (upsert).
- **Ao vivo:** lista de **quem já palpitou** (apenas nomes). Os **palpites em si
  ficam ocultos** até a apuração (anti-cópia).
- Estados: `open` (aceitando), `closed` (palpites encerrados, aguardando resultado),
  `resolved` (mostra resultado + ganhador + animação).
- Se não há temporada/jogo ativo: tela "aguardando o próximo jogo".

### `/temporada` — Tabela de pontos (canvas claro — denso)
- Ranking acumulado (nome, pontos, jogos cravados).
- Histórico de jogos com resultado e quem cravou cada um.
- Indicação do pote atual acumulado.

### `/admin` — Painel (protegido por PIN; canvas claro)
- Criar temporada (nome + valor da aposta, padrão R$ 5).
- Cadastrar jogo: nomes dos dois times + seletor de **bandeiras de país**.
- **Encerrar palpites** (`open` → `closed`).
- **Lançar resultado** (`closed` → `resolved`): grava placar, calcula pontos de
  todos, define ganhador(es) e pote → dispara animação para todos.
- **Novo jogo**.
- **Encerrar temporada** (`active` → `closed`): coroa campeão geral + animação.

## Realtime & Animações

- Canal Realtime assinando `bets` (insert/update) do jogo atual → nomes entrando ao vivo.
- Canal assinando `games` (update) → quando vira `resolved`, todos os clientes
  recebem e disparam **confetti + nome do ganhador** (ou banner "Acumulou!" se
  ninguém cravou).
- Ao encerrar a temporada (`seasons` update), animação maior para o **campeão geral**.

## Admin & Segurança

- PIN único em variável de ambiente `ADMIN_PIN`. Admin digita uma vez → cookie
  (httpOnly, assinado). Qualquer um com o PIN é admin — suficiente para o contexto
  interno da empresa.
- Service role key **somente** no servidor (server actions). Nunca enviada ao cliente.
- Validação de entrada nas server actions (placares inteiros ≥ 0, nome não vazio).

## Bandeiras (v1)

- Seletor embutido de **bandeiras de países** (foco em bolão de seleção/Copa).
  Implementação por código de país (ex: `BR`) renderizado como bandeira (emoji
  regional ou conjunto SVG embutido — decidir no plano, sem dependência externa
  de CDN para não quebrar offline/CSP).
- Upload de escudo de clube fica para versão futura (não-objetivo do v1).

## Testes

- **TDD na lógica de pontos** (`scoring`): cobre os 5 níveis e casos de borda
  (empate, saldo igual mas lado diferente, um time certo).
- **TDD no cálculo do pote** (`pot`): acúmulo entre jogos, reset ao cravar,
  pote restante no fim da temporada.
- Testes das **server actions de apuração**: cenários cravou / acumulou / fim de
  temporada / co-vencedores.
- Lógica de regras isolada em módulos puros (sem dependência de Supabase) para
  ser testável sem rede.

## Riscos & Mitigações

- **Dois palpites simultâneos da mesma pessoa:** constraint único `(game_id,
  participant_id)` + upsert resolve.
- **Admin lança resultado antes de encerrar palpites:** a action de "lançar
  resultado" só aceita jogo `closed`; UI obriga encerrar antes.
- **Nome digitado diferente entre jogos:** mitigado pela lista aberta (escolhe da
  lista) + unicidade case-insensitive ao criar participant.
- **PIN vazado:** escopo interno, baixo risco; PIN trocável por env var.
