import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadEvents } from '../part-1-event-log/inspect-log.mjs';
import { LEAKED_KEY, TRUSTED_IPS, scopeKey } from './scope-key.mjs';

const facts = JSON.parse(fs.readFileSync(new URL('../../../datasets/cloudtrail-leaked-key.facts.json', import.meta.url), 'utf8'));
const scope = scopeKey(loadEvents(), LEAKED_KEY, TRUSTED_IPS);

test('who the key belongs to, and the normal calls', () => {
  assert.equal(scope.owner, facts.owner);
  assert.equal(scope.trustedCalls, facts.eventsWithTheKey - facts.suspect.calls);
});

test('how many calls the stranger made, and how many failed', () => {
  assert.equal(scope.suspect.calls, facts.suspect.calls);
  assert.equal(scope.suspect.failed, facts.suspect.failed);
});

test('first and last time', () => {
  assert.equal(scope.suspect.firstSeen, facts.suspect.firstSeen);
  assert.equal(scope.suspect.lastSeen, facts.suspect.lastSeen);
});

test('where the calls came from', () => {
  assert.deepEqual(scope.suspect.sourceIps, facts.suspect.sourceIps);
  assert.deepEqual(scope.suspect.regions, facts.suspect.regions);
});

test('what was read, started and changed', () => {
  assert.equal(scope.suspect.objectsRead, facts.suspect.objectsRead);
  assert.equal(scope.suspect.instancesLaunched, facts.suspect.instancesLaunched);
  assert.deepEqual(scope.suspect.writes, facts.suspect.writes);
});

test('the call counts add up and the biggest group is the note downloads', () => {
  const total = scope.suspect.byEvent.reduce((sum, [, n]) => sum + n, 0);
  assert.equal(total, facts.suspect.calls);
  assert.equal(scope.suspect.byEvent[0][0], 's3:GetObject');
  assert.equal(scope.suspect.byEvent[0][1], 120);
});

test('with every address trusted there is nothing suspect', () => {
  const none = scopeKey(loadEvents(), LEAKED_KEY, [...TRUSTED_IPS, ...facts.suspect.sourceIps]);
  assert.equal(none.suspect.calls, 0);
  assert.equal(none.suspect.firstSeen, null);
});
