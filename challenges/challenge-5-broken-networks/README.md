# Challenge 5: broken networks

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The 101

When "it cannot connect" is the only clue, the skill is to walk the path in order and find the **first** thing that stops the traffic. This challenge gives you ten broken versions of the Daftar network (as JSON, in three sets). Each has exactly one fault and one probe that fails. You find the fault with the reachability model, fix it with the smallest change, and write one line a teammate can use at 3am: a **runbook line**.

The path of a request, and what can stop it:

| Layer | What it is | Remembers replies? | Fault codes |
|---|---|---|---|
| security group (egress) | firewall around the sender | yes | `sg-egress-denied` |
| network ACL (outbound) | firewall on the subnet edge | no | `nacl-out-denied` |
| route table | where does traffic for this address go? | n/a | `no-route`, `blackhole`, `no-igw`, `nat-missing`, `nat-not-public` |
| public address | needed to cross the internet gateway | n/a | `no-public-ip` |
| network ACL (inbound) | firewall on the receiver's subnet edge | no | `nacl-in-denied` |
| security group (ingress) | firewall around the receiver | yes | `sg-ingress-denied` |
| the reply | back through the ACLs | ACLs do not remember | `nacl-return-denied` |

A **security group** is **stateful**: if it lets a request in, the reply goes out without a rule. A **network ACL** is **stateless**: requests and replies each need a rule, and replies use high port numbers (1024 to 65535).

## Parts

| Part | Faults | Script |
|---|---|---|
| [1 security groups](part-1-security-groups/README.md) | wrong port, wrong source, missing outbound rule, port closed to the world | `fix-security-groups.mjs` |
| [2 route tables](part-2-routes/README.md) | a blackhole route, a missing default route, a subnet on the wrong table | `fix-routes.mjs` |
| [3 gateways and network ACLs](part-3-gateways-and-nacls/README.md) | NAT gateway in a private subnet, no public address, an ACL that blocks replies | `fix-gateways-and-nacls.mjs` |

## The rule about lazy fixes

Opening a port to `0.0.0.0/0` (everyone) makes many problems disappear, and creates a worse one. The tests refuse any fix that adds an ingress rule open to the world on something other than a single web port. They also check that your fix does not break the four paths that worked before.

## What the emulator cannot show

moto would store these settings but cannot tell you if traffic flows. That is why this challenge uses only the model (`toolkit/models/reach.js`) and needs no emulator. The configurations are made by `make-configs.mjs`; it checks each one against the model before writing it.

## Run it

```
npm run test:5
```
