// STEP 1: the guard first. This part writes 3,000 items to a table on the emulator, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { dynamodb as makeDynamo, resetEmulator } from '../../../toolkit/aws.js';
import { hotKeys, tally, topShare } from '../../../toolkit/models/dynamo.js';
import { main } from '../../../toolkit/part.js';
import { EVENTS, HOT, countFor, createActivityTable, makeLoad, writeAll } from '../shared.mjs';

export const title = 'Challenge 12, part 2: a skewed load';

export const TABLE = 'daftar-activity';
export const FACTOR = 2; // a key is hot when it takes more than 2 times its even share

// STEP 2: measure the spread (your turn). counts is { key: number of writes }.
// Return { keys, total, evenShare, top: { key, count, share }, hot } where
//   evenShare is total / keys, share is the top key's count divided by total (0 to 1), and hot is hotKeys(counts, FACTOR).
export function spread(counts) {
  // YOUR TURN start
  // HINT: hotKeys and tally are in toolkit/models/dynamo.js. The top key is the one with the biggest count.
  // YOUR TURN end
}

export async function drill() {
  const ddb = makeDynamo();
  await resetEmulator();
  await createActivityTable(ddb, TABLE);
  const load = makeLoad();
  await writeAll(ddb, TABLE, load);
  const counts = tally(load.map((e) => e.pk));
  const inTable = await countFor(ddb, TABLE, HOT);
  return { counts, spread: spread(counts), inTable };
}

export async function run() {
  const d = await drill();
  const s = d.spread;
  const top = Object.entries(d.counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return {
    facts: [
      ['Writes', `${EVENTS} to ${s.keys} partition keys (the load is made with seed 12)`],
      ['Even share', `${s.evenShare.toFixed(1)} writes a key`],
      ['Busiest key', `${s.top.key} with ${s.top.count} writes, ${(s.top.share * 100).toFixed(1)} percent of all`],
      ['Hot keys (more than 2 times the even share)', s.hot.join(', ') || 'none'],
      ['Items for the busiest key in the table', `${d.inTable} (the emulator agrees with the count)`],
      ['What the emulator cannot show', 'it does not throttle a busy partition, so the spread is measured by the course model, not by errors'],
    ],
    head: ['Key', 'Writes', 'Times the even share'],
    rows: top.map(([k, n]) => [k, n, (n / s.evenShare).toFixed(1)]),
    chart: { title: 'Writes for the five busiest keys', unit: 'writes', bars: top.map(([k, n]) => ({ label: k, value: n })) },
  };
}

main(import.meta.url, run);
