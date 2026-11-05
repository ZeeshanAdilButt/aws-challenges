# Challenge 8, part 1: register the task definition

Runs on: **emulator**. Cost: 0 dollars, runs on the emulator.

## The idea from zero

A task definition is plain data. You write it as a JavaScript object, send it with `RegisterTaskDefinition`, and read it back. The emulator stores it and shows it again. It never pulls the image.

## The Daftar example

The Daftar API listens on port 8080, answers `GET /health`, and writes logs to the group `/daftar/api`. It runs with 0.5 vCPU and 1 GB. It needs the execution role `daftar-api-execution` and the task role `daftar-api-task`.

## Steps

<!-- steps:start -->
| Step | What happens | Where |
|---|---|---|
| 1 | The guard first. This part creates two roles and registers a task definition, so it must only ever touch the emulator. | [register.mjs#L1](register.mjs#L1) |
| 2 | Two different roles. The execution role is used by ECS itself (pull the image, write logs). | [register.mjs#L19](register.mjs#L19) |
| 3 | The task definition for the Daftar API (your turn). Return the input for RegisterTaskDefinitionCommand. | [register.mjs#L29](register.mjs#L29) |
| 4 | Register it and read it back. Provided. | [register.mjs#L42](register.mjs#L42) |
<!-- steps:end -->

## Run it

```
node toolkit/with-env.mjs challenges/challenge-8-ecs-deploy/part-1-register-the-task-definition/register.mjs
npm run test:8
```

## Where each number comes from

Fargate sizes are written as text: `cpu` "512" means 0.5 vCPU and `memory` "1024" means 1 GB (512 CPU units is half a vCPU). The account number 123456789012 is the emulator's. The image name is made up and is never pulled.

## Results

<!-- results:start -->
Run the script to see your own numbers. The reference numbers and the chart are in the private reference repository, shared with mentors.
<!-- results:end -->
