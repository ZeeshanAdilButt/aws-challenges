# Part 2: a queue between the upload and the work

Time: about 20 minutes. Cost: 0 dollars, runs on the emulator.

## Why

After a file lands, the drive has work to do on it: fingerprint it, make a preview, look for a copy. That work is slower than the upload and it can fail. If the upload had to wait for it, a slow or broken step would make every upload slow or broken.

So the upload does not call the work. The bucket leaves a note that says "a file arrived" and the upload is finished. The note waits in a **queue** (SQS). A worker takes notes from the queue at its own speed.

Two settings of a queue matter today:

- **Visibility timeout.** When a worker takes a message, the queue hides it from other workers for this many seconds. If the worker deletes the message in time, it is done. If not, the message shows again and someone retries it.
- **Receive limit** (the queue setting is named `RedrivePolicy`). After a message was taken 3 times and never deleted, the queue moves it to a second queue, the **dead-letter queue**. One bad message then cannot be retried forever.

## Run it

Inside the lab shell. Create the dead-letter queue first, because the main queue points at it.

```bash
aws sqs create-queue --queue-name drive-uploads-dlq --query QueueUrl
aws sqs create-queue --queue-name drive-uploads --attributes '{
  "VisibilityTimeout": "5",
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:drive-uploads-dlq\",\"maxReceiveCount\":\"3\"}"
}' --query QueueUrl
```

Keep the address of the queue in a variable. You need it in this terminal for the next commands.

```bash
Q=$(aws sqs get-queue-url --queue-name drive-uploads --query QueueUrl --output text)
echo $Q
```

The visibility timeout is 5 seconds here so that the experiments in part 7 finish quickly. The AWS default is 30.

## Who may write to the queue

Tell the bucket to send a message for every new object under `files/`. Try it now:

```bash
aws s3api put-bucket-notification-configuration --bucket daftar-drive-files \
  --notification-configuration file://part-2-queue-and-events/notification.json || echo "REFUSED"
```

It is refused: `Unable to validate the following destination configurations`. The S3 service is not allowed to send to your queue until the queue's own policy says so. Open `part-2-queue-and-events/queue-policy.json` and read it. It allows one action (`sqs:SendMessage`), to one queue, from the S3 service, and only when the sender is your bucket in your account.

Attach the policy to the queue and try again.

```bash
aws sqs set-queue-attributes --queue-url $Q \
  --attributes "{\"Policy\": $(jq -c . part-2-queue-and-events/queue-policy.json | jq -Rs .)}"
aws s3api put-bucket-notification-configuration --bucket daftar-drive-files \
  --notification-configuration file://part-2-queue-and-events/notification.json
aws s3api get-bucket-notification-configuration --bucket daftar-drive-files --query 'QueueConfigurations[0].Events'
```

## See one event

Upload a file by hand and look at the note the bucket left.

```bash
echo "week 1 notes" > /tmp/hello.txt
aws s3 cp /tmp/hello.txt s3://daftar-drive-files/files/try/hello.txt
sleep 2
aws sqs get-queue-attributes --queue-url $Q --attribute-names ApproximateNumberOfMessages --query Attributes
aws sqs receive-message --queue-url $Q --max-number-of-messages 10 --visibility-timeout 0 \
  --query 'Messages[].Body' --output text | tr '\t' '\n' | jq -c '{event: (.Event // .Records[0].eventName), key: .Records[0].s3.object.key, size: .Records[0].s3.object.size}'
```

You should see two messages. One is `s3:TestEvent`, which S3 sent when you attached the notification, to prove it can reach the queue. The other is `ObjectCreated:Put` with the key `files/try/hello.txt` and the size 13. The note names the file. It does not carry the file.

Clean up, so the drive starts empty.

```bash
aws sqs purge-queue --queue-url $Q
aws s3 rm s3://daftar-drive-files/files/try/hello.txt
```

## Check

```bash
python part-2-queue-and-events/check.py
```

## Think about it

1. The message holds the key of the file and not its bytes. Give one reason that is the right choice.
2. Nobody reads the queue yet. What happens to the notes for files uploaded today? (An SQS queue keeps a message for 4 days unless you change that.)

## On real AWS

The same commands work, with your own account number. The two conditions matter more there: without them, the S3 service could be made to send to your queue on behalf of a bucket that is not yours. Two more things are true on real AWS that this lab does not show. S3 delivers each event at least once, so a note can arrive twice. And a note usually arrives within seconds but can take a minute or more.
