create table if not exists blocklist (
  google_place_id text primary key,
  name text not null,
  reason text,
  blocked_at timestamptz not null default now()
);

create index if not exists blocklist_blocked_at_idx on blocklist (blocked_at desc);

alter table blocklist enable row level security;
-- Only service role can read/write blocklist; no public policies needed.
