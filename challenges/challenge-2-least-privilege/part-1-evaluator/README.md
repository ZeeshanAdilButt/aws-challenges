# Challenge 2, part 1: the policy evaluator

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Your job is the middle of `evaluate()` in `toolkit/models/policy.js`: the order in which the four rules are applied. Wildcards, conditions and the "does this statement apply?" check are given. Read them first.

- A **wildcard** `*` stands for any run of characters. `s3:Get*` matches `s3:GetObject` and `s3:GetBucketPolicy`.
- A **condition** compares a value in the request (the **context**, for example the caller's IP address or whether HTTPS was used) with a value in the policy. A condition on a key that is missing from the request is false, unless the operator is a "Not" one.
- A **reason** says why the answer is what it is: `allowed`, `explicit-deny`, `no-allow` (nothing allowed it) or `outside-boundary`.

## The Daftar example

`cases.json` holds two policies that Daftar's API role carries, a boundary, and 16 requests with the answer AWS would give. One shows a Deny beating an Allow: reading a note over plain HTTP is denied by a "no plain http" rule even though another statement allows reading notes.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. The decision logic is in toolkit/models/policy.js (the YOUR TURN is there). | [evaluate-requests.mjs#L1](evaluate-requests.mjs#L1) |
| 2 | Ask the evaluator about one case. The policies and the boundary come from cases.json. | [evaluate-requests.mjs#L11](evaluate-requests.mjs#L11) |
| 3 | Compare every answer with the decision and the reason written in cases.json. | [evaluate-requests.mjs#L17](evaluate-requests.mjs#L17) |
| R1 | Wildcards. * matches any run of characters (including none), ? matches exactly one. | [../../../toolkit/models/policy.js#L17](../../../toolkit/models/policy.js#L17) |
| R2 | Conditions. One Condition block: every operator and key must pass (AND); several policy values for a key are OR. | [../../../toolkit/models/policy.js#L52](../../../toolkit/models/policy.js#L52) |
| R3 | Does one statement apply to a request? (Effect is not looked at here.) | [../../../toolkit/models/policy.js#L71](../../../toolkit/models/policy.js#L71) |
| R4 | The decision (your turn).  evaluate(request, policies, boundary?) | [../../../toolkit/models/policy.js#L87](../../../toolkit/models/policy.js#L87) |
<!-- steps:end -->
<!-- steps-also: ../../../toolkit/models/policy.js -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-2-least-privilege/part-1-evaluator/evaluate-requests.mjs
npm run test:2
```

## Where each number comes from

"Cases passed" counts the requests in `cases.json` where both the decision and the reason match. The answers in that file were worked out by hand from the four rules. The tests in `toolkit/models/policy.test.mjs` check the model on more edge cases.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
