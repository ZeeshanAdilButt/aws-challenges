# Challenge 15, part 1: the usage report

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Running the script writes `datasets/usage-2026-08.json` and `usage-2026-09.json`. Each line is `quantity x unit price = cost`. You write the function that adds the lines up by AWS service.

## The Daftar example

The August report has 19 lines and the September report has 31: six idle load balancers (two lines each) were added.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It writes two usage reports to datasets/ from unit prices, then reads them. | [generate.mjs#L1](generate.mjs#L1) |
| 2 | The unit prices. us-east-1, dollars, read 2026-10-24 (dossier appendix 01b). Every price here is VERIFIED. | [generate.mjs#L14](generate.mjs#L14) |
| 3 | Read a report back from datasets/. | [generate.mjs#L68](generate.mjs#L68) |
| 4 | Add up a report by AWS service, biggest first (your turn). **(your turn)** | [generate.mjs#L73](generate.mjs#L73) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-15-find-the-bill/part-1-the-usage-report/generate.mjs
npm run test:15
```

## Where each number comes from

Unit prices (us-east-1, read 2026-10-24, all VERIFIED): EC2 m7g.large 0.0816 an hour (P13); NAT gateway 0.045 an hour and 0.045 a GB (P15); ALB 0.0225 an hour and 0.008 per LCU-hour (P9); public IPv4 0.005 an hour (P14, P12); CloudWatch Logs ingestion 0.50 a GB (P7); S3 Standard 0.023 a GB-month and PUT 0.005 per 1,000 (P11); DynamoDB on-demand 0.625 per million writes and 0.125 per million reads (P10); SQS 0.40 per million requests (D4). A month is 730 hours.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
