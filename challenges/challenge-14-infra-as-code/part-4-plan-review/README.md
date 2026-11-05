# Challenge 14, part 4: the plan review

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A plan lists every change with a symbol. Most are small. A few need a person: a database that **must be replaced** (the old one is destroyed with its data), a security rule that opens a database port to 0.0.0.0/0, and an IAM policy that changes to allow `*` on `*`.

## The Daftar example

The plan in `plan-output.txt` has six changes and three of them are risky. Flagging all six is as useless as flagging none.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS and never runs OpenTofu. It reads a plan written as text and you review it. | [review.mjs#L1](review.mjs#L1) |
| 2 | Split the plan into its changes. Provided. Each item is { address, action, text }. | [review.mjs#L10](review.mjs#L10) |
| 3 | Write the review (your turn). Return a list of { address, risk, ask } for the changes that need a person to stop and think. | [review.mjs#L22](review.mjs#L22) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-14-infra-as-code/part-4-plan-review/review.mjs
npm run test:14
```

## Where each number comes from

The plan text is a hand-written illustration in the usual shape of a plan. It is not the output of a real run, and the exact wording of `tofu plan` is not quoted from any source.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
