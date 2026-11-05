# Challenge 10, part 3: lifecycle rules, a cost estimate and an audit

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A lifecycle rule says "after 30 days move to Standard-IA, after 90 days to Glacier Instant Retrieval, delete old versions after 365 days". The estimate counts storage, requests and retrieval for each class. The audit asks the emulator for each setting and names every missing one with its AWS name.

## The Daftar example

A 100 TB bucket with data up to a year old. In Standard it costs 2,300 dollars a month for storage alone. With the rules most of the data sits in Glacier Instant Retrieval at 0.004 dollars a GB.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part sets rules on buckets and reads them back, so it must only ever touch the emulator. | [lifecycle-and-audit.mjs#L1](lifecycle-and-audit.mjs#L1) |
| 2 | The lifecycle rules (your turn). One rule for the whole bucket, in the format of PutBucketLifecycleConfiguration: | [lifecycle-and-audit.mjs#L15](lifecycle-and-audit.mjs#L15) |
| 3 | How many GB end up in each class (your turn). A sample bucket holds totalGb, spread evenly over ages 0 to maxAgeDays - 1 **(your turn)** | [lifecycle-and-audit.mjs#L28](lifecycle-and-audit.mjs#L28) |
| 4 | The audit. Provided. Each finding uses the AWS name of the setting. | [lifecycle-and-audit.mjs#L47](lifecycle-and-audit.mjs#L47) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-10-bucket-done-right/part-3-lifecycle-and-audit/lifecycle-and-audit.mjs
npm run test:10
```

## Where each number comes from

Prices: us-east-1, read 2026-10-24 (dossier P11, VERIFIED): storage per GB-month Standard 0.023, Standard-IA 0.0125, Glacier Instant Retrieval 0.004; PUT 0.005 per 1,000; GET 0.0004 per 1,000 (Standard), 0.01 per 10,000 (IA), 0.1 per 10,000 (Glacier IR); Glacier IR retrieval 0.03 a GB. A lifecycle transition request is billed like one PUT because the notes have no separate price (stated in the model). The exercise has no Standard-IA retrieval fee; the real class has one. The sample (10 million uploads, 20 million reads, 500 GB retrieved from Glacier IR) is made up.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
