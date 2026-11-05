import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, expectations, policies } from './daftar-policies.mjs';

for (const name of Object.keys(expectations)) {
  test(`${name} policy: allows what the job needs`, () => {
    const c = check(name);
    assert.ok(c.allowTotal > 0);
    assert.equal(c.allowed, c.allowTotal);
  });

  test(`${name} policy: refuses everything else we tried`, () => {
    const c = check(name);
    assert.equal(c.denied, c.denyTotal);
  });

  test(`${name} policy: has no wildcard action and no resource *`, () => {
    assert.deepEqual(check(name).lazy, []);
  });

  test(`${name} policy: is a valid policy document`, () => {
    const policy = policies[name];
    assert.equal(policy.Version, '2012-10-17');
    assert.ok(Array.isArray(policy.Statement) && policy.Statement.length > 0);
    for (const s of policy.Statement) assert.ok(['Allow', 'Deny'].includes(s.Effect));
  });
}
