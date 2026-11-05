// STEP 1: this part never calls AWS. It reads a log file from datasets/.
import '../../../toolkit/guard-offline.js';
import fs from 'node:fs';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 3, part 1: read the event log';

export const LOG_FILE = new URL('../../../datasets/cloudtrail-leaked-key.jsonl', import.meta.url);

// Read the log: one JSON event per line, oldest first.
export function loadEvents(file = LOG_FILE) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)).sort((a, b) => a.eventTime.localeCompare(b.eventTime));
}

// STEP 2: count how many items give each key. countBy(['a', 'b', 'a'], (x) => x) -> [['a', 2], ['b', 1]].
// Biggest count first; when counts are equal, sort by key.
export function countBy(items, keyOf) {
  // YOUR TURN start
  // HINT: put the counts in a Map, then turn it into an array of [key, count] pairs and sort it.
  // YOUR TURN end
}

// STEP 3: for each access key, how many calls, from how many addresses and regions.
export function perKey(events) {
  return countBy(events, (e) => e.userIdentity.accessKeyId).map(([keyId, calls]) => {
    const mine = events.filter((e) => e.userIdentity.accessKeyId === keyId);
    return {
      keyId,
      who: mine[0].userIdentity.userName,
      calls,
      ips: countBy(mine, (e) => e.sourceIPAddress).map(([ip]) => ip).sort(),
      regions: countBy(mine, (e) => e.awsRegion).map(([region]) => region).sort(),
    };
  });
}

export async function run() {
  const events = loadEvents();
  const keys = perKey(events);
  const odd = keys.filter((k) => k.ips.length > 1);
  return {
    facts: [
      ['Events in the log', String(events.length)],
      ['Access keys seen', String(keys.length)],
      ['Keys used from more than one address', odd.map((k) => `${k.keyId} (${k.who})`).join(', ') || 'none'],
    ],
    head: ['Access key', 'Who', 'Calls', 'Source addresses', 'Regions', 'More than one address?'],
    rows: keys.map((k) => [k.keyId, k.who, k.calls, k.ips.join(' '), k.regions.join(' '), k.ips.length > 1 ? 'YES' : 'no']),
  };
}

main(import.meta.url, run);
