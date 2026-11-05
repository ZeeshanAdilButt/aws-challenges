# AWS challenges

Hands-on challenges for the course **AWS in Practice** by Zeeshan Adil. You build, break and fix cloud systems for **Daftar**, a made-up notes app that is moving to AWS. Nothing here touches a real AWS account.

Cost: 0 dollars, runs on the emulator.

## The 101: what you need to know first

- **AWS** (Amazon Web Services) is a company that rents out computers, storage, networks and many other services. You talk to AWS by sending requests to its **API** (a web address that accepts commands). Every request is signed with an **access key**: a pair of text values that works like a username and password.
- An **emulator** is a program on your own computer that answers the same API requests, but keeps everything in memory and does nothing real. We use **moto**, a free emulator, started with Docker. It listens at `http://localhost:5000`.
- A **model** is a small pure program (no network, no AWS) that follows a set of rules, for example the rules AWS uses to decide if a request is allowed. The emulator keeps settings but moves no network packets and enforces IAM only in a basic way, so the questions "can A reach B?" and "is this request allowed?" are answered by models in `toolkit/models/`. They are the same rules the course pictures use.
- A **dataset** is a file we generated for you to study, such as an event log. It is small, documented in `datasets/README.md`, and made with a fixed seed, so it is the same for everyone.
- A **challenge** is a project made of **parts**. Each part has one script, one test, a README and (in the reference) the results of a real run.

## Safety first: the guard

This computer may hold real AWS credentials in `~/.aws`. These challenges must never use them. So every script and every test starts with `import '../../../toolkit/guard.js'` (or `guard-offline.js` for parts that never call AWS). The guard stops the program, before any AWS call, unless all of this is true:

1. `AWS_ENDPOINT_URL` is set and its host is exactly `localhost`, `127.0.0.1` or `[::1]`. Any `AWS_ENDPOINT_URL_*` must also be local. `AWS_IGNORE_CONFIGURED_ENDPOINT_URLS` must not be set.
2. The keys are exactly `test` and `test`. There is no session token, no `AWS_PROFILE`, and no key starting `AKIA` or `ASIA`. Instance metadata is switched off, and the config and credentials files are replaced by two empty files in `.aws-empty/`.
3. Only then does it ask the emulator who it is (STS `GetCallerIdentity`). The answer must be account `123456789012` (moto) or `000000000000` (LocalStack).
4. It prints one line: `Safe: talking to the emulator at http://localhost:5000, account 123456789012.`

The OpenTofu wrapper (`toolkit/tofu.js`) pins `allowed_account_ids` to the same two accounts and every endpoint to the emulator. The guard has its own tests (`toolkit/guard.test.mjs`): they check that a real-looking key, a remote endpoint and a profile are all refused. `npm run guard` runs the guard alone and is the first check in the CI workflow.

## Set up

You need **Node.js 24** and **Docker**. Then:

```
npm ci
npm run moto:up        # starts the emulator, waits until it answers
npm run guard          # should print the "Safe:" line
npm test               # runs the toolkit tests and every challenge test
npm run moto:down      # stops the emulator, everything in it is gone
```

`npm run ...` sets the safe variables for you. To run a script by hand, set them first: `source toolkit/env.sh` (macOS, Linux) or `. .\toolkit\env.ps1` (Windows PowerShell). If port 5000 is already used on your computer, stop the other program first: the guard accepts only that address.

## How a challenge works

1. Open `challenges/challenge-N-name/README.md`, then each part's `README.md`.
2. In the part's script, find `// YOUR TURN start` and `// YOUR TURN end`. Write your code between them. Lines starting with `// HINT:` help you.
3. Run the part's test: `npm run test:N`. In this template the tests **fail on purpose** until you write your part.
4. Run the script itself to see your numbers: `node toolkit/with-env.mjs challenges/challenge-N-name/part-M-name/script.mjs`.

The step table in each part README links to the exact line of each step.

## What runs where

| Kind | What it means | Example |
|---|---|---|
| emulator | SDK calls to moto | create a VPC, list buckets |
| model | the course's pure models | can the app reach the database? is this request allowed? |
| dataset | a provided file to analyse | a log of what a leaked key did |
| optional real account | a README-only checklist with costs and a teardown, never required, never run by this repository | the first-day checklist |

## What the emulator cannot show

moto keeps the API state (resources and their settings) but runs no instances, moves no packets, evaluates IAM only at a basic level and has no cost data. That is why reachability, policy decisions, scaling, alarms and costs are computed by the models in `toolkit/models/` and by the price table in `toolkit/prices.js` (dated, with a VERIFIED or UNVERIFIED tag on every price).

## The challenges in this release

