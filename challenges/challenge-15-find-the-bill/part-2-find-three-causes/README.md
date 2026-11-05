# Challenge 15, part 2: find three causes

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

`billDiff()` sums the lines of each service and usage type and orders the rows by the biggest increase. `anomalies()` keeps the rows that grew by at least 50 dollars and at least 2 times. Exactly three rows pass. You write the cause and the fix of each, and the script saves them in `findings.md`.

## The Daftar example

NAT data processing grew 22 times (a new job pulls big files from S3 through NAT: a gateway endpoint for S3 costs nothing). Log processing grew 15 times (debug level was switched on). Load balancer hours grew 3 times (six idle load balancers).

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It compares two monthly usage reports. | [find-causes.mjs#L1](find-causes.mjs#L1) |
| 2 | The diff and the anomalies. Provided. billDiff sums the lines of each service and usage type, orders by the | [find-causes.mjs#L10](find-causes.mjs#L10) |
| 3 | Explain each flagged row (your turn). | [find-causes.mjs#L17](find-causes.mjs#L17) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-15-find-the-bill/part-2-find-three-causes/find-causes.mjs
npm run test:15
```

## Where each number comes from

The three rows explain about 94 percent of the increase. The rest is normal growth in storage, requests and public IP addresses.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
