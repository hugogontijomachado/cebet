-- Valor acumulado extra (em dinheiro) que o admin injeta no bolão de um jogo.
-- Acumula junto com as apostas: entra no prêmio se houver vencedor, ou passa
-- para o próximo jogo se não houver (zera após qualquer acertador exato).
alter table games add column extra_pot numeric not null default 0;
