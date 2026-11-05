# Challenge 14, part 2: state in S3

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The backend block in `backend.tf` says: keep the state in the bucket `daftar-tfstate`, and use a lock file. The lock is written with **If-None-Match: \***, which means "create only if it does not exist". The second person gets HTTP 412 (precondition failed) and OpenTofu prints a lock error. You do the same thing with the SDK on the emulator.

## The Daftar example

Ana takes the lock. Bilal tries and is refused. Ana lets go (the object is deleted). Bilal tries again and gets it.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part creates a bucket on the emulator, so it must only ever touch the emulator. | [state-in-s3.mjs#L1](state-in-s3.mjs#L1) |
| 2 | Create the state bucket with versioning on (so an old state can be brought back). Provided. | [state-in-s3.mjs#L16](state-in-s3.mjs#L16) |
| 3 | Take the lock the way use_lockfile does (your turn). | [state-in-s3.mjs#L22](state-in-s3.mjs#L22) |
| 4 | Let the lock go. Provided. | [state-in-s3.mjs#L31](state-in-s3.mjs#L31) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-14-infra-as-code/part-2-state-in-s3/state-in-s3.mjs
npm run test:14
```

## Where each number comes from

The drill uses the S3 calls PutObject (with IfNoneMatch), ListObjectsV2 and DeleteObject. The results table shows what the emulator did on each step: moto refuses the second conditional write (HTTP 412), as S3 does. Real OpenTofu shows it the same way: in the first apply run, the second apply stopped with "Error acquiring the state lock", and the message under it named StatusCode 412 and PreconditionFailed.

## What this part cannot show

## Apply by hand

The checks in this part are static: they read your files and the wrapper. Starting OpenTofu is a separate step, done by hand with the wrapper, and the first apply run for this release was done on 2026-11-05 with OpenTofu 1.13.2 and moto 5.2.4. Its lines are in the results below. To run it yourself:

```
source toolkit/env.sh          # or: . .\toolkit\env.ps1 on Windows
npm run moto:up
cd <this part folder>
node ../../../toolkit/tofu.js init
node ../../../toolkit/tofu.js plan
node ../../../toolkit/tofu.js apply -auto-approve
```

The wrapper starts the pinned image `ghcr.io/opentofu/opentofu:1.13.2` on the Compose network (`aws-challenges`), where the emulator is reachable as `http://moto:5000`. It mounts only this folder, passes only fake keys, and writes `provider_override.tf.json`, which sets `allowed_account_ids` to the two emulator accounts and points every endpoint at the emulator. Terraform 1.17 reads the same files. The first run pulls the image (a download), so it is not part of `npm test`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
