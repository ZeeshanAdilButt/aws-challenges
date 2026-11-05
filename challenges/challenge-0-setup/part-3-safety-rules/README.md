# Challenge 0, part 3: the safety rules as tests

Runs on: **model** (no emulator needed). Cost: 0 dollars, runs on the emulator.

## The idea from zero

A **test** is a small program that checks that another program behaves as you expect. A safety rule that nobody tests is only a hope. Here you write down six unsafe setups, and the test proves that the guard refuses each one, for its own reason.

The guard's rules are a plain function, `checkEnvironment(env)` in `toolkit/guard-core.js`. It takes an object of variables and returns a list of problems. Each problem has a short **code** such as `endpoint-remote`.

## The Daftar example

A new teammate copies a shell setup from the web. It contains `AWS_ACCESS_KEY_ID=AKIA...` and a profile name. The guard must stop them before their first command. You write the setups that prove it will.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | This part never calls AWS, so it uses the guard's offline form: same environment checks, no network. | [safety-rules.mjs#L1](safety-rules.mjs#L1) |
| 2 | Write the unsafe setups. Each one changes a single thing and must be refused for its own reason. **(your turn)** | [safety-rules.mjs#L16](safety-rules.mjs#L16) |
| 3 | Run one scenario through the same function the guard uses. | [safety-rules.mjs#L25](safety-rules.mjs#L25) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-0-setup/part-3-safety-rules/safety-rules.mjs
npm run test:0
```

## Where each number comes from

- **The safe setup is accepted**: `checkEnvironment` on four variables returns no problem.
- **Unsafe setups refused**: each scenario is the safe setup with one change. The count of refused ones should equal the count of scenarios.
- **Rule that fired**: the code of each problem returned. The six rules are `endpoint-remote`, `service-endpoint-remote`, `ignore-endpoints`, `real-key-prefix`, `session-token` and `profile-set`.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
