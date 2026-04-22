-- Run this entire file in your Supabase SQL Editor

create table if not exists users (
  id uuid primary key references auth.users(id),
  email text,
  squirrel_name text not null default 'Acorn',
  created_at timestamptz default now()
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  dose text,
  color text not null default '#d97706',
  created_at timestamptz default now()
);

create table if not exists medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references medications(id) on delete cascade,
  time_of_day time not null
);

create table if not exists medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  medication_id uuid references medications(id) on delete cascade,
  schedule_id uuid references medication_schedules(id),
  scheduled_at timestamptz not null,
  logged_at timestamptz,
  status text not null default 'pending',
  acorns_earned int not null default 0
);

create table if not exists acorn_balance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) unique,
  balance int not null default 0,
  lifetime_earned int not null default 0
);

create table if not exists streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) unique,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_compliant_date date
);

create table if not exists caregiver_links (
  id uuid primary key default gen_random_uuid(),
  caregiver_user_id uuid references users(id),
  patient_user_id uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists forest_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  item_id text not null,
  grid_x int,
  grid_y int,
  placed_at timestamptz default now()
);

-- RLS: users can only access their own data
alter table users enable row level security;
alter table medications enable row level security;
alter table medication_schedules enable row level security;
alter table medication_logs enable row level security;
alter table acorn_balance enable row level security;
alter table streaks enable row level security;
alter table caregiver_links enable row level security;
alter table forest_items enable row level security;

create policy "users: own data" on users for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "medications: own data" on medications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "schedules: own data" on medication_schedules for all using (
  exists (select 1 from medications where id = medication_id and user_id = auth.uid())
);
create policy "logs: own data" on medication_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "acorn_balance: own data" on acorn_balance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "streaks: own data" on streaks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "caregiver_links: own data" on caregiver_links for all using (auth.uid() = caregiver_user_id or auth.uid() = patient_user_id);
create policy "forest_items: own data" on forest_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
