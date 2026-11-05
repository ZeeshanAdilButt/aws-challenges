import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DescribeTableCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { TABLE, build, noteById, notesByStudent, sharedWithMe } from './table.mjs';

const ddb = await build();

// A client that remembers which commands were sent, to prove that no question used a Scan.
const sent = [];
const watching = { send: (command) => { sent.push(command.constructor.name); return ddb.send(command); } };

test('the table has the two indexes and the main key', async () => {
  const { Table } = await ddb.send(new DescribeTableCommand({ TableName: TABLE }));
  assert.deepEqual(Table.KeySchema.map((k) => k.AttributeName), ['studentId', 'noteId']);
  assert.deepEqual(Table.GlobalSecondaryIndexes.map((i) => i.IndexName).sort(), ['byNoteId', 'bySharedWith']);
});

test('pattern 1: the notes of a student, newest first', async () => {
  assert.deepEqual((await notesByStudent(watching, 'amina')).map((n) => n.noteId), ['n-003', 'n-002', 'n-001']);
});

test('pattern 2: one note by its id, or null', async () => {
  assert.equal((await noteById(watching, 'n-006')).title, 'Chemistry');
  assert.equal(await noteById(watching, 'n-999'), null);
});

test('pattern 3: the notes shared with a student', async () => {
  assert.deepEqual((await sharedWithMe(watching, 'amina')).map((n) => n.noteId).sort(), ['n-005', 'n-007']);
  assert.deepEqual((await sharedWithMe(watching, 'nobody')), []);
});

test('the index is sparse: a note that is not shared is not in bySharedWith', async () => {
  const everyone = (await Promise.all(['amina', 'bilal', 'chen'].map((s) => sharedWithMe(watching, s)))).flat();
  assert.equal(everyone.length, 5);
  assert.ok(!everyone.some((n) => n.noteId === 'n-001'));
});

test('no question used a Scan', () => {
  assert.ok(sent.length >= 6);
  assert.ok(!sent.includes(ScanCommand.name));
  assert.ok(sent.every((name) => name === 'QueryCommand'));
});
