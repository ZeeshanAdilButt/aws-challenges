import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkList, run } from './show-environment.mjs';

const good = {
  AWS_ENDPOINT_URL: 'http://localhost:5000',
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  AWS_REGION: 'us-east-1',
  AWS_EC2_METADATA_DISABLED: 'true',
};

test('a correct environment gives five rows, all OK', () => {
  const rows = checkList(good);
  assert.equal(rows.length, 5);
  assert.ok(rows.every((r) => r.ok));
  assert.deepEqual(Object.keys(rows[0]).sort(), ['actual', 'expected', 'ok', 'variable', 'why']);
});

test('a missing variable is flagged and shown as (not set)', () => {
  const rows = checkList({ ...good, AWS_REGION: undefined });
  const region = rows.find((r) => r.variable === 'AWS_REGION');
  assert.equal(region.ok, false);
  assert.equal(region.actual, '(not set)');
});

test('a wrong value is flagged', () => {
  const rows = checkList({ ...good, AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE' });
  assert.equal(rows.find((r) => r.variable === 'AWS_ACCESS_KEY_ID').ok, false);
  assert.equal(rows.filter((r) => !r.ok).length, 1);
});

test('run() reports the real environment as safe', async () => {
  const result = await run();
  assert.equal(result.rows.length, 5);
  assert.ok(result.rows.every((row) => row[3] === 'yes'));
});
