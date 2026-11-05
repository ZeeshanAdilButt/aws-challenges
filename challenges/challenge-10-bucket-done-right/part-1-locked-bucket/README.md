# Challenge 10, part 1: a locked bucket

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Three calls lock a bucket: `PutPublicAccessBlock`, `PutBucketEncryption` and `PutBucketVersioning`. Then you read the settings back and see ON beside each.

## The Daftar example

The bucket `daftar-notes-prod` holds private student notes. Nobody on the internet should ever read it without a signed link.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part creates and changes a bucket, so it must only ever touch the emulator. | [bucket.mjs#L1](bucket.mjs#L1) |
| 2 | Create the bucket and lock it (your turn). Three settings: | [bucket.mjs#L14](bucket.mjs#L14) |
| 3 | Read the settings back from the emulator. Provided. | [bucket.mjs#L27](bucket.mjs#L27) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-10-bucket-done-right/part-1-locked-bucket/bucket.mjs
npm run test:10
```

## Where each number comes from

No numbers here, only settings. Six lines are ON: four Block Public Access switches, AES256 encryption and versioning Enabled.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
