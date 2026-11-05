// STEP 1: the guard first. This part changes a security group on the emulator, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import { AuthorizeSecurityGroupIngressCommand, CreateSecurityGroupCommand, CreateVpcCommand, DescribeSecurityGroupsCommand, RevokeSecurityGroupIngressCommand } from '@aws-sdk/client-ec2';
import { ec2 as makeEc2, resetEmulator } from '../../../toolkit/aws.js';
import { planDiff } from '../../../toolkit/models/plan.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 14, part 3: the drift drill';

// STEP 2: what the code says (security-group.tf): only the two app subnets may reach the database port.
export const DESIRED_CIDRS = ['10.20.0.0/22', '10.20.4.0/22'];
export const rulesFor = (cidrs) => cidrs.map((CidrIp) => ({ IpProtocol: 'tcp', FromPort: 5432, ToPort: 5432, IpRanges: [{ CidrIp }] }));

// STEP 3: make the world match the code. Provided. In the tests this stands in for `apply`: it builds the group with the SDK and resets the emulator first.
// For the real tool, apply security-group.tf with the wrapper instead and use --open and --revert (see the README).
export async function applyCode(ec2) {
  const { Vpc } = await ec2.send(new CreateVpcCommand({ CidrBlock: '10.20.0.0/16' }));
  const { GroupId } = await ec2.send(new CreateSecurityGroupCommand({ GroupName: 'daftar-db', Description: 'The Daftar database', VpcId: Vpc.VpcId }));
  await ec2.send(new AuthorizeSecurityGroupIngressCommand({ GroupId, IpPermissions: rulesFor(DESIRED_CIDRS) }));
  return GroupId;
}

// STEP 4: turn the rules the API reports into plain text attributes (your turn).
// ipPermissions is the IpPermissions list of DescribeSecurityGroups. Return a sorted list of strings like
// "tcp/5432 from 10.20.0.0/22", one per protocol, port range and address range.
export function rulesToAttrs(ipPermissions) {
  // YOUR TURN start
  // HINT: each permission has IpProtocol, FromPort, ToPort and IpRanges (a list of { CidrIp }).
  // HINT: a single port is "tcp/5432"; a range would be "tcp/5432-5440". Sort the final list.
  // YOUR TURN end
}

export const asItem = (attrs) => ({ id: 'aws_security_group.db', type: 'aws_security_group', attrs: { ingress: attrs }, dependsOn: [] });
export const desiredItem = () => asItem(rulesToAttrs(rulesFor(DESIRED_CIDRS)));

export async function readState(ec2, groupId) {
  const { SecurityGroups } = await ec2.send(new DescribeSecurityGroupsCommand({ GroupIds: [groupId] }));
  return asItem(rulesToAttrs(SecurityGroups[0].IpPermissions ?? []));
}

// STEP 5: decide what to do about a drift (your turn). Return 'revert' (put the world back to what the code says)
// or 'adopt' (change the code to match the world). The course rule: revert anything that opens a database port to the whole internet
// (0.0.0.0/0); adopt other additions only after a person agrees. For this exercise return 'adopt' for those.
export function decide(addedRules) {
  // YOUR TURN start
  // YOUR TURN end
}

export async function drill() {
  const ec2 = makeEc2();
  await resetEmulator();
  const groupId = await applyCode(ec2);
  const plan = async () => planDiff([desiredItem()], [await readState(ec2, groupId)]);
  const before = await plan();
  // Someone opens the database port to everybody, by hand, outside the code.
  await ec2.send(new AuthorizeSecurityGroupIngressCommand({ GroupId: groupId, IpPermissions: rulesFor(['0.0.0.0/0']) }));
  const drifted = await plan();
  const state = await readState(ec2, groupId);
  const added = state.attrs.ingress.filter((r) => !desiredItem().attrs.ingress.includes(r));
  const decision = decide(added);
  if (decision === 'revert') await ec2.send(new RevokeSecurityGroupIngressCommand({ GroupId: groupId, IpPermissions: rulesFor(['0.0.0.0/0']) }));
  const after = await plan();
  return { before, drifted, added, decision, after };
}

