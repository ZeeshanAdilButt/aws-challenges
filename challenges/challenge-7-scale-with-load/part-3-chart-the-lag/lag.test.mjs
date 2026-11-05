import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SALE_SCHEDULE, loadProfile, replay } from '../shared.mjs';
import { lag, worstShortfall } from './lag.mjs';

const { stepSeconds } = loadProfile();

test('lag on a small example', () => {
  const rows = [
    { t: 0, dropped: 0 },
    { t: 10, dropped: 5 },
    { t: 20, dropped: 0 },
    { t: 30, dropped: 9 },
    { t: 40, dropped: 0 },
  ];
  assert.deepEqual(lag(rows, 10), { startSecond: 10, endSecond: 40, seconds: 30 });
});

test('lag with no drops', () => {
  assert.deepEqual(lag([{ t: 0, dropped: 0 }], 10), { startSecond: null, endSecond: null, seconds: 0 });
});

test('plain target tracking is late for about two minutes at the first spike', () => {
  const plain = replay({ warmupSeconds: 120, cooldownSeconds: 300 });
  const l = lag(plain.timeline, stepSeconds);
  assert.ok(l.startSecond >= 480 && l.startSecond <= 500);
  assert.ok(l.seconds >= 120);
});

test('with a scheduled minimum the fleet is never late', () => {
  const planned = replay({ warmupSeconds: 120, cooldownSeconds: 60, scheduled: SALE_SCHEDULE });
  assert.equal(lag(planned.timeline, stepSeconds).seconds, 0);
});

test('the fleet is short of dozens of servers at the worst moment without a schedule', () => {
  assert.ok(worstShortfall(replay({ warmupSeconds: 120, cooldownSeconds: 300 }).timeline) >= 30);
});
