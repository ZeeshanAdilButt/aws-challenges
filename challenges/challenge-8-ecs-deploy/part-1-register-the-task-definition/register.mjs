// STEP 1: the guard first. This part creates two roles and registers a task definition, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { CreateRoleCommand } from '@aws-sdk/client-iam';
import { DescribeTaskDefinitionCommand, RegisterTaskDefinitionCommand } from '@aws-sdk/client-ecs';
import { ecs as makeEcs, iam as makeIam, resetEmulator } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 8, part 1: register the task definition';

export const ACCOUNT = '123456789012';
// The image is a name only. The emulator never pulls it. In AWS it would live in ECR (Elastic Container Registry).
export const IMAGE = `${ACCOUNT}.dkr.ecr.us-east-1.amazonaws.com/daftar-api:1.4.2`;

const ecsTasksTrust = JSON.stringify({
  Version: '2012-10-17',
  Statement: [{ Effect: 'Allow', Principal: { Service: 'ecs-tasks.amazonaws.com' }, Action: 'sts:AssumeRole' }],
});

// STEP 2: two different roles. The execution role is used by ECS itself (pull the image, write logs).
// The task role is used by the Daftar code (read notes, send jobs). Provided.
export async function createRoles(iam) {
  const make = async (RoleName, Description) => (await iam.send(new CreateRoleCommand({ RoleName, Description, AssumeRolePolicyDocument: ecsTasksTrust }))).Role.Arn;
  return {
    executionRoleArn: await make('daftar-api-execution', 'ECS pulls the image and writes logs'),
    taskRoleArn: await make('daftar-api-task', 'The Daftar API code: notes bucket and jobs queue'),
  };
}

// STEP 3: the task definition for the Daftar API (your turn). Return the input for RegisterTaskDefinitionCommand.
//   family 'daftar-api', Fargate, network mode awsvpc, 0.5 vCPU (cpu '512') and 1 GB (memory '1024')
//   one container named 'api' with IMAGE, port 8080, essential
//   a health check that runs: curl -f http://localhost:8080/health  (every 30 s, 5 s timeout, 3 retries, 10 s start period)
//   logs sent to CloudWatch Logs with the awslogs driver: group '/daftar/api', region 'us-east-1', stream prefix 'api'
//   the two roles from step 2: executionRoleArn and taskRoleArn
export function taskDefinition({ executionRoleArn, taskRoleArn }) {
  // YOUR TURN start
  // HINT: the health check is { command: ['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1'], interval, timeout, retries, startPeriod }.
  // HINT: logConfiguration is { logDriver: 'awslogs', options: { 'awslogs-group': ..., 'awslogs-region': ..., 'awslogs-stream-prefix': ... } }.
  // YOUR TURN end
}

// STEP 4: register it and read it back. Provided.
export async function registerAndRead(ecs, iam) {
  const roles = await createRoles(iam);
  await ecs.send(new RegisterTaskDefinitionCommand(taskDefinition(roles)));
  const { taskDefinition: stored } = await ecs.send(new DescribeTaskDefinitionCommand({ taskDefinition: 'daftar-api' }));
  return { roles, stored };
}

export async function run() {
  await resetEmulator();
  const { roles, stored } = await registerAndRead(makeEcs(), makeIam());
  const c = stored.containerDefinitions[0];
  return {
    facts: [
      ['Family and revision', `${stored.family}:${stored.revision}`],
      ['Size', `${stored.cpu} CPU units, ${stored.memory} MB, ${stored.networkMode}`],
      ['Roles differ', roles.executionRoleArn !== roles.taskRoleArn ? 'yes' : 'NO'],
    ],
    head: ['Setting', 'Value'],
    rows: [
      ['Image', c.image],
      ['Port', c.portMappings.map((p) => p.containerPort).join(', ')],
      ['Health check', c.healthCheck?.command?.join(' ')],
      ['Log group', c.logConfiguration?.options?.['awslogs-group']],
      ['Execution role', stored.executionRoleArn],
      ['Task role', stored.taskRoleArn],
    ],
  };
}

main(import.meta.url, run);
