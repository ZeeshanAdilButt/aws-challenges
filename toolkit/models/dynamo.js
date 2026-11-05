// DynamoDB request units and the hot key check. Mirrors unit rounding for requests and the idea of a hot key.
// The unit sizes are the exercise's own rules, from the DynamoDB developer guide on read and write operations (dossier D11):
// a read unit covers 4 KB, a write unit covers 1 KB, both rounded up; eventual reads cost half; transactions cost double.
// On-demand prices, us-east-1, read 2026-10-24 (D12, VERIFIED): 0.625 dollars per million write units, 0.125 per million read units.
// Not sourced: the per-partition limits (3,000 read and 1,000 write units a second are commonly quoted, UNVERIFIED).

export const DYNAMO_PRICES = { writePerMillion: 0.625, readPerMillion: 0.125 };

export function unitsFor(itemKb, kind) {
  const blocks = (size) => Math.max(1, Math.ceil(size - 1e-9));
  switch (kind) {
    case 'read-strong': return blocks(itemKb / 4);
    case 'read-eventual': return blocks(itemKb / 4) / 2;
    case 'read-transactional': return blocks(itemKb / 4) * 2;
    case 'write': return blocks(itemKb);
    case 'write-transactional': return blocks(itemKb) * 2;
    default: throw new Error(`Unknown kind: ${kind}`);
  }
}

// Keys whose count is above factor times the even share (total divided by the number of keys), busiest first.
export function hotKeys(counts, factor) {
  const keys = Object.keys(counts);
  const total = keys.reduce((sum, key) => sum + counts[key], 0);
  if (!keys.length || total === 0) return [];
  const limit = (factor * total) / keys.length;
  return keys.filter((key) => counts[key] > limit).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
}

// The share (0 to 1) of all requests that the busiest key takes.
export function topShare(counts) {
  const values = Object.values(counts);
  const total = values.reduce((a, b) => a + b, 0);
  return total ? Math.max(...values) / total : 0;
}

// Write sharding: one busy key becomes `shards` keys by adding a suffix. pick is a number in [0, 1) from a random source.
export const shardedKey = (key, shards, pick) => `${key}#${Math.floor(pick * shards)}`;

// Count requests per key.
export function tally(keys) {
  const counts = {};
  for (const key of keys) counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}
