# Challenge 10, part 2: a bucket policy and a presigned URL

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A bucket policy has statements. One **Deny** statement refuses every request that does not use HTTPS (`aws:SecureTransport` is false). One **Allow** statement lets the app role read and write only under `notes/`. A **presigned URL** carries its signing time and its lifetime in the address: `X-Amz-Date` and `X-Amz-Expires`.

## The Daftar example

The app role may read `notes/1.txt` over HTTPS. It may not read `exports/` and may not delete anything. A teacher gets a link that works for 2 seconds in this drill (minutes or hours in real life).

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part puts a policy on a bucket and signs a URL, so it must only ever touch the emulator. | [policy-and-presign.mjs#L1](policy-and-presign.mjs#L1) |
| 2 | The bucket policy (your turn). Two statements: | [policy-and-presign.mjs#L16](policy-and-presign.mjs#L16) |
| 3 | How long a presigned URL lives. The URL carries X-Amz-Date (when it was signed) and X-Amz-Expires (seconds). Provided. | [policy-and-presign.mjs#L25](policy-and-presign.mjs#L25) |
| 4 | The drill. Provided: apply the policy, read it back, lint it, sign a URL that lives 2 seconds, use it, wait, check it again. | [policy-and-presign.mjs#L34](policy-and-presign.mjs#L34) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-10-bucket-done-right/part-2-policy-and-presign/policy-and-presign.mjs
npm run test:10
```

## Where each number comes from

The link lives 2 seconds. After 3 seconds the URL's own dates say "expired". Whether the emulator also refuses it is shown in the results (the emulator does not have to check expiry; AWS does).

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
