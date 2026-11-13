"""Check part 6: the log groups, the metrics and the alarm."""
import datetime

from lib.drive import ALARM, API_FN, DLQ, INDEXER_FN, Checker, client, safe

c = Checker("Part 6: watch it")
logs, cw = client("logs"), client("cloudwatch")

groups = safe(lambda: [g["logGroupName"] for g in logs.describe_log_groups()["logGroups"]], [])
c.check("both functions have a log group", {f"/aws/lambda/{API_FN}", f"/aws/lambda/{INDEXER_FN}"} <= set(groups),
        "a log group appears after the function's first run with the logs permission")
events = safe(lambda: logs.filter_log_events(logGroupName=f"/aws/lambda/{INDEXER_FN}",
                                             filterPattern='"indexed"').get("events", []), [])
c.check("the indexer wrote at least one indexed line", len(events) >= 1, "upload a file and wait a few seconds")

now = datetime.datetime.now(datetime.timezone.utc)
window = dict(StartTime=now - datetime.timedelta(hours=3), EndTime=now + datetime.timedelta(minutes=1), Period=10800)


def total(namespace, metric, dims=()):
    points = cw.get_metric_statistics(Namespace=namespace, MetricName=metric, Statistics=["Sum"],
                                      Dimensions=[{"Name": k, "Value": v} for k, v in dims], **window)["Datapoints"]
    return sum(p["Sum"] for p in points)


c.check("CloudWatch counted the API's invocations",
        safe(lambda: total("AWS/Lambda", "Invocations", [("FunctionName", API_FN)]), 0) > 0)
c.check("your own metric DaftarDrive/FilesIndexed has data", safe(lambda: total("DaftarDrive", "FilesIndexed"), 0) > 0,
        "the indexer role needs cloudwatch:PutMetricData")
alarm = safe(lambda: cw.describe_alarms(AlarmNames=[ALARM])["MetricAlarms"][0], {})
c.check(f"alarm {ALARM} exists", bool(alarm), "aws cloudwatch put-metric-alarm ...")
c.check("it watches the dead-letter queue",
        alarm.get("MetricName") == "ApproximateNumberOfMessagesVisible"
        and {"Name": "QueueName", "Value": DLQ} in alarm.get("Dimensions", []),
        "the dimension must be QueueName=drive-uploads-dlq")
c.check("it fires above 0", alarm.get("Threshold") == 0 and alarm.get("ComparisonOperator") == "GreaterThanThreshold")
c.check("its period is 60 seconds, the shortest a service metric supports", alarm.get("Period") == 60,
        "use --period 60")
c.done()
