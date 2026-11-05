# Challenge 16, part 2: test it

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Two models judge the design. The reachability model (challenge 5) reads the security groups **from your code** and answers "can A reach B on this port?". The policy model (challenge 2) reads the policy JSON files and answers "is this request allowed?". You write probes: some must work, some must stay closed. The script saves `evidence.md`.

## The Daftar example

The internet reaches the load balancer on 443 and nothing else. The app reaches the database on 5432 and not on 22. The task role may read `notes/1` over HTTPS and may not read it over plain HTTP.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. The emulator keeps the settings but cannot say what traffic would pass or what a policy | [test-it.mjs#L1](test-it.mjs#L1) |
| 2 | The paths that must work and the paths that must not (your turn). The network is read from the code in part 1. | [test-it.mjs#L13](test-it.mjs#L13) |
| 3 | The policy requests that must be allowed and refused (your turn). | [test-it.mjs#L30](test-it.mjs#L30) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-16-capstone/part-2-test-it/test-it.mjs
npm run test:16
```

## Where each number comes from

Counts are the number of probes and how many came out as expected. A wide policy (every S3 action on every resource) is run against the refusal probes in the test to show that the probes catch it.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
