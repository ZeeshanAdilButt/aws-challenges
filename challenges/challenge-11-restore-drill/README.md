# Challenge 11: a restore drill

Runs on: **Docker stand-in**. Cost: 0 dollars, runs on the emulator.

## The 101

A backup you have never restored is a hope, not a backup. A **restore drill** means you break something on purpose and bring it back, and you write down how long it took and what you lost.

- A **base backup** is a full copy of the database files.
- The **WAL** (write-ahead log) is the list of every change the database makes. If you keep the WAL files (**archiving**), you can start from the base backup and replay the log up to any moment you choose. This is **point-in-time recovery**.
- **RDS** does this for you: it keeps backups and logs and lets you restore to a chosen time inside the **restorable window**. It creates a **new** database, it does not rewind the old one.

## The Daftar example

Someone at Daftar drops the `notes` table by mistake. You restore to the second before, and count how many notes were lost.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 WAL and a write load](part-1-wal-and-write-load/README.md) | create the table, take a base backup and write 20 notes a second | `wal-and-load.mjs` |
| [2 drop a table](part-2-drop-a-table/README.md) | drop the table at a recorded moment and see the app error | `drop-a-table.mjs` |
| [3 restore and measure](part-3-restore-and-measure/README.md) | restore to one second before the drop and compare with the course model | `restore-and-measure.mjs` |

## What the emulator cannot show

moto does not run a database engine. So this challenge uses a stand-in: the `postgres:17-alpine` image (already needed, no new download) started by Docker Compose, with the same ideas RDS uses (base backup plus WAL archive). The restore speed measured here is for a tiny database on your own computer and says nothing about the speed of RDS. RDS adds what the stand-in does not: managed backups and logs, a restorable window, a new endpoint for the restored copy, Multi-AZ, and encryption. This challenge makes no claim about RDS timing. The restore time model (`toolkit/models/restore.js`) counts in whole units; here one unit is one second.

## Run it

```
docker compose --profile restore up -d postgres   # the tests start and stop it themselves
npm run test:11
```
