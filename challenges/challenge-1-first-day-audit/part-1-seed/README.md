# Challenge 1, part 1: seed a fake account with bad settings

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

To practise an audit you need something to find. **Seeding** means filling an empty account with example data on purpose. You plant four kinds of bad setting (six findings) and two good ones, so that the audit in part 2 must tell good from bad.

Terms: an **IAM user** is a named identity for a person or a program. An **access key** is a pair of values (an ID and a secret) that lets a program act as that user. A **bucket policy** is a JSON document that says who may do what with a bucket. `Principal: "*"` means everyone, including people with no AWS account.

## The Daftar example

Asif, Aqib, a CI robot (`ci-deploy`) and an old contractor each have a user. Three of them created a key and never used it. Aqib's key was already switched off. One bucket, `daftar-public-assets`, was opened to everyone for a quick demo and never closed. The private bucket, `daftar-notes-private`, blocks public access.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. Seeding means creating users and buckets, so it must never reach a real account. | [seed-account.mjs#L1](seed-account.mjs#L1) |
| 2 | The root user has an access key. The emulator cannot store this, so it goes in a file. | [seed-account.mjs#L29](seed-account.mjs#L29) |
| 3 | Four IAM users. No password policy is set, which is the second bad setting. | [seed-account.mjs#L33](seed-account.mjs#L33) |
| 4 | Access keys that nobody ever used. aqib's key is switched off already, so it is not a problem. **(your turn)** | [seed-account.mjs#L36](seed-account.mjs#L36) |
| 5 | Two buckets. The private one blocks public access. The public one allows everyone to read. | [seed-account.mjs#L42](seed-account.mjs#L42) |
<!-- steps:end -->

## Run it

```
npm run moto:up
node toolkit/with-env.mjs challenges/challenge-1-first-day-audit/part-1-seed/seed-account.mjs
npm run test:1
```

## Where each number comes from

"4 kinds, 6 findings" is a count of what the seed plants: root key (1), no password policy (1), public bucket (1), three unused active keys (3). Aqib's switched-off key and the private bucket are the two things that must **not** be reported. The key IDs are random on every run, so nothing in the results depends on them.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
