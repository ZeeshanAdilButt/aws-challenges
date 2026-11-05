# Challenge 12: key design on DynamoDB

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The 101

**DynamoDB** is a database that answers fast when you ask by key. A table has a **partition key** (which box the item lives in) and, optionally, a **sort key** (the order inside the box). To ask a different question fast, you add an **index** with another key.

- A **Query** reads one partition (or one index key). A **Scan** reads everything and is slow and expensive. Good design means every question is a Query.
- DynamoDB spreads items over partitions by the partition key. If one key gets most of the traffic, it is a **hot key**: that partition works hard while the others sleep.
- **Write sharding** fixes a hot key: add a random suffix (`class-7#0` to `class-7#9`) so one logical key becomes ten.

## The Daftar example

Daftar has three questions (notes of a student, one note by id, notes shared with me) and, on a bad day, a whole class posting notes at once.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 three access patterns](part-1-three-patterns/README.md) | design the table and its two indexes, then answer three questions with Query | `table.mjs` |
| [2 a skewed load](part-2-skewed-load/README.md) | replay 3,000 writes where one class takes 60 percent and measure the spread | `skewed-load.mjs` |
| [3 the key fix](part-3-key-fix/README.md) | shard the hot key into thirty and measure the new spread | `key-fix.mjs` |

## What the emulator cannot show

This challenge uses moto for DynamoDB (it covers the calls needed) instead of the DynamoDB Local image, to save a download. moto keeps tables and items and answers queries, but it does not enforce partition throughput limits, so it never throttles a hot key. The spread is measured by the course model `toolkit/models/dynamo.js`, which counts writes per key.

## Run it

```
npm run moto:up
npm run test:12
```
