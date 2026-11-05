# Challenge 7, part 1: replay the profile

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The file `datasets/sale-profile.json` has one value every 10 seconds: requests a second. The model walks through it, decides each step how many servers are wanted, starts them (they answer after the warm-up) and counts the requests that no running server could answer. You write the function that groups these 10-second rows into minutes.

## The Daftar example

At minute 8 the sale starts. The fleet had 4 servers and wanted about 40. Every new server needs 120 seconds. For those two minutes most requests have nowhere to go.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It replays a traffic file through the target tracking model. | [replay.mjs#L1](replay.mjs#L1) |
| 2 | Group the 10-second steps into minutes (your turn). | [replay.mjs#L8](replay.mjs#L8) |
| 3 | Replay the sale. Servers take 120 seconds to start and the cooldown is 300 seconds: plain target tracking. | [replay.mjs#L21](replay.mjs#L21) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-7-scale-with-load/part-1-replay-the-profile/replay.mjs
npm run test:7
```

## Where each number comes from

One server answers 50 requests a second. Target tracking aims for 50 percent between 4 and 50 servers. Warm-up 120 seconds, cooldown 300 seconds. The profile is made by `datasets/make-sale-profile.mjs` (seed 5). "Dropped" = requests above the capacity of the running servers, times the 10 seconds of a step.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
