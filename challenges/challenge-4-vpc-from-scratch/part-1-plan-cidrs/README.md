# Challenge 4, part 1: plan the address blocks

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Every address is a 32-bit number, written as four numbers from 0 to 255 (`10.20.8.0`). A block `10.20.8.0/24` is the 256 numbers that start with `10.20.8`. Two rules make planning a puzzle:

- **Size from hosts.** You need a block big enough for the machines in it plus the 5 addresses AWS keeps. `/26` holds 64 addresses, 59 usable. If you need 60, you need `/25`.
- **Alignment.** A block must start at a multiple of its own size. A `/24` (256 addresses) can start at `10.20.8.0` but never at `10.20.8.128`.

Place the biggest blocks first, so smaller blocks fill the gaps and nothing overlaps.

The subnet model (`toolkit/models/subnets.js`) gives you the arithmetic: `prefixForHosts`, `parseCidr`, `intToIp`, `usableAddresses`. You write the placement loop.

## The Daftar example

| Subnet | Zone | Servers and growth |
|---|---|---|
| public-a, public-b | a, b | 200 (load balancers, NAT) |
| app-a, app-b | a, b | 1000 (containers) |
| data-a, data-b | a, b | 50 (databases) |

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It is arithmetic on address blocks, using the subnet model. | [plan-cidrs.mjs#L1](plan-cidrs.mjs#L1) |
| 2 | Give every requirement its own block inside the VPC (your turn). | [plan-cidrs.mjs#L20](plan-cidrs.mjs#L20) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-4-vpc-from-scratch/part-1-plan-cidrs/plan-cidrs.mjs
npm run test:4
```

## Where each number comes from

- **Usable addresses** = block size minus 5. A `/22` has 1,024 addresses, so 1,019 usable. A `/24` has 256, so 251. A `/26` has 64, so 59.
- **Prefix** = the smallest prefix whose usable count is at least the hosts needed (`prefixForHosts`): 1000 hosts needs `/22`, 200 needs `/24`, 50 needs `/26`.
- **Percent of the VPC used** = addresses given to subnets divided by 65,536 (the size of a `/16`).
- **Spare** = usable minus needed.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
