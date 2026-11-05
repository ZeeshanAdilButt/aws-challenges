import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percentile } from '../../../toolkit/models/rightsize.js';
import { loadWeek, percentileOf, summarise } from './summarise.mjs';

const week = loadWeek();

test('percentileOf follows the nearest-rank rule', () => {
  const ten = [10, 3, 7, 1, 9, 2, 8, 4, 6, 5];
  assert.equal(percentileOf(ten, 0.5), 5);
  assert.equal(percentileOf(ten, 0.95), 10);
  assert.equal(percentileOf(ten, 0.1), 1);
  assert.equal(percentileOf([42], 0.95), 42);
});

test('percentileOf does not change the list it is given', () => {
  const values = [3, 1, 2];
  percentileOf(values, 0.5);
  assert.deepEqual(values, [3, 1, 2]);
});

test('the week has 168 hours for each of three services', () => {
  assert.deepEqual(Object.keys(week.services), ['api', 'worker', 'admin']);
  for (const hours of Object.values(week.services)) assert.equal(hours.length, 168);
});

test('the summary matches the course model for every service', () => {
  for (const hours of Object.values(week.services)) {
    const s = summarise(hours);
    const cpu = hours.map((h) => h.cpuPct);
    assert.equal(s.p95, percentile(cpu, 0.95));
    assert.equal(s.p50, percentile(cpu, 0.5));
    assert.equal(s.peak, Math.max(...cpu));
  }
});

test('the worker has a hot hour every night that p95 does not show', () => {
  const s = summarise(week.services.worker);
  assert.equal(s.hoursAbove60, 7);
  assert.ok(s.peak >= 80);
  assert.ok(s.p95 < 60);
});

test('the admin tool is almost idle', () => {
  const s = summarise(week.services.admin);
  assert.ok(s.p95 < 10);
  assert.equal(s.hoursAbove60, 0);
});
