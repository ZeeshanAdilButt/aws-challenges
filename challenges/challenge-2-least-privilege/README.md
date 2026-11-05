# Challenge 2: least privilege

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The 101

**IAM** (Identity and Access Management) decides who may do what in AWS. A **policy** is a JSON document of **statements**. Each statement says `Allow` or `Deny`, for some **actions** (like `s3:GetObject`), on some **resources** (named by an ARN, an Amazon Resource Name such as `arn:aws:s3:::daftar-notes/notes/42`), maybe only if a **condition** is true.

**Least privilege** means giving a program exactly what it needs and nothing more. If its key leaks (challenge 3), the damage is limited to that little.

IAM follows four rules, and you build them in part 1:

1. Everything starts **denied**.
2. An **Allow** that matches opens the door.
3. A matching **Deny** always wins, even over an Allow in another policy.
4. A **permissions boundary** is a cap: an action must also be allowed by the boundary.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 the policy evaluator](part-1-evaluator/README.md) | write the decision logic in `toolkit/models/policy.js` | `evaluate-requests.mjs` |
| [2 three policies](part-2-three-policies/README.md) | write least-privilege policies for the API, the worker and the report job | `daftar-policies.mjs` |
| [3 narrow a wide policy](part-3-narrow/README.md) | turn an access log into a tight policy | `narrow-from-log.mjs` |

Do part 1 first: parts 2 and 3 use your evaluator.

## What the emulator cannot show

moto does not enforce IAM in depth, so this challenge never asks it. The evaluator in `toolkit/models/policy.js` is the course's own model. It covers statements, wildcards, conditions on any request key, explicit deny and boundaries. It leaves out policy variables, resource policies, service control policies and session policies. Real IAM has them.

## Run it

```
npm run test:2
```
