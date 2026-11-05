# Challenge 2, part 3: narrow a wide policy from an access log

Runs on: **model** and **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Teams often start with a wide policy ("allow everything for these five services") because it works on day one. Later you can see what the program really did: AWS keeps a record of every call. If you give the program only what that record shows, you get a narrow policy with the same behaviour.

The rule of thumb in this part: one statement per set of resources. When three or more resources share a **folder** (the part of the ARN before the last `/` or `:`), write the folder once with a star at the end.

## The Daftar example

`datasets/daftar-api-access-log.jsonl` is 14 days of what the Daftar API role did: 600 calls of 8 kinds. The wide policy allows `s3:*`, `sqs:*`, `dynamodb:*`, `secretsmanager:*` and `logs:*` on every resource. Your narrow policy must still allow all 600 calls, and refuse 16 risky requests that the API never made (delete a bucket, purge the queue, read another secret, create a user).

A warning you should say out loud in a review: a log shows what **did** happen in 14 days, not everything the program will ever need. A monthly job missing from the log would break. Narrow, then watch for denied calls, then adjust.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It reads a log file and builds a policy. | [narrow-from-log.mjs#L1](narrow-from-log.mjs#L1) |
| 2 | Read the log. One JSON object per line. | [narrow-from-log.mjs#L11](narrow-from-log.mjs#L11) |
| 3 | Turn a log into a policy that allows exactly what happened (your turn). | [narrow-from-log.mjs#L22](narrow-from-log.mjs#L22) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-2-least-privilege/part-3-narrow/narrow-from-log.mjs
npm run test:2
```

## Where each number comes from

- **Log events read (600)** and **actions (8)**: counted from the dataset file (`datasets/README.md` says how it was made, seed 2026).
- **Logged calls still allowed**: each log event is sent through your part 1 evaluator against the policy. It must be 600 of 600.
- **Unlogged probes allowed**: the 16 requests in `probes` in the script, each sent through the evaluator. The wide policy allows the ones in its five services; the narrow one must allow none.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
