# Challenge 8, part 3: fail and roll back

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A bad image means every new task fails its health check. With the circuit breaker on, ECS counts failures in a row. At the threshold (half of the tasks, at least 3) it rolls back. The **error budget** is how much bad time your target allows in a month: for 99.9 percent that is 0.1 percent of 30 days, which is 2,592 seconds. A rollout that costs capacity spends some of it.

## The Daftar example

With "100 and 200" the old tasks never stop, so users notice nothing and the budget spent is 0. With "50 and 100" ECS must stop 3 old tasks to make room, so the service runs at half capacity for a minute before the rollback: 2.3 percent of the month's budget. With the breaker off and half capacity, the loss goes on until a person notices.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. A bad deploy is simulated with the model in toolkit/models/rollout.js. | [rollback.mjs#L1](rollback.mjs#L1) |
| 2 | The story. Image 1.4.3 has a bug: every new task fails its health check. | [rollback.mjs#L8](rollback.mjs#L8) |
| 3 | How much of the monthly error budget a deploy spent (your turn). | [rollback.mjs#L16](rollback.mjs#L16) |
| 4 | Run the same bad image under three settings, and one with the breaker off. Provided. | [rollback.mjs#L26](rollback.mjs#L26) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-8-ecs-deploy/part-3-fail-and-roll-back/rollback.mjs
npm run test:8
```

## Where each number comes from

Threshold: 50 percent of desired rounded up, clamped between 3 and 200 (dossier D22, VERIFIED). Each batch takes 60 seconds in the model. The 30 minutes before a person notices (breaker off) is an assumption of the exercise.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
