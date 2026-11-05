# Challenge 16, part 3: break it

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Three things go wrong. (1) A zone is lost in the middle of the sale: the scaling model (challenge 7) removes half of the running servers. (2) The CI key leaks: the dataset and `scopeKey()` of challenge 3 say what the stranger did. (3) The bill jumps: `billDiff()` and `anomalies()` of challenge 15 find the rows. Each has a chart, and `runbook.md` has one entry for each.

## The Daftar example

If the fleet is sized to run at 40 percent busy, losing half of it drops nothing. At 80 percent busy it drops about one request in ten. One NAT gateway in the lost zone also stops the other zone's outside calls.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. Three things go wrong on purpose, and each is measured with a model or a dataset from an earlier challenge. | [break-it.mjs#L1](break-it.mjs#L1) |
| 2 | Experiment 1, a zone is lost during the sale (your turn). | [break-it.mjs#L17](break-it.mjs#L17) |
| 3 | Experiment 2, the leaked key (challenge 3). Scope it from the dataset. Provided. | [break-it.mjs#L37](break-it.mjs#L37) |
| 4 | Experiment 3, a bill spike (challenge 15). Find it with billDiff. Provided. | [break-it.mjs#L40](break-it.mjs#L40) |
| 5 | The runbook, one entry for each experiment (your turn). Each entry has a symptom, a check and a fix, in plain sentences. **(your turn)** | [break-it.mjs#L46](break-it.mjs#L46) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-16-capstone/part-3-break-it/break-it.mjs
npm run test:16
```

## Where each number comes from

The numbers come from the challenge 7, 3 and 15 models and datasets, run again here. The charts are `chart.svg` (zone) and `chart-zone.svg`, `chart-key.svg`, `chart-bill.svg`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
