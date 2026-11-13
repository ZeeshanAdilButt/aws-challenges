"""The indexer of Daftar Drive: a Lambda function that reads the upload queue.

For every uploaded file it
  1. reads the bytes from the bucket,
  2. works out a fingerprint (SHA-256) and, for a .txt file, a short preview,
  3. checks whether a file with the same fingerprint is already in the drive,
  4. marks the record "ready".

A queue may deliver the same message more than once. Step 4 is written so that
doing it twice leaves the same result as doing it once.
"""
import hashlib
import json
import os
import time
import urllib.parse

import boto3
from botocore.exceptions import ClientError

TABLE = os.environ.get("TABLE", "drive-files")

s3 = boto3.client("s3")
ddb = boto3.client("dynamodb")
cloudwatch = boto3.client("cloudwatch")


def _preview(name, data):
    """The first 60 characters of a text file."""
    if not name.endswith(".txt"):
        return ""
    return data.decode("utf-8")[:60]  # part 7 comes back to this line


def _first_with_fingerprint(sha, file_id):
    """Claim the fingerprint for this file. Returns the id of the file that claimed it first."""
    try:
        ddb.put_item(
            TableName=TABLE,
            Item={"id": {"S": f"sha256#{sha}"}, "first_id": {"S": file_id}},
            ConditionExpression="attribute_not_exists(id)",
        )
        return file_id
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        claim = ddb.get_item(TableName=TABLE, Key={"id": {"S": f"sha256#{sha}"}}, ConsistentRead=True)
        return claim["Item"]["first_id"]["S"]


def _mark_ready(file_id, etag, sha, preview, duplicate_of):
    """Mark the record ready. Returns True if this call did the work, False if it was done before."""
    values = {
        ":ready": {"S": "ready"},
        ":etag": {"S": etag},
        ":sha": {"S": sha},
        ":preview": {"S": preview},
        ":dup": {"S": duplicate_of},
        ":one": {"N": "1"},
    }
    try:
        # YOUR TURN start
        # HINT: one ddb.update_item call on TABLE with Key {"id": {"S": file_id}}.
        # HINT: UpdateExpression: SET #s = :ready, indexed_etag = :etag, sha256 = :sha,
        # HINT:   preview = :preview, duplicate_of = :dup ADD work_done :one
        # HINT: ConditionExpression: the record exists AND (it has no indexed_etag OR indexed_etag <> :etag).
        # HINT: "status" is a reserved word in DynamoDB, so pass ExpressionAttributeNames {"#s": "status"}.
        # HINT: The values for :ready, :etag and the others are in the dict named values, just above.
        # YOUR TURN end
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return False
        raise


def _index(bucket, key, etag):
    started = time.time()
    file_id, name = key.split("/")[1], key.split("/")[-1]
    if "Item" not in ddb.get_item(TableName=TABLE, Key={"id": {"S": file_id}}, ConsistentRead=True):
        # The file was deleted before its note was read. There is nothing left to index.
        print(json.dumps({"event": "gone", "id": file_id, "name": name}))
        return
    data = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    sha = hashlib.sha256(data).hexdigest()
    preview = _preview(name, data)
    first = _first_with_fingerprint(sha, file_id)
    did_work = _mark_ready(file_id, etag, sha, preview, "" if first == file_id else first)
    ms = int((time.time() - started) * 1000)
    print(json.dumps({"event": "indexed" if did_work else "skipped", "id": file_id, "name": name,
                      "bytes": len(data), "ms": ms}))
    if did_work:
        try:
            cloudwatch.put_metric_data(
                Namespace="DaftarDrive",
                MetricData=[{"MetricName": "FilesIndexed", "Value": 1, "Unit": "Count"}],
            )
        except ClientError as e:
            # The file is indexed. A counter that could not be sent must not make the note come back.
            print(json.dumps({"event": "metric-not-sent", "id": file_id, "error": e.response["Error"]["Code"]}))


def handler(event, context):
    # The queue link uses a batch size of 1, so one run handles one note. An error fails that one note
    # and the queue shows it again. With larger batches, turn on ReportBatchItemFailures on the link,
    # or one bad note fails every note that came with it.
    for message in event["Records"]:
        body = json.loads(message["body"])
        for record in body.get("Records", []):  # an S3 test event has no Records, so it is skipped
            _index(
                record["s3"]["bucket"]["name"],
                urllib.parse.unquote_plus(record["s3"]["object"]["key"]),
                record["s3"]["object"]["eTag"],
            )
