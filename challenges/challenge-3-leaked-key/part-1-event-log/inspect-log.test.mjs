import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { countBy, loadEvents, perKey } from './inspect-log.mjs';

const facts = JSON.parse(fs.readFileSync(new URL('../../../datasets/cloudtrail-leaked-key.facts.json', import.meta.url), 'utf8'));

test('countBy counts, biggest first, ties by key', () => {
  assert.deepEqual(countBy(['b', 'a', 'b', 'c', 'a', 'b'], (x) => x), [['b', 3], ['a', 2], ['c', 1]]);
  assert.deepEqual(countBy(['y', 'x'], (x) => x), [['x', 1], ['y', 1]]);
  assert.deepEqual(countBy([], (x) => x), []);
  assert.deepEqual(countBy([{ n: 1 }, { n: 2 }, { n: 1 }], (o) => o.n), [[1, 2], [2, 1]]);
});

test('the log has the expected number of events, oldest first', () => {
  const events = loadEvents();
  assert.equal(events.length, facts.totalEventsInLog);
  for (let i = 1; i < events.length; i++) assert.ok(events[i - 1].eventTime <= events[i].eventTime);
});

test('the leaked key has the most surprising profile: two source addresses', () => {
  const keys = perKey(loadEvents());
  const leaked = keys.find((k) => k.keyId === facts.leakedKey);
  assert.equal(leaked.calls, facts.eventsWithTheKey);
  assert.equal(leaked.ips.length, 2);
  assert.deepEqual(leaked.regions, facts.suspect.regions);
});

test('exactly one key is used from more than one address', () => {
  const odd = perKey(loadEvents()).filter((k) => k.ips.length > 1);
  assert.deepEqual(odd.map((k) => k.keyId), [facts.leakedKey]);
});
