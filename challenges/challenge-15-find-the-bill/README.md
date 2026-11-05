# Challenge 15: find the bill

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The 101

An AWS bill is a long list of **usage lines**: a **service** (EC2, S3), a **usage type** (for example `NatGateway-Bytes`), a quantity, a unit price and the cost. Finding why a bill grew is a diff: group the lines by service and usage type, subtract last month from this month, and look at the rows that grew most.

- An **anomaly** here is a row that grew by at least 50 dollars **and** at least 2 times (or that is new).
- A **tag** is a label on a resource, such as `team=api`. A cost report can group by tag, but only for resources that carry it. **Tag coverage** is the share of the bill that has all the required tags.
- Some costs are traps: a **NAT gateway** charges for every GB it processes, **log ingestion** charges for every GB of logs, and a **load balancer** charges every hour even with no traffic.

## The Daftar example

Daftar's bill went from about 1,900 to about 3,800 dollars in one month. You generate the two reports, find the three causes, and set up tag rules so the next bill is easy to read.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 the usage report](part-1-the-usage-report/README.md) | generate two monthly reports and total them by service | `generate.mjs` |
| [2 find three causes](part-2-find-three-causes/README.md) | use billDiff and anomalies to find the three rows, then explain each one | `find-causes.mjs` |
| [3 tags and rules](part-3-tags-and-rules/README.md) | measure tag coverage by service and write the tagging rules | `tags.mjs` |

## What the emulator cannot show

This challenge uses files only: it never calls AWS. The reports are made up from real unit prices (dossier P7, P9, P12, P14, P15, read 2026-10-24) and are illustrations, not a copy of any real bill. The model `toolkit/models/bill.js` leaves out credits, refunds, tax, amortised commitments and forecasts.

## Run it

```
# nothing to start: no emulator is needed
npm run test:15
```
