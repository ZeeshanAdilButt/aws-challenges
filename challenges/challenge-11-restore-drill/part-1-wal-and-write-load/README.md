# Challenge 11, part 1: WAL archiving and a write load

Runs on: **Docker stand-in**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The Compose service starts Postgres with `wal_level=replica`, `archive_mode=on` and an `archive_command` that copies each finished WAL file into a volume. `archive_timeout=5` makes a file at least every 5 seconds, so you see files quickly. A script takes a base backup with `pg_basebackup`, then writes one note every 50 ms.

## The Daftar example

Daftar writes notes all the time. After 8 seconds there are 160 notes, and WAL files sit in the archive.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It starts the Postgres stand-in (the Compose service "postgres", image postgres:17-alpine). | [wal-and-load.mjs#L1](wal-and-load.mjs#L1) |
| 2 | The table and one insert (your turn). | [wal-and-load.mjs#L12](wal-and-load.mjs#L12) |
| 3 | A base backup (a full copy of the database files, taken while it runs) into the archive volume. Provided. | [wal-and-load.mjs#L26](wal-and-load.mjs#L26) |
| 4 | Write one note every 50 ms (20 a second) for LOAD_SECONDS. Provided. | [wal-and-load.mjs#L31](wal-and-load.mjs#L31) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-11-restore-drill/part-1-wal-and-write-load/wal-and-load.mjs
npm run test:11
```

## Where each number comes from

20 notes a second for 8 seconds is 160 notes. The WAL file names are read from the archive volume.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
