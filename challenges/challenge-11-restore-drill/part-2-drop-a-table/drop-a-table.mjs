// STEP 1: this part never calls AWS. It repeats part 1 (backup and write load), then someone drops the table.
import '../../../toolkit/guard-offline.js';
import { main } from '../../../toolkit/part.js';
import { waitForArchive, drill as part1 } from '../part-1-wal-and-write-load/wal-and-load.mjs';
import { archiveFiles, sleep } from '../docker.mjs';

export const title = 'Challenge 11, part 2: drop a table';

// STEP 2: the mistake (your turn). Do three things in this order and return what you saw:
//   1. read the time on the DATABASE clock:  select clock_timestamp()::text
//   2. count the rows in notes
//   3. drop the table notes
// Return { dropAt, rowsBefore } where dropAt is the time text from step 1. This time is what you restore to (one second before it).
export async function dropTable(client) {
  // YOUR TURN start
  // HINT: use the database clock, not the clock of your computer, because the restore reads the database clock.
  // YOUR TURN end
}

// STEP 3: what the app sees after the drop, and making sure the WAL up to the drop is archived. Provided.
export async function afterDrop(client) {
  let error = null;
  try {
    await client.query('select count(*) from notes');
  } catch (e) {
    error = { code: e.code, message: e.message };
  }
  await client.query('select pg_switch_wal()');
  await waitForArchive(archiveFiles().length + 1, 20);
  return error;
}

export async function drill() {
  const p1 = await part1();
  // Provided. The restore target is one second before the drop, and the newest note that survives is the last one written at or before it.
  // Notes come every 50 ms, so if the drop lands in the first 100 ms of a second, that note can belong to the second before the target second.
  // Wait (on the database clock) until the drop is going to land later in its second, so the check on the target second cannot flake.
  for (;;) {
    const ms = (await p1.client.query("select (extract(milliseconds from clock_timestamp())::int % 1000) as ms")).rows[0].ms;
    if (ms >= 150) break;
    await sleep(150 - ms);
  }
  const dropped = await dropTable(p1.client);
  const error = await afterDrop(p1.client);
  return { ...p1, ...dropped, error };
}

export async function run() {
  const d = await drill();
  await d.client.end();
  return {
    facts: [
      ['Rows before the drop', String(d.rowsBefore)],
      ['Table dropped at (database clock)', d.dropAt],
      ['What the app sees next', d.error ? `error ${d.error.code}: ${d.error.message}` : 'nothing (no error)'],
      ['Restore target', 'one second before the drop (part 3)'],
    ],
    head: ['Item', 'Value'],
    rows: [['Drop time', d.dropAt], ['Postgres error code for "table does not exist"', '42P01']],
  };
}

main(import.meta.url, run);
