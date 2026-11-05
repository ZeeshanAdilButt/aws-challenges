import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replay } from '../shared.mjs';
import { SETTINGS, perMinute } from './replay.mjs';

const result = replay(SETTINGS);
const minutes = perMinute(result.timeline);

test('thirty minutes in the profile', () => {
  assert.equal(minutes.length, 30);
  assert.deepEqual(minutes.map((m) => m.minute).slice(0, 3), [0, 1, 2]);
});

test('perMinute adds up to the same drops as the whole timeline', () => {
  assert.equal(minutes.reduce((sum, m) => sum + m.dropped, 0), result.dropped);
});

test('perMinute on a small example', () => {
  const rows = [
    { t: 0, offered: 100, wanted: 4, running: 4, pending: 0, dropped: 0 },
    { t: 50, offered: 300, wanted: 12, running: 4, pending: 8, dropped: 500 },
    { t: 60, offered: 200, wanted: 8, running: 5, pending: 7, dropped: 100 },
  ];
  assert.deepEqual(perMinute(rows), [
    { minute: 0, offeredAvg: 200, wanted: 12, running: 4, dropped: 500 },
    { minute: 1, offeredAvg: 200, wanted: 8, running: 5, dropped: 100 },
  ]);
});

test('the spike at minute 8 drops requests because new servers need 120 seconds', () => {
  assert.equal(minutes[7].dropped, 0);
  assert.ok(minutes[8].dropped > 0);
  assert.ok(minutes[9].dropped > 0);
});

test('the fleet grows to match a ten times spike, and no further', () => {
  assert.ok(result.peakRunning >= 40 && result.peakRunning <= 44);
});

test('quiet minutes drop nothing', () => {
  for (const m of minutes.slice(0, 7)) assert.equal(m.dropped, 0);
});
