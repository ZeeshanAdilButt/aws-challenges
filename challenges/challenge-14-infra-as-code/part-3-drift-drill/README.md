# Challenge 14, part 3: the drift drill

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The code says only the two app subnets may reach database port 5432. You apply it with OpenTofu, so the group is in the tool's state. The script then changes that same group by hand (opens 5432 to 0.0.0.0/0), reads the rules back, and compares them with the code using the plan model. The tests do the same on a stand-in group that the SDK builds, because they do not start OpenTofu. You write the function that turns the rules into text and the rule that decides revert or adopt.

## The Daftar example

Before: "No changes." After the hand change: "Plan: 0 to add, 1 to change, 0 to destroy." The ingress rules changed. The rule is: a database port open to the whole internet is always reverted.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part changes a security group on the emulator, so it must only ever touch the emulator. | [drift.mjs#L1](drift.mjs#L1) |
| 2 | What the code says (security-group.tf): only the two app subnets may reach the database port. | [drift.mjs#L10](drift.mjs#L10) |
| 3 | Make the world match the code. Provided. In the tests this stands in for `apply`: it builds the group with the SDK and resets the emulator first. | [drift.mjs#L14](drift.mjs#L14) |
| 4 | Turn the rules the API reports into plain text attributes (your turn). | [drift.mjs#L23](drift.mjs#L23) |
| 5 | Decide what to do about a drift (your turn). Return 'revert' (put the world back to what the code says) | [drift.mjs#L41](drift.mjs#L41) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-14-infra-as-code/part-3-drift-drill/drift.mjs
npm run test:14
```

## Where each number comes from

The plan lines come from `planDiff()` in the course model. The real `tofu plan` lines from the first apply run say the same: "No changes.", then "Plan: 0 to add, 1 to change, 0 to destroy." after the hand change, then "No changes." after the revert.

## What this part cannot show

## Apply by hand

The checks in this part are static: they read your files and the wrapper. Starting OpenTofu is a separate step, done by hand with the wrapper, and the first apply run for this release was done on 2026-11-05 with OpenTofu 1.13.2 and moto 5.2.4. Its lines are in the results below. The group the drill changes must be one that OpenTofu created, so apply first, then change it by hand, then plan:

```
source toolkit/env.sh          # or: . .\toolkit\env.ps1 on Windows
npm run moto:up
cd <this part folder>
node ../../../toolkit/tofu.js init
node ../../../toolkit/tofu.js apply -auto-approve     # creates the VPC and the group, and records them in state
node ../../../toolkit/tofu.js plan                    # No changes.
node ../../../toolkit/with-env.mjs drift.mjs --open   # the hand change: opens 5432 to 0.0.0.0/0 on that group
node ../../../toolkit/tofu.js plan                    # 1 to change: the ingress rules
node ../../../toolkit/with-env.mjs drift.mjs --revert # put the group back
node ../../../toolkit/tofu.js plan                    # No changes.
```

The wrapper starts the pinned image `ghcr.io/opentofu/opentofu:1.13.2` on the Compose network (`aws-challenges`), where the emulator is reachable as `http://moto:5000`. It mounts only this folder, passes only fake keys, and writes `provider_override.tf.json`, which sets `allowed_account_ids` to the two emulator accounts and points every endpoint at the emulator. Terraform 1.17 reads the same files. The first run pulls the image (a download), so it is not part of `npm test`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
