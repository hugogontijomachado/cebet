-- Palpites não pagos são excluídos ao encerrar as apostas (início do jogo).
-- Soft-exclude: o registro permanece, mas é ocultado e ignorado na pontuação/bolão.
alter table bets add column excluded boolean not null default false;
