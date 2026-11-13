# Part 6: watch it (logs, metrics and one alarm)

Time: about 20 minutes. Cost: 0 dollars, runs on the emulator.

## Why

The drive works. On the day it stops working, nobody will tell you which part broke. You find out from what the parts wrote down while they ran. AWS collects that in **CloudWatch**, in three forms:

- A **log** is text a part printed, line by line, with a time. It answers "what happened to this one file?"
- A **metric** is a number measured again and again. It answers "how many, how fast, how full?"
- An **alarm** watches one metric and changes state when the number crosses a line. It answers "should a person look now?"

You set up nothing for most of this. Lambda and SQS report their own numbers. You added two things yourself in the code: one log line per file, and one metric of your own.

## Logs: follow one file

Inside the lab shell. Each function has a **log group**. List them, then read what the indexer said about each file.

```bash
aws logs describe-log-groups --query 'logGroups[].logGroupName' --output text
aws logs filter-log-events --log-group-name /aws/lambda/drive-indexer --filter-pattern '"indexed"' \
  --query 'events[].message' --output text | tr '\t' '\n' | jq -c '{name, bytes, ms}'
```

The code prints each line as JSON on purpose. A machine can then pick fields out of it, as `jq` just did. A line such as `done with notes.txt` reads well and cannot be counted.

Lambda adds a line of its own after every call. Read the last three for the API:

```bash
aws logs filter-log-events --log-group-name /aws/lambda/drive-api --filter-pattern REPORT \
  --query 'events[-3:].message' --output text | tr '\t' ' ' | sed 's/REPORT/\nREPORT/g' | grep REPORT
```

`Duration` is how long your code ran. `Billed Duration` is what you pay for, rounded up to the next millisecond.

## Metrics: count and time

Ask CloudWatch for numbers over the last hour. First set the time window.

```bash
START=$(date -u -d '-60 minutes' +%Y-%m-%dT%H:%M:%SZ); END=$(date -u -d '+1 minutes' +%Y-%m-%dT%H:%M:%SZ)
echo "from $START to $END"
```

How many times did each function run, and how long does the API take?

```bash
for FN in drive-api drive-indexer; do
  echo "$FN invocations: $(aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Invocations \
    --dimensions Name=FunctionName,Value=$FN --start-time $START --end-time $END --period 3600 --statistics Sum \
    --query 'sum(Datapoints[].Sum)' --output text)"
done
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration \
  --dimensions Name=FunctionName,Value=drive-api --start-time $START --end-time $END --period 3600 \
  --statistics Average Maximum --query 'Datapoints[0].{average_ms: Average, slowest_ms: Maximum}'
```

Your numbers will differ from your neighbour's. The slowest call is usually the very first one: Lambda had to start a fresh copy of the function, which is called a **cold start**.

Your own metric, the one the indexer sends with `put_metric_data`:

```bash
aws cloudwatch get-metric-statistics --namespace DaftarDrive --metric-name FilesIndexed \
  --start-time $START --end-time $END --period 3600 --statistics Sum --query 'sum(Datapoints[].Sum)'
```

It counts files that were really indexed. A repeat delivery that was skipped adds nothing. That is a business number, and no AWS service could have counted it for you. It can run a little low: if sending the number fails, the indexer logs `metric-not-sent` and moves on, because a file that is indexed must not be retried for the sake of a counter.

How full is the queue right now? This is the number to watch for the health of the whole drive.

```bash
aws cloudwatch get-metric-statistics --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=drive-uploads --start-time $START --end-time $END --period 3600 \
  --statistics Maximum --query 'Datapoints[0].Maximum'
```

## One alarm: a file nobody could index

A message reaches the dead-letter queue only after three failed tries. So one message there means one file a student is waiting for and will never see `ready`. That deserves a person's attention. Make an alarm that fires when the dead-letter queue holds anything at all.

```bash
aws cloudwatch put-metric-alarm --alarm-name drive-dead-letters \
  --alarm-description "A file could not be indexed after 3 tries" \
  --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=drive-uploads-dlq \
  --statistic Maximum --period 60 --evaluation-periods 1 \
  --threshold 0 --comparison-operator GreaterThanThreshold --treat-missing-data notBreaching
sleep 20
aws cloudwatch describe-alarms --alarm-names drive-dead-letters --query 'MetricAlarms[0].StateValue'
```

It says `"OK"` (or `"INSUFFICIENT_DATA"` in the first minute, before the first number arrives). In part 7 you will make it say `"ALARM"`. A period of 60 seconds is the shortest that works for a number a service reports about itself, because those numbers arrive once a minute.

Notice what you did not alarm on: the main queue being non-empty. A queue with messages in it is a queue doing its job. Alarm on what hurts a user.

## Check

```bash
python part-6-watch-it/check.py
```

## Think about it

1. A student says "my file is stuck". You have the file id. Which of the three (log, metric, alarm) do you open first, and what do you search for?
2. Suppose the API function shows 0 errors and the indexer shows 3. Which users noticed, and when?
3. Why is "the main queue has more than 0 messages" a bad alarm, and "the oldest message is older than 5 minutes" a good one?

## On real AWS

All of this exists with the same names. Three things differ. Logs are kept forever unless you set a retention time, and you pay for every gigabyte, so set one. Standard metrics arrive once a minute, so an alarm reacts in one to five minutes. And an alarm on real AWS does something: it sends a message to an SNS topic, which emails or pages a person.
