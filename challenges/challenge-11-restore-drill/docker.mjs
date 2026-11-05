// Small helpers for challenge 11. They start only containers made from postgres:17-alpine, which is already on the machine
// (the Compose service "postgres" and one short-lived "awr-restore" container). Nothing here touches AWS.
import { spawnSync } from 'node:child_process';
import pg from 'pg';

export const IMAGE = 'postgres:17-alpine';
export const SOURCE = 'awr-postgres';
export const RESTORE = 'awr-restore';
export const SOURCE_URL = 'postgres://postgres:daftar-local-only@127.0.0.1:15433/postgres';
export const RESTORE_URL = 'postgres://postgres:daftar-local-only@127.0.0.1:15434/postgres';

export function docker(args, options = {}) {
  const r = spawnSync('docker', args, { encoding: 'utf8', ...options });
  if (r.status !== 0 && !options.allowFail) throw new Error(`docker ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return (r.stdout ?? '').trim();
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connect(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      await client.query('select 1');
      return client;
    } catch {
      await client.end().catch(() => {});
      await sleep(500);
    }
  }
  throw new Error(`Could not connect to ${url.replace(/:[^:@]*@/, ':***@')}`);
}

// Remove only the database container and its archive volume (never the emulator, which shares the Compose project).
function removeSource() {
  docker(['rm', '-f', SOURCE, RESTORE], { allowFail: true });
  docker(['volume', 'rm', '-f', 'awr-archive'], { allowFail: true });
}

// Start (or restart) the source database with a clean data volume and archive volume.
export async function startSource() {
  removeSource();
  docker(['compose', '--profile', 'restore', 'up', '-d', 'postgres']);
  docker(['exec', '-u', 'root', SOURCE, 'chown', 'postgres:postgres', '/archive'], { allowFail: true });
  return connect(SOURCE_URL);
}

export const archived = () => docker(['exec', SOURCE, 'sh', '-c', 'ls /archive | grep -v base | grep -c .'], { allowFail: true }) || '0';
export const archiveFiles = () => docker(['exec', SOURCE, 'sh', '-c', 'ls /archive | grep -v base'], { allowFail: true }).split('\n').filter(Boolean);

export function stopAll() {
  docker(['rm', '-f', RESTORE], { allowFail: true });
  removeSource();
  docker(['volume', 'rm', '-f', 'awr-restore'], { allowFail: true });
}

// Postgres writes times like "2026-11-05 09:39:32.367094+00". JavaScript needs "T" and "+00:00".
export const toMs = (text) => Date.parse(text.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
