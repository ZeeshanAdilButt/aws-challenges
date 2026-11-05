# Challenge 11, part 2: drop a table

Runs on: **Docker stand-in**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The restore must name a moment. You record it from the **database** clock (`clock_timestamp()`), not your own computer, because the recovery reads the database clock. After the drop the app gets error `42P01`: the relation does not exist.

## The Daftar example

The drop is recorded to the microsecond. One second before it is the restore target.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It repeats part 1 (backup and write load), then someone drops the table. | [drop-a-table.mjs#L1](drop-a-table.mjs#L1) |
| 2 | The mistake (your turn). Do three things in this order and return what you saw: | [drop-a-table.mjs#L9](drop-a-table.mjs#L9) |
| 3 | What the app sees after the drop, and making sure the WAL up to the drop is archived. Provided. | [drop-a-table.mjs#L20](drop-a-table.mjs#L20) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-11-restore-drill/part-2-drop-a-table/drop-a-table.mjs
npm run test:11
```

## Where each number comes from

The drop time is printed in the results. The rows before the drop are counted just before the drop.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
