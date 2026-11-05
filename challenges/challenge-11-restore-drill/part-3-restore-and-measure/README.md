# Challenge 11, part 3: restore and measure

Runs on: **Docker stand-in**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A second container starts from a copy of the base backup, with `recovery.signal` and the lines you write: where to find archived WAL (`restore_command`), when to stop (`recovery_target_time`) and what to do then (`promote`). It replays the log up to the target and opens. You count the notes that came back.

## The Daftar example

Writes lost = the notes written in the last second before the drop. At 20 a second, about 20.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It restores the database to one second before the drop and measures what it cost. | [restore-and-measure.mjs#L1](restore-and-measure.mjs#L1) |
| 2 | Tell Postgres how to recover (your turn). Return the lines to add to postgresql.auto.conf of the restored copy: | [restore-and-measure.mjs#L11](restore-and-measure.mjs#L11) |
| 3 | Restore. Provided. Copy the base backup into a new volume, add the recovery lines and recovery.signal, start a second | [restore-and-measure.mjs#L22](restore-and-measure.mjs#L22) |
| 4 | The target is one second before the drop, computed by the database. Provided. | [restore-and-measure.mjs#L42](restore-and-measure.mjs#L42) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-11-restore-drill/part-3-restore-and-measure/restore-and-measure.mjs
npm run test:11
```

## Where each number comes from

The model `restorePlan()` says: target = the second before the drop, lost writes = (drop time - target) x writes per second = 20. Measured and modelled lost writes must be within one second of writes (20).

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
