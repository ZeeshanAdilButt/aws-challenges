# Challenge 5, part 2: three broken route tables

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A **route table** answers one question for every packet: "this destination address, where do I send it?" Each rule has a **destination** range and a **target**. The rule with the longest prefix (the most specific range) wins. `10.20.0.0/16` (the VPC itself) goes to `local`. `0.0.0.0/0` means "everything else", and its target says what kind of subnet this is: an internet gateway means public, a NAT gateway means private with outbound access, nothing means isolated.

Three things go wrong with routes: the rule is **missing**, the rule points at something **deleted** (a **blackhole**: AWS shows the route with the state "blackhole" and drops the traffic), or the subnet uses the **wrong table**. The model tells them apart: `no-route` or `blackhole`, with the table name.

## The Daftar example

| Configuration | The story |
|---|---|
| `route-blackhole` | Someone deleted the NAT gateway to save money. The app cannot download updates or call the payment service. |
| `route-missing-default` | A change to the public route table removed one line. The site is down for everyone. |
| `route-wrong-table` | A new app subnet in zone a was tied to the wrong route table. Zone b is fine. |

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. The reachability model finds each fault; you write the fix and the runbook line. | [fix-routes.mjs#L1](fix-routes.mjs#L1) |
| 2 | The three broken networks. Provided. | [fix-routes.mjs#L8](fix-routes.mjs#L8) |
| 3 | One fix per configuration (your turn). **(your turn)** | [fix-routes.mjs#L11](fix-routes.mjs#L11) |
| 4 | One runbook line per configuration (your turn): "<fault code> at <where>: <what to change>". **(your turn)** | [fix-routes.mjs#L19](fix-routes.mjs#L19) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-5-broken-networks/part-2-routes/fix-routes.mjs
npm run test:5
```

## Where each number comes from

The same counts as part 1. The "Where" column is the route table that the model reports: for `route-wrong-table` that is `rt-data`, the table the subnet is wrongly using, not the table it should use.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
