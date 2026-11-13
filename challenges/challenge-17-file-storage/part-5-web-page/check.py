"""Check part 5: the web page is up, and an upload through the page ends as a ready file."""
import urllib.error
import urllib.request
import uuid

from lib.drive import Checker, api_base, get_file, http, wait_until

c = Checker("Part 5: the web page")
PAGE = "http://127.0.0.1:8090"
PAYLOAD = '{"a":1}'  # valid JSON on purpose: a download must hand back the same bytes, not a reformatted copy


def get(path):
    try:
        r = urllib.request.urlopen(PAGE + path, timeout=10)
        return r.status, r.read().decode(errors="replace")
    except (urllib.error.URLError, OSError) as e:
        return 0, str(e)


status, html = get("/")
if c.check("the page answers on port 8090", status == 200 and "Daftar Drive" in html,
           "on your own computer: docker compose --profile web up -d web"):
    name = f"check-5-{uuid.uuid4().hex[:6]}.txt"
    boundary = "----drive" + uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="owner"\r\n\r\nchecker\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\n'
            f"Content-Type: text/plain\r\n\r\n{PAYLOAD}\r\n--{boundary}--\r\n").encode()
    req = urllib.request.Request(PAGE + "/upload", data=body, method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        status = urllib.request.urlopen(req, timeout=20).status
    except (urllib.error.URLError, OSError):
        status = 0
    c.check("an upload through the page is accepted", status == 200, "is the API from part 3 still there?")
    base = api_base()

    def mine():
        files = http("GET", base + "/files")[1].get("files", [])
        return next((f for f in files if f["name"] == name), None)

    f = wait_until(mine, timeout=10)
    if c.check("the file is in the list the API returns", bool(f)):
        ready = wait_until(lambda: (get_file(f["id"]) or {}).get("status") == "ready", timeout=40)
        c.check("the indexer marks it ready", bool(ready), "is the indexer from part 4 running?")
        status, html = get("/")
        c.check("the page shows the file", name in html)
        status, data = get(f"/download/{f['id']}")
        c.check("the page downloads the same bytes", data == PAYLOAD, "the download must not change the file")
        http("DELETE", f"{base}/files/{f['id']}")
c.done()
