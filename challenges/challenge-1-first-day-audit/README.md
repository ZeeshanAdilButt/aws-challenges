# Challenge 1: first-day audit

Runs on: **emulator**. Optional real-account day: README only (below).

Cost: 0 dollars, runs on the emulator.

## The 101

On the first day with a new AWS account, a few settings decide how safe it is. An **audit** is a check of an account against a list of good settings. Each failed item is a **finding**: what is wrong, where, and what to do. AWS Security Hub names this kind of check with short codes like `IAM.4`. This challenge uses those names; check the current list before you rely on a code, because AWS renames and renumbers controls.

Daftar just opened an account. Four things are wrong, and the account looks fine until you check:

| Finding | AWS name | Why it matters |
|---|---|---|
| The **root user** (the all-powerful first login) has an access key | `IAM.4` | A leaked root key cannot be limited. |
| No **password policy** (rules for how strong passwords must be) | `IAM.7` | Weak passwords. |
| A bucket whose policy lets everyone read | `S3.2` | Public data leaks. |
| Access keys that nobody uses | `IAM.22` | Unwatched keys are the ones that leak. |

## Parts

| Part | You do | Script |
|---|---|---|
| [1 seed a fake account](part-1-seed/README.md) | plant the bad settings on the emulator | `seed-account.mjs` |
| [2 the audit script](part-2-audit/README.md) | report each finding with its AWS name | `audit.mjs` |
| [3 fix and audit again](part-3-fix/README.md) | fix all six and prove the second audit is clean | `fix-and-reaudit.mjs` |

Do the parts in order: parts 2 and 3 start from the account that part 1 builds.

## What the emulator cannot show

The emulator cannot hold the root user's keys: its account summary always answers the same fixed values. So part 1 writes that one fact into a small file (`.work/root-account.json`, not committed) and the audit reads it. Everything else (users, keys, password policy, buckets) is real emulator state. moto also does not model what Block Public Access does to a public policy, so the audit applies that rule itself.

## Run it

```
npm run moto:up
npm run test:1
```

## Optional: the same day on a real account (a checklist, nothing here runs it)

Only do this if you want to. Nothing in this repository requires a real account or ever calls one.

1. **Costs first.** A new account can choose a Free plan (it cannot be billed; it ends after 6 months or when the credits are used) or a Paid plan (it can be billed). A **budget** only sends a warning, often hours late, and cannot stop spending. Check the current terms on the AWS pricing pages before you start.
2. Sign in as the root user once. AWS now requires multi-factor authentication (MFA, a second proof such as an app code) for the root user. Turn it on.
3. Make sure the root user has **no** access keys (the console shows this under security credentials).
4. Create an administrator user or role for daily work. Never use root again.
5. Set a password policy: 14 or more characters, all four character types.
6. Create a budget with an email alert at a small amount.
7. In S3, make sure **Block Public Access** is on for the whole account.
8. **Teardown last:** delete anything you created that you do not need, and keep the budget alert on.
