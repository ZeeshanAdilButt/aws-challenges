"""Check part 7: the four experiments were run, and the bug is fixed and the broken file is back."""
import json
import os

from lib.drive import ALARM, DLQ, Checker, client, get_file, queue_counts, safe

c = Checker("Part 7: break it")
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".results.json")
r = json.load(open(path)) if os.path.exists(path) else {}

b = r.get("backlog", {})
c.check("experiment 1 ran: every upload was accepted while the indexer was off",
        bool(b) and b["accepted"] == b["uploads"] and b["waiting"] >= b["uploads"],
        "python part-7-break-it/experiments.py backlog")
c.check("experiment 1: every file was ready after the indexer came back", bool(b) and b["ready"] == b["uploads"])
p = r.get("poison", {})
c.check("experiment 2 ran: the broken file was tried 3 times and reached the dead-letter queue",
        bool(p) and p["tries"] == 3 and p["in_dlq"], "python part-7-break-it/experiments.py poison")
c.check("experiment 2: the file after it was not held up", bool(p) and p["good_ready"])
c.check("experiment 2: the alarm fired", p.get("alarm") == "ALARM", "did you create the alarm in part 6?")
t = r.get("throttle", {})
c.check("experiment 3 ran: some requests got 200 and some got 429",
        t.get("answers", {}).get("200", 0) > 0 and t.get("answers", {}).get("429", 0) > 0,
        "python part-7-break-it/experiments.py throttle")
c.check("experiment 3: requests work again after a pause", t.get("after") == [200] * 5)
w = r.get("twice", {})
c.check("experiment 4 ran: two uploads gave two records, the second marked as a copy",
        bool(w) and w["objects"] == 2 and w["duplicate_of"] == w["first"],
        "python part-7-break-it/experiments.py twice")
c.check("experiment 4: three repeat notes did no work", bool(w) and w["skipped"] >= 3 and w["work_done"] == "1")

bad = get_file(p.get("bad_id", "none")) or {}
c.check("after your fix, broken.txt is ready with the preview (not text)",
        bad.get("status") == "ready" and bad.get("preview") == "(not text)",
        "fix _preview, update the function code, then start the message move task")
c.check("the dead-letter queue is empty", safe(lambda: sum(queue_counts(DLQ)), 1) == 0)
state = safe(lambda: client("cloudwatch").describe_alarms(AlarmNames=[ALARM])["MetricAlarms"][0]["StateValue"])
c.check("the alarm is back to OK", state == "OK", "it can take two minutes after the queue is empty")
c.done()
