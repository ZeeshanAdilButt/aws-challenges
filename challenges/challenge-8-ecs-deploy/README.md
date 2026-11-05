# Challenge 8: ship the Daftar image with ECS

Runs on: **emulator and model**. Cost: 0 dollars, runs on the emulator.

## The 101

A **container** is a box that holds your program and everything it needs. An **image** is the box before it runs. **ECS** (Elastic Container Service) starts containers for you and keeps the right number running. **Fargate** means AWS finds the computer, so you only say how much CPU and memory a container needs.

- A **task definition** is the recipe: the image, the port, the health check, where logs go, and two roles.
- The **execution role** is used by ECS itself (pull the image, write logs). The **task role** is used by your own code (read a bucket, send a message). They are different on purpose, so a bug in your code cannot pull images or change logs.
- A **rolling deployment** replaces old tasks with new ones in rounds. Two percentages control it: **minimumHealthyPercent** (how many tasks must keep working) and **maximumPercent** (how many may run at once, old and new).
- A **circuit breaker** stops a bad rollout: after enough new tasks fail their health check in a row, ECS rolls back to the last good version.

## The Daftar example

Daftar ships a new image of its API, 6 tasks. You register the task definition, plan the rollout, then watch a bad image fail and roll back.

## Parts

| Part | You do | Script |
|---|---|---|
| [1 register the task definition](part-1-register-the-task-definition/README.md) | write the task definition with two roles, a health check and logs, and register it on moto | `register.mjs` |
| [2 plan the rollout](part-2-plan-the-rollout/README.md) | compare six percentage pairs for 6 tasks and choose one that keeps every task answering | `plan.mjs` |
| [3 fail and roll back](part-3-fail-and-roll-back/README.md) | simulate a bad image, watch the circuit breaker trip, and count the error budget spent | `rollback.mjs` |

## What the emulator cannot show

moto keeps the ECS API state (a task definition, its roles, its settings) and runs no containers. It does not simulate a service rolling out, so parts 2 and 3 use the course model `toolkit/models/rollout.js`. The model rounds the minimum up and the maximum down; that is the exercise's own rule, not a quote from AWS. The circuit breaker numbers come from the AWS documentation (dossier D22).

## Run it

```
npm run moto:up
npm run test:8
```
