# Part 3: the front door (a function, its role and API Gateway)

Time: about 30 minutes. Cost: 0 dollars, runs on the emulator.

## Why

The web page needs an address to send "store this file" and "list my files" to. Two managed parts answer it:

- **Lambda** runs one function per request. You upload code. There is no server to size or patch.
- **API Gateway** owns the address. It takes each HTTP request, matches it to a route such as `POST /files`, and hands it to the function. It can also refuse requests that arrive too fast.

A function has no rights of its own. It runs as an **IAM role**, and the role lists exactly what the function may touch. You will see a refusal first, and then give the function the smallest set of rights that makes it work.

Open `app/api/handler.py` and read it before you continue. Find the two lines that write: `ddb.put_item` and `s3.put_object`.

## A role with almost nothing

Inside the lab shell. A role has two halves. The **trust policy** says who may use the role: here, the Lambda service. The **permission policy** says what the role may do. Start with one that only lets the function write its own logs.

```bash
aws iam create-role --role-name drive-api-role \
  --assume-role-policy-document file://part-3-api-function-and-gateway/trust-policy.json --query Role.Arn
aws iam put-role-policy --role-name drive-api-role --policy-name logs \
  --policy-document file://part-3-api-function-and-gateway/logs-policy.json
```

Package the function (a zip of one file) and create it.

```bash
python tools/package.py api
aws lambda create-function --function-name drive-api --runtime python3.12 \
  --role arn:aws:iam::000000000000:role/drive-api-role \
  --handler handler.handler --zip-file fileb:///tmp/drive-api.zip \
  --timeout 10 --memory-size 128 --query State
aws lambda wait function-active-v2 --function-name drive-api
```

Call the function directly, with no web address yet. The health route touches nothing, so it works.

```bash
aws lambda invoke --function-name drive-api --cli-binary-format raw-in-base64-out \
  --payload '{"routeKey": "GET /health"}' /tmp/out.json --query StatusCode
cat /tmp/out.json; echo
```

## Watch it be refused

Now ask it to store a file. `aGVsbG8=` is the word `hello` in base64, a way to write bytes as text.

```bash
aws lambda invoke --function-name drive-api --cli-binary-format raw-in-base64-out \
  --payload '{"routeKey": "POST /files", "body": "{\"name\": \"hello.txt\", \"owner\": \"amina\", \"content_b64\": \"aGVsbG8=\"}"}' \
  /tmp/out.json --query FunctionError
jq -r .errorMessage /tmp/out.json
```

Read the error slowly. It names who asked (`assumed-role/drive-api-role/drive-api`), what they tried (`dynamodb:PutItem`), on what (`table/drive-files`), and why it failed (`no identity-based policy allows` it). Every Access Denied on AWS has these four parts, and they tell you which line is missing.

## Give it exactly what it needs

Open `part-3-api-function-and-gateway/api-policy.json`. Four actions on one table, three actions on the objects under `files/` in one bucket. Nothing about the queue, because this function never touches the queue.

```bash
aws iam put-role-policy --role-name drive-api-role --policy-name api-access \
  --policy-document file://part-3-api-function-and-gateway/api-policy.json
sleep 2
aws lambda invoke --function-name drive-api --cli-binary-format raw-in-base64-out \
  --payload '{"routeKey": "POST /files", "body": "{\"name\": \"hello.txt\", \"owner\": \"amina\", \"content_b64\": \"aGVsbG8=\"}"}' \
  /tmp/out.json --query StatusCode
cat /tmp/out.json; echo
```

Now the answer is `"statusCode": 201` with an `id` and `"status": "receiving"`.

## The address: API Gateway

Create an HTTP API, connect it to the function, and add one route per thing the drive can do.

```bash
API_ID=$(aws apigatewayv2 create-api --name drive-http-api --protocol-type HTTP --query ApiId --output text)
INTEG=$(aws apigatewayv2 create-integration --api-id $API_ID --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:000000000000:function:drive-api \
  --payload-format-version 2.0 --query IntegrationId --output text)
for ROUTE in "GET /health" "POST /files" "GET /files" "GET /files/{id}" "GET /files/{id}/content" "DELETE /files/{id}"; do
  aws apigatewayv2 create-route --api-id $API_ID --route-key "$ROUTE" --target integrations/$INTEG --query RouteKey
done
```

A **stage** is a published copy of the API. Set its speed limit here: at most 20 requests a second in steady state, with room for a short burst of 10. A request over the limit gets the answer 429, "too many requests", and never reaches your function.

```bash
aws apigatewayv2 create-stage --api-id $API_ID --stage-name '$default' --auto-deploy \
  --default-route-settings ThrottlingRateLimit=20,ThrottlingBurstLimit=10 --query DefaultRouteSettings
```

One more permission, of a different kind. The role says what the function may do. This line, on the function itself, says who may **call** it: API Gateway.

```bash
aws lambda add-permission --function-name drive-api --statement-id apigw \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:000000000000:$API_ID/*" --query Statement --output text
```

## Use it

```bash
URL=$(aws apigatewayv2 get-apis --query "Items[?Name=='drive-http-api'].ApiEndpoint" --output text)
echo $URL
curl -s --cacert $AWS_CA_BUNDLE $URL/health; echo
curl -s --cacert $AWS_CA_BUNDLE -X POST $URL/files \
  -d "{\"name\": \"notes.txt\", \"owner\": \"omar\", \"content_b64\": \"$(echo 'queues hold work' | base64)\"}"; echo
curl -s --cacert $AWS_CA_BUNDLE $URL/files | jq -c '.files[] | {id, name, owner, size, status}'
```

You should see two files, `hello.txt` and `notes.txt`, both with the status `receiving`. They stay that way: the bucket left two notes on the queue and nobody reads the queue yet. That is the next part.

Download one of them through the API:

```bash
ID=$(curl -s --cacert $AWS_CA_BUNDLE $URL/files | jq -r '.files[] | select(.name == "notes.txt") | .id')
curl -s --cacert $AWS_CA_BUNDLE $URL/files/$ID/content
```

Every call leaves log lines. Read the last ones:

```bash
aws logs filter-log-events --log-group-name /aws/lambda/drive-api \
  --query 'events[].message' --output json | jq -r '.[]' | grep -E '"event"|REPORT' | tail -4
```

A line with `"event"` is one your code printed. A `REPORT` line is written by Lambda itself after every call: how long the call took and how many milliseconds you would be billed for.

## Check

```bash
python part-3-api-function-and-gateway/check.py
```

## Think about it

1. The first policy let the function write logs and nothing else. Why give it even that?
2. The function's role says nothing about the queue. Which bad day does that protect you from?
3. The files say `receiving` and never `ready`. Is the upload broken?

## On real AWS

The same commands, with your own account number in the ARNs. The bytes of a real upload do not travel through API Gateway, which stops at 10 MB. The function hands the browser a **presigned URL**, a short-lived address that lets it send the file straight to S3. The emulator signs such an address for the real S3 host and not for itself, so this lab sends small files through the API.
