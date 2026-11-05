# Challenge 4: VPC from scratch

Runs on: **emulator** and **model**. Cost: 0 dollars, runs on the emulator.

## The 101

A **VPC** (Virtual Private Cloud) is your own private network inside AWS. You choose its address range, split it into **subnets**, and decide with **route tables** where traffic may go.

- A **CIDR block** like `10.20.0.0/16` is a range of addresses. The number after the slash says how many leading bits are fixed. `/16` leaves 16 bits, so 65,536 addresses. `/24` leaves 8 bits, so 256.
- A **subnet** is a smaller range inside the VPC, in one **availability zone** (a separate data centre area, such as `us-east-1a`). AWS keeps **5 addresses** of every subnet for itself, so a `/24` has 251 usable.
- A **route table** is a list of rules: "traffic for this range goes to that target". The most specific rule wins.
- An **internet gateway** is the door between the VPC and the internet. A subnet is **public** when its route table sends `0.0.0.0/0` (everything else) to that door.
- A **NAT gateway** lets servers in private subnets start connections to the internet (for updates, payment APIs) without letting the internet start connections to them. It sits in a public subnet and costs money by the hour and by the gigabyte.

## The Daftar network

Two zones, three layers: public (load balancer, NAT), app (servers) and data (database). The database has no route to the internet at all.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 plan the address blocks](part-1-plan-cidrs/README.md) | give six subnets their blocks, no overlap | `plan-cidrs.mjs` |
| [2 build the VPC on the emulator](part-2-build-vpc/README.md) | route tables and a NAT gateway with the SDK | `build-vpc.mjs` |
| [3 test the routes and price the NAT gateways](part-3-routes-and-cost/README.md) | probe the paths, compare one NAT with one per zone | `routes-and-cost.mjs` |

## What the emulator cannot show

moto stores the VPC, subnets, routes and gateways, and shows them back, but it runs no servers and moves no packets. So part 3 reads the settings back from the emulator and hands them to the reachability model (`toolkit/models/reach.js`), which answers "can A reach B?". The emulator has no prices, so the NAT cost comes from `toolkit/prices.js`.

## Run it

```
npm run moto:up
npm run test:4
```
