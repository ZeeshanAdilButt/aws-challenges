# Challenge 7: scale against a load profile

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The 101

A **load balancer** spreads requests over many servers. **Auto Scaling** adds or removes servers while the traffic changes. **Target tracking** is the simplest rule: you name a target (for example "keep servers about 50 percent busy") and AWS works out how many servers that needs.

- The model asks for `ceil(servers now x busy percent / target)` servers, kept between a minimum and a maximum.
- A new server is not useful at once. It must start, load the app and pass health checks. This delay is the **warm-up**. Until then, requests above what the running servers can answer are **dropped**.
- The **cooldown** is a pause after a scaling action, so the fleet does not add and remove servers in a loop.
- A **scheduled action** changes the minimum at a set time, which is how you prepare for a sale you already know about.

## The Daftar example

Daftar runs a Friday sale. Traffic goes from 100 requests a second to 1,000 in 30 seconds, stays there, falls, and a smaller spike comes later. You replay that traffic through the model, compare settings and draw the lag.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 replay the profile](part-1-replay-the-profile/README.md) | group the replay into minutes and read where requests were dropped | `replay.mjs` |
| [2 warm-up and cooldown](part-2-warm-up-and-cooldown/README.md) | compare settings and pick the cheapest one that keeps drops under a line | `sweep.mjs` |
| [3 chart the lag](part-3-chart-the-lag/README.md) | measure how long the fleet was late and draw wanted against running | `lag.mjs` |

## What the emulator cannot show

AWS's exact target tracking algorithm is not in the course notes. The model is the course's own simple rule, and the README of each part says what it leaves out (for example, AWS's own scale-in behaviour). The emulator is not used here: it runs no servers and has no traffic, so everything is computed by `toolkit/models/scaling.js`.

## Run it

```
# nothing to start: no emulator is needed
npm run test:7
```
