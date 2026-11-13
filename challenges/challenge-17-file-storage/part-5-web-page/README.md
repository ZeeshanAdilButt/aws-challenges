# Part 5: the web page

Time: about 15 minutes. Cost: 0 dollars, runs on the emulator.

## Why

Students do not type `curl`. They open a page, pick a file and press Upload. That page is a small Python program (Flask) on a web server. On real AWS the server is an **EC2 instance** in a public subnet of a VPC. Here a container stands in for it, because the emulator creates EC2 instances on paper only and runs nothing on them.

Open `web/app.py` and look for where it keeps files. It does not. It keeps no list either. Every button on the page calls the API from part 3. A server that keeps nothing is called **stateless**. You can stop it, start a new one or run three side by side, and no file is lost.

## Run it

On your own computer, in the challenge folder (not in the lab shell):

```sh
docker compose --profile web up -d web
```

Open http://127.0.0.1:8090. You should see the three files from parts 3 and 4.

1. Type your name, choose any small file (under 1 MB) and press **Upload**.
2. The new file is at the top with the status `receiving`.
3. Reload the page. It says `ready`, and a text file shows its first characters as a preview.
4. Click the file name to download it. Press **Delete** on one file.

Each of those four clicks went the whole way: page, API Gateway, function, table and bucket. The step from `receiving` to `ready` went the other way: bucket, queue, indexer, table.

## Follow one upload through every part

Back in the lab shell. Upload through the page's own form, from the command line, then look at each part in turn.

```bash
echo "the page keeps nothing" > /tmp/page.txt
curl -s -o /dev/null -w '%{http_code}\n' -F owner=amina -F file=@/tmp/page.txt http://127.0.0.1:8090/upload
sleep 6
URL=$(aws apigatewayv2 get-apis --query "Items[?Name=='drive-http-api'].ApiEndpoint" --output text)
ID=$(curl -s --cacert $AWS_CA_BUNDLE $URL/files | jq -r '.files[] | select(.name == "page.txt") | .id')
echo "the file id is $ID"
aws s3 ls s3://daftar-drive-files/files/$ID/
aws dynamodb get-item --table-name drive-files --key "{\"id\": {\"S\": \"$ID\"}}" \
  --query 'Item.{name: name.S, status: status.S, sha256: sha256.S, work_done: work_done.N}'
aws logs filter-log-events --log-group-name /aws/lambda/drive-indexer --filter-pattern "$ID" \
  --query 'events[].message' --output text
```

`302` is the page saying "done, go back to the list". Then you see the object in the bucket, the record in the table with a 64 character fingerprint, and the indexer's own log line for this file.

## Look at it in the console

Open http://127.0.0.1:8091 (the console from part 1). Find the same file three times: as an object in the bucket, as an item in the table, and as a line in the log group `/aws/lambda/drive-indexer`.

## Check

```bash
python part-5-web-page/check.py
```

## Think about it

1. Stop the web container (`docker compose stop web` on your computer) and upload with `curl` to the API. Does the drive still work? What does that tell you about where the data lives?
2. The page shows `receiving` first. A different design would make the upload wait until the file is `ready`. What would a student feel on a day when the indexer is slow?

## On real AWS

You would launch an EC2 instance from an image, in a public subnet, with a security group that lets in HTTPS from the internet and nothing else. The instance would get its rights from an instance role, never from keys in a file. One instance is one point of failure, so a real drive runs two or more in different Availability Zones behind a load balancer. An instance costs money every hour it exists, used or not, which the other five parts of this design do not.
