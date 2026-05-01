-- Feature 1: compliments (publiek) na check-in
create table if not exists compliments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references restaurants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  text varchar(140) not null,
  created_at timestamptz not null default now()
);

create index if not exists compliments_restaurant_id_created_at_idx
  on compliments (restaurant_id, created_at desc);

alter table compliments enable row level security;

create policy "compliments_select_all"
  on compliments for select
  using (true);

create policy "compliments_insert_anyone"
  on compliments for insert
  with check (true);

-- Feature 2: prive notitie op de bestaande check-in
alter table checkins
  add column if not exists journal_note text;
