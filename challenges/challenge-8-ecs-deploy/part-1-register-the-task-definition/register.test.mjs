import '../../../toolkit/guard.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ecs as makeEcs, iam as makeIam, resetEmulator } from '../../../toolkit/aws.js';
import { IMAGE, registerAndRead } from './register.mjs';

await resetEmulator();
const { roles, stored } = await registerAndRead(makeEcs(), makeIam());
const container = stored.containerDefinitions[0];

test('the task definition is for the daftar-api family on Fargate', () => {
  assert.equal(stored.family, 'daftar-api');
  assert.ok(stored.requiresCompatibilities.includes('FARGATE'));
  assert.equal(stored.networkMode, 'awsvpc');
});

test('the execution role and the task role are two different roles', () => {
  assert.ok(roles.executionRoleArn && roles.taskRoleArn);
  assert.notEqual(stored.executionRoleArn, stored.taskRoleArn);
  assert.match(stored.executionRoleArn, /daftar-api-execution/);
  assert.match(stored.taskRoleArn, /daftar-api-task/);
});

test('one essential container with the image and port 8080', () => {
  assert.equal(stored.containerDefinitions.length, 1);
  assert.equal(container.image, IMAGE);
  assert.equal(container.essential, true);
  assert.deepEqual(container.portMappings.map((p) => p.containerPort), [8080]);
});

test('the health check calls /health on the same port', () => {
  assert.ok(container.healthCheck, 'add a health check');
  assert.match(container.healthCheck.command.join(' '), /localhost:8080\/health/);
  assert.equal(container.healthCheck.retries, 3);
});

test('logs go to CloudWatch Logs with the awslogs driver', () => {
  assert.equal(container.logConfiguration.logDriver, 'awslogs');
  assert.equal(container.logConfiguration.options['awslogs-group'], '/daftar/api');
  assert.equal(container.logConfiguration.options['awslogs-stream-prefix'], 'api');
});

test('the size is 0.5 vCPU and 1 GB', () => {
  assert.equal(stored.cpu, '512');
  assert.equal(stored.memory, '1024');
});
