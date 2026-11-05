# Challenge 5, part 3: broken gateways and network ACLs

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Three more places where traffic dies, and they are the hardest to see because every rule looks right.

- A **NAT gateway** must live in a **public** subnet (one whose route table reaches the internet gateway). Put it in a private subnet and the route to it is correct, but its own traffic goes nowhere.
- A server needs a **public address** to cross the internet gateway. A load balancer recreated without one is invisible from outside, even with perfect rules.
- A **network ACL** is a numbered list of allow and deny rules on a subnet's edge. Rules are read from the lowest number; the first match decides; no match means deny. It is **stateless**: the reply to an allowed request is a new packet that needs its own outbound rule, to a high port (1024 to 65535).

## The Daftar example

| Configuration | The story |
|---|---|
| `nat-in-private-subnet` | The NAT gateway exists and the route to it is right, but the app still has no internet. |
| `no-public-address` | The load balancer was recreated. Its security group and routes are right, but nobody outside can reach it. |
| `nacl-no-reply` | A network ACL was added to the public subnet "for safety". Requests arrive, but customers never get an answer. |

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. The reachability model finds each fault; you write the fix and the runbook line. | [fix-gateways-and-nacls.mjs#L1](fix-gateways-and-nacls.mjs#L1) |
| 2 | The three broken networks. Provided. | [fix-gateways-and-nacls.mjs#L8](fix-gateways-and-nacls.mjs#L8) |
| 3 | One fix per configuration (your turn). **(your turn)** | [fix-gateways-and-nacls.mjs#L11](fix-gateways-and-nacls.mjs#L11) |
| 4 | One runbook line per configuration (your turn): "<fault code> at <where>: <what to change>". **(your turn)** | [fix-gateways-and-nacls.mjs#L20](fix-gateways-and-nacls.mjs#L20) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-5-broken-networks/part-3-gateways-and-nacls/fix-gateways-and-nacls.mjs
npm run test:5
```

## Where each number comes from

The same counts as part 1. For `nacl-no-reply` the model reports the ACL (`nacl-public`) because the request passes both firewalls and the failure is on the reply, which is what makes this fault feel like "it hangs".

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
