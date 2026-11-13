# Part 1: a place for the files and a place for the facts

Time: about 15 minutes. Cost: 0 dollars, runs on the emulator.

## Why

A drive keeps two different things. The **file** itself can be large and is read whole: a photo, a PDF, a zip. The **facts about the file** are small and are asked for all the time: its name, its owner, its size, whether it is ready.

One store is bad at one of these jobs. So you use two:

- **S3** keeps the bytes. A bucket holds objects, and each object has a key (its name inside the bucket).
- **DynamoDB** keeps the facts. A table holds items, and each item is found by its key in a few milliseconds, however many items there are.

The page that lists your files never opens a file. It reads the table.

## Run it

Type these inside the lab shell (`docker compose exec lab bash`, from the challenge folder).

First the guard. It must print the Safe line.

```bash
python tools/guard.py
```

Create the bucket and close it to the public. No file in a drive should be readable by a stranger with a link.

```bash
aws s3api create-bucket --bucket daftar-drive-files
aws s3api put-public-access-block --bucket daftar-drive-files \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api get-public-access-block --bucket daftar-drive-files --query PublicAccessBlockConfiguration
```

Create the table. Every item is found by one attribute, `id`. `PAY_PER_REQUEST` means you do not choose a size: you pay for each read and write.

```bash
aws dynamodb create-table --table-name drive-files \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --query TableDescription.TableStatus
aws dynamodb wait table-exists --table-name drive-files
aws dynamodb describe-table --table-name drive-files --query Table.TableStatus
```

The first answer is `"CREATING"` and the last is `"ACTIVE"`. Real AWS does the same: a table is not ready the moment you ask for it.

## Try both stores by hand

Put one file in the bucket and read it back.

```bash
echo "week 1 notes" > /tmp/hello.txt
aws s3 cp /tmp/hello.txt s3://daftar-drive-files/try/hello.txt
aws s3 ls s3://daftar-drive-files/try/
aws s3 cp s3://daftar-drive-files/try/hello.txt -
```

Put one item in the table and read it back by its key.

```bash
aws dynamodb put-item --table-name drive-files \
  --item '{"id": {"S": "try-1"}, "name": {"S": "hello.txt"}, "owner": {"S": "amina"}}'
aws dynamodb get-item --table-name drive-files --key '{"id": {"S": "try-1"}}' --query Item
```

`{"S": "hello.txt"}` is how DynamoDB writes a value with its type. `S` is a string and `N` is a number.

Now remove both, so the drive starts empty.

```bash
aws s3 rm s3://daftar-drive-files/try/hello.txt
aws dynamodb delete-item --table-name drive-files --key '{"id": {"S": "try-1"}}'
```

## Look at it in the browser

On your own computer (not in the lab shell), start the console once:

```sh
docker compose --profile ui up -d stackport
```

Open http://127.0.0.1:8091. Find the bucket under S3 and the table under DynamoDB. Everything you make in the next parts shows up here.

## Check

```bash
python part-1-storage-and-data/check.py
```

## Think about it

1. The list page reads the table and never the bucket. What would the page cost in time if it had to open every file to learn its size?
2. You closed the bucket to the public. How does a student still download a file? (Part 3 answers this.)

## On real AWS

The same two commands create the same two things. A bucket name must be unique across all of AWS, so `daftar-drive-files` is probably taken. Both stores charge by use and cost close to nothing when idle.
