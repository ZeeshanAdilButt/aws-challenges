# Challenge 14, part 1: the VPC as code

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Four files: `versions.tf` (the provider), `variables.tf`, `main.tf` and `outputs.tf`. The VPC, the internet gateway and the six subnets are given. You write the routing: three route tables, two routes, six associations, an Elastic IP and the NAT gateway. The data route table has **no** internet route.

## The Daftar example

The same six address blocks as challenge 4. If the code is right, the model plan says "Plan: 21 to add, 0 to change, 0 to destroy."

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This script never calls AWS and never starts OpenTofu. It reads your .tf files and checks them. | [vpc-as-code.mjs#L1](vpc-as-code.mjs#L1) |
| 2 | Read the code. The files are versions.tf, variables.tf, main.tf and outputs.tf in this folder. | [vpc-as-code.mjs#L14](vpc-as-code.mjs#L14) |
| 3 | What the code should declare. These are the 21 resources of challenge 4's network: | [vpc-as-code.mjs#L17](vpc-as-code.mjs#L17) |
| 4 | The plan line the course model gives for this code against an empty account. The real `tofu plan` line came out the | [vpc-as-code.mjs#L31](vpc-as-code.mjs#L31) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-14-infra-as-code/part-1-the-vpc-as-code/vpc-as-code.mjs
npm run test:14
```

## Where each number comes from

21 resources: 1 VPC, 1 internet gateway, 6 subnets, 3 route tables, 2 routes, 6 associations, 1 Elastic IP, 1 NAT gateway. The count comes from reading the file.

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
