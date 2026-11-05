# Challenge 16, part 1: design and code it

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Copy `design.template.md` to `design.md` and fill each section: requirements, estimate, diagram, a short self-review against the six pillars, and the lab board result. Then write the code in `infra/`: `network.tf`, `storage.tf` and `compute.tf` are given; you write `iam.tf` (three roles whose policies are the JSON files in `infra/policies/`) and `alarms.tf` (three alarms, one with missing data treated as breaching).

## The Daftar example

The API role may read and write only `notes/`, send to one queue, and nothing else. The error alarm still fires when the error counter goes silent.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS and never starts OpenTofu. It reads design.md and the code in infra/ and checks them. | [design-and-code.mjs#L1](design-and-code.mjs#L1) |
| 2 | The resource types the platform must declare in infra/ (applied to the emulator). | [design-and-code.mjs#L14](design-and-code.mjs#L14) |
| 3 | Read design.md and report what is missing (provided). A section counts when it has at least 40 characters of text. | [design-and-code.mjs#L26](design-and-code.mjs#L26) |
| 4 | The plan line from the course model for the code in infra/. The real `tofu plan` line counts each for_each item, so it is higher. | [design-and-code.mjs#L47](design-and-code.mjs#L47) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-16-capstone/part-1-design-and-code/design-and-code.mjs
npm run test:16
```

## Where each number comes from

Resource counts come from reading the files. The database is in `infra/validate-only/` on purpose (see below). db.t4g.medium is a size whose us-east-1 price is UNVERIFIED in the research notes (dossier P22).

## What this part cannot show

## Apply by hand

The tests are static: they read `design.md`, the files in `infra/`, the policy JSON files, the wrapper arguments and the models. Starting OpenTofu is a separate step. The first apply run for this release was done on 2026-11-05 with OpenTofu 1.13.2 and moto 5.2.4; its lines are in the results below. To run it yourself:

```
source toolkit/env.sh          # or: . .\toolkit\env.ps1 on Windows
npm run moto:up
cd challenges/challenge-16-capstone/part-1-design-and-code/infra
node ../../../../toolkit/tofu.js init
node ../../../../toolkit/tofu.js plan
node ../../../../toolkit/tofu.js apply -auto-approve
```

The wrapper runs the pinned OpenTofu image on the Compose network, where the emulator is `http://moto:5000`. If moto 5.2.4 refuses a resource type, drop that resource and note it in `results.md`. In the first apply run it refused the three `aws_cloudwatch_metric_alarm` resources: the call `PutMetricAlarm` failed with "deserialization failed", because the emulator does not answer the newer CloudWatch format the AWS provider uses. AWS itself accepts them. Keep `alarms.tf` (the tests read it) and leave the alarms out of the emulator apply instead:

```
node ../../../../toolkit/tofu.js apply -auto-approve -exclude=aws_cloudwatch_metric_alarm.api_5xx -exclude=aws_cloudwatch_metric_alarm.api_p99 -exclude=aws_cloudwatch_metric_alarm.jobs_dlq_not_empty
```

That apply ends with "Apply complete! Resources: 40 added, 0 changed, 0 destroyed." The database (`infra/validate-only/rds.tf`) is **never applied**: moto has no RDS subnet groups, so it is only checked with `tofu validate` and by a static test. The model plan line counts a `for_each` as one resource; real OpenTofu counts each item.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
