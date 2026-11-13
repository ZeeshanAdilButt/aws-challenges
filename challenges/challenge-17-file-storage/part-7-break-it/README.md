# Part 7: break it on purpose

Time: about 40 minutes. Cost: 0 dollars, runs on the emulator.

## Why

A design shows what it is worth on a bad day. You will cause four bad days and measure each one. Before every run, **write down what you think will happen**. A wrong guess teaches you more than a right one.

Each experiment is one command inside the lab shell. Each prints what it measured. Copy your own numbers into `part-7-break-it/results.md` as you go. The numbers below are from the reference run and yours will differ a little.

## Experiment 1: the indexer stops, the uploads keep coming

Predict: the indexer is switched off and 12 students upload a file. How many uploads fail?

```bash
python part-7-break-it/experiments.py backlog
```

Reference run:

| Measured | Value |
|---|---|
| Uploads accepted while the indexer was off | 12 of 12 |
| Slowest upload answer | 343 ms |
| Messages waiting in the queue | 12 |
| File statuses while it was off | 12 receiving |
| Time to empty the queue after it came back | 9.2 s |
| File statuses at the end | 12 ready |

No upload failed, and no upload was slow. The work piled up in the queue and was done later. That is the reason the queue is in the design. Now think of the same day without the queue, with the upload calling the indexer directly: 12 students would have seen an error.

The queue does not make the work go away. If files arrive faster than the indexer finishes them for long enough, the queue grows without end. The number to watch is the age of the oldest message.

## Experiment 2: a file the indexer cannot read

Predict: one uploaded file crashes the indexer every time. What happens to that file? What happens to the file uploaded right after it?

```bash
python part-7-break-it/experiments.py poison
```

Reference run:

| Measured | Value |
|---|---|
| `fine.txt`, uploaded right after the broken one | ready after 2 s |
| Failed tries on `broken.txt` in the log | 3 |
| Time until the message was in the dead-letter queue | 19.4 s |
| Status of `broken.txt` | receiving |
| Alarm `drive-dead-letters` | ALARM, about a minute later |

Read the crash yourself:

```bash
aws logs filter-log-events --log-group-name /aws/lambda/drive-indexer --filter-pattern UnicodeDecodeError \
  --query 'events[].message' --output json | jq -r '.[]' | grep ERROR | cut -c1-150
aws sqs get-queue-attributes --queue-url $(aws sqs get-queue-url --queue-name drive-uploads-dlq --query QueueUrl --output text) \
  --attribute-names ApproximateNumberOfMessages --query Attributes
```

Three things happened, and each one is a part doing its job. The function crashed, so it did not delete the message. The queue showed the message again after the visibility timeout, three times in all. Then the receive limit moved it out of the way, and the alarm told a person. The other file was never held up.

A message that fails every time is called a **poison message**. Retrying helps with a fault that passes, such as a network blip. It never helps with a bug. The dead-letter queue is where the bug's victims wait for you.

## Experiment 3: more requests than the front door allows

Predict: the stage allows 20 requests a second with a burst of 10. You send 40 at the same moment. How many get an answer?

```bash
python part-7-break-it/experiments.py throttle
```

Reference run:

| Measured | Value |
|---|---|
| 40 requests at once | 11 answered 200, 29 answered 429 (14 and 26 in a later run) |
| 5 requests, 2 seconds later | all 200 |

The gateway keeps a bucket of 10 tokens and refills it 20 times a second. Each request takes one token. A request that finds the bucket empty gets `429 Too Many Requests` at once, and your function never runs for it. The first reference run let 11 through, one more than the burst size, and a later run let 14 through. Tokens come back while the 40 requests are still arriving, so the slower they arrive, the more get an answer. Real API Gateway also treats its limits as targets, not exact counts. That protects everything behind the door: the function, the table and your bill.

The throttle is not an error to fix. It is a promise to keep: a client that gets a 429 should wait a moment and try again. Open the page at http://127.0.0.1:8090 and you will find that `web/app.py` already says so in plain words when it gets a 429.

