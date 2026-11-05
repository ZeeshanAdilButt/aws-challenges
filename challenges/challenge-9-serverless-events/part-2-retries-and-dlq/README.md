# Challenge 9, part 2: retries and the dead-letter queue

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A **poison message** is one that always fails. Without a limit it would come back forever. With `maxReceiveCount` 3, SQS moves it to the DLQ after the third receive. You also break the system on purpose: a handler that takes longer than the visibility timeout gives the same message to a second worker.

## The Daftar example

Two messages: `good-1` and `poison-1`. The worker deletes the good one and fails on the poison one. After three receives the poison message is in `daftar-jobs-dlq`, where a person can look at it.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part creates queues on the emulator, so it must only ever touch the emulator. | [retries.mjs#L1](retries.mjs#L1) |
| 2 | The two queues (your turn). Create the dead-letter queue 'daftar-jobs-dlq', then the main queue 'daftar-jobs' with | [retries.mjs#L10](retries.mjs#L10) |
| 3 | A worker that fails on a poison message. Provided. A message is poison when its body says so. | [retries.mjs#L21](retries.mjs#L21) |
| 4 | Break it on purpose. A slow handler (1.5 s) with a 1 s visibility timeout: the message comes back while the first | [retries.mjs#L38](retries.mjs#L38) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-9-serverless-events/part-2-retries-and-dlq/retries.mjs
npm run test:9
```

## Where each number comes from

The emulator drill uses a 1 second visibility timeout so it runs in seconds. The table uses the AWS default of 30 seconds and `maxReceiveCount` 3 in the course model `deliver()`: for example "fails twice then works" is 3 receives and finishes at 65 seconds (30 + 30 + 5). A 40-second handler with a 30-second timeout is received twice (the effect happens twice).

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
