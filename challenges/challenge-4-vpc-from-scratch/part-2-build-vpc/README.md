# Challenge 4, part 2: build the VPC on the emulator

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

You build the network with the AWS SDK, one request per thing: `CreateVpc`, `CreateSubnet`, `CreateInternetGateway`, `CreateRouteTable`, `CreateRoute`, `AssociateRouteTable`, `AllocateAddress` and `CreateNatGateway`. A request that creates something returns its **ID** (like `subnet-0abc...`), and you use that ID in the next request. That is the whole craft: keep the IDs, connect things in the right order.

Order matters. A route needs the gateway to exist first. A NAT gateway needs a public subnet and an **Elastic IP** (a fixed public address) first. A route table does nothing until it is **associated** with a subnet.

You write the routing part: the public table to the internet gateway, the NAT gateway in `public-a`, and the app table to the NAT gateway. The VPC, subnets, internet gateway and the database table are given.

## The Daftar example

When you finish, `describeNetwork()` reads the VPC back from the emulator in the plain shape the reachability model uses. The tests compare it with the healthy example network (`toolkit/models/example-network.js`): the same subnets, the same three route tables, the same one NAT gateway.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part creates network resources, so it must only ever touch the emulator. | [build-vpc.mjs#L1](build-vpc.mjs#L1) |
| 2 | The VPC, the subnets and the internet gateway. Provided. | [build-vpc.mjs#L27](build-vpc.mjs#L27) |
| 3 | Route tables and the NAT gateway (your turn). | [build-vpc.mjs#L40](build-vpc.mjs#L40) |
| 4 | Read the VPC back and turn it into the plain network shape the reachability model understands. | [build-vpc.mjs#L72](build-vpc.mjs#L72) |
<!-- steps:end -->

## Run it

```
npm run moto:up
node toolkit/with-env.mjs challenges/challenge-4-vpc-from-scratch/part-2-build-vpc/build-vpc.mjs
npm run test:4
```

## Where each number comes from

There are no calculated numbers. The table shows what the emulator returns for each subnet: its block, its route table and the routes in it, read with `DescribeSubnets` and `DescribeRouteTables`. Subnets and tables are found by their `Name` tag, because their IDs are random.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
