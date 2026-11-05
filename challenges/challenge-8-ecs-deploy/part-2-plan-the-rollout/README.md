# Challenge 8, part 2: plan the rollout

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The planner turns two percentages into rounds. `minH = ceil(tasks x minimum / 100)` is the fewest tasks that may be healthy. `maxT = floor(tasks x maximum / 100)` is the most that may exist. Each round starts new tasks if there is room, waits for them to be healthy, and stops old tasks while keeping at least `minH`. If a round can neither start nor stop anything, the rollout is **stuck**.

## The Daftar example

With 6 tasks, "100 and 100" is stuck: nothing may stop and nothing may start. "100 and 200" starts all 6 new tasks first, so there is no gap, but 12 tasks run for a moment, which costs a little more. "50 and 100" never needs extra tasks but serves only 3 at the lowest point.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It uses the rolling deployment planner from toolkit/models/rollout.js. | [plan.mjs#L1](plan.mjs#L1) |
| 2 | What one option does to the service. Provided. | [plan.mjs#L19](plan.mjs#L19) |
| 3 | Choose (your turn). Keep only the options that are not stuck and never serve fewer than `mustServe` tasks. | [plan.mjs#L37](plan.mjs#L37) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-8-ecs-deploy/part-2-plan-the-rollout/plan.mjs
npm run test:8
```

## Where each number comes from

All numbers come from `plan()` in `toolkit/models/rollout.js` with `desired = 6`. "Lowest tasks serving" is the old tasks left plus all new tasks after a round. "Most tasks running" is old plus new before old ones stop.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
