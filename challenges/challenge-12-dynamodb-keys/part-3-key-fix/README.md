# Challenge 12, part 3: the key fix

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Write sharding gives up one thing: to read all of `class-7` you must ask all 30 shards and join the answers. You trade one read for ten reads to avoid one overloaded partition. After the fix, no key is above 2 times the even share.

## The Daftar example

The 1,877 writes of class 7 spread over `class-7#0` to `class-7#29`, about 63 each. With only 10 shards each would still take about 188, three times the even share, so the number of shards matters.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part writes 3,000 items to a table on the emulator, so it must only ever touch the emulator. | [key-fix.mjs#L1](key-fix.mjs#L1) |
| 2 | Write sharding (your turn). Return the partition key to use for an event. | [key-fix.mjs#L15](key-fix.mjs#L15) |
| 3 | Reading a split key means asking all its shards and joining the answers. Provided. | [key-fix.mjs#L24](key-fix.mjs#L24) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-12-dynamodb-keys/part-3-key-fix/key-fix.mjs
npm run test:12
```

## Where each number comes from

Same 3,000 writes as part 2, same seed. The suffix comes from a second seeded generator (seed 99). Reading class-7 takes 30 queries, and the join finds every item. Keys go from 41 to 70.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
