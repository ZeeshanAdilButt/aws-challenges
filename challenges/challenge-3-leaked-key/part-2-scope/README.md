# Challenge 3, part 2: scope the damage

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

**Scope** means: how big is the problem? Before you act you need four answers.

1. Which **calls** did the stranger make, and how many worked? A call with an `errorCode` such as `AccessDenied` failed. Failed calls still matter: they show what the stranger tried.
2. Which **resources** did they touch (notes read, servers started)?
3. **When** was the first call and the last? The first call is when the leak started. The last call tells you if it is still going.
4. Did they **change** anything? Read-only calls (`Get`, `List`, `Describe`) only look. The others change things and need cleaning up.

You decide who the stranger is by a **trusted list**: the CI server address (`198.51.100.10`) is where this key normally lives. Everything from another address counts as suspect.

## The Daftar example

The stranger got in at 02:14:07 UTC, listed buckets, tried to read IAM and the billing bucket (denied), downloaded 120 notes, tried to create a user (denied), and started four large servers (a common pattern: the stranger rents your computers to mine coins). That is a very different story from "they only looked around", and your numbers prove it.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It reads the log from part 1 and answers "what did the stranger do?". | [scope-key.mjs#L1](scope-key.mjs#L1) |
| 2 | Everything the key did from an address we do not trust (your turn). | [scope-key.mjs#L11](scope-key.mjs#L11) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-3-leaked-key/part-2-scope/scope-key.mjs
npm run test:3
```

## Where each number comes from

- **Normal calls (180)**: events of the key from the trusted address.
- **Calls from the stranger (156), failed (16)**: events of the key from any other address; failed means the event has an `errorCode`.
- **First and last call, minutes**: smallest and largest `eventTime` of those events; minutes is the gap divided by 60,000 milliseconds.
- **Notes read (120)**: distinct `bucket/key` pairs of successful `GetObject` calls.
- **Servers started (4)**: instance ids in successful `RunInstances` responses.
- **Things changed**: the names of successful calls that are not read-only.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