| Challenge | Parts | Runs on |
|---|---|---|
| [0 setup](challenges/challenge-0-setup/README.md) | the guard and the safe environment; moto up, list buckets, down; the safety rules as tests | emulator |
| [1 first-day-audit](challenges/challenge-1-first-day-audit/README.md) | seed a fake account with bad settings; audit it; fix it and audit again | emulator |
| [2 least-privilege](challenges/challenge-2-least-privilege/README.md) | the policy evaluator; three least-privilege policies; narrow a wide policy from an access log | model |
| [3 leaked-key](challenges/challenge-3-leaked-key/README.md) | read an event log; scope the damage; containment plan and runbook | dataset, emulator |
| [4 vpc-from-scratch](challenges/challenge-4-vpc-from-scratch/README.md) | plan the address blocks; build the VPC on the emulator; test routes and price NAT | emulator, model |
| [5 broken-networks](challenges/challenge-5-broken-networks/README.md) | ten broken networks in three sets | model |

| [6 right-size](challenges/challenge-6-right-size/README.md) | read a week of metrics; recommend a size and a purchase mix | dataset |
| [7 scale-with-load](challenges/challenge-7-scale-with-load/README.md) | replay a sale through target tracking; warm-up and cooldown; chart the lag | model |
| [8 ecs-deploy](challenges/challenge-8-ecs-deploy/README.md) | register a task definition; plan a rolling deploy; fail and roll back | emulator, model |
| [9 serverless-events](challenges/challenge-9-serverless-events/README.md) | upload to queue to handler; retries and a dead-letter queue; an idempotent handler | emulator |
| [10 bucket-done-right](challenges/challenge-10-bucket-done-right/README.md) | a locked bucket; policy and presigned URL; lifecycle, cost and audit | emulator, model |
| [11 restore-drill](challenges/challenge-11-restore-drill/README.md) | WAL archiving; drop a table; restore to the second before | Docker stand-in (Postgres) |
| [12 dynamodb-keys](challenges/challenge-12-dynamodb-keys/README.md) | three access patterns; a skewed load; write sharding | emulator, model |
| [13 3am-drill](challenges/challenge-13-3am-drill/README.md) | a bad night; three alarm designs; three faults and a runbook | dataset, model |
| [14 infra-as-code](challenges/challenge-14-infra-as-code/README.md) | the VPC as OpenTofu; state in S3; a drift drill; a plan review | emulator, model |
| [15 find-the-bill](challenges/challenge-15-find-the-bill/README.md) | two usage reports; find three causes; tags and rules | dataset |
| [16 capstone](challenges/challenge-16-capstone/README.md) | design and code the platform; test it; break it; price it | emulator, model |

Challenge 11 starts a Postgres container (`postgres:17-alpine`, Compose profile `restore`) and challenge 12 uses moto instead of the DynamoDB Local image, to save a download. The OpenTofu challenges (14 and 16) are tested without starting OpenTofu; the apply is a hand step described in their READMEs.

## The toolkit

| File | What it is |
|---|---|
| `toolkit/guard.js`, `guard-core.js`, `guard-lib.js`, `guard-offline.js` | the safety guard and its rules |
| `toolkit/env.sh`, `env.ps1`, `with-env.mjs` | set the safe environment |
| `toolkit/aws.js` | SDK clients (S3, IAM, EC2, STS, ECS, SQS, DynamoDB) that can only talk to the emulator, and `resetEmulator()` |
| `toolkit/tofu.js` | runs OpenTofu 1.13.2 from a pinned image (Terraform 1.17 reads the same files), guarded |
| `toolkit/table.js`, `bars.js` | result tables and SVG bar charts |
| `toolkit/prices.js` | the dated price table |
| `toolkit/models/policy.js` | IAM policy evaluation |
| `toolkit/models/subnets.js` | CIDR arithmetic with AWS's five reserved addresses |
| `toolkit/models/reach.js` | route tables, security groups and network ACLs along a path |
| `toolkit/models/rightsize.js`, `scaling.js`, `rollout.js` | right-sizing from metrics; target tracking, warm-up and cooldown; ECS rolling batches and the circuit breaker |
| `toolkit/models/sqs.js`, `s3cost.js`, `dynamo.js` | queue retries and dead-letter queue; S3 class and lifecycle cost; DynamoDB units and hot keys |
| `toolkit/models/alarm.js`, `plan.js`, `bill.js`, `restore.js`, `cost.js`, `policylint.js` | M-of-N alarms; plan diff; bill diff and tag coverage; restore point; platform cost; policy text lint |
| `toolkit/hcl.js` | a small reader for .tf files, used by the static tests of challenges 14 and 16 |

## Layout

```
challenges/challenge-N-name/part-M-name/   README.md, script, test (results.md and chart.svg in the reference)
datasets/                                  generated data, with its generator and a README
toolkit/                                   guard, clients, models, helpers
tools/                                     wait-for-moto (and, in the reference, make-results and make-starter)
.aws-empty/                                two empty files so real AWS config is never read
```
