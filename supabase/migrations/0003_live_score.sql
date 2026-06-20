-- Preliminary / live score the admin updates during the match (before resolving).
alter table games add column live_a int;
alter table games add column live_b int;
