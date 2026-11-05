import '../guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classForAge, monthlyCost } from './s3cost.js';

test('1000 GB in Standard is 23 dollars', () => assert.equal(monthlyCost({ gb: { standard: 1000 } }).total, 23));
test('100,000 GB in Standard is 2300', () => assert.equal(monthlyCost({ gb: { standard: 100000 } }).total, 2300));
test('1000 GB in Standard-IA is 12.5', () => assert.equal(monthlyCost({ gb: { ia: 1000 } }).total, 12.5));
test('100,000 GB in Glacier IR is 400', () => assert.equal(monthlyCost({ gb: { glacierIr: 100000 } }).total, 400));
test('100 million PUTs are 500 dollars of requests', () => assert.equal(monthlyCost({ puts: 100e6 }).requests, 500));
test('PUTs plus storage', () => {
  const c = monthlyCost({ puts: 100e6, gb: { standard: 100 } });
  assert.equal(c.storage, 2.3);
  assert.equal(c.total, 502.3);
});
test('GET requests by class', () => assert.equal(monthlyCost({ gets: { standard: 50e6, ia: 10e6, glacierIr: 1e6 } }).requests, 40));
test('Glacier IR retrieval is 0.03 a GB', () => {
  const c = monthlyCost({ gb: { glacierIr: 1000 }, retrieveGb: { glacierIr: 200 } });
  assert.deepEqual([c.storage, c.retrieval, c.total], [4, 6, 10]);
});
test('a transition is billed like one PUT', () => assert.equal(monthlyCost({ transitions: 2e6 }).requests, 10));
test('a mixed plan', () => {
  const c = monthlyCost({ gb: { standard: 20000, ia: 30000, glacierIr: 50000 }, puts: 5e6, transitions: 1e6, gets: { standard: 20e6, ia: 3e6, glacierIr: 100000 }, retrieveGb: { glacierIr: 500 } });
  assert.deepEqual([c.storage, c.requests, c.retrieval, c.total], [1035, 42, 15, 1092]);
});
test('classForAge follows the rules, in any order', () => {
  const rules = [{ afterDays: 90, class: 'glacierIr' }, { afterDays: 30, class: 'ia' }];
  assert.deepEqual([0, 29, 30, 89, 90, 400].map((d) => classForAge(d, rules)), ['standard', 'standard', 'ia', 'ia', 'glacierIr', 'glacierIr']);
});
