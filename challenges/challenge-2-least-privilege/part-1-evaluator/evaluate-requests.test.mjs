import '../../../toolkit/guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ask, sample } from './evaluate-requests.mjs';

for (const c of sample.cases) {
  test(c.name, () => {
    const got = ask(c);
    assert.equal(got.decision, c.decision);
    assert.equal(got.reason, c.reason);
  });
}

test('an allow reports which statement allowed it', () => {
  const got = ask(sample.cases[0]);
  assert.equal(got.matched.sid, 'ReadWriteNotes');
});

test('a deny reports which statement denied it', () => {
  const plainHttp = sample.cases.find((c) => c.name.startsWith('read a note over plain http'));
  assert.equal(ask(plainHttp).matched.sid, 'NoPlainHttp');
});
