# Challenge 9, part 3: an idempotent handler

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

To be idempotent, the handler needs a **key** that names the job. Here the key is the bucket, the object key and the ETag: `daftar-uploads/photos/cat.jpg#<etag>`. It keeps the keys it has finished. A repeated event has a key it has seen, so nothing happens. A changed file has a new ETag, so it is new work.

## The Daftar example

The same upload event is delivered three times. The thumbnail is made once. Then the student uploads a new version of `cat.jpg`: new ETag, a second thumbnail.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part uploads files and reads queue messages on the emulator, so it must only ever touch the emulator. | [idempotent.mjs#L1](idempotent.mjs#L1) |
| 2 | The idempotent handler (your turn). `store` is a Set of keys already done. `effects` is a list where the handler | [idempotent.mjs#L13](idempotent.mjs#L13) |
| 3 | Upload one file, then deliver its event twice (as a queue may), then upload a changed file. Provided. | [idempotent.mjs#L25](idempotent.mjs#L25) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-9-serverless-events/part-3-idempotent-handler/idempotent.mjs
npm run test:9
```

## Where each number comes from

The store here is a Set in memory. In a real system it is a table with a conditional write ("put only if the key does not exist"), so two workers cannot both win.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