## Experiment 4: the same thing twice

Predict: a student uploads the same report two times. How many files does the drive hold? And the queue hands the indexer the same note four times. How many times is the work done?

```bash
python part-7-break-it/experiments.py twice
```

Reference run:

| Measured | Value |
|---|---|
| Records after two uploads of the same file | 2 |
| Objects in the bucket | 2 |
| Same fingerprint | True |
| The second record | `duplicate_of` names the first one |
| Deliveries of one note | 4 (1 real, 3 repeats) |
| Repeats skipped | 3 |
| `work_done` | 1 |

Two different "twice" are in this table, and they need different answers.

The student uploaded twice **on purpose** (or by a double click). The drive cannot know which. It keeps both, and the fingerprint lets it say "this is a copy". Deleting a copy without asking would be a decision for the student, not for the indexer.

The queue delivered twice **by accident**. That must change nothing, and it did not: the conditional write you wrote in part 4 refused the three repeats. Every queue on AWS may deliver a message more than once, so every reader of a queue needs this.

## Fix the bug and bring the file back

`broken.txt` is still `receiving` and its note is in the dead-letter queue. Fix the indexer. In `app/indexer/handler.py`, change `_preview` so that a file that is not text gets a preview that says so:

```text
    try:
        return data.decode("utf-8")[:60]
    except UnicodeDecodeError:
        return "(not text)"
```

Send the new code, then move the message from the dead-letter queue back to the main queue. That move is called a **redrive**.

```bash
python tools/package.py indexer
aws lambda update-function-code --function-name drive-indexer --zip-file fileb:///tmp/drive-indexer.zip --query LastUpdateStatus
aws lambda wait function-updated-v2 --function-name drive-indexer
aws sqs start-message-move-task --source-arn arn:aws:sqs:us-east-1:000000000000:drive-uploads-dlq --query TaskHandle --output text | cut -c1-20
sleep 12
URL=$(aws apigatewayv2 get-apis --query "Items[?Name=='drive-http-api'].ApiEndpoint" --output text)
curl -s --cacert $AWS_CA_BUNDLE $URL/files | jq -c '.files[] | select(.name == "broken.txt") | {name, status, preview}'
```

`broken.txt` is `ready` with the preview `(not text)`. The student never uploaded it again. The file waited in the bucket and its note waited in the dead-letter queue, and nothing was lost while the bug was open. Within a minute or two the alarm goes back to `OK`:

```bash
sleep 100
aws cloudwatch describe-alarms --alarm-names drive-dead-letters --query 'MetricAlarms[0].StateValue'
```

## Check

```bash
python part-7-break-it/check.py
```

## Think about it

1. In experiment 1 the uploads stayed fast while the indexer was off. Name the one part that would make uploads fail if it stopped.
2. In experiment 2, what would have happened to `fine.txt` with no dead-letter queue and one indexer copy that reads one message at a time, in order?
3. A 429 protected the function. Who is hurt by it, and what should their program do?
4. Why did the indexer use the ETag in its condition and not the file name?
5. The copy check is global. It can tell one student that their file has the same content as another student's file. Is that acceptable in a shared drive? What would you change?

## What this emulator cannot show you

- It drained about 1.3 files a second. Real Lambda reads a queue with many copies of your function at once and is far faster.
- The alarm took a minute or two because queue metrics arrive once a minute. That part is like real AWS.
- Bucket events arrived in a second or two, every time, exactly once. Real S3 delivers each event at least once and can take longer.
- A download goes through the function, and a function's answer can be at most 6 MB. A real drive hands out a presigned URL for downloads as well.
- Every call of a function leaves a few megabytes behind in the emulator that it never frees. After a few hundred calls it gets slow. To start fresh, run `docker compose down -v` and `docker compose up -d` on your own computer, then `python tools/run_readme.py 1 2 3 4` in the lab shell.
