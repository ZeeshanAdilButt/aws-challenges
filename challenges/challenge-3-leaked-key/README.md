# Challenge 3: leaked key

Runs on: **dataset** and **emulator**. Cost: 0 dollars, runs on the emulator.

## The 101

An **access key** is a long-lived secret that lets a program call AWS. If it is copied into a public repository, a chat or a log, strangers can use it. Attackers scan the internet for keys, so a leaked key is often used within minutes.

When it happens you do four things in this order: **find out what was done** (scope), **stop it** (contain), **clean up** (eradicate) and **get back to normal** (recover). Then you **learn**. A **runbook** is a short written procedure for this, so that a tired person at 3am can follow it.

AWS keeps a record of calls in **CloudTrail**: who called what, when, from which address. Here you work with a made-up log in the same shape.

## The Daftar story

On 2026-10-19 Daftar's CI robot key is used from an address nobody knows. The log has a week of normal work and one stranger. You read the log, measure the damage, write the containment plan, and run its first two steps on the emulator.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 read the event log](part-1-event-log/README.md) | count calls per key, address and region; spot the odd one | `inspect-log.mjs` |
| [2 scope the damage](part-2-scope/README.md) | calls, resources, first and last time of the stranger | `scope-key.mjs` |
| [3 contain and write the runbook](part-3-contain/README.md) | deny policy, key switch-off, plan and runbook entry | `contain.mjs` |

## What the emulator cannot show

The emulator does not produce CloudTrail logs, so the log is a generated dataset (`datasets/README.md`). IAM can switch a key off and attach a policy on the emulator, so part 3 runs those two steps for real there; it does not enforce the policy, so a model (`toolkit/models/policy.js`) shows that every call the stranger made would be refused.

## Run it

```
npm run moto:up
npm run test:3
```
