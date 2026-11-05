# Challenge 6, part 1: read the metrics

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A week has 168 hours. Averages hide the busy hours, so we look at the **median** (p50), the **p95**, the **peak** and the number of hours above 60 percent CPU. You write the percentile function with the **nearest-rank** rule: sort the numbers, then take the one at position `ceil(p x n)`, counting from 1.

## The Daftar example

The api is busy in the day and quiet at night. The worker is quiet except for a nightly export. The admin tool is almost idle. One of them has a hot hour that the p95 does not show. The table tells you which.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It reads a file of metrics and prints a table. | [summarise.mjs#L1](summarise.mjs#L1) |
| 2 | Read the week. services.<name> is a list of 168 hours: { cpuPct, memGb, instances }. | [summarise.mjs#L10](summarise.mjs#L10) |
| 3 | The percentile (your turn). The p-th percentile (p between 0 and 1) by the nearest-rank rule: | [summarise.mjs#L15](summarise.mjs#L15) |
| 4 | One service in numbers: median, p95, the highest hour, and how many hours were above 60 percent CPU. | [summarise.mjs#L25](summarise.mjs#L25) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-6-right-size/part-1-read-the-metrics/summarise.mjs
npm run test:6
```

## Where each number comes from

The numbers come from `datasets/metrics-week.json`, made by `datasets/make-metrics-week.mjs` (seed 11). The server today is an m7i.large with 2 vCPU and 8 GB at 0.1008 dollars an hour (price table read 2026-10-24). The vCPU and memory sizes are the course catalog shape, not read from AWS.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
