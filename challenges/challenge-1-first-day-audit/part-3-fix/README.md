# Challenge 1, part 3: fix and audit again

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A fix is only done when a second audit says so. This part fixes each finding, then runs the audit from part 2 again and expects zero findings. Two habits are practised:

- **Switch off before you delete.** Switching an access key off (status `Inactive`) can be undone. Deleting cannot. If a robot was secretly using the key, switching it off shows you who complains, and you can switch it back on.
- **Fixes can be repeated.** Running the fix twice must do no harm.

## The Daftar example

After the fix, `daftar-public-assets` blocks public access and has no public policy (public files would be shared through signed links instead; challenge 10). The three idle keys are off. The password policy asks for 14 characters, all four types, a 90 day change and no reuse of the last 24 passwords.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. | [fix-and-reaudit.mjs#L1](fix-and-reaudit.mjs#L1) |
| 2 | Root keys. Provided. In a real account you sign in as root once and delete the key in the console. | [fix-and-reaudit.mjs#L13](fix-and-reaudit.mjs#L13) |
| 3 | A strong password policy: 14 characters, all four types, passwords expire in 90 days, last 24 cannot be reused. **(your turn)** | [fix-and-reaudit.mjs#L18](fix-and-reaudit.mjs#L18) |
| 4 | Close the public bucket. Turn on all four Block Public Access settings and remove the public policy. **(your turn)** | [fix-and-reaudit.mjs#L26](fix-and-reaudit.mjs#L26) |
| 5 | Switch an unused key off. Switching off can be undone; deleting cannot, so it comes later. **(your turn)** | [fix-and-reaudit.mjs#L34](fix-and-reaudit.mjs#L34) |
| 6 | Fix each finding by its check name. | [fix-and-reaudit.mjs#L41](fix-and-reaudit.mjs#L41) |
<!-- steps:end -->

## Run it

```
npm run moto:up
node toolkit/with-env.mjs challenges/challenge-1-first-day-audit/part-3-fix/fix-and-reaudit.mjs
npm run test:1
```

## Where each number comes from

"Findings before" is the length of the part 2 audit. "Findings after" is the length of the same audit after `fixAll`. The root key is fixed in a file here; in a real account you would delete it in the console while signed in as root, once.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