// The real-tool path. First you apply security-group.tf with the wrapper, so OpenTofu creates the group and keeps it in its state.
// These two modes change that group by hand and put it back. They never reset the emulator, because that would delete the group.
export async function findToolGroup(ec2) {
  const { SecurityGroups } = await ec2.send(new DescribeSecurityGroupsCommand({ Filters: [{ Name: 'group-name', Values: ['daftar-db'] }] }));
  return SecurityGroups[0]?.GroupId ?? null;
}

async function toolGroupOrStop(ec2) {
  const groupId = await findToolGroup(ec2);
  if (!groupId) throw new Error('No security group named daftar-db. Run "node ../../../toolkit/tofu.js apply" in this folder first, so OpenTofu creates it.');
  return groupId;
}

export async function openByHand() {
  const ec2 = makeEc2();
  const groupId = await toolGroupOrStop(ec2);
  const before = await planDiff([desiredItem()], [await readState(ec2, groupId)]);
  try {
    await ec2.send(new AuthorizeSecurityGroupIngressCommand({ GroupId: groupId, IpPermissions: rulesFor(['0.0.0.0/0']) }));
  } catch (error) {
    if (error.name !== 'InvalidPermission.Duplicate') throw error;
  }
  const state = await readState(ec2, groupId);
  const drifted = planDiff([desiredItem()], [state]);
  const added = state.attrs.ingress.filter((r) => !desiredItem().attrs.ingress.includes(r));
  return { groupId, before, drifted, added, decision: decide(added) };
}

export async function revertByHand() {
  const ec2 = makeEc2();
  const groupId = await toolGroupOrStop(ec2);
  try {
    await ec2.send(new RevokeSecurityGroupIngressCommand({ GroupId: groupId, IpPermissions: rulesFor(['0.0.0.0/0']) }));
  } catch (error) {
    if (error.name !== 'InvalidPermission.NotFound') throw error;
  }
  return { groupId, after: planDiff([desiredItem()], [await readState(ec2, groupId)]) };
}

export async function run() {
  if (process.argv.includes('--open')) {
    const d = await openByHand();
    return {
      facts: [
        ['Group changed (created by OpenTofu)', d.groupId],
        ['Course model plan before the change', d.before.line],
        ['Course model plan now', d.drifted.line],
        ['The new rule', d.added.join(', ')],
        ['Decision', d.decision],
        ['Next', 'run "node ../../../toolkit/tofu.js plan" now, then run this script again with --revert'],
      ],
    };
  }
  if (process.argv.includes('--revert')) {
    const d = await revertByHand();
    return {
      facts: [
        ['Group put back (created by OpenTofu)', d.groupId],
        ['Course model plan now', d.after.line],
        ['Next', 'run "node ../../../toolkit/tofu.js plan" again and compare'],
      ],
    };
  }
  const d = await drill();
  return {
    facts: [
      ['Plan before the change', d.before.line],
      ['Plan after someone opened the port by hand', d.drifted.line],
      ['What changed', `${d.drifted.steps[0].id}: ${d.drifted.steps[0].changed.join(', ')}; the new rule is ${d.added.join(', ')}`],
      ['Decision', d.decision],
      ['Plan after the decision', d.after.line],
      ['Real tofu plan lines', 'No changes, then Plan: 0 to add, 1 to change, 0 to destroy. after the hand change, then No changes after the revert'],
    ],
    head: ['Moment', 'Plan line (course model)'],
    rows: [['code and world agree', d.before.line], ['port opened to 0.0.0.0/0', d.drifted.line], [`after "${d.decision}"`, d.after.line]],
    chart: {
      title: 'Resources the plan wants to change',
      unit: 'resources',
      bars: [{ label: 'before', value: d.before.counts.update }, { label: 'after the drift', value: d.drifted.counts.update }, { label: 'after the decision', value: d.after.counts.update }],
    },
  };
}

main(import.meta.url, run);
