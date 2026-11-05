import './guard-offline.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasVariable, parseResources } from './hcl.js';

const sample = `
variable "region" { default = "us-east-1" }
# resource "aws_ignored" "me" { }
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "x" }
}
resource "aws_subnet" "a" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.0.0/24"
}
`;

test('finds the resources and their simple attributes', () => {
  const r = parseResources(sample);
  assert.deepEqual(r.map((x) => x.id), ['aws_vpc.main', 'aws_subnet.a']);
  assert.equal(r[0].attrs.cidr_block, '10.0.0.0/16');
});
test('finds the references between resources', () => {
  assert.deepEqual(parseResources(sample)[1].dependsOn, ['aws_vpc.main']);
});
test('ignores commented resources', () => assert.ok(!parseResources(sample).some((x) => x.id === 'aws_ignored.me')));
test('finds variables', () => {
  assert.equal(hasVariable(sample, 'region'), true);
  assert.equal(hasVariable(sample, 'nope'), false);
});
