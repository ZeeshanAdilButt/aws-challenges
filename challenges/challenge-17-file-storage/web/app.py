"""The Daftar Drive web page: a small Flask app. On real AWS this runs on an EC2 instance
in a public subnet. Here it runs in a container that stands in for that instance.

The page holds no files and no data. Every button calls the API. If this server is
replaced by a fresh one, nothing is lost, and that is why it is easy to run two of them.
"""
import base64
import json
import os
import ssl
import urllib.error
import urllib.request

import boto3
from flask import Flask, Response, redirect, render_template_string, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
_ctx = ssl.create_default_context(cafile=os.environ["AWS_CA_BUNDLE"])
_api = {"url": os.environ.get("API_URL", "")}

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Daftar Drive</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; margin: 0; background: #fff; color: #111; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 28px; margin: 0 0 4px; } p.sub { margin: 0 0 24px; color: #555; }
  form.up { border: 2px solid #111; padding: 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  input[type=text] { font: inherit; padding: 6px 8px; border: 1px solid #111; width: 9em; }
  button { font: inherit; padding: 6px 14px; border: 2px solid #111; background: #111; color: #fff; cursor: pointer; }
  button.plain { background: #fff; color: #111; }
  .note { border-left: 4px solid #111; padding: 8px 12px; margin: 16px 0; background: #f2f2f2; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #ccc; vertical-align: top; }
  .chip { display: inline-block; padding: 0 8px; border: 1px solid #111; font-size: 13px; }
  .chip.ready { background: #111; color: #fff; }
  small { color: #555; } td form { display: inline; } .wrap { overflow-x: auto; }
</style></head><body><main>
<h1>Daftar Drive</h1>
<p class="sub">Files for the class. Served by a web server that keeps nothing itself.</p>
{% if note %}<div class="note">{{ note }}</div>{% endif %}
<form class="up" method="post" action="/upload" enctype="multipart/form-data">
  <label>Your name <input type="text" name="owner" value="{{ owner }}" required></label>
  <input type="file" name="file" required>
  <button>Upload</button>
</form>
<div class="wrap"><table>
<tr><th>File</th><th>Owner</th><th>Size</th><th>Status</th><th></th></tr>
{% for f in files %}
<tr>
  <td><a href="/download/{{ f.id }}">{{ f.name }}</a>
      {% if f.preview %}<br><small>{{ f.preview }}</small>{% endif %}
      {% if f.duplicate_of %}<br><small>same content as file {{ f.duplicate_of }}</small>{% endif %}</td>
  <td>{{ f.owner }}</td><td>{{ f.size }} B</td>
  <td><span class="chip {{ f.status }}">{{ f.status }}</span></td>
  <td><form method="post" action="/delete/{{ f.id }}"><button class="plain">Delete</button></form></td>
</tr>
{% else %}<tr><td colspan="5">No files yet. Upload the first one.</td></tr>
{% endfor %}
</table></div>
<p><small>{{ files|length }} file(s). "receiving" means the bytes are stored and the indexer has not looked at the file yet.
Reload the page to see it turn "ready".</small></p>
</main></body></html>"""


def api_url():
    """Find the API address once. On real AWS this would be a setting given to the instance."""
    if not _api["url"]:
        for a in boto3.client("apigatewayv2").get_apis()["Items"]:
            if a["Name"] == "drive-http-api":
                _api["url"] = a["ApiEndpoint"]
    return _api["url"]


def call(method, path, body=None, raw=False):
    """Call the API. Returns (status, parsed JSON), or (status, bytes) when raw is set and the call worked."""
    base = api_url()
    if not base:
        return 0, {"error": "The API does not exist yet. Finish part 3."}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method, headers={"content-type": "application/json"})
    try:
        r = urllib.request.urlopen(req, context=_ctx, timeout=20)
        status, payload = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, payload = e.code, e.read()
    except OSError as e:
        return 0, {"error": f"The API did not answer: {e}"}
    if raw and status == 200:
        return status, payload  # the file's own bytes, untouched
    try:
        return status, json.loads(payload)
    except ValueError:
        return status, {"error": f"The API answered {status}."}


def explain(status, body):
    if status == 429:
        return "The front door is busy (429, too many requests). Wait a second and try again."
    if isinstance(body, dict) and body.get("error"):
        return body["error"]
    return f"The API answered {status}."


@app.get("/")
def home():
    status, body = call("GET", "/files")
    note = request.args.get("note", "")
    files = body.get("files", []) if status == 200 else []
    if status != 200:
        note = explain(status, body)
    return render_template_string(PAGE, files=files, note=note, owner=request.args.get("owner", ""))


@app.post("/upload")
def upload():
    f, owner = request.files["file"], request.form.get("owner", "anonymous")
    payload = {"name": f.filename, "owner": owner, "content_b64": base64.b64encode(f.read()).decode()}
    status, body = call("POST", "/files", payload)
    note = f"Stored {f.filename}. The indexer will mark it ready." if status == 201 else explain(status, body)
    return redirect(f"/?note={urllib.request.quote(note)}&owner={urllib.request.quote(owner)}")


@app.get("/download/<file_id>")
def download(file_id):
    status, meta = call("GET", f"/files/{file_id}")
    if status != 200:
        return redirect(f"/?note={urllib.request.quote(explain(status, meta))}")
    status, data = call("GET", f"/files/{file_id}/content", raw=True)
    if status != 200:
        return redirect(f"/?note={urllib.request.quote(explain(status, data))}")
    safe_name = "".join(ch for ch in meta["name"] if ch not in '"\r\n')
    return Response(data, mimetype="application/octet-stream",
                    headers={"Content-Disposition": f'attachment; filename="{safe_name}"'})


@app.post("/delete/<file_id>")
def delete(file_id):
    status, body = call("DELETE", f"/files/{file_id}")
    note = "Deleted." if status == 200 else explain(status, body)
    return redirect(f"/?note={urllib.request.quote(note)}")


@app.get("/healthz")
def healthz():
    return {"ok": True}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8090)
