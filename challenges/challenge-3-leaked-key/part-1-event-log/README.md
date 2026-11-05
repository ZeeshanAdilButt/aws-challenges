# Challenge 3, part 1: read the event log

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

An **event** is one line of the log: one call to AWS. A **source address** (`sourceIPAddress`) is where the call came from. A **region** is a geographic area of AWS, like `us-east-1`.

A key belongs to one person or one robot, and robots and people work from the same few places every day. So the quickest sign of a leak is **a key that is used from more than one place**. To see it you need one skill: count things by a label. You write `countBy`.

## The Daftar example

The log has 886 events and 12 access keys: two people, the CI robot and nine API task sessions. Counting calls per key and addresses per key, one key stands out: it is used from the CI server and from a second address, and it also calls a region Daftar never uses.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It reads a log file from datasets/. | [inspect-log.mjs#L1](inspect-log.mjs#L1) |
| 2 | Count how many items give each key. countBy(['a', 'b', 'a'], (x) => x) -> [['a', 2], ['b', 1]]. **(your turn)** | [inspect-log.mjs#L15](inspect-log.mjs#L15) |
| 3 | For each access key, how many calls, from how many addresses and regions. | [inspect-log.mjs#L23](inspect-log.mjs#L23) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-3-leaked-key/part-1-event-log/inspect-log.mjs
npm run test:3
```

## Where each number comes from

All numbers are counts over `datasets/cloudtrail-leaked-key.jsonl` (made with seed 7, see `datasets/README.md`). The test compares them with `cloudtrail-leaked-key.facts.json`, which the generator wrote from the events it injected. "Calls" for the leaked key (336) is 180 normal CI calls plus 156 calls from the stranger.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
