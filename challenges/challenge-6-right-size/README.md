# Challenge 6: right-size a server

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The 101

Daftar pays for servers by the hour. A bigger server costs more even when it sits idle. **Right-sizing** means looking at what a server really used and picking the smallest size that is still comfortable.

- **CPU** is how much work the processor does. We read it as a percent of the server.
- **Memory** is how much data the server holds at once. Unlike CPU, a program that runs out of memory stops, so we leave room.
- A **percentile** answers "what value is only exceeded by a small share of the hours?". The **p95** is the value that 95 percent of the hours are at or below. We size for p95 so one hot hour does not drive the whole decision. A hot hour is still a risk, so we also count the hours above 60 percent.
- A **purchase mix** is how you pay: **on-demand** (full price, stop any time), a **commitment** such as a Savings Plan (cheaper, for use that never stops) and **Spot** (cheapest, AWS can take the server back).

## The Daftar example

Daftar runs three services on the same size, an m7i.large: the **api**, the **worker** (a nightly export) and the **admin** tool. You get a week of hourly numbers for each. You read them, pick a size for each service and a purchase mix, and say how many dollars a month it saves.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 read the metrics](part-1-read-the-metrics/README.md) | write the percentile and summarise each service | `summarise.mjs` |
| [2 recommend a size and a mix](part-2-recommend-a-size-and-mix/README.md) | pick a size per service, split the servers into commit, on-demand and Spot, and warn about burstable sizes | `recommend.mjs` |

## What the emulator cannot show

This challenge never calls AWS at all. It reads files and runs pure models from `toolkit/models/`. The emulator (moto) keeps API state but runs no servers, moves no packets, evaluates IAM only at a basic level and has no cost data, so sizes, scaling and money are computed by the course models and the dated price table.

## Run it

```
# nothing to start: no emulator is needed
npm run test:6
```
