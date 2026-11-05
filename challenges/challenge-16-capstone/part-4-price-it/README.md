# Challenge 16, part 4: price it

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The cost model adds the monthly lines at 100, 1,000 and 5,000 requests a second: Fargate tasks, the load balancer, the NAT gateways, log ingestion, the queue, DynamoDB and S3 requests. The database is shown apart, because its price is not confirmed. You name the largest line and one change that halves it, and measure the saving.

## The Daftar example

At 5,000 requests a second, log ingestion is the largest line. Writing half as much log data per request halves it.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. The emulator has no cost data, so the cost comes from toolkit/models/cost.js and the dated price table. | [price-it.mjs#L1](price-it.mjs#L1) |
| 2 | The three traffic levels of the course (its own choice, not an AWS number): requests a second, all month. | [price-it.mjs#L8](price-it.mjs#L8) |
| 3 | One change that halves the largest line (your turn). | [price-it.mjs#L12](price-it.mjs#L12) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-16-capstone/part-4-price-it/price-it.mjs
npm run test:16
```

## Where each number comes from

Prices: us-east-1, dollars, read 2026-10-24: Fargate 0.04048 per vCPU-hour and 0.004445 per GB-hour (P6); ALB 0.0225 an hour and 0.008 per LCU-hour (P9); NAT 0.045 an hour and 0.045 a GB (P15); Logs 0.50 a GB (P7); SQS 0.40 per million requests (D4); DynamoDB 0.625 per million writes and 0.125 per million reads (P10); S3 PUT 0.005 per 1,000 (P11). All are VERIFIED. The traffic levels and the traffic assumptions (1 KB of logs a request, 2 KB through NAT a request, 50 requests a second for each task, 100 requests per LCU) are the course's choices, not AWS numbers; the LCU rule is not sourced. The 730-hour month is the usual one.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
