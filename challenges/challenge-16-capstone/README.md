# Challenge 16: the capstone

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The 101

The capstone puts the course together. You design the whole Daftar platform, write it as code, test it, break it and price it.

- A **design** says what the system must do and why it is built this way. The **Well-Architected** review asks six questions: operational excellence, security, reliability, performance efficiency, cost optimization and sustainability.
- The platform is: a VPC in two zones, a load balancer, an ECS service for the API, a queue and a worker function, a bucket, roles with small policies, alarms and a database.
- You test it with the **models** from earlier challenges (can A reach B? is this request allowed?), you break it three ways, and you price it at three traffic levels.

## The Daftar example

Daftar grows from a class project to a platform. The capstone shows what it would take to run it for 100, 1,000 and 5,000 requests a second.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 design and code it](part-1-design-and-code/README.md) | write design.md and the OpenTofu code in infra/ | `design-and-code.mjs` |
| [2 test it](part-2-test-it/README.md) | write the path probes and the policy probes, and save the evidence | `test-it.mjs` |
| [3 break it](part-3-break-it/README.md) | lose a zone, scope a leaked key, find a bill spike, and write the runbook | `break-it.mjs` |
| [4 price it](part-4-price-it/README.md) | cost the design at three traffic levels and halve the largest line | `price-it.mjs` |

## What the emulator cannot show

moto keeps API state, runs no instances, moves no packets and checks IAM only at a basic level; RDS on moto is API state only, and moto has no RDS subnet groups, so the database is validate-only. So the tests use the reachability model (challenge 5), the policy model (challenge 2), the scaling model (challenge 7), the bill model (challenge 15) and the cost model. The OpenTofu apply to the emulator is not run by the tests; the first apply run is in part 1.

## Run it

```
npm run moto:up
npm run test:16
```
