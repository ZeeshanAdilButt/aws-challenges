# Challenge 0, part 1: the guard and the safe environment

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

An **environment variable** is a named value that your computer gives to every program it starts, for example `AWS_REGION=us-east-1`. The AWS tools read some of them to decide where to send requests and which keys to use. If one of them is wrong, a program can quietly talk to a real account.

The **guard** (`toolkit/guard.js`) is the first thing every script loads. It reads these variables, refuses to go on if anything is unsafe, and only then asks the emulator who it is.

## The Daftar example

Maya works at Daftar. On her laptop she also has a real AWS login for her other job. If she ran a Daftar script with her real profile, it could create buckets in the wrong account. The guard makes that impossible: a profile, a real-looking key or a remote address stops the program at once.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard is the first import. If anything looks unsafe, the program stops right here. | [show-environment.mjs#L1](show-environment.mjs#L1) |
| 2 | Compare each required variable with the value the course expects. **(your turn)** | [show-environment.mjs#L8](show-environment.mjs#L8) |
| 3 | Show the list for the real environment of this process, and the places the guard moved the config files. | [show-environment.mjs#L17](show-environment.mjs#L17) |
<!-- steps:end -->

## Run it

```
npm run moto:up
node toolkit/with-env.mjs challenges/challenge-0-setup/part-1-guard/show-environment.mjs
npm run test:0
```

## Where each number comes from

- **5 variables**: the list `REQUIRED` in `toolkit/guard-core.js`. Each has the value the course expects and one sentence on why.
- **Config file and credentials file**: the guard replaces your real files with the two empty files in `.aws-empty/`, so a profile on disk can never be read.
- **Profile (not set)**: the guard refuses to start if `AWS_PROFILE` has any value.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
