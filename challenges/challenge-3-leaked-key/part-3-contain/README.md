# Challenge 3, part 3: containment plan and runbook entry

Runs on: **dataset**, **emulator** and **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

**Containment** is stopping the damage fast, before you understand everything. For a leaked key there are two quick moves:

1. **Switch the key off** (`UpdateAccessKey`, status `Inactive`). It stops working at once, and you can undo it.
2. **Attach a deny-everything policy** to the user. An explicit Deny beats every Allow (challenge 2), so even if the user has another key, nothing works.

Only after that do you **eradicate** (remove what the stranger created: servers, users, keys) and **recover** (give the robot a safe way to work, ideally a role with short-lived access instead of a stored key).

A plan is only useful if each step has a place, an order and an owner. So the plan is data: a list of steps. The first two steps name an API that this repository can run on the emulator; the others are for a person.

## The Daftar example

You write the deny policy, the six-step plan and a runbook entry with the numbers from part 2 (key, first and last time, calls, notes read, servers started). The script then runs steps 1 and 2 on the emulator against a practice user, and uses the policy model to check how many of the stranger's successful calls would still work afterwards.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. Containment changes users and keys, so it must only ever touch the emulator. | [contain.mjs#L1](contain.mjs#L1) |
| 2 | A policy that stops everything the user could do, whatever other policies say (your turn). **(your turn)** | [contain.mjs#L14](contain.mjs#L14) |
| 3 | The containment plan, in the order it must happen (your turn). | [contain.mjs#L21](contain.mjs#L21) |
| 4 | The runbook entry, in plain markdown, one heading per phase (your turn). **(your turn)** | [contain.mjs#L46](contain.mjs#L46) |
<!-- steps:end -->

## Run it

```
npm run moto:up
node toolkit/with-env.mjs challenges/challenge-3-leaked-key/part-3-contain/contain.mjs
npm run test:3
```

## Where each number comes from

- **Key status** and **policy name**: read back from the emulator after steps 1 and 2.
- **Stranger calls that succeeded (140)**: the 156 calls of part 2 minus the 16 that failed.
- **Still allowed after containment**: each of the 140 calls is evaluated by `toolkit/models/policy.js` with an allow-everything policy and your deny policy attached. The deny wins, so the answer should be 0.
- The emulator does not enforce policies, which is why the second number comes from the model.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
