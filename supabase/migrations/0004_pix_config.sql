-- Configurable PIX recipient per season (editable in /admin).
alter table seasons add column pix_name text not null default 'Deborah';
alter table seasons add column pix_key text not null default '62991711700';
