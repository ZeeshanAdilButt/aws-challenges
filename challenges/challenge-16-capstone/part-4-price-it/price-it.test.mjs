import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { largestLine, monthlyCost } from '../../../toolkit/models/cost.js';
import { LEVELS, costs, halveTheLargest } from './price-it.mjs';

test('three traffic levels: 100, 1000 and 5000 requests a second', () => assert.deepEqual(LEVELS, [100, 1000, 5000]));

test('the cost grows with traffic', () => {
  const [a, b, c] = costs().map((x) => x.total);
  assert.ok(a < b && b < c);
});

test('the total is the sum of its lines, to the cent', () => {
  for (const c of costs()) assert.equal(c.total, Math.round(c.lines.reduce((s, l) => s + l.dollars, 0) * 100) / 100);
});

test('the change names the largest line', () => {
  for (const rps of LEVELS) assert.equal(halveTheLargest(rps).line, largestLine(monthlyCost(rps)).name);
});

test('the change is measured: the saving is real', () => {
  const pick = halveTheLargest(5000);
  const before = monthlyCost(5000);
  const after = monthlyCost(5000, pick.overrides);
  assert.equal(pick.savedDollars, Math.round((before.total - after.total) * 100) / 100);
  assert.ok(pick.savedDollars > 0);
});

test('the change halves the largest line', () => {
  const pick = halveTheLargest(5000);
  const name = largestLine(monthlyCost(5000)).name;
  const was = monthlyCost(5000).lines.find((l) => l.name === name).dollars;
  const now = monthlyCost(5000, pick.overrides).lines.find((l) => l.name === name).dollars;
  assert.ok(now <= was / 2 + 0.01, `${now} should be about half of ${was}`);
  assert.ok(pick.change.length > 30);
});
