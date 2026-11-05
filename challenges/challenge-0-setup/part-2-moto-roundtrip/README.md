# Challenge 0, part 2: moto up, list buckets, down

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A **bucket** is a named container for files in **S3**, AWS's file storage service. An AWS **account** is the owner of all your resources. A brand new account has no buckets.

You send three requests with the AWS SDK for JavaScript (the library `@aws-sdk/client-s3`): `ListBuckets` (what exists?), `CreateBucket` and `DeleteBucket`. A **client** is the object that sends them. `toolkit/aws.js` gives you a client that can only talk to the emulator.

## The Daftar example

Daftar keeps each user's notes as files in a bucket called `daftar-notes-prod`. Here you practise on a throwaway bucket, `daftar-setup-check`, to prove your setup works end to end.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first, then the clients. aws.js imports the guard too, so a client cannot exist without it. | [moto-roundtrip.mjs#L1](moto-roundtrip.mjs#L1) |
| 2 | Start from an empty emulator and list the buckets. A new account has none. | [moto-roundtrip.mjs#L14](moto-roundtrip.mjs#L14) |
| 3 | Create the bucket Daftar will use for its notes. **(your turn)** | [moto-roundtrip.mjs#L18](moto-roundtrip.mjs#L18) |
| 4 | Delete it again. The account is empty once more. **(your turn)** | [moto-roundtrip.mjs#L24](moto-roundtrip.mjs#L24) |
<!-- steps:end -->

## Run it

```
npm run moto:up
node toolkit/with-env.mjs challenges/challenge-0-setup/part-2-moto-roundtrip/moto-roundtrip.mjs
npm run test:0
npm run moto:down
```

After `moto:down` run `npm run moto:up` again and list the buckets: the emulator starts empty. That is the point. Nothing you do here lasts.

## Where each number comes from

There are no numbers to compute. The three rows are three `ListBuckets` answers: before the create, after the create, after the delete. `resetEmulator()` in step 2 empties the emulator, so "before" is always empty.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
