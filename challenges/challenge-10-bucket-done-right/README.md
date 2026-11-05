# Challenge 10: a bucket done right

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The 101

**S3** stores objects (files) in **buckets**. A bucket is private by default, but it is easy to make it wrong. Four things make a bucket safe and cheap:

- **Block Public Access**: four switches that stop anyone from making the bucket public by mistake.
- **Default encryption**: every object is encrypted at rest.
- **Versioning**: an overwritten or deleted object can be brought back.
- A **bucket policy** says who can do what, and a **presigned URL** is a link that works for a short time without giving away your keys.
- **Lifecycle rules** move old objects to cheaper **storage classes** (Standard, Standard-IA, Glacier Instant Retrieval) and delete old versions.

## The Daftar example

Daftar keeps student notes in `daftar-notes-prod`. You lock the bucket, write its policy, make a short-lived link, add lifecycle rules, price a 100 TB sample, and audit two buckets: one careless, one done right.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 a locked bucket](part-1-locked-bucket/README.md) | create a bucket with Block Public Access, encryption and versioning | `bucket.mjs` |
| [2 a policy and a presigned URL](part-2-policy-and-presign/README.md) | write a TLS-only policy for the app role and make a link that expires | `policy-and-presign.mjs` |
| [3 lifecycle, cost and audit](part-3-lifecycle-and-audit/README.md) | write the lifecycle rules, estimate a 100 TB bucket, and audit two buckets | `lifecycle-and-audit.mjs` |

## What the emulator cannot show

moto applies bucket policies only for Principal "*" and ignores conditions, so it cannot tell you that a policy is too wide (it does apply a Deny for Principal "*", which is why part 2 makes its link on a second bucket) or that a request over plain HTTP would be refused. The real check here is a policy-text lint (`toolkit/models/policylint.js`) and the policy model (`toolkit/models/policy.js`). The audit reads the settings the emulator stores. The money comes from `toolkit/models/s3cost.js`, because the emulator has no prices. The project brief lists four parts and the module spec three; this challenge follows the spec and puts the audit in part 3.

## Run it

```
npm run moto:up
npm run test:10
```
