// The tests every part of challenge 5 runs. Each part's test file calls defineSetTests with its own set, fixes and runbook.
import '../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPath } from '../../toolkit/models/reach.js';
import { diagnose, tryFix } from './shared.mjs';

// The working paths of the healthy Daftar network. A fix must not break any of them.
const HEALTHY_PATHS = [
  { from: 'internet:198.51.100.7', to: 'alb', port: 443 },
  { from: 'alb', to: 'app', port: 8080 },
  { from: 'app', to: 'db', port: 5432 },
  { from: 'app', to: 'internet:203.0.113.20', port: 443 },
];

export function defineSetTests({ set, fixes, runbook }) {
  for (const config of set.configs) {
    test(`${config.id}: the model finds the fault`, () => {
      const found = diagnose(config);
      assert.equal(found.reachable, false);
      assert.equal(found.code, config.expect.code);
      assert.equal(found.where, config.expect.where);
    });

    test(`${config.id}: your fix makes the probe work`, () => {
      assert.equal(typeof fixes[config.id], 'function', `write a fix for ${config.id}`);
      assert.equal(tryFix(config, fixes[config.id]).reachable, true);
    });

    test(`${config.id}: the fix does not open a port to the whole internet`, () => {
      assert.equal(tryFix(config, fixes[config.id]).lazy, false);
    });

    test(`${config.id}: the fix does not break the other paths`, () => {
      assert.equal(typeof fixes[config.id], 'function', `write a fix for ${config.id}`);
      const { network } = tryFix(config, fixes[config.id]);
      for (const path of HEALTHY_PATHS) {
        const result = checkPath(network, path);
        assert.equal(result.reachable, true, `${path.from} to ${path.to}:${path.port} now fails with ${result.fault?.code}`);
      }
    });

    test(`${config.id}: the runbook line names the fault code and the place`, () => {
      const line = runbook[config.id] ?? '';
      assert.ok(line.includes(config.expect.code), `mention ${config.expect.code}`);
      assert.ok(line.includes(config.expect.where), `mention ${config.expect.where}`);
      assert.ok(line.length >= 40 && line.length <= 300, 'one clear line, 40 to 300 characters');
      assert.ok(!line.includes(String.fromCharCode(0x2014)) && !line.includes(String.fromCharCode(0x2013)), 'no long dashes');
    });
  }
}
