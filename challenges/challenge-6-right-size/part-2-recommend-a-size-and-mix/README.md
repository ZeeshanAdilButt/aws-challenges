# Challenge 6, part 2: recommend a size and a purchase mix

Runs on: **dataset**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

The course model `recommend()` (in `toolkit/models/rightsize.js`) turns the p95 CPU and the highest memory into a need: **vCPU needed = p95 CPU used divided by 0.6** (we aim to keep a server at 60 percent) and **memory needed = highest memory x 1.2**. Then it takes the cheapest size that fits. You add the purchase mix and the safety warning.

A **burstable** size (the t3 and t4g families) is cheap because it earns CPU credits slowly and spends them when busy. A service with hot hours can run out. The course does not quote credit numbers, so the rule here is simple: unsafe if the service has any hour above 60 percent.

## The Daftar example

The api always runs at least 2 servers and 3 by day, so the 2 are the **floor** and can be committed. The worker starts extra servers only for the nightly export, and a failed export can be retried, so the extra servers can be **Spot**. The admin tool is idle and safe to put on the cheapest burstable size.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS. It uses the course model and the price table. | [recommend.mjs#L1](recommend.mjs#L1) |
| 2 | The discounts. AWS gives only the ceiling, never a typical figure (AWS Savings Plans and Spot pages): | [recommend.mjs#L9](recommend.mjs#L9) |
| 3 | The purchase mix for one service (your turn). | [recommend.mjs#L14](recommend.mjs#L14) |
| 4 | A burstable size (t3, t4g) is cheap but earns CPU credits slowly and spends them when busy (your turn). | [recommend.mjs#L27](recommend.mjs#L27) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-6-right-size/part-2-recommend-a-size-and-mix/recommend.mjs
npm run test:6
```

## Where each number comes from

- **Prices**: six EC2 on-demand prices per hour, us-east-1, read 2026-10-24: t3.medium 0.0416, t4g.medium 0.0336, m7g.large 0.0816, m7i.large 0.1008, c7g.large 0.0725, r7g.large 0.1071.
- **Server-hours**: 730 hours in a month. The floor is committed for all 730. Extra server-hours in the week are scaled by 730 / 168.
- **Discounts**: AWS says a Compute Savings Plan saves "up to" 66 percent and Spot "up to" 90 percent (AWS Savings Plans and Spot pages). It gives no typical figure and the course invents none. The "best case" column uses those ceilings and is a ceiling, not a forecast. The "new size" column uses list prices only and is the number to trust, with one condition: no service gets a smaller machine here, since every pick has 2 vCPU. The saving is the price gap between the x86 m7i.large and the Arm sizes (m7g.large is about 19 percent cheaper), so it exists only if the software runs on arm64. Build and test an arm64 image first.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
