# Challenge 17: Daftar Drive, a file storage system

Runs on: **the AWS Emulator** (its own compose file in this folder). Cost: 0 dollars, no AWS account.

## The 101

A drive like the one your class shares files in is six parts working together:

- **S3** keeps the files. **DynamoDB** keeps the facts about each file (name, owner, size, status).
- **API Gateway** is the front door with an address and a speed limit. **Lambda** runs the code behind it.
- **SQS** is a queue between "the file arrived" and "the file was looked at", so a slow or broken step never blocks an upload.
- A small **web page** on a server (an EC2 instance on real AWS) is what students see.

Around them, **IAM** decides what each part may touch and **CloudWatch** records what each part did.

## The Daftar example

Daftar students share notes and reports. You build the drive they upload to, then break it four ways and measure what happens: the worker stops, a file crashes the worker, too many requests arrive, and the same file comes twice.

## Parts

| Part | You build | Time |
|---|---|---|
| [1 storage and data](part-1-storage-and-data/README.md) | the bucket and the table | 15 min |
| [2 queue and events](part-2-queue-and-events/README.md) | the queue, its dead-letter queue, and the bucket's "a file arrived" note | 20 min |
| [3 API function and gateway](part-3-api-function-and-gateway/README.md) | the upload function, its role, the routes and the throttle | 30 min |
| [4 indexer and least privilege](part-4-indexer-and-least-privilege/README.md) | the queue reader, made safe to run twice, with a role cut down to size | 35 min |
| [5 web page](part-5-web-page/README.md) | the page students use | 15 min |
| [6 watch it](part-6-watch-it/README.md) | logs, metrics and one alarm | 20 min |
| [7 break it](part-7-break-it/README.md) | four experiments, one bug fix, one redrive | 40 min |

About 3 hours in all. Parts 1 to 5 make a working drive in about 2 hours.

## What you need

Only **Docker** (Docker Desktop on Windows or macOS, Docker Engine with the Compose plugin on Linux), with at least 4 GB of memory given to it and about 3 GB of free disk. The AWS CLI, Python and the emulator all come inside containers. Ports 9317, 8090 and 8091 on your computer must be free.

## Start it

On your own computer, in this folder:

```sh
docker compose --profile ui up -d --build
docker compose exec lab bash
```

The first build downloads about 1 GB once and takes a few minutes. The second command opens the **lab shell**. You type almost every command of this challenge there, so keep that terminal open. Inside it, check that you are safe:

```sh
python tools/guard.py
```

It must print `Safe: talking to the emulator at https://127.0.0.1:9317, account 000000000000.` From the repository root, `npm run drive:up` does the same as the first command.

Two pages open in a browser as you go: the console at http://127.0.0.1:8091 (look at what you built) and, from part 5, the drive itself at http://127.0.0.1:8090.

On Windows use PowerShell for the commands on your own computer. Git Bash can complain about a terminal when you open the lab shell.

## Your two gaps

Most of this challenge is commands you type and read. Two pieces are yours to write, both in part 4:

1. The conditional write in `app/indexer/handler.py` that makes the indexer safe to run twice.
2. The narrow policy `part-4-indexer-and-least-privilege/indexer-policy.json`.

## Check your work

Every part ends with `python part-N-.../check.py`, which prints `PASS` or `FAIL` for each thing it looked at, with a hint. From the repository root, `npm run test:17` runs all seven.

## If you fall behind or want a fresh start

`python tools/run_readme.py 1 2 3` (in the lab shell) types the commands of parts 1 to 3 for you, straight from their READMEs. To wipe everything, run `docker compose --profile ui --profile web down -v` on your own computer and start again. Everything in the emulator lives in memory, so a restart of Docker also empties it.

## What the emulator cannot show

- **EC2 and the network.** The emulator creates instances on paper and runs nothing on them, so the web page runs in a container. The VPC, the public subnet and the security group of the real design are in the course chapter, not in this lab.
- **Presigned uploads and downloads.** A real drive moves big files straight to and from S3 with presigned URLs, because a function accepts and returns at most 6 MB. The emulator signs such a URL for the real S3 host, so this lab sends small files (up to 1 MB) through the API.
- **Speed, scale and timing.** The queue is drained at about one file a second and the emulator slows down after a few hundred function calls. Bucket events arrive at once and exactly once here, where real S3 delivers at least once and can lag. Never read a performance number off it.
- **Security proof.** The emulator did enforce the roles of your functions, which is why you saw a real Access Denied. Its own documents still say it is not a tool for testing security. Check a real policy on real AWS.

## Teaching it to a class

[FACILITATOR.md](FACILITATOR.md) has a two hour and a three hour plan: what to prepare, what to demo, the question to ask before each experiment, and where students get stuck.

## Afterwards: the same design on real AWS

KodeKloud has a guided lab, "Design a file storage system with S3, Lambda and API Gateway", that builds this same shape in a real AWS console on a temporary account they provide. It is a good next step once you can explain every part here: you already know why each piece is there, and there you see the real console screens. This challenge and that lab are separate works and share only the topic.
