import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUCKET, run } from './moto-roundtrip.mjs';

test('the account starts empty, has the bucket after create, and is empty after delete', async () => {
  const { rows } = await run();
  assert.deepEqual(rows.map((r) => r[0]), ['before', 'after create', 'after delete']);
  assert.equal(rows[0][1], '(none)');
  assert.equal(rows[1][1], BUCKET);
  assert.equal(rows[2][1], '(none)');
});
