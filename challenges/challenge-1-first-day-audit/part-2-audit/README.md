# Challenge 1, part 2: the audit script

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

An audit script asks the account questions and turns the answers into findings. Each question is one API call, and the way the API says "nothing here" matters: when no password policy exists, `GetAccountPasswordPolicy` does not return an empty answer, it fails with `NoSuchEntity`. Your script must read that failure as a finding, and must still stop on a real error (such as no network).

Terms: **Block Public Access** is a bucket setting that switches off public access whatever a policy says. A key's **last used** date tells you if anybody still uses it; if the date is missing, the key was never used.

## The Daftar example

Maya runs the audit on Daftar's new account. It should print six findings, each with the AWS name, the thing at fault and the fix. It must not report the private bucket or Aqib's switched-off key. Reporting those would train the team to ignore the audit.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. | [audit.mjs#L1](audit.mjs#L1) |
| 2 | The root user's keys. Provided: it reads the small file from part 1. | [audit.mjs#L17](audit.mjs#L17) |
| 3 | The password policy. Missing is a finding. So is a weak one (under 14 characters, or a missing character type). **(your turn)** | [audit.mjs#L25](audit.mjs#L25) |
| 4 | Buckets that the whole internet can read. A bucket is public when its policy says so **(your turn)** | [audit.mjs#L33](audit.mjs#L33) |
| 5 | Active keys nobody uses. A key with no "last used" date has never been used. **(your turn)** | [audit.mjs#L42](audit.mjs#L42) |
| 6 | Run all four checks and sort the findings so the report is the same every time. | [audit.mjs#L51](audit.mjs#L51) |
<!-- steps:end -->

## Run it

```
npm run moto:up
node toolkit/with-env.mjs challenges/challenge-1-first-day-audit/part-2-audit/audit.mjs
npm run test:1
```

## Where each number comes from

- **Findings (6)**: one for the root key, one for the password policy, one for the public bucket, and one for each of three unused active keys.
- **A password policy counts as weak** when the minimum length is under 14 or any of the four character types is not required.
- **A bucket is public** when `GetBucketPolicyStatus` says `IsPublic` and `RestrictPublicBuckets` is not on.
- **A key is unused** when it is Active and has no last-used date. The `minAgeDays` option is how long it must have been idle. It is 0 here because every key in the emulator is brand new; in a real account use 45 days. The test shows the difference.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
