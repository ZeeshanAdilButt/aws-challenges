import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAFE_ENV, scenarios, tryScenario } from './safety-rules.mjs';
import { checkEnvironment } from '../../../toolkit/guard-core.js';

test('the safe setup is accepted', () => {
  assert.deepEqual(checkEnvironment(SAFE_ENV), []);
});

test('there are at least six scenarios and each one is refused', () => {
  assert.ok(scenarios.length >= 6, `write at least 6 scenarios, you have ${scenarios.length}`);
  for (const scenario of scenarios) assert.equal(tryScenario(scenario).refused, true, scenario.name);
});

test('the scenarios cover six different rules', () => {
  const fired = new Set(scenarios.flatMap((s) => tryScenario(s).codes));
  for (const code of ['endpoint-remote', 'service-endpoint-remote', 'ignore-endpoints', 'real-key-prefix', 'session-token', 'profile-set']) {
    assert.ok(fired.has(code), `no scenario fires the rule "${code}"`);
  }
});

test('every scenario has a name and changes something', () => {
  for (const scenario of scenarios) {
    assert.ok(scenario.name && scenario.name.length > 3);
    assert.ok(Object.keys(scenario.env).length >= 1);
  }
});
