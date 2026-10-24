// Runs the real migrations in an in-process Postgres (PGlite) and tries to break the security rules.
// No Docker needed:  npm run test:db
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', 'migrations')
const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'

let db

// Minimal stand-in for what Supabase provides: roles, auth.users and auth.uid().
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`

before(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_STUB)
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'))
  }
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}')`)
})

after(async () => db.close())

/** Runs `fn` as an authenticated user (or anon when uid is null), then restores the superuser. */
async function as(uid, fn) {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false)` : 'set role anon')
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`)
  }
}

const rejects = (promise, pattern) => assert.rejects(promise, pattern)

test('every table has RLS enabled', async () => {
  const { rows } = await db.query(
    `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
  )
  assert.deepEqual(rows, [])
})

test('anon cannot read or write anything', async () => {
  for (const table of ['profiles', 'consents', 'medications', 'medication_times', 'plants', 'events']) {
    await as(null, () => rejects(db.query(`select * from public.${table}`), /permission denied/))
  }
})

test('profile: owner can create and read; under-18 is rejected', async () => {
  await as(A, () => db.query(`insert into public.profiles (user_id, display_name, date_of_birth) values ('${A}', 'Daniel', '1980-05-01')`))
  const { rows } = await as(A, () => db.query('select display_name from public.profiles'))
  assert.deepEqual(rows, [{ display_name: 'Daniel' }])

  const minor = new Date(); minor.setFullYear(minor.getFullYear() - 17)
  await as(B, () => rejects(
    db.query(`insert into public.profiles (user_id, display_name, date_of_birth) values ('${B}', 'Kid', '${minor.toISOString().slice(0, 10)}')`),
    /check/,
  ))
})

test('profile: name length and future dates are rejected', async () => {
  await as(B, () => rejects(db.query(`insert into public.profiles values ('${B}', '', '1980-01-01')`), /check/))
  await as(B, () => rejects(db.query(`insert into public.profiles values ('${B}', '${'x'.repeat(31)}', '1980-01-01')`), /check/))
  await as(B, () => rejects(db.query(`insert into public.profiles values ('${B}', 'Bee', '2999-01-01')`), /check/))
})

test("a user cannot read or modify another user's profile, or insert one for them", async () => {
  const { rows } = await as(B, () => db.query('select * from public.profiles'))
  assert.equal(rows.length, 0)
  const upd = await as(B, () => db.query(`update public.profiles set display_name = 'Hacked' where user_id = '${A}'`))
  assert.equal(upd.affectedRows, 0)
  await as(B, () => rejects(db.query(`insert into public.profiles values ('${A}', 'Fake', '1980-01-01')`), /row-level security/))
})

test('consents are insert-only and unique per notice version', async () => {
  await as(A, () => db.query(`insert into public.consents (user_id, notice_version) values ('${A}', 'v1')`))
  await as(A, () => rejects(db.query(`insert into public.consents (user_id, notice_version) values ('${A}', 'v1')`), /unique|duplicate/))
  await as(A, () => rejects(db.query(`update public.consents set notice_version = 'v2'`), /permission denied/))
  await as(A, () => rejects(db.query(`delete from public.consents`), /permission denied/))
})

test('medications: owner CRUD (soft delete), isolated from other users, no hard delete', async () => {
  const med = await as(A, () => db.query(`insert into public.medications (user_id, name, strength) values ('${A}', 'Amlodipine', '5 mg') returning id`))
  const id = med.rows[0].id
  await as(A, () => db.query(`update public.medications set deleted_at = now() where id = '${id}'`))
  assert.equal((await as(B, () => db.query('select * from public.medications'))).rows.length, 0)
  await as(A, () => rejects(db.query(`delete from public.medications where id = '${id}'`), /permission denied/))
  await as(A, () => rejects(db.query(`insert into public.medications (user_id, name) values ('${A}', '')`), /check/))
})

test('dose times: max four, no duplicates, and cannot attach to another user\'s medication', async () => {
  const { rows } = await as(A, () => db.query(`insert into public.medications (user_id, name) values ('${A}', 'Metformin') returning id`))
  const id = rows[0].id
  for (const t of ['08:00', '12:00', '16:00', '20:00']) {
    await as(A, () => db.query(`insert into public.medication_times (medication_id, user_id, time_of_day) values ('${id}', '${A}', '${t}')`))
  }
  await as(A, () => rejects(db.query(`insert into public.medication_times (medication_id, user_id, time_of_day) values ('${id}', '${A}', '22:00')`), /at most 4/))
  await as(A, () => rejects(db.query(`insert into public.medication_times (medication_id, user_id, time_of_day) values ('${id}', '${A}', '08:00')`), /unique|duplicate|at most/))
  // B tries to add a time to A's medication, claiming it as their own.
  await as(B, () => rejects(db.query(`insert into public.medication_times (medication_id, user_id, time_of_day) values ('${id}', '${B}', '09:00')`), /foreign key|violates/))
})

test('plants: only one growing plant per user, and a user cannot see others', async () => {
  await as(A, () => db.query(`insert into public.plants (user_id) values ('${A}')`))
  await as(A, () => rejects(db.query(`insert into public.plants (user_id) values ('${A}')`), /unique|duplicate/))
  await as(A, () => db.query(`update public.plants set completed_at = now() where user_id = '${A}'`))
  await as(A, () => db.query(`insert into public.plants (user_id) values ('${A}')`)) // next plant after completion
  assert.equal((await as(B, () => db.query('select * from public.plants'))).rows.length, 0)
})

test('events: insert-only, fixed names, small object props', async () => {
  await as(A, () => db.query(`insert into public.events (user_id, name, props) values ('${A}', 'app_open', '{}')`))
  await as(A, () => rejects(db.query(`insert into public.events (user_id, name) values ('${A}', 'made_up_event')`), /check/))
  await as(A, () => rejects(db.query(`insert into public.events (user_id, name, props) values ('${A}', 'app_open', '[1]')`), /check/))
  await as(A, () => rejects(db.query(`insert into public.events (user_id, name, props) values ('${A}', 'app_open', '{"x":"${'y'.repeat(2000)}"}')`), /check/))
  await as(A, () => rejects(db.query('select * from public.events'), /permission denied/))
  await as(B, () => rejects(db.query(`insert into public.events (user_id, name) values ('${A}', 'app_open')`), /row-level security/))
})

test('deleting an auth user removes all of their data', async () => {
  await db.exec(`delete from auth.users where id = '${A}'`)
  for (const table of ['profiles', 'consents', 'medications', 'medication_times', 'plants', 'events']) {
    const { rows } = await db.query(`select count(*)::int as n from public.${table} where user_id = '${A}'`)
    assert.equal(rows[0].n, 0, `${table} still has rows for the deleted user`)
  }
})
