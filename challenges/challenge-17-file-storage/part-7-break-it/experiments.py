"""Part 7: four experiments that break the drive on purpose and measure what happens.

    python part-7-break-it/experiments.py backlog     the indexer is off, uploads keep coming
    python part-7-break-it/experiments.py poison      one file the indexer cannot read
    python part-7-break-it/experiments.py throttle    more requests than the front door allows
    python part-7-break-it/experiments.py twice       the same file, and the same note, more than once

Each one prints what it measured and saves it in part-7-break-it/.results.json for the check.
"""
import base64
import concurrent.futures
import json
import os
import sys
import time

from lib.drive import (ALARM, BUCKET, DLQ, INDEXER_FN, QUEUE, api_base, client, get_file, http, queue_counts,
                       queue_url, set_indexer, wait_until)

RESULTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".results.json")


def save(name, data):
    all_results = json.load(open(RESULTS)) if os.path.exists(RESULTS) else {}
    all_results[name] = data
    json.dump(all_results, open(RESULTS, "w"), indent=2)


def upload(base, name, data, owner="experiment"):
    """Upload through the API. Returns (status, id or None, milliseconds)."""
    started = time.time()
    status, body = http("POST", base + "/files",
                        {"name": name, "owner": owner, "content_b64": base64.b64encode(data).decode()})
    ms = int((time.time() - started) * 1000)
    return status, (body.get("id") if isinstance(body, dict) else None), ms


def statuses(ids):
    out = {}
    for i in ids:
        s = (get_file(i) or {}).get("status", "missing")
        out[s] = out.get(s, 0) + 1
    return out


def backlog(count=12):
    base = api_base()
    print(f"1. Switch the indexer off, then upload {count} files.")
    set_indexer(False)
    results = [upload(base, f"backlog-{n:02d}.txt", f"file {n} waits its turn".encode()) for n in range(1, count + 1)]
    ids = [i for _, i, _ in results]
    accepted = sum(1 for s, _, _ in results if s == 201)
    slowest = max(ms for _, _, ms in results)
    wait_until(lambda: queue_counts(QUEUE)[0] >= count, timeout=15)
    waiting = queue_counts(QUEUE)[0]
    print(f"   uploads accepted: {accepted} of {count}, slowest answer {slowest} ms")
    print(f"   messages waiting in the queue: {waiting}")
    print(f"   file statuses: {statuses(ids)}")
    print("2. Switch the indexer on again and time how long the queue takes to empty.")
    set_indexer(True)
    started = time.time()
    last = None
    while time.time() - started < 180:
        left = sum(queue_counts(QUEUE))
        if left != last:
            print(f"   t={time.time() - started:4.0f} s   still in the queue: {left}")
            last = left
        if left == 0 and statuses(ids).get("ready", 0) == count:
            break
        time.sleep(1)
    drain = round(time.time() - started, 1)
    final = statuses(ids)
    print(f"   queue empty after {drain} s, file statuses: {final}")
    print(f"   that is {count / drain:.2f} files a second on this emulator")
    save("backlog", {"uploads": count, "accepted": accepted, "slowest_upload_ms": slowest, "waiting": waiting,
                     "drain_seconds": drain, "ready": final.get("ready", 0)})


def poison():
    base, sqs, cw = api_base(), client("sqs"), client("cloudwatch")
    print("1. Upload broken.txt (bytes that are not text) and, right after it, fine.txt.")
    started = time.time()
    _, bad_id, _ = upload(base, "broken.txt", b"\xff\xfe\xfa this is not UTF-8 text")
    _, good_id, _ = upload(base, "fine.txt", b"this one is fine")
    good_ready = wait_until(lambda: (get_file(good_id) or {}).get("status") == "ready", timeout=60)
    print(f"   fine.txt ready after {time.time() - started:.0f} s: {bool(good_ready)}")
    print("2. Watch the broken file be retried and then moved to the dead-letter queue.")
    dlq = wait_until(lambda: queue_counts(DLQ)[0] >= 1, timeout=90)
    to_dlq = round(time.time() - started, 1)
    logs = client("logs")
    events = logs.filter_log_events(logGroupName=f"/aws/lambda/{INDEXER_FN}",
                                    filterPattern="UnicodeDecodeError").get("events", [])
    tries = sum(1 for e in events if e["message"].startswith("[ERROR]"))
    message = sqs.receive_message(QueueUrl=queue_url(DLQ), VisibilityTimeout=0,
                                  AttributeNames=["ApproximateReceiveCount"]).get("Messages", [{}])[0]
    key = json.loads(message.get("Body", "{}")).get("Records", [{}])[0].get("s3", {}).get("object", {}).get("key")
    print(f"   failed tries in the log: {tries}")
    print(f"   in the dead-letter queue after {to_dlq} s: {bool(dlq)}, the message names {key}")
    print(f"   status of broken.txt: {(get_file(bad_id) or {}).get('status')}")
    print("3. Wait for the alarm from part 6.")
    alarm_started = time.time()
    state = wait_until(
        lambda: cw.describe_alarms(AlarmNames=[ALARM])["MetricAlarms"][0]["StateValue"] == "ALARM" and "ALARM",
        timeout=240, every=2)
    alarm_seconds = round(time.time() - alarm_started, 1)
    print(f"   alarm {ALARM}: {state or 'not in ALARM yet'} ({alarm_seconds} s after the message arrived)")
    save("poison", {"bad_id": bad_id, "good_ready": bool(good_ready), "tries": tries, "seconds_to_dlq": to_dlq,
                    "in_dlq": bool(dlq), "status": (get_file(bad_id) or {}).get("status"), "alarm": state or "OK",
                    "alarm_seconds": alarm_seconds})


