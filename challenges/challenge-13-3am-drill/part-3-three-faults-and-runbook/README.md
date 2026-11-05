# Challenge 13, part 3: three faults and the runbook

Runs on: **dataset and model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Three separate faults hid in the same night. (1) A slow database query that appeared with the deploy. (2) A debug log line added by the same deploy that made the logs about twice as big. (3) An error alarm that treats missing data as "not breaching", so when the error counter stopped arriving, the alarm went back to OK in the middle of the incident.

## The Daftar example

The runbook is the part that helps next time: a symptom, a check and a fix, written for a person who just woke up.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It reads the night again and writes down what went wrong. | [faults.mjs#L1](faults.mjs#L1) |
| 2 | Fault 1, the slow query (your turn). logs is a list of { time, level, msg }. | [faults.mjs#L12](faults.mjs#L12) |
| 3 | Fault 2, the log volume. Compare the average logMb before the deploy with the average between the deploy and the rollback. Provided. | [faults.mjs#L21](faults.mjs#L21) |
| 4 | Fault 3, the silent alarm (your turn). | [faults.mjs#L30](faults.mjs#L30) |
| 5 | The runbook line (your turn). Three short parts: what the on-call person sees, what to check, what to do. **(your turn)** | [faults.mjs#L41](faults.mjs#L41) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-13-3am-drill/part-3-three-faults-and-runbook/faults.mjs
npm run test:13
```

## Where each number comes from

Log volume: average MB a minute before the deploy against between the deploy and the rollback. Log cost: CloudWatch Logs ingestion is 0.50 dollars a GB (dossier P7, VERIFIED, read 2026-10-24). The count of incident minutes not in ALARM comes from `replayAlarm()` on the 5XX series with the alarm as written and with `breaching`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
