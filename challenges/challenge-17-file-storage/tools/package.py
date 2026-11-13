"""Zip one function's code into /tmp/<name>.zip, which is what `aws lambda create-function` uploads.

    python tools/package.py api        -> /tmp/drive-api.zip
    python tools/package.py indexer    -> /tmp/drive-indexer.zip
"""
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))


def package(which):
    if which not in ("api", "indexer"):
        sys.exit("Usage: python tools/package.py api|indexer")
    src = os.path.join(HERE, "..", "app", which, "handler.py")
    out = f"/tmp/drive-{which}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(src, "handler.py")
    return out


if __name__ == "__main__":
    out = package(sys.argv[1] if len(sys.argv) > 1 else "")
    print(f"wrote {out} ({os.path.getsize(out)} bytes)")
