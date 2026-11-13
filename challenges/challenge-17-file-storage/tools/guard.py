"""The safety guard for this challenge. It refuses to continue unless every call goes to the emulator.

    python tools/guard.py
"""
import os
import sys
from urllib.parse import urlparse

import boto3

endpoint = os.environ.get("AWS_ENDPOINT_URL", "")
host = urlparse(endpoint).hostname
if host not in ("127.0.0.1", "localhost"):
    sys.exit(f"STOP: AWS_ENDPOINT_URL is {endpoint or 'not set'}. This challenge only runs against the emulator.")
account = boto3.client("sts").get_caller_identity()["Account"]
if account != "000000000000":
    sys.exit(f"STOP: account {account} is not the emulator's account 000000000000.")
print(f"Safe: talking to the emulator at {endpoint}, account {account}.")
