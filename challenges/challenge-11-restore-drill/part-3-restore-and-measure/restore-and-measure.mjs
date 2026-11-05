// STEP 1: this part never calls AWS. It restores the database to one second before the drop and measures what it cost.
import '../../../toolkit/guard-offline.js';
import { restorePlan } from '../../../toolkit/models/restore.js';
import { main } from '../../../toolkit/part.js';
import { IMAGE, RESTORE, RESTORE_URL, connect, docker, sleep, toMs } from '../docker.mjs';
import { WRITES_PER_SECOND } from '../part-1-wal-and-write-load/wal-and-load.mjs';
import { drill as part2 } from '../part-2-drop-a-table/drop-a-table.mjs';

export const title = 'Challenge 11, part 3: restore and measure';

// STEP 2: tell Postgres how to recover (your turn). Return the lines to add to postgresql.auto.conf of the restored copy:
//   archive_mode = off                      (the copy must not write into the archive)
//   restore_command = 'cp /archive/%f %p'   (how to fetch an archived WAL file)
//   recovery_target_time = '<target>'       (stop replaying the log at this time)
//   recovery_target_action = 'promote'      (when it reaches the time, open for normal use)
export function recoveryLines(target) {
  // YOUR TURN start
  // HINT: each line is "name = 'value'". The file recovery.signal (made for you) tells Postgres to start in recovery.
  // YOUR TURN end
}

// STEP 3: restore. Provided. Copy the base backup into a new volume, add the recovery lines and recovery.signal, start a second
// container from the same image on port 15434, and time how long until it accepts queries.
export async function restoreTo(target) {
  const lines = recoveryLines(target).join('\n');
  docker(['rm', '-f', RESTORE], { allowFail: true });
  docker(['volume', 'rm', '-f', 'awr-restore'], { allowFail: true });
  docker(['run', '--rm', '-u', 'root', '-e', 'LINES', '-v', 'awr-restore:/restore', '-v', 'awr-archive:/archive:ro', IMAGE, 'sh', '-c',
    `cp -a /archive/base/. /restore/ && printf '%s\\n' "$LINES" >> /restore/postgresql.auto.conf && touch /restore/recovery.signal && chown -R postgres:postgres /restore && chmod 700 /restore`], { env: { ...process.env, LINES: lines } });
  const started = Date.now();
  docker(['run', '-d', '--name', RESTORE, '-e', 'POSTGRES_PASSWORD=daftar-local-only', '-v', 'awr-restore:/var/lib/postgresql/data', '-v', 'awr-archive:/archive:ro', '-p', '127.0.0.1:15434:5432', IMAGE]);
  const client = await connect(RESTORE_URL, 120);
  // Wait until recovery has finished and the copy is open for writes.
  for (let i = 0; i < 60; i++) {
    const { rows } = await client.query('select pg_is_in_recovery() as r');
    if (!rows[0].r) break;
    await sleep(500);
  }
  return { client, seconds: Math.round((Date.now() - started) / 100) / 10 };
}

// STEP 4: the target is one second before the drop, computed by the database. Provided.
export async function targetBefore(client, dropAt) {
  return (await client.query("select ($1::timestamptz - interval '1 second')::text as t", [dropAt])).rows[0].t;
}

export async function drill() {
  const d = await part2();
  const target = await targetBefore(d.client, d.dropAt);
  await d.client.end();
  const restored = await restoreTo(target);
  const { rows } = await restored.client.query('select count(*)::int as n from notes');
  const last = (await restored.client.query('select max(created_at)::text as t from notes')).rows[0].t;
  // The same question asked of the course model. The unit of time here is one second (the model works in any whole unit).
  const dropSecond = Math.floor(toMs(d.dropAt) / 1000);
  const modelled = restorePlan({ dropAt: dropSecond, restorableStart: dropSecond - 30, restorableEnd: dropSecond + 60, writesPerMinute: WRITES_PER_SECOND, sizeGb: 0.1, gbPerMinute: 1, fixedMinutes: 3 });
  return { ...d, target, restoredRows: rows[0].n, lastRestored: last, seconds: restored.seconds, lostWrites: d.rowsBefore - rows[0].n, modelled, restoredClient: restored.client };
}

export async function run() {
  const d = await drill();
  await d.restoredClient.end();
  return {
    facts: [
      ['Drop time', d.dropAt],
      ['Restore target', `${d.target} (one second before the drop)`],
      ['Rows before the drop', String(d.rowsBefore)],
      ['Rows after the restore', String(d.restoredRows)],
      ['Last restored note at', d.lastRestored],
      ['Time to restore (container start to ready)', `${d.seconds} seconds, for a tiny database; this says nothing about RDS speed`],
    ],
    head: ['', 'Measured', 'Course model (restorePlan, unit = 1 second)'],
    rows: [
      ['Writes lost', d.lostWrites, d.modelled?.lostWrites],
      ['Restore time (seconds)', d.seconds, d.modelled?.restoreMinutes],
    ],
    chart: { title: 'Writes lost: measured against the course model', unit: 'writes', bars: [{ label: 'measured', value: d.lostWrites }, { label: 'course model', value: d.modelled?.lostWrites ?? 0 }] },
  };
}

main(import.meta.url, run);
