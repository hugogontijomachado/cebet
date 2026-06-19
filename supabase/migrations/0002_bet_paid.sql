-- Track whether each bet (R$ stake) was paid.
alter table bets add column paid boolean not null default false;
