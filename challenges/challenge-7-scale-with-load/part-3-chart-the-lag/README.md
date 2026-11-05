# Challenge 7, part 3: chart the lag

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The **lag** is the time between the first dropped request and the last one. The chart puts "servers wanted" next to "servers running" minute by minute, so you see the gap close.

## The Daftar example

Without a schedule the fleet is late for more than two minutes and is short of dozens of servers at the worst moment. With the scheduled minimum the lag is 0 seconds.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It measures how late the fleet is and draws it. | [lag.mjs#L1](lag.mjs#L1) |
| 2 | The lag (your turn). timeline rows are { t, offered, wanted, running, pending, dropped }. | [lag.mjs#L9](lag.mjs#L9) |
| 3 | How many servers were wanted but not yet running at the worst moment. | [lag.mjs#L19](lag.mjs#L19) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-7-scale-with-load/part-3-chart-the-lag/lag.mjs
npm run test:7
```

## Where each number comes from

The lag comes from the same replay as part 1 (warm-up 120 s, cooldown 300 s). The chart is `chart.svg`, drawn by `toolkit/bars.js` from the same numbers as the table below it.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
