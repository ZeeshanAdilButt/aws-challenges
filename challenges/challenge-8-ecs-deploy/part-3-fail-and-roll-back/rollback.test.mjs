import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, badSeconds, budgetSpentPercent, runScenario } from './rollback.mjs';

const by = (name) => runScenario(SCENARIOS.find((s) => s.name === name));

test('budget: 60 seconds is 2.3 percent, 2,592 seconds is all of it', () => {
  assert.equal(budgetSpentPercent(60), 2.3);
  assert.equal(budgetSpentPercent(2592), 100);
  assert.equal(budgetSpentPercent(0), 0);
});

test('a stricter target leaves less budget', () => {
  assert.equal(budgetSpentPercent(60, 99.99), 23.1);
});

test('with room to spare the breaker trips and users notice nothing', () => {
  const r = by('100 and 200, breaker on');
  assert.equal(r.state, 'ROLLED_BACK');
  assert.equal(r.secondsBelowFull, 0);
});

test('with 50 and 100 the breaker still rolls back, after some lost capacity', () => {
  const r = by('50 and 100, breaker on');
  assert.equal(r.state, 'ROLLED_BACK');
  assert.equal(r.minCapacityPercent, 50);
  assert.ok(r.secondsBelowFull > 0);
});

test('without the breaker the bad deploy is never rolled back', () => {
  assert.notEqual(by('50 and 100, breaker off').state, 'ROLLED_BACK');
  assert.equal(by('100 and 100, breaker off').state, 'STUCK');
});

test('without the breaker and with lost capacity the loss goes on until a person notices', () => {
  const r = by('50 and 100, breaker off');
  assert.equal(r.ongoing, true);
  assert.equal(budgetSpentPercent(badSeconds(r)), 69.4);
});

test('the timeline names the failures and the trip', () => {
  const text = by('50 and 100, breaker on').events.map((e) => e.text).join('\n');
  assert.match(text, /fails its health check/);
  assert.match(text, /circuit breaker trips/);
});
