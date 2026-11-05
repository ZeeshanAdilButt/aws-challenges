# Challenge 15, part 3: tags and rules

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

Required tags: `team`, `env` and `service`. A line counts as covered only when it carries all three, non-empty. You write the coverage for each AWS service, and a rule for each tag: its allowed values and who enforces it. The rules are saved in `tagging-rules.md`.

## The Daftar example

The CloudWatch logs have team and env but no service tag, so 0 percent of that line is covered. The idle load balancers have no tags at all.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It measures how much of the bill carries the tags Daftar requires. | [tags.mjs#L1](tags.mjs#L1) |
| 2 | Coverage for each AWS service (your turn). | [tags.mjs#L13](tags.mjs#L13) |
| 3 | The tagging rules (your turn). Fill in the three required tags: the allowed values of each, and who enforces the rule. **(your turn)** | [tags.mjs#L22](tags.mjs#L22) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-15-find-the-bill/part-3-tags-and-rules/tags.mjs
npm run test:15
```

## Where each number comes from

Coverage is dollars with every required tag divided by total dollars, from `tagCoverage()` in `toolkit/models/bill.js`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
