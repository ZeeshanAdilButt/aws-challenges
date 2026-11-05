# Challenge 13, part 1: the bad night

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

One bad minute is noise. An incident is a **run** of bad minutes. You write the function that finds the start of a run, and the one that lists the changes made just before it.

## The Daftar example

The night runs from 00:30 to 02:29. There are two single-minute spikes (00:41 and 02:05) that are not incidents. The real trouble starts at 01:10, and a deploy went out at 01:05.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It reads one bad night of metrics, logs and a change record. | [timeline.mjs#L1](timeline.mjs#L1) |
| 2 | Find when the trouble started (your turn). | [timeline.mjs#L8](timeline.mjs#L8) |
| 3 | What changed just before (your turn). changes is a list of { time: 'HH:MM', what, detail }. | [timeline.mjs#L18](timeline.mjs#L18) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-13-3am-drill/part-1-bad-night-data/timeline.mjs
npm run test:13
```

## Where each number comes from

The limit is 800 ms of p99 and a run is 3 minutes in a row. The data is in `datasets/bad-night.json` (120 minutes), `bad-night-logs.jsonl` and `bad-night-changes.json`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
