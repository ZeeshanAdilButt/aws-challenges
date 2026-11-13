# Part 4: the indexer, and a role cut down to size

Time: about 35 minutes. Cost: 0 dollars, runs on the emulator.

## Why

Two files sit in the drive with the status `receiving`, and two notes sit on the queue. In this part a second function, the **indexer**, reads the queue. For each note it checks that the file still has a record, reads the file, works out a fingerprint, writes a short preview, and marks the record `ready`.

You do two pieces of work yourself:

1. **Make the indexer safe to run twice.** A queue may hand out the same note more than once. The indexer must leave the same result either way.
2. **Cut its role down.** You get a policy that allows everything, and you write the one that allows only what the indexer does.

## YOUR TURN 1: mark the record ready, once

Open `app/indexer/handler.py` and find `_mark_ready`. Between the two `YOUR TURN` lines, write one `ddb.update_item` call. The hints in the file give you the update expression. The part that matters is the **condition**:

```text
attribute_exists(id) AND (attribute_not_exists(indexed_etag) OR indexed_etag <> :etag)
```

In words: the record must exist, and either nobody indexed it yet, or the file has changed since. The **ETag** is a short code S3 works out from the bytes of an object when it is stored in one piece, as these are. The same bytes give the same code. If the same note arrives a second time, the ETag is the same, the condition is false, DynamoDB refuses the write, and the function reports `skipped`. The check and the write happen as one step inside DynamoDB, so two copies of the indexer that run at the same moment cannot both win.

The line `ADD work_done :one` counts how many times the work was really done. Part 7 reads that counter.

## A role that allows everything

Inside the lab shell. Create the role and, for now, attach the wide policy.

```bash
aws iam create-role --role-name drive-indexer-role \
  --assume-role-policy-document file://part-4-indexer-and-least-privilege/trust-policy.json --query Role.Arn
aws iam put-role-policy --role-name drive-indexer-role --policy-name indexer-access \
  --policy-document file://part-4-indexer-and-least-privilege/indexer-policy.wide.json
```

Create the function, then link the queue to it. The link is called an **event source mapping**: Lambda itself reads the queue and calls your function with the messages.

```bash
python tools/package.py indexer
aws lambda create-function --function-name drive-indexer --runtime python3.12 \
  --role arn:aws:iam::000000000000:role/drive-indexer-role \
  --handler handler.handler --zip-file fileb:///tmp/drive-indexer.zip \
  --timeout 4 --memory-size 128 --query State
aws lambda wait function-active-v2 --function-name drive-indexer
aws lambda create-event-source-mapping --function-name drive-indexer \
  --event-source-arn arn:aws:sqs:us-east-1:000000000000:drive-uploads \
  --batch-size 1 --query State
```

The function's timeout (4 seconds) is shorter than the queue's visibility timeout (5 seconds) on purpose. If it were longer, the queue could show a message again while the first run was still busy with it.

Wait a few seconds and list the files. The two notes that were waiting have been worked off.

```bash
sleep 10
URL=$(aws apigatewayv2 get-apis --query "Items[?Name=='drive-http-api'].ApiEndpoint" --output text)
curl -s --cacert $AWS_CA_BUNDLE $URL/files | jq -c '.files[] | {name, status, preview, work_done}'
```

Both should say `"status":"ready"` with a preview and `"work_done":"1"`. If they still say `receiving`, your `update_item` is not right yet. Read the function's errors with the log command at the end of this part, fix the code, and send the new code with:

```text
python tools/package.py indexer
aws lambda update-function-code --function-name drive-indexer --zip-file fileb:///tmp/drive-indexer.zip --query LastUpdateStatus
```

## What the wide role would let a bug do

Ask IAM what the role may do. The policy simulator answers without doing anything.

```bash
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::000000000000:role/drive-indexer-role \
  --action-names s3:GetObject s3:DeleteObject s3:DeleteBucket dynamodb:DeleteTable sqs:PurgeQueue \
  --resource-arns "*" --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
```

All five are `allowed`. The indexer only ever reads a file. With this role, one bug in it (or one stolen set of its credentials) could delete every file, the table and the queue.

## YOUR TURN 2: write the narrow policy

