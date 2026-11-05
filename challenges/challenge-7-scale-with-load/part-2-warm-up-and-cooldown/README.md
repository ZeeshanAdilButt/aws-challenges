# Challenge 7, part 2: warm-up and cooldown

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

You cannot make a server start faster by wishing. You can change what you control: the **cooldown**, and a **scheduled minimum** that starts servers before the sale. The first table shows what warm-up does. The second shows the levers at a warm-up of 120 seconds. You write the function that picks the cheapest row under a line.

## The Daftar example

The line is 2 percent of requests dropped. With a 120 second warm-up, plain target tracking drops almost one request in ten. A cooldown of 0 is worse still: servers are removed just before the second spike. A scheduled minimum of 40 servers from minute 5 gets the drops to zero, and costs a little more.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It replays the sale many times with different settings. | [sweep.mjs#L1](sweep.mjs#L1) |
| 2 | How long a server needs before it answers requests changes everything. Cooldown 300 seconds, no schedule. | [sweep.mjs#L8](sweep.mjs#L8) |
| 3 | The levers you control when the warm-up is 120 seconds: the cooldown, and a scheduled minimum before the sale. | [sweep.mjs#L17](sweep.mjs#L17) |
| 4 | Pick the cheapest setting that keeps dropped requests under a line (your turn). | [sweep.mjs#L30](sweep.mjs#L30) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-7-scale-with-load/part-2-warm-up-and-cooldown/sweep.mjs
npm run test:7
```

## Where each number comes from

Cost = server-hours x 0.0816 dollars (m7g.large, us-east-1, read 2026-10-24, dossier P13, VERIFIED tool-read), for the 30 minutes of the profile only. A server that is still warming up is paid for, so it counts as a server-hour.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
