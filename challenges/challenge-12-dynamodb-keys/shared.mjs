// Shared by parts 2 and 3 of challenge 12: a skewed write load and the helpers that put it in a table on the emulator.
import { BatchWriteItemCommand, CreateTableCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { rng } from '../../toolkit/random.js';

export const SEED = 12;
export const EVENTS = 3000;
export const HOT = 'class-7';
// 40 quiet classes and one very busy one. 60 percent of all writes go to class-7 (a whole class posting notes at the same time).
export const QUIET = Array.from({ length: 40 }, (_, i) => `class-${i + 100}`);

export function makeLoad(seed = SEED, count = EVENTS) {
  const random = rng(seed);
  return Array.from({ length: count }, (_, i) => ({ pk: random.chance(0.6) ? HOT : random.pick(QUIET), sk: `event-${String(i).padStart(5, '0')}` }));
}

export async function createActivityTable(ddb, name) {
  await ddb.send(new CreateTableCommand({
    TableName: name,
    AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }, { AttributeName: 'sk', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }, { AttributeName: 'sk', KeyType: 'RANGE' }],
    BillingMode: 'PAY_PER_REQUEST',
  }));
}

// Write 25 items per call, the most BatchWriteItem accepts.
export async function writeAll(ddb, table, items) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await ddb.send(new BatchWriteItemCommand({ RequestItems: { [table]: chunk.map((it) => ({ PutRequest: { Item: { pk: { S: it.pk }, sk: { S: it.sk } } } })) } }));
  }
}

export async function countFor(ddb, table, pk) {
  const { Count } = await ddb.send(new QueryCommand({ TableName: table, KeyConditionExpression: 'pk = :p', ExpressionAttributeValues: { ':p': { S: pk } }, Select: 'COUNT' }));
  return Count;
}
