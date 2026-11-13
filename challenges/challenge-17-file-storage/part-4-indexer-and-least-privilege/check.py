"""Check part 4: the indexer runs from the queue, is safe to run twice, and its role is narrow."""
import base64
import json
import time

from lib.drive import (API_ROLE, BUCKET, INDEXER_FN, INDEXER_ROLE, QUEUE, TABLE, Checker, api_base, arn, client,
                       get_file, http, queue_url, safe, wait_until)

c = Checker("Part 4: indexer and least privilege")
iam, lam, sqs = client("iam"), client("lambda"), client("sqs")

fn = safe(lambda: lam.get_function(FunctionName=INDEXER_FN)["Configuration"], {})
c.check(f"function {INDEXER_FN} is Active and runs as {INDEXER_ROLE}",
        fn.get("State") == "Active" and fn.get("Role", "").endswith("/" + INDEXER_ROLE), "create the function and wait")
c.check("the indexer does not share the API's role", not fn.get("Role", "").endswith("/" + API_ROLE))
maps = safe(lambda: lam.list_event_source_mappings(FunctionName=INDEXER_FN)["EventSourceMappings"], [])
c.check("the queue is linked to the indexer",
        any(m["EventSourceArn"] == arn("sqs", QUEUE) and m["State"] in ("Enabled", "Enabling", "Creating") for m in maps),
        "aws lambda create-event-source-mapping ...")

# ---- the role ---------------------------------------------------------------
doc = safe(lambda: iam.get_role_policy(RoleName=INDEXER_ROLE, PolicyName="indexer-access")["PolicyDocument"], {})
actions = [a for s in doc.get("Statement", []) for a in ([s["Action"]] if isinstance(s["Action"], str) else s["Action"])]
c.check("the policy has no wildcard action", bool(actions) and not any("*" in a for a in actions),
        "replace s3:*, dynamodb:* and the others with the exact actions from the table in the README")


def decision(action, resource):
    r = iam.simulate_principal_policy(PolicySourceArn=arn("iam", f"role/{INDEXER_ROLE}"),
                                      ActionNames=[action], ResourceArns=[resource])
    return r["EvaluationResults"][0]["EvalDecision"]


file_arn, table_arn, queue_arn = arn("s3", f"{BUCKET}/files/abc/notes.txt"), arn("dynamodb", f"table/{TABLE}"), arn("sqs", QUEUE)
allowed = [("s3:GetObject", file_arn), ("dynamodb:UpdateItem", table_arn), ("dynamodb:PutItem", table_arn),
           ("dynamodb:GetItem", table_arn), ("sqs:ReceiveMessage", queue_arn), ("sqs:DeleteMessage", queue_arn)]
denied = [("s3:DeleteObject", file_arn), ("s3:GetObject", arn("s3", "some-other-bucket/x")),
          ("s3:PutObject", file_arn), ("dynamodb:DeleteTable", table_arn), ("dynamodb:Scan", table_arn),
          ("sqs:PurgeQueue", queue_arn), ("sqs:SendMessage", queue_arn)]
bad = [a for a, r in allowed if safe(lambda: decision(a, r)) != "allowed"]
c.check("the role allows what the indexer does", not bad, f"not allowed yet: {bad}")
bad = [f"{a} on {r.split(':')[-1]}" for a, r in denied if safe(lambda: decision(a, r)) == "allowed"]
c.check("the role refuses what the indexer never does", not bad, f"still allowed: {bad}")

# ---- behaviour --------------------------------------------------------------
base = api_base()
text = f"check 4 at {time.time()}".encode()
status, body = http("POST", base + "/files",
                    {"name": "check-4.txt", "owner": "checker", "content_b64": base64.b64encode(text).decode()})
if c.check("an upload through the API answers 201", status == 201, f"got {status} {body}"):
    fid = body["id"]
    rec = wait_until(lambda: (get_file(fid) or {}).get("status") == "ready" and get_file(fid), timeout=40)
    if c.check("the indexer marks it ready within 40 seconds", bool(rec),
               "read the indexer log: an AccessDenied names the action your policy forgot"):
        c.check("the record has a fingerprint and a preview",
                len(rec.get("sha256", "")) == 64 and rec.get("preview", "").startswith("check 4"))
        c.check("the work was done once", rec.get("work_done") == "1")
        # Deliver the same S3 event two more times, as a queue is allowed to do.
        event = {"Records": [{"s3": {"bucket": {"name": BUCKET},
                                     "object": {"key": rec["key"], "eTag": rec["indexed_etag"]}}}]}
        for _ in range(2):
            sqs.send_message(QueueUrl=queue_url(QUEUE), MessageBody=json.dumps(event))
        logs = client("logs")

        def skipped():
            ev = logs.filter_log_events(logGroupName=f"/aws/lambda/{INDEXER_FN}", filterPattern=fid).get("events", [])
            return sum(1 for e in ev if '"skipped"' in e["message"]) >= 2

        c.check("two repeat deliveries are skipped", bool(wait_until(skipped, timeout=40)),
                "the condition must compare indexed_etag with :etag")
        c.check("work_done is still 1 after the repeats", get_file(fid).get("work_done") == "1",
                "the ADD must be inside the conditional update, so a refused write adds nothing")
    http("DELETE", f"{base}/files/{fid}")
c.done()
