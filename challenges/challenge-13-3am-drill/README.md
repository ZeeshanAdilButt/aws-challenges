# Challenge 13: the 3 am drill

Runs on: **dataset and model**. Cost: 0 dollars, runs on the emulator.

## The 101

**Observability** means you can see what your system is doing from the outside. Three kinds of data help: **metrics** (numbers over time, such as p99 latency or errors a minute), **logs** (lines of text with details) and **change records** (what was deployed, when).

- **p99** is the value that 99 percent of requests are faster than. It shows the slow tail that averages hide.
- An **alarm** watches a metric and goes to the state ALARM when the metric is bad. An "M of N" alarm needs M bad datapoints out of the last N.
- **Missing data** is a datapoint that never arrived. An alarm must be told what to do with it: count it as good, as bad, ignore it, or report "not enough data". The wrong choice can hide an outage.
- A **runbook** is a short page that tells a tired person at 3 am what they see, what to check and what to do.

## The Daftar example

At 01:05 a deploy goes out. At 01:10 the API gets slow. You read the night, test three alarm designs, and find three faults.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 the bad night](part-1-bad-night-data/README.md) | find when the trouble started and what changed just before | `timeline.mjs` |
| [2 three alarm designs](part-2-alarm-designs/README.md) | run 1 of 1, 2 of 3 and 3 of 3 over the night and count pages, false pages and delay | `designs.mjs` |
| [3 three faults and the runbook](part-3-three-faults-and-runbook/README.md) | find the slow query, the log growth and the silent alarm, then write the runbook line | `faults.mjs` |

## What the emulator cannot show

The emulator's CloudWatch keeps alarm settings but does not say that it evaluates them. So every alarm here is evaluated by the course model `toolkit/models/alarm.js`, whose rules (M of N, treat missing data) are the exercise's own, based on the CloudWatch documentation (dossier D13, D14). Everything else is a dataset made by `datasets/make-bad-night.mjs` (seed 13).

## Run it

```
# nothing to start: no emulator is needed
npm run test:13
```
