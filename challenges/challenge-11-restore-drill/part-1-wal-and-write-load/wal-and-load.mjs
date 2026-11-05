// STEP 1: this part never calls AWS. It starts the Postgres stand-in (the Compose service "postgres", image postgres:17-alpine).
// RDS point-in-time restore is built on the same idea: a base backup plus the log of every change (the WAL).
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { archiveFiles, docker, SOURCE, sleep, startSource } from '../docker.mjs';

export const title = 'Challenge 11, part 1: WAL archiving and a write load';

export const WRITES_PER_SECOND = 20;
export const LOAD_SECONDS = 8;

// STEP 2: the table and one insert (your turn).
// createNotes(client): a table "notes" with id (bigserial primary key), body (text) and created_at (timestamptz that defaults to clock_timestamp()).
// insertNote(client, n): add a note whose body is "note <n>".
export async function createNotes(client) {
  // YOUR TURN start
  // HINT: clock_timestamp() gives the real time of each row. now() would give the same time for a whole transaction.
  // YOUR TURN end
}

export async function insertNote(client, n) {
  // YOUR TURN start
  // YOUR TURN end
}

// STEP 3: a base backup (a full copy of the database files, taken while it runs) into the archive volume. Provided.
export function takeBaseBackup() {
  docker(['exec', '-u', 'postgres', SOURCE, 'pg_basebackup', '-D', '/archive/base', '-Fp', '-X', 'fetch', '-c', 'fast']);
}

// STEP 4: write one note every 50 ms (20 a second) for LOAD_SECONDS. Provided.
export async function writeLoad(client, seconds = LOAD_SECONDS) {
  const total = seconds * WRITES_PER_SECOND;
  const begin = Date.now();
  for (let n = 1; n <= total; n++) {
    await insertNote(client, n);
    await sleep(Math.max(0, begin + (n * 1000) / WRITES_PER_SECOND - Date.now())); // keep to the schedule, whatever the query took
  }
  return total;
}

export async function waitForArchive(minFiles = 1, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const files = archiveFiles();
    if (files.length >= minFiles) return files;
    await sleep(1000);
  }
  return archiveFiles();
}

export async function drill() {
  const client = await startSource();
  await createNotes(client);
  takeBaseBackup();
  const written = await writeLoad(client);
  await client.query('select pg_switch_wal()');
  const files = await waitForArchive(1);
  const { rows } = await client.query('select count(*)::int as n, min(created_at)::text as first, max(created_at)::text as last from notes');
  const setting = (await client.query("select current_setting('archive_mode') as mode, current_setting('wal_level') as level")).rows[0];
  return { client, written, files, count: rows[0].n, first: rows[0].first, last: rows[0].last, setting };
}

export async function run() {
  const d = await drill();
  await d.client.end();
  return {
    facts: [
      ['Stand-in', 'postgres:17-alpine in Docker; RDS runs the same engine, and its point-in-time restore uses the same two ingredients'],
      ['Settings', `wal_level ${d.setting.level}, archive_mode ${d.setting.mode}, a WAL file is archived at least every 5 seconds`],
      ['Notes written', `${d.written} in ${LOAD_SECONDS} seconds (${WRITES_PER_SECOND} a second)`],
      ['Notes in the table', String(d.count)],
      ['WAL files archived', `${d.files.length}: ${d.files.slice(0, 3).join(', ')}${d.files.length > 3 ? ', ...' : ''}`],
    ],
    head: ['Item', 'Value'],
    rows: [['First note at', d.first], ['Last note at', d.last]],
  };
}

main(import.meta.url, run);
