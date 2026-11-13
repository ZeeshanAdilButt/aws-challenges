"""Check part 2: the two queues, the redrive policy, the queue policy and the bucket notification."""
import json

from lib.drive import BUCKET, DLQ, MAX_RECEIVES, QUEUE, Checker, arn, client, queue_counts, queue_url, safe

c = Checker("Part 2: queue and events")
sqs, s3 = client("sqs"), client("s3")

c.check(f"dead-letter queue {DLQ} exists", safe(lambda: queue_url(DLQ)) is not None, "create drive-uploads-dlq first")
attrs = safe(lambda: sqs.get_queue_attributes(QueueUrl=queue_url(QUEUE), AttributeNames=["All"])["Attributes"], {})
c.check(f"queue {QUEUE} exists", bool(attrs), "create drive-uploads")
c.check("visibility timeout is 5 seconds", attrs.get("VisibilityTimeout") == "5", 'the attribute is "VisibilityTimeout": "5"')
redrive = json.loads(attrs.get("RedrivePolicy", "{}"))
c.check(f"a message moves to the dead-letter queue after {MAX_RECEIVES} receives",
        str(redrive.get("maxReceiveCount")) == str(MAX_RECEIVES) and redrive.get("deadLetterTargetArn") == arn("sqs", DLQ),
        "RedrivePolicy must be a JSON string with deadLetterTargetArn and maxReceiveCount 3")
policy = json.loads(attrs.get("Policy", "{}"))
st = (policy.get("Statement") or [{}])[0]
c.check("the queue policy lets S3 send, and only from your bucket",
        st.get("Action") == "sqs:SendMessage"
        and st.get("Condition", {}).get("ArnEquals", {}).get("aws:SourceArn") == arn("s3", BUCKET),
        "attach part-2-queue-and-events/queue-policy.json with set-queue-attributes")
conf = safe(lambda: s3.get_bucket_notification_configuration(Bucket=BUCKET).get("QueueConfigurations", []), [])
c.check("the bucket sends ObjectCreated events to the queue",
        any(q.get("QueueArn") == arn("sqs", QUEUE) and "s3:ObjectCreated:*" in q.get("Events", []) for q in conf),
        "run put-bucket-notification-configuration again after the queue policy is attached")
leftover = safe(lambda: s3.list_objects_v2(Bucket=BUCKET, Prefix="files/try/").get("KeyCount", 0), 0)
c.check("the try file is removed", leftover == 0, "aws s3 rm s3://daftar-drive-files/files/try/hello.txt")
c.check("the queue is empty", safe(lambda: sum(queue_counts(QUEUE)), 1) == 0, "aws sqs purge-queue --queue-url $Q")
c.done()
