# Challenge 4, part 3: test the routes and price the NAT gateways

Runs on: **emulator** and **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Settings are not behaviour. The emulator says the routes exist; only a model can say what traffic would pass. The reachability model walks a request along its path: the sender's security group (egress), the subnet's network ACL, the route table, the receiver's network ACL and security group, and the reply. It stops at the first fault and names it (`no-public-ip`, `sg-egress-denied`, `no-route`, ...).

Then money. A NAT gateway costs by the hour whether you use it or not, plus a charge for every gigabyte it processes. With **one NAT gateway** all private traffic goes to one zone, and servers in the other zone pay to **cross zones**. With **one per zone** you pay two hourly fees but nothing crosses. Which is cheaper depends on traffic, and cost is not the only thing: with one NAT gateway, losing its zone stops outbound traffic for both.

## The Daftar example

You write the list of paths Daftar must keep open and closed. The most important closed one: nobody on the internet may reach the app servers directly, and the database may never reach out. Then you price the NAT choice for 100 GB, 1,000 GB and 5,000 GB a month.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. The network is built on the emulator, then judged by the reachability model. | [routes-and-cost.mjs#L1](routes-and-cost.mjs#L1) |
| 2 | Build the VPC on the emulator, read it back, and add the servers and security groups. | [routes-and-cost.mjs#L12](routes-and-cost.mjs#L12) |
| 3 | The paths that must work and the paths that must not (your turn). | [routes-and-cost.mjs#L24](routes-and-cost.mjs#L24) |
| 4 | What NAT gateways cost for one month (your turn). | [routes-and-cost.mjs#L42](routes-and-cost.mjs#L42) |
<!-- steps:end -->

## Run it

```
npm run moto:up
node toolkit/with-env.mjs challenges/challenge-4-vpc-from-scratch/part-3-routes-and-cost/routes-and-cost.mjs
npm run test:4
```

## Where each number comes from

All prices are in `toolkit/prices.js`: us-east-1, read on 2026-10-24, in dollars.

- **Gateway fee**: 730 hours in a month times 0.045 dollars an hour is 32.85 dollars per gateway (VERIFIED).
- **Processing**: 0.045 dollars per GB through the gateway (VERIFIED).
- **Crossing zones**: 0.01 dollars per GB in each direction, so 0.02 per GB that crosses. The research notes could not confirm this rate, so it is tagged **UNVERIFIED**: check the current price before you rely on it. We assume half of the app servers sit in the other zone, so half of the traffic crosses.
- **Break-even**: the second gateway costs 32.85 more a month and saves 0.5 times 0.02 = 0.01 dollars per GB, so it pays for itself above 32.85 / 0.01 = 3,285 GB a month.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
