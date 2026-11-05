import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINE, cheapestUnder, leverTable, warmupTable } from './sweep.mjs';

const warm = warmupTable();
const levers = leverTable();

test('a slower warm-up always drops more requests', () => {
  for (let i = 1; i < warm.length; i++) assert.ok(warm[i].dropped > warm[i - 1].dropped);
});

test('with a 120 second warm-up and no schedule, no cooldown gets under the line', () => {
  assert.ok(levers.filter((l) => !l.scheduled).every((l) => l.dropPercent > LINE));
});

test('a scheduled minimum before the sale gets under the line', () => {
  assert.ok(levers.filter((l) => l.scheduled).some((l) => l.dropPercent <= LINE));
});

test('cooldown 0 flaps: it drops more in the second spike than cooldown 60', () => {
  const at = (scheduled, cd) => levers.find((l) => l.scheduled === scheduled && l.cooldownSeconds === cd);
  assert.ok(at(true, 0).dropped > at(true, 60).dropped);
});

test('cheapestUnder picks the cheapest row under the line', () => {
  const rows = [
    { dropPercent: 5, dollars: 1, dropped: 50 },
    { dropPercent: 1, dollars: 3, dropped: 10 },
    { dropPercent: 0, dollars: 4, dropped: 0 },
    { dropPercent: 1.5, dollars: 3, dropped: 15 },
  ];
  assert.deepEqual(cheapestUnder(rows, 2), rows[1]);
  assert.equal(cheapestUnder(rows, -1), null);
});

test('the answer for this sale', () => {
  const pick = cheapestUnder(levers, LINE);
  assert.equal(pick.scheduled, true);
  assert.equal(pick.cooldownSeconds, 60);
  assert.equal(pick.dropped, 0);
});
