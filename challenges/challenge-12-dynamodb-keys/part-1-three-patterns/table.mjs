// STEP 1: the guard first. This part creates a table on the emulator, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { BatchWriteItemCommand, CreateTableCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { dynamodb as makeDynamo, resetEmulator } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 12, part 1: one table, three access patterns';

export const TABLE = 'daftar-notes';

// The three questions the app asks all day:
//   1. all notes of one student, newest first      2. one note, by its id      3. all notes shared with me
// DynamoDB answers a question fast only when the question matches a key. So the keys come first.

// STEP 2: the table (your turn). Items have: studentId (S), noteId (S), title (S), and sometimes sharedWith (S, a student id).
//   main key: studentId (partition key) and noteId (sort key), so pattern 1 is a Query on one partition
//   index 'byNoteId': noteId as partition key, with all attributes projected, so pattern 2 is a Query on the index
//   index 'bySharedWith': sharedWith as partition key and noteId as sort key. Only items that have sharedWith appear in it
//   billing: pay per request
export async function createTable(ddb) {
  // YOUR TURN start
  // HINT: every attribute used in a key or index key must be in AttributeDefinitions. Projection: { ProjectionType: 'ALL' }.
  // YOUR TURN end
}

export const NOTES = [
  { studentId: 'amina', noteId: 'n-001', title: 'Maths week 1' },
  { studentId: 'amina', noteId: 'n-002', title: 'Maths week 2', sharedWith: 'bilal' },
  { studentId: 'amina', noteId: 'n-003', title: 'Physics lab', sharedWith: 'chen' },
  { studentId: 'bilal', noteId: 'n-004', title: 'History essay' },
  { studentId: 'bilal', noteId: 'n-005', title: 'History notes', sharedWith: 'amina' },
  { studentId: 'chen', noteId: 'n-006', title: 'Chemistry' },
  { studentId: 'chen', noteId: 'n-007', title: 'Chemistry lab', sharedWith: 'amina' },
  { studentId: 'chen', noteId: 'n-008', title: 'Biology', sharedWith: 'bilal' },
];

export async function seed(ddb) {
  const item = (n) => Object.fromEntries(Object.entries(n).map(([k, v]) => [k, { S: v }]));
  await ddb.send(new BatchWriteItemCommand({ RequestItems: { [TABLE]: NOTES.map((n) => ({ PutRequest: { Item: item(n) } })) } }));
}

const plain = (item) => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v.S]));

// STEP 3: the three questions (your turn). Each must be ONE Query or GetItem, never a Scan.
// notesByStudent(ddb, studentId)  -> list of notes, newest first (the sort key noteId grows with time: use ScanIndexForward: false)
// noteById(ddb, noteId)           -> the one note (or null), through the index 'byNoteId'
// sharedWithMe(ddb, studentId)    -> notes other students shared with this student, through the index 'bySharedWith'
// Return notes as plain objects like { studentId, noteId, title }.
export async function notesByStudent(ddb, studentId) {
  // YOUR TURN start
  // YOUR TURN end
}

export async function noteById(ddb, noteId) {
  // YOUR TURN start
  // YOUR TURN end
}

export async function sharedWithMe(ddb, studentId) {
  // YOUR TURN start
  // YOUR TURN end
}

export async function build() {
  const ddb = makeDynamo();
  await resetEmulator();
  await createTable(ddb);
  await seed(ddb);
  return ddb;
}

export async function run() {
  const ddb = await build();
  const mine = await notesByStudent(ddb, 'amina');
  const one = await noteById(ddb, 'n-006');
  const shared = await sharedWithMe(ddb, 'amina');
  return {
    facts: [['Table', `${TABLE}: ${NOTES.length} notes, 2 indexes, pay per request`], ['Rule', 'every question is one Query or GetItem on a key, never a Scan']],
    head: ['Question', 'Answered by', 'Result'],
    rows: [
      ['Notes of amina, newest first', 'Query on the main key', mine.map((n) => n.noteId).join(', ')],
      ['Note n-006', 'Query on index byNoteId', one ? `${one.title} (${one.studentId})` : 'not found'],
      ['Shared with amina', 'Query on index bySharedWith', shared.map((n) => n.noteId).join(', ')],
    ],
  };
}

main(import.meta.url, run);
