import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAlarm, judgeAlarm, replayAlarm } from './alarm.js';

const ev = (points, m, n, treat, prev) => evaluateAlarm({ points, threshold: 5, m, n, treat, prev });

test('1 of 1 on a calm series is OK', () => assert.equal(ev([1, 2, 3], 1, 1, 'missing'), 'OK'));
test('only the last point is read when n is 1', () => assert.equal(ev([1, 9, 3], 1, 1, 'missing'), 'OK'));
test('3 of 3 needs all three', () => assert.equal(ev([9, 9, 1], 3, 3, 'missing'), 'OK'));
test('2 of 3 fires on two of three', () => assert.equal(ev([9, 1, 9], 2, 3, 'missing'), 'ALARM'));
test('a missing point breaching counts', () => assert.equal(ev([9, null, 9], 3, 3, 'breaching'), 'ALARM'));
test('a missing point notBreaching does not', () => assert.equal(ev([9, null, 9], 3, 3, 'notBreaching'), 'OK'));
test('all missing with treat missing is INSUFFICIENT_DATA', () => assert.equal(ev([null, null, null], 2, 3, 'missing'), 'INSUFFICIENT_DATA'));
test('all missing with notBreaching is OK', () => assert.equal(ev([null, null, null], 2, 3, 'notBreaching'), 'OK'));
test('all missing with ignore keeps the previous state', () => assert.equal(ev([null, null, null], 2, 3, 'ignore', 'ALARM'), 'ALARM'));
test('fewer points than n are padded with missing', () => assert.equal(ev([9], 2, 3, 'missing'), 'OK'));
test('ignore with a gap still alarms when enough points breach', () => assert.equal(ev([9, 9], 2, 3, 'ignore', 'OK'), 'ALARM'));
test('equal to the threshold is not above it', () => assert.equal(ev([5, 5, 5], 1, 3, 'missing'), 'OK'));

test('replayAlarm gives one state per point', () => {
  const states = replayAlarm({ series: [1, 9, 9, 9, 1, 1], threshold: 5, m: 2, n: 3 });
  assert.deepEqual(states, ['OK', 'OK', 'ALARM', 'ALARM', 'ALARM', 'OK']);
});
test('judgeAlarm counts pages, false pages and the delay', () => {
  const states = ['ALARM', 'OK', 'OK', 'OK', 'ALARM', 'ALARM', 'OK'];
  assert.deepEqual(judgeAlarm(states, [3, 6]), { pages: 2, falsePages: 1, delay: 1 });
  assert.deepEqual(judgeAlarm(['OK', 'OK'], [0, 2]), { pages: 0, falsePages: 0, delay: null });
});
