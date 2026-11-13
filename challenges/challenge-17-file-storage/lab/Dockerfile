# The lab shell and the web page share this image: AWS CLI v2, Python, boto3 and Flask,
# already pointed at the emulator. You need nothing on your own computer except Docker.
#
# CLI v2 and not `pip install awscli`: CLI v1 has an old fixed SQS address that
# ignores AWS_ENDPOINT_URL and would talk to real AWS. v2 does not.
FROM python:3.12-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl jq less unzip zip ca-certificates \
    && curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /tmp && /tmp/aws/install \
    && rm -rf /tmp/aws /tmp/awscliv2.zip /var/lib/apt/lists/* \
    && pip install --no-cache-dir --root-user-action=ignore boto3==1.35.99 flask==3.1.0 \
    && useradd -m -u 1000 student \
    && mkdir -p /home/student/.aws && chown -R 1000 /home/student
ENV HOME=/home/student \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/drive \
    AWS_ENDPOINT_URL=https://127.0.0.1:9317 \
    AWS_SHARED_CREDENTIALS_FILE=/home/emulator/.aws/emulator/9317/emulator_credentials \
    AWS_CONFIG_FILE=/home/emulator/.aws/emulator/9317/config \
    AWS_CA_BUNDLE=/home/emulator/.aws/emulator/9317/ca.pem \
    AWS_REGION=us-east-1 \
    AWS_DEFAULT_REGION=us-east-1 \
    AWS_EC2_METADATA_DISABLED=true \
    AWS_DISABLE_HOST_PREFIX_INJECTION=true \
    AWS_PAGER=""
USER 1000
WORKDIR /drive
