# Challenge 13, part 2: three alarm designs

Runs on: **model**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A **page** is a run of ALARM that wakes a person. A **false page** happens outside the incident. The **delay** is how many minutes pass between the first bad minute and the first ALARM. Faster designs wake people for noise. Slower designs wake them late.

## The Daftar example

"1 of 1" pages at once but also pages for both noise spikes. "3 of 3" has no false page but is two minutes late. "2 of 3" is one minute late and has no false page.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. The emulator keeps alarm settings but does not say it evaluates them, | [designs.mjs#L1](designs.mjs#L1) |
| 2 | Three ways to write the same alarm on p99 above 800 ms. M of N means: ALARM when M of the last N minutes breach. | [designs.mjs#L10](designs.mjs#L10) |
| 3 | Run one design over the night (your turn). | [designs.mjs#L18](designs.mjs#L18) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-13-3am-drill/part-2-alarm-designs/designs.mjs
npm run test:13
```

## Where each number comes from

The incident is 35 minutes long (01:10 to 01:44). Pages, false pages and delay come from `replayAlarm()` and `judgeAlarm()` in `toolkit/models/alarm.js`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