Create the file `part-4-indexer-and-least-privilege/indexer-policy.json`. Work from what the code calls. Open `app/indexer/handler.py` again and list every AWS call it makes:

| The code calls | Action to allow | On which resource |
|---|---|---|
| Lambda reads the queue for it | `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` | the queue `drive-uploads` |
| `s3.get_object` | `s3:GetObject` | objects under `files/` in the bucket |
| `ddb.put_item`, `ddb.get_item`, `ddb.update_item` | `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:UpdateItem` | the table `drive-files` |
| `print` | `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` | log groups that start with `/aws/lambda/drive-indexer` |
| `cloudwatch.put_metric_data` | `cloudwatch:PutMetricData` | `*`, with a condition (see below) |

Write one statement per row. The ARNs have these shapes, and `api-policy.json` in part 3 shows two of them in use:

```text
arn:aws:sqs:us-east-1:000000000000:drive-uploads
arn:aws:s3:::daftar-drive-files/files/*
arn:aws:dynamodb:us-east-1:000000000000:table/drive-files
arn:aws:logs:us-east-1:000000000000:log-group:/aws/lambda/drive-indexer*
```

`cloudwatch:PutMetricData` is the odd one. It has no resource to name, so its `Resource` must be `*`. You can still narrow it with a condition that allows only your own namespace:

```text
"Condition": { "StringEquals": { "cloudwatch:namespace": "DaftarDrive" } }
```

Replace the wide policy with yours. `put-role-policy` with the same policy name overwrites it.

```bash
aws iam put-role-policy --role-name drive-indexer-role --policy-name indexer-access \
  --policy-document file://part-4-indexer-and-least-privilege/indexer-policy.json
sleep 2
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::000000000000:role/drive-indexer-role \
  --action-names s3:GetObject s3:DeleteObject s3:DeleteBucket dynamodb:DeleteTable sqs:PurgeQueue \
  --resource-arns "*" --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
```

Now all five say `implicitDeny`, even `s3:GetObject`. The question was "on any resource", and the answer is no: only on the files of one bucket. Ask about the real resource:

```bash
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::000000000000:role/drive-indexer-role \
  --action-names s3:GetObject s3:DeleteObject \
  --resource-arns "arn:aws:s3:::daftar-drive-files/files/abc/notes.txt" \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
```

`s3:GetObject` is `allowed` and `s3:DeleteObject` is `implicitDeny`.

## Prove the narrow role still does the job

A policy that is too tight shows up as a broken upload, so upload one file and watch it become ready.

```bash
curl -s --cacert $AWS_CA_BUNDLE -X POST $URL/files \
  -d "{\"name\": \"narrow.txt\", \"owner\": \"amina\", \"content_b64\": \"$(echo 'least privilege works' | base64)\"}"; echo
sleep 6
curl -s --cacert $AWS_CA_BUNDLE $URL/files | jq -c '.files[] | {name, status, preview}'
aws logs filter-log-events --log-group-name /aws/lambda/drive-indexer \
  --query 'events[].message' --output json | jq -r '.[]' | grep -E '"event"|ERROR|AccessDenied' | tail -4
```

`narrow.txt` must be `ready`. If it stays `receiving`, the log names the action your policy forgot.

## Check

```bash
python part-4-indexer-and-least-privilege/check.py
```

## Think about it

1. `cloudwatch:PutMetricData` has the resource `*`. What would the role be able to do without the namespace condition?
2. The API role and the indexer role are separate. What would be lost with one shared role for both functions?
3. Every upload in this drive gets a new id, so a key is never overwritten and the "file has changed" half of the condition never fires here. What would have to change in the drive for it to matter?

## On real AWS

Roles are enforced on every call, as they were here. One thing to copy with care: this lab gives the function a timeout of 4 seconds and the queue a visibility timeout of 5, so that retries are quick to watch. AWS's guide for Lambda with SQS recommends a visibility timeout of at least six times the function timeout, and a receive limit of at least 5, because a busy Lambda can use up receives without your code running. Check the current guide before you choose real values. Two tools help you narrow a role with evidence: IAM Access Analyzer can write a policy from what a role really did (read from CloudTrail), and the policy simulator you just used exists in the console too. The emulator checked the function's role for you, but its own documents say it is not a security test, so check a real policy on real AWS before you trust it.
