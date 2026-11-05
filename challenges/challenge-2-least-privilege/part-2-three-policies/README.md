# Challenge 2, part 2: three least-privilege policies

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A good policy is a short list of facts: this program may do these exact things to these exact objects. Two habits make that easy to review:

- **Exact actions.** `s3:GetObject`, not `s3:*`. A star hides what the program really needs.
- **Exact resources.** A path like `arn:aws:s3:::daftar-notes-prod/notes/*` (everything under `notes/`), not `*`.

Add **conditions** when a job should only run from a known place: for example only from inside Daftar's network range (`10.20.0.0/16`), or only in one region.

## The Daftar example

Daftar has three jobs that each get their own policy:

| Job | What it may do |
|---|---|
| API | read and write notes under `notes/`; send a message to the `daftar-jobs` queue |
| worker | take messages from the queue; read notes; write finished exports under `exports/` |
| weekly report | read only, notes only, only from inside the network, only in `us-east-1` |

Your policies are tested against requests they must allow and requests they must refuse (delete a note, read exports, send to another queue, call from an office address, call from another region). A lint also refuses wildcard actions and `Resource: "*"` in Allow statements.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It writes policies and tests them with the evaluator from part 1. | [daftar-policies.mjs#L1](daftar-policies.mjs#L1) |
| 2 | The API. It reads and writes notes under notes/, and sends a job to the queue. Nothing else. **(your turn)** | [daftar-policies.mjs#L12](daftar-policies.mjs#L12) |
| 3 | The worker. It takes jobs from the queue, reads notes, and writes finished exports under exports/. **(your turn)** | [daftar-policies.mjs#L19](daftar-policies.mjs#L19) |
| 4 | The weekly report job. Read only, notes only, only from inside the VPC (10.20.0.0/16), and only in us-east-1. **(your turn)** | [daftar-policies.mjs#L26](daftar-policies.mjs#L26) |
| 5 | Check one policy against its expectations, and look for lazy wildcards in the Allow statements. | [daftar-policies.mjs#L70](daftar-policies.mjs#L70) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-2-least-privilege/part-2-three-policies/daftar-policies.mjs
npm run test:2
```

## Where each number comes from

For each policy, "Requests allowed as wanted" counts the requests in `expectations.<job>.allow` that your policy allows, using your evaluator from part 1. "Requests refused as wanted" does the same for the `deny` lists. "Lazy wildcards" lists any Allow statement with an action ending in `*` or a resource that is just `*`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
