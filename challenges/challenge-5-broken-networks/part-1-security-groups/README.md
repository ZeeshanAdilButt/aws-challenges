# Challenge 5, part 1: four broken security groups

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A **security group** is a list of rules attached to a server or load balancer. A rule says: this protocol, these ports, from or to this **peer**. A peer is an address range (`10.20.0.0/16`) or another security group by name. Naming a group is better than an address range: "the app group" stays true when the app servers change their addresses.

There are two lists: **ingress** (what may come in) and **egress** (what may go out). Both must allow a request. Anything not allowed is refused, quietly: no error message, the connection just hangs. That is why a model that names the missing rule is valuable.

## The Daftar example

| Configuration | The story |
|---|---|
| `sg-wrong-port` | After a deploy the load balancer says every app target is unhealthy. |
| `sg-wrong-source` | The app cannot connect to the database. The database group was copied from another project. |
| `sg-egress-missing` | A security review removed "unneeded" outbound rules from the app group. |
| `sg-https-closed` | Customers outside the office cannot open Daftar. Colleagues can. |

For each, the test checks that the model finds the right fault in the right group, that your fix makes the probe work without opening a port to the world, that the other four paths still work, and that your runbook line names the fault code and the place.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. The reachability model finds each fault; you write the fix and the runbook line. | [fix-security-groups.mjs#L1](fix-security-groups.mjs#L1) |
| 2 | The four broken networks. Each has one probe that fails. Provided. | [fix-security-groups.mjs#L8](fix-security-groups.mjs#L8) |
| 3 | One fix per configuration (your turn). A fix is a function that changes the network it is given. **(your turn)** | [fix-security-groups.mjs#L11](fix-security-groups.mjs#L11) |
| 4 | One runbook line per configuration (your turn). Say the fault code, where it is, and what to change. **(your turn)** | [fix-security-groups.mjs#L20](fix-security-groups.mjs#L20) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-5-broken-networks/part-1-security-groups/fix-security-groups.mjs
npm run test:5
```

## Where each number comes from

"Fault found as expected" counts configurations where the model's code and place equal the `expect` field in `configs.json`. "Fixed without opening the world" counts configurations where, after your fix, the probe is reachable and the number of ingress rules open to everyone on non-web ports did not grow.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
