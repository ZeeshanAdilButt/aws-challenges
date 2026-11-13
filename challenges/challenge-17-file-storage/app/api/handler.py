"""The front door of Daftar Drive: one Lambda function behind an API Gateway HTTP API.

GET    /health               -> "ok"
POST   /files                -> store a file and its record, answer 201 fast
GET    /files                -> list the records
GET    /files/{id}           -> one record
GET    /files/{id}/content   -> the bytes of the file
DELETE /files/{id}           -> remove the file and its record

This function does only the fast part of an upload: write the record, store the bytes,
answer. The slow part (fingerprint, preview, duplicate check) is done later by the
indexer, which reads a queue. That is why an upload still works when the indexer is down.
"""
import base64
import json
import os
import time
import uuid

import boto3

BUCKET = os.environ.get("BUCKET", "daftar-drive-files")
TABLE = os.environ.get("TABLE", "drive-files")
MAX_BYTES = 1024 * 1024  # 1 MB. The request travels through API Gateway, which has a payload limit.

s3 = boto3.client("s3")
ddb = boto3.client("dynamodb")


def _reply(status, body):
    return {"statusCode": status, "headers": {"content-type": "application/json"}, "body": json.dumps(body)}


def _plain(item):
    """DynamoDB gives {"name": {"S": "a.txt"}}. Turn it into {"name": "a.txt"}."""
    return {k: list(v.values())[0] for k, v in item.items()}


def _upload(event):
    try:
        body = json.loads(event.get("body") or "{}")
        data = base64.b64decode(body["content_b64"], validate=True)
        name, owner = body["name"].strip(), body.get("owner", "anonymous").strip()
    except (ValueError, KeyError, AttributeError):
        return _reply(400, {"error": 'send {"name": "...", "owner": "...", "content_b64": "..."}'})
    if not name or "/" in name:
        return _reply(400, {"error": "name must not be empty or contain /"})
    if len(data) > MAX_BYTES:
        return _reply(413, {"error": f"file is {len(data)} bytes, the limit is {MAX_BYTES}"})

    file_id = uuid.uuid4().hex[:12]
    key = f"files/{file_id}/{name}"
    # Record first, bytes second. If the second step fails, the record says "receiving"
    # and a person can see that something is stuck. Bytes with no record would be invisible.
    ddb.put_item(
        TableName=TABLE,
        Item={
            "id": {"S": file_id},
            "name": {"S": name},
            "owner": {"S": owner},
            "key": {"S": key},
            "size": {"N": str(len(data))},
            "status": {"S": "receiving"},
            "created": {"N": str(int(time.time() * 1000))},
        },
    )
    s3.put_object(Bucket=BUCKET, Key=key, Body=data)
    print(json.dumps({"event": "upload", "id": file_id, "name": name, "bytes": len(data)}))
    return _reply(201, {"id": file_id, "status": "receiving"})


def _list():
    items, kwargs = [], {"TableName": TABLE, "FilterExpression": "attribute_exists(#n)",
                         "ExpressionAttributeNames": {"#n": "name"}}
    while True:
        page = ddb.scan(**kwargs)
        items += [_plain(i) for i in page["Items"]]
        if "LastEvaluatedKey" not in page:
            break
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]
    items.sort(key=lambda i: int(i["created"]), reverse=True)
    return _reply(200, {"files": items})


def _get(file_id):
    item = ddb.get_item(TableName=TABLE, Key={"id": {"S": file_id}}).get("Item")
    return _plain(item) if item and "name" in item else None


def _release_fingerprint(record, file_id):
    """If this file was the first with its content, forget that, so a later upload is not called a copy of a deleted file."""
    if not record.get("sha256"):
        return
    try:
        ddb.delete_item(
            TableName=TABLE,
            Key={"id": {"S": "sha256#" + record["sha256"]}},
            ConditionExpression="first_id = :me",
            ExpressionAttributeValues={":me": {"S": file_id}},
        )
    except ddb.exceptions.ConditionalCheckFailedException:
        pass  # another file holds the claim


def handler(event, context):
    route = event.get("routeKey", "")
    file_id = (event.get("pathParameters") or {}).get("id", "")

    if route == "GET /health":
        return _reply(200, {"ok": True})
    if route == "POST /files":
        return _upload(event)
    if route == "GET /files":
        return _list()

    if route in ("GET /files/{id}", "GET /files/{id}/content", "DELETE /files/{id}"):
        record = _get(file_id)
        if record is None:
            return _reply(404, {"error": f"no file {file_id}"})
        if route == "GET /files/{id}":
            return _reply(200, record)
        if route == "GET /files/{id}/content":
            data = s3.get_object(Bucket=BUCKET, Key=record["key"])["Body"].read()
            return {
                "statusCode": 200,
                "headers": {"content-type": "application/octet-stream"},
                "isBase64Encoded": True,
                "body": base64.b64encode(data).decode(),
            }
        s3.delete_object(Bucket=BUCKET, Key=record["key"])
        ddb.delete_item(TableName=TABLE, Key={"id": {"S": file_id}})
        _release_fingerprint(record, file_id)
        print(json.dumps({"event": "delete", "id": file_id}))
        return _reply(200, {"deleted": file_id})

    return _reply(404, {"error": f"no route {route}"})
