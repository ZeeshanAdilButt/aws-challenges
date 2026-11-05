# Challenge 14: the earlier challenges as code

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The 101

**Infrastructure as code** means you describe your cloud in files, and a tool makes the cloud match the files. We use **OpenTofu** (Terraform reads the same files).

- `plan` compares the files with the **state** (the tool's record of what it built) and prints what it would add, change or destroy. `apply` does it.
- **Remote state** keeps that record in a shared place, an S3 bucket. A **lock** stops two people from applying at the same time. With `use_lockfile = true` the lock is a small object written with a conditional write.
- **Drift** is when the real cloud no longer matches the files, for example someone changed a security group by hand. A plan shows it.
- A **plan review** is reading a plan before you apply it. Replacements and wide permissions are the lines to stop on.

## The Daftar example

You turn the VPC from challenge 4 into code, keep its state in S3, find and fix a drift, and review a risky plan.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 the VPC as code](part-1-the-vpc-as-code/README.md) | write the route tables, routes, NAT gateway and associations in OpenTofu | `vpc-as-code.mjs` |
| [2 state in S3](part-2-state-in-s3/README.md) | write the lock drill: take the state lock with a conditional write | `state-in-s3.mjs` |
| [3 the drift drill](part-3-drift-drill/README.md) | change a security group by hand, read the plan, and choose revert or adopt | `drift.mjs` |
| [4 the plan review](part-4-plan-review/README.md) | read a plan and name the three risky changes | `review.mjs` |

## What the emulator cannot show

moto keeps API state, runs no instances, moves no packets and checks IAM only at a basic level. The OpenTofu apply is not run by the tests (it needs the OpenTofu image, which is a download): the tests read the files, the wrapper arguments, the provider override and the course plan model (`toolkit/models/plan.js`, which has the same idea as `tofu plan`). The model counts a `for_each` or a module as the resources you can see in the file. The real `tofu plan` lines come from the first apply run (2026-11-05, OpenTofu 1.13.2, moto 5.2.4), and are in the results of parts 1 to 3. How `allowed_account_ids` behaves together with `skip_requesting_account_id` is not documented, so the wrapper keeps the account check on for the provider and turns it off only for the state backend.

## Run it

```
npm run moto:up
npm run test:14
```
