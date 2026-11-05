// STEP 1: the guard first. This part writes 3,000 items to a table on the emulator, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { dynamodb as makeDynamo, resetEmulator } from '../../../toolkit/aws.js';
import { hotKeys, shardedKey, tally, topShare } from '../../../toolkit/models/dynamo.js';
import { main } from '../../../toolkit/part.js';
import { rng } from '../../../toolkit/random.js';
import { HOT, countFor, createActivityTable, makeLoad, writeAll } from '../shared.mjs';

export const title = 'Challenge 12, part 3: the key fix';

export const TABLE = 'daftar-activity-sharded';
export const SHARDS = 30;

// STEP 2: write sharding (your turn). Return the partition key to use for an event.
// A key that is in `hot` is split into SHARDS keys by a random suffix: 'class-7' becomes 'class-7#0' to 'class-7#29'.
// Other keys stay as they are. random is a function that returns a number in [0, 1).
export function shardKeyFor(event, hot, random) {
  // YOUR TURN start
  // HINT: shardedKey(key, shards, pick) in toolkit/models/dynamo.js adds the suffix.
  // YOUR TURN end
}

// STEP 3: reading a split key means asking all its shards and joining the answers. Provided.
export async function readLogical(ddb, table, key, shards = SHARDS) {
  const parts = await Promise.all(Array.from({ length: shards }, (_, i) => ddb.send(new QueryCommand({
    TableName: table, KeyConditionExpression: 'pk = :p', ExpressionAttributeValues: { ':p': { S: `${key}#${i}` } },
  }))));
  return parts.flatMap((p) => p.Items.map((it) => it.sk.S)).sort();
}

export async function drill() {
  const ddb = makeDynamo();
  await resetEmulator();
  await createActivityTable(ddb, TABLE);
  const load = makeLoad();
  const before = tally(load.map((e) => e.pk));
  const hot = hotKeys(before, 2);
  const random = rng(99).next;
  const sharded = load.map((e) => ({ pk: shardKeyFor(e, hot, random), sk: e.sk }));
  await writeAll(ddb, TABLE, sharded);
  const after = tally(sharded.map((e) => e.pk));
  const logical = await readLogical(ddb, TABLE, HOT);
  return { before, after, hot, logicalCount: logical.length, expectedLogical: before[HOT], onShard0: await countFor(ddb, TABLE, `${HOT}#0`) };
}

export async function run() {
  const d = await drill();
  const evenBefore = 3000 / Object.keys(d.before).length;
  const evenAfter = 3000 / Object.keys(d.after).length;
  const topAfter = Object.entries(d.after).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return {
    facts: [
      ['Hot keys found', d.hot.join(', ')],
      ['Keys before and after', `${Object.keys(d.before).length} and ${Object.keys(d.after).length}`],
      ['Busiest key before', `${(topShare(d.before) * 100).toFixed(1)} percent of all writes (${(Math.max(...Object.values(d.before)) / evenBefore).toFixed(1)} times the even share)`],
      ['Busiest key after', `${(topShare(d.after) * 100).toFixed(1)} percent (${(Math.max(...Object.values(d.after)) / evenAfter).toFixed(1)} times the even share)`],
      ['Hot keys after', hotKeys(d.after, 2).join(', ') || 'none'],
      ['Reading class-7 now', `${SHARDS} queries instead of 1, ${d.logicalCount} items found (expected ${d.expectedLogical})`],
      ['What the emulator cannot show', 'it does not throttle a busy partition, so the spread is measured by the course model'],
    ],
    head: ['Key', 'Writes after the fix'],
    rows: topAfter.map(([k, n]) => [k, n]),
    chart: {
      title: 'Share of all writes taken by the busiest key (percent)',
      unit: '%',
      format: (v) => v.toFixed(1),
      bars: [{ label: 'before the fix', value: topShare(d.before) * 100 }, { label: 'after the fix', value: topShare(d.after) * 100 }],
    },
  };
}

main(import.meta.url, run);
