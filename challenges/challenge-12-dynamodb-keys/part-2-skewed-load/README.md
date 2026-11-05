# Challenge 12, part 2: a skewed load

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The **even share** is total writes divided by number of keys. A key is **hot** when its count is more than 2 times the even share (`hotKeys()` in the model). You write the function that measures the spread.

## The Daftar example

Class 7 posts at the same time: 60 percent of the writes go to one key, and 40 quiet classes share the rest.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part writes 3,000 items to a table on the emulator, so it must only ever touch the emulator. | [skewed-load.mjs#L1](skewed-load.mjs#L1) |
| 2 | Measure the spread (your turn). counts is { key: number of writes }. | [skewed-load.mjs#L13](skewed-load.mjs#L13) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-12-dynamodb-keys/part-2-skewed-load/skewed-load.mjs
npm run test:12
```

## Where each number comes from

3,000 writes, 41 keys, so the even share is about 73 writes. The load is made with seed 12. The result table lists the busiest keys and how many times the even share each one is.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