def throttle(requests=40):
    base = api_base()
    stage = client("apigatewayv2").get_stage(ApiId=base.rsplit("/", 1)[-1], StageName="$default")
    limits = stage["DefaultRouteSettings"]
    print(f"The stage allows {limits['ThrottlingRateLimit']:.0f} requests a second, burst {limits['ThrottlingBurstLimit']}.")
    print(f"1. Send {requests} requests at the same moment.")
    with concurrent.futures.ThreadPoolExecutor(max_workers=requests) as pool:
        codes = list(pool.map(lambda _: http("GET", base + "/health")[0], range(requests)))
    counts = {str(code): codes.count(code) for code in sorted(set(codes))}
    print(f"   answers: {counts}")
    print("2. Wait 2 seconds and send 5 requests, one after the other.")
    time.sleep(2)
    after = [http("GET", base + "/health")[0] for _ in range(5)]
    print(f"   answers: {after}")
    save("throttle", {"requests": requests, "answers": counts, "after": after})


def twice():
    base, sqs = api_base(), client("sqs")
    data = b"the same bytes, uploaded two times"
    print("1. Upload the same file two times (same name, same bytes).")
    _, first, _ = upload(base, "report.txt", data)
    wait_until(lambda: (get_file(first) or {}).get("status") == "ready", timeout=60)
    _, second, _ = upload(base, "report.txt", data)
    wait_until(lambda: (get_file(second) or {}).get("status") == "ready", timeout=60)
    a, b = get_file(first), get_file(second)
    objects = sum(client("s3").list_objects_v2(Bucket=BUCKET, Prefix=f"files/{i}/").get("KeyCount", 0)
                  for i in (first, second))
    print(f"   records: 2 (ids {first} and {second}), objects in the bucket: {objects}")
    print(f"   same fingerprint: {a['sha256'] == b['sha256']}")
    print(f"   the second record says duplicate_of = {b.get('duplicate_of') or '(empty)'}")
    print("2. Deliver the note for the first file three more times, as a queue may do.")
    event = {"Records": [{"s3": {"bucket": {"name": BUCKET}, "object": {"key": a["key"], "eTag": a["indexed_etag"]}}}]}
    for _ in range(3):
        sqs.send_message(QueueUrl=queue_url(QUEUE), MessageBody=json.dumps(event))
    logs = client("logs")

    def skipped():
        ev = logs.filter_log_events(logGroupName=f"/aws/lambda/{INDEXER_FN}", filterPattern=first).get("events", [])
        return sum(1 for e in ev if '"skipped"' in e["message"])

    wait_until(lambda: skipped() >= 3, timeout=60)
    done = get_file(first).get("work_done")
    print(f"   deliveries of that note: 4 (1 real, 3 repeats), skipped: {skipped()}, work_done: {done}")
    save("twice", {"first": first, "second": second, "objects": objects, "same_fingerprint": a["sha256"] == b["sha256"],
                   "duplicate_of": b.get("duplicate_of", ""), "skipped": skipped(), "work_done": done})


if __name__ == "__main__":
    runs = {"backlog": backlog, "poison": poison, "throttle": throttle, "twice": twice}
    if len(sys.argv) != 2 or sys.argv[1] not in runs:
        sys.exit(__doc__)
    runs[sys.argv[1]]()
