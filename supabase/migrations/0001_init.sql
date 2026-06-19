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
