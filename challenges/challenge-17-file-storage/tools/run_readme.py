"""Run every ```bash block of one part's README, in order, in one shell. Stops at the first failure.

    python tools/run_readme.py 1         run part 1
    python tools/run_readme.py 1 2 3     run parts 1 to 3 (this is the catch-up path)

Blocks marked ```sh are for your own computer and are skipped. This is how the maintainers
prove that the commands in the READMEs work, and how you catch up if you fall behind.
"""
import glob
import os
import re
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def blocks(part):
    found = glob.glob(os.path.join(ROOT, f"part-{part}-*", "README.md"))
    if not found:
        sys.exit(f"no part {part}")
    text = open(found[0], encoding="utf-8").read()
    return re.findall(r"^```bash\n(.*?)^```", text, flags=re.S | re.M)


def run(parts, skip=None):
    script = ["set -eo pipefail", f"cd {os.path.abspath(ROOT)}"]
    for part in parts:
        script.append(f'echo; echo "##### part {part}"')
        for block in blocks(part):
            if skip and skip in block:
                continue
            script += ["set -x", block.rstrip(), "{ set +x; } 2>/dev/null"]
    return subprocess.call(["bash", "-c", "\n".join(script)])


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    args = sys.argv[1:]
    skip = None
    if "--skip" in args:  # leave out blocks that contain this text
        skip = args[args.index("--skip") + 1]
        args = [a for a in args if a not in ("--skip", skip)]
    sys.exit(run(args, skip))
