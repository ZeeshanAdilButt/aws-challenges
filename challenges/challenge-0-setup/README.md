# Challenge 0: setup

Runs on: **emulator** (part 3 is a model of the guard's rules).

Cost: 0 dollars, runs on the emulator.

## The 101

Before you build anything on AWS, you make sure you can never hurt a real account by mistake. This challenge sets up the tools and proves the safety rules work.

Daftar is a small notes app. Its team wants to learn AWS without risking a surprise bill or a leaked key. So everything runs on **moto**, a free emulator in Docker. An emulator answers the same requests as AWS, but keeps its data in memory. When you stop it, the data is gone.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 the guard and the safe environment](part-1-guard/README.md) | list the safe settings and check them | `show-environment.mjs` |
| [2 moto up, list buckets, down](part-2-moto-roundtrip/README.md) | create and delete a bucket on the emulator | `moto-roundtrip.mjs` |
| [3 the safety rules as tests](part-3-safety-rules/README.md) | write six unsafe setups and watch the guard refuse each | `safety-rules.mjs` |

## What runs where

Parts 1 and 2 talk to the emulator. Part 3 only runs the guard's rule function, so it needs no emulator.

## What the emulator cannot show

moto keeps the API state (resources and settings) but runs no instances, moves no packets, evaluates IAM only at a basic level and has no cost data. Challenges 2, 4 and 5 use the course's pure models for those questions.

## Run it

```
npm run moto:up
npm run test:0
```
