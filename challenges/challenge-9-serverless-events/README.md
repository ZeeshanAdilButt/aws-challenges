# Challenge 9: an event-driven upload pipeline

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The 101

An **event** is a message that says "something happened". When a file lands in a bucket, S3 can put an event on a **queue** (SQS, the Simple Queue Service). A **function** (Lambda) or any worker then takes messages off the queue and does the work.

- A queue gives each message to a worker and hides it for the **visibility timeout** (30 seconds by default). If the worker deletes the message in time, it is done. If not, the message appears again.
- That means a message can be delivered **more than once**. Your handler must cope. A handler is **idempotent** when doing the same job twice gives the same result as doing it once.
- If a message fails again and again, a **redrive policy** moves it to a **dead-letter queue** (DLQ) after N receives, so one bad message cannot block the others.

## The Daftar example

Daftar students upload photos and notes. Each upload should create a thumbnail or a word count, once. You build the pipeline and make it safe against retries and duplicates.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 from upload to handler](part-1-upload-to-handler/README.md) | write the handler that reads the uploaded note and counts its words | `upload.mjs` |
| [2 retries and the DLQ](part-2-retries-and-dlq/README.md) | create a queue with a redrive policy and watch a poison message end in the DLQ | `retries.mjs` |
| [3 an idempotent handler](part-3-idempotent-handler/README.md) | make the handler do each job once, even when the event arrives three times | `idempotent.mjs` |

## What the emulator cannot show

moto stores the bucket, the queues and their settings, and sends the S3 event to the queue. The function code does not run in the emulator, so the handler is a plain function that runs on your computer (in AWS it would be Lambda). The emulator is not asked to move messages back from a DLQ (message-move tasks are missing), so that redrive is simulated by the course model `toolkit/models/sqs.js`.

## Run it

```
npm run moto:up
npm run test:9
```
