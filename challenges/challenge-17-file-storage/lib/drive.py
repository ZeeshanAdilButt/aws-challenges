"""Shared helpers for challenge 17: names, clients, waiting and the check() helper.

Everything here talks to the emulator through the environment variables that the
lab container already sets (AWS_ENDPOINT_URL, AWS_CA_BUNDLE, the credentials file).
"""
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# ---- names used by every part (one place, so scripts and READMEs agree) ----
ACCOUNT = "000000000000"
REGION = "us-east-1"
BUCKET = "daftar-drive-files"
TABLE = "drive-files"
QUEUE = "drive-uploads"
DLQ = "drive-uploads-dlq"
API_FN = "drive-api"
INDEXER_FN = "drive-indexer"
API_ROLE = "drive-api-role"
INDEXER_ROLE = "drive-indexer-role"
API_NAME = "drive-http-api"
ALARM = "drive-dead-letters"
MAX_RECEIVES = 3          # after this many failed tries a message goes to the dead-letter queue
VISIBILITY_SECONDS = 5    # how long a received message stays hidden from other readers


class LabError(Exception):
    """A problem a student can fix (a missing resource, the emulator not running)."""


def _quiet_hook(exc_type, exc, tb):
    # Scripts show LabError as one clean line instead of a Python traceback.
    if issubclass(exc_type, LabError):
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
    sys.__excepthook__(exc_type, exc, tb)


sys.excepthook = _quiet_hook

_cfg = Config(retries={"max_attempts": 3, "mode": "standard"}, max_pool_connections=32)


def client(service):
    return boto3.client(service, config=_cfg)


def arn(service, resource, account=ACCOUNT, region=REGION):
    if service in ("s3", "iam"):
        return f"arn:aws:{service}::{'' if service == 's3' else account}:{resource}"
    return f"arn:aws:{service}:{region}:{account}:{resource}"


def wait_until(fn, timeout=60, every=1.0):
    end = time.time() + timeout
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(every)
    return None


def wait_for_emulator(timeout=120):
    """Block until the emulator answers its health route."""
    ctx = ssl.create_default_context(cafile=os.environ["AWS_CA_BUNDLE"])
    url = os.environ["AWS_ENDPOINT_URL"] + "/__admin/health"

    def healthy():
        try:
            return urllib.request.urlopen(url, context=ctx, timeout=2).read() == b"ok"
        except Exception:
            return False

    if not wait_until(healthy, timeout=timeout):
        raise LabError("The emulator did not answer. Is `docker compose up -d` running?")


def queue_url(name=QUEUE):
    try:
        return client("sqs").get_queue_url(QueueName=name)["QueueUrl"]
    except ClientError:
        raise LabError(f"Queue {name} not found. Finish part 2 first.")


def queue_counts(name=QUEUE):
    """(waiting, being worked on) for a queue."""
    a = client("sqs").get_queue_attributes(
        QueueUrl=queue_url(name),
        AttributeNames=["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible"],
    )["Attributes"]
    return int(a["ApproximateNumberOfMessages"]), int(a["ApproximateNumberOfMessagesNotVisible"])


def api_base():
    """The address of the HTTP API (created in part 3)."""
    for a in client("apigatewayv2").get_apis()["Items"]:
        if a["Name"] == API_NAME:
            return a["ApiEndpoint"]
    raise LabError("API not found. Finish part 3 first.")


def http(method, url, body=None, timeout=20):
    """Tiny HTTP helper that trusts the emulator certificate. Returns (status, parsed JSON or text)."""
    ctx = ssl.create_default_context(cafile=os.environ["AWS_CA_BUNDLE"])
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"content-type": "application/json"})
    try:
        r = urllib.request.urlopen(req, context=ctx, timeout=timeout)
        status, raw = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read().decode()
    try:
        return status, json.loads(raw)
    except ValueError:
        return status, raw


def get_file(file_id):
    """One file record from the table, as a plain dict, or None."""
    item = client("dynamodb").get_item(TableName=TABLE, Key={"id": {"S": file_id}}).get("Item")
    if not item:
        return None
    return {k: list(v.values())[0] for k, v in item.items()}


def event_source_uuid():
    """The id of the link between the queue and the indexer function."""
    maps = client("lambda").list_event_source_mappings(FunctionName=INDEXER_FN)["EventSourceMappings"]
    if not maps:
        raise LabError("The queue is not linked to the indexer yet. Finish part 3 first.")
    return maps[0]["UUID"]


def set_indexer(enabled):
    """Switch the link between the queue and the indexer on or off, and wait until it settles."""
    lam, uuid = client("lambda"), event_source_uuid()
    lam.update_event_source_mapping(UUID=uuid, Enabled=enabled)
    want = "Enabled" if enabled else "Disabled"
    wait_until(lambda: lam.get_event_source_mapping(UUID=uuid)["State"] == want, timeout=30)


def empty_queue(name):
    """Empty a queue. AWS allows one purge per 60 s, so fall back to receive-and-delete."""
    sqs, url = client("sqs"), queue_url(name)
    try:
        sqs.purge_queue(QueueUrl=url)
        return
    except ClientError:
        pass
    quiet = 0
    while quiet < 2:  # two empty reads in a row means empty
        msgs = sqs.receive_message(QueueUrl=url, MaxNumberOfMessages=10, WaitTimeSeconds=1).get("Messages", [])
        quiet = quiet + 1 if not msgs else 0
        for m in msgs:
            sqs.delete_message(QueueUrl=url, ReceiptHandle=m["ReceiptHandle"])


# ---- check scripts ---------------------------------------------------------
class Checker:
    """Prints PASS/FAIL lines and exits non-zero if anything failed."""

    def __init__(self, title):
        self.failed = 0
        print(f"\n=== {title} ===")

    def check(self, name, ok, hint=""):
        if ok:
            print(f"  PASS  {name}")
        else:
            self.failed += 1
            print(f"  FAIL  {name}" + (f"\n        hint: {hint}" if hint else ""))
        return bool(ok)

    def done(self):
        print("\nRESULT: " + ("PASS" if not self.failed else f"FAIL ({self.failed} check(s) failed)"))
        sys.exit(1 if self.failed else 0)


def safe(fn, default=None):
    """Run fn and return its value, or default when AWS says the thing is missing or refused."""
    try:
        return fn()
    except (ClientError, LabError, KeyError, IndexError):
        return default
