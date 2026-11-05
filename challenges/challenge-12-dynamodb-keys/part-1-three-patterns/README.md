# Challenge 12, part 1: three access patterns

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

List the questions first, then choose the keys. Pattern 1 (notes of a student) is the main key: student as partition key, note id as sort key. Pattern 2 (one note by id) needs an index with the note id as key. Pattern 3 (shared with me) needs an index on `sharedWith`. That index is **sparse**: only items that have the attribute appear in it.

## The Daftar example

Amina has 3 notes, shares one with Bilal and one with Chen. Bilal and Chen share notes with Amina. Each question is one call.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part creates a table on the emulator, so it must only ever touch the emulator. | [table.mjs#L1](table.mjs#L1) |
| 2 | The table (your turn). Items have: studentId (S), noteId (S), title (S), and sometimes sharedWith (S, a student id). | [table.mjs#L15](table.mjs#L15) |
| 3 | The three questions (your turn). Each must be ONE Query or GetItem, never a Scan. | [table.mjs#L44](table.mjs#L44) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-12-dynamodb-keys/part-1-three-patterns/table.mjs
npm run test:12
```

## Where each number comes from

Eight made-up notes. The test client counts the commands: all of them must be Query, none Scan.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
