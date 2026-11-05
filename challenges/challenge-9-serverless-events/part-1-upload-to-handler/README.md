# Challenge 9, part 1: from upload to handler

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

S3 can be told "when an object is created, send an event to this queue". The event is JSON with a `Records` list. Each record names the bucket and the object key (URL-encoded) and carries the ETag, a fingerprint of the content.

## The Daftar example

A student uploads `notes/week-1.txt`. One message arrives on the queue. Your handler reads the file and returns its size and word count. Then the message is deleted and the queue is empty.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part creates a bucket and a queue, so it must only ever touch the emulator. | [upload.mjs#L1](upload.mjs#L1) |
| 2 | The handler (your turn). In AWS this would be a Lambda function. The emulator does not run function code here, | [upload.mjs#L11](upload.mjs#L11) |
| 3 | The pipeline: upload a note, find the event on the queue, run the handler, delete the message. Provided. | [upload.mjs#L21](upload.mjs#L21) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-9-serverless-events/part-1-upload-to-handler/upload.mjs
npm run test:9
```

## Where each number comes from

The test note has 50 bytes and 9 words. Message counts are read from the emulator.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
