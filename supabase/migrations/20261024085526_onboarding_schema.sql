-- Onboarding schema: profile, consent, medications + dose times, plants, usage events.
--
-- Security model (see AGENTS.md):
--   * RLS is enabled on every table; each policy limits a signed-in user to their own rows.
--   * Access is granted explicitly to `authenticated` only. `anon` gets nothing.
--   * Deleting an auth user cascades to every row below (account + data deletion).
--   * Streaks and plant growth are NOT stored: they are derived on the device from dose logs.

-- ---------------------------------------------------------------------------
-- Shared helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per user. Under-18s are rejected by the CHECK, so no row is saved for them.
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  date_of_birth date not null check (date_of_birth <= (current_date - interval '18 years')::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- consents: append-only record of which privacy notice version the user accepted, and when.
-- ---------------------------------------------------------------------------
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notice_version text not null check (char_length(notice_version) between 1 and 32),
  accepted_at timestamptz not null default now(),
  unique (user_id, notice_version)
);

-- ---------------------------------------------------------------------------
-- medications: soft-deleted (deleted_at) so calendar history survives.
-- ---------------------------------------------------------------------------
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  strength text check (strength is null or char_length(strength) <= 50),
  frequency text check (frequency is null or char_length(frequency) <= 50),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id) -- lets child tables prove they share the owner
);

create index medications_user_id_idx on public.medications (user_id) where deleted_at is null;

create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- medication_times: daily dose times (1-4 per medication), in the user's local clock time.
-- The composite foreign key guarantees user_id matches the medication's owner.
-- ---------------------------------------------------------------------------
create table public.medication_times (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  time_of_day time not null,
  unique (medication_id, time_of_day),
  foreign key (medication_id, user_id)
    references public.medications (id, user_id) on delete cascade
);

create index medication_times_user_id_idx on public.medication_times (user_id);

create or replace function public.enforce_max_dose_times()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.medication_times where medication_id = new.medication_id) >= 4 then
    raise exception 'A medication can have at most 4 dose times'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger medication_times_max_four
  before insert on public.medication_times
  for each row execute function public.enforce_max_dose_times();

-- ---------------------------------------------------------------------------
-- plants: the growing plant (completed_at is null) and completed ones (the Forest).
-- Growth state is derived from dose logs on the device, so it is not stored here.
-- ---------------------------------------------------------------------------
create table public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  species text not null default 'sapling' check (char_length(species) between 1 and 32),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check (completed_at is null or completed_at >= started_at)
);

-- At most one growing plant per user.
create unique index plants_one_growing_per_user on public.plants (user_id) where completed_at is null;
create index plants_user_id_idx on public.plants (user_id, completed_at);

-- ---------------------------------------------------------------------------
-- events: pseudonymous product analytics. Fixed event names; no names, dates of birth,
-- medication names or locations may be placed in props (also enforced in app code).
-- ---------------------------------------------------------------------------
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name in (
    'onboarding_step', 'onboarding_completed', 'app_open',
    'dose_logged', 'plant_completed', 'reminder_scheduled', 'reminder_opened'
  )),
  props jsonb not null default '{}'::jsonb
    check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 1024),
  created_at timestamptz not null default now()
);

create index events_user_id_created_idx on public.events (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Row-Level Security: owner-only. `(select auth.uid())` is evaluated once per statement.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.consents enable row level security;
alter table public.medications enable row level security;
alter table public.medication_times enable row level security;
alter table public.plants enable row level security;
alter table public.events enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "consents: read own" on public.consents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "consents: insert own" on public.consents
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "medications: read own" on public.medications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "medications: insert own" on public.medications
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "medications: update own" on public.medications
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "medication_times: read own" on public.medication_times
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "medication_times: insert own" on public.medication_times
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "medication_times: update own" on public.medication_times
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "medication_times: delete own" on public.medication_times
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "plants: read own" on public.plants
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "plants: insert own" on public.plants
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "plants: update own" on public.plants
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Events are write-only from the app; analysis happens in the dashboard.
create policy "events: insert own" on public.events
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants: least privilege. Reset whatever the project's default privileges handed out (the
-- dashboard's "automatically expose new tables" option), then grant only what the app needs.
-- Nothing for `anon`; no DELETE except dose times.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.consents, public.medications,
  public.medication_times, public.plants, public.events from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.consents to authenticated;
grant select, insert, update on public.medications to authenticated;
grant select, insert, update, delete on public.medication_times to authenticated;
grant select, insert, update on public.plants to authenticated;
grant insert on public.events to authenticated;
