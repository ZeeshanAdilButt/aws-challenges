// STEP 1: the guard first. This part creates network resources, so it must only ever touch the emulator.
import '../../../toolkit/guard.js';
import {
  AllocateAddressCommand, AssociateRouteTableCommand, AttachInternetGatewayCommand, CreateInternetGatewayCommand, CreateNatGatewayCommand,
  CreateRouteCommand, CreateRouteTableCommand, CreateSubnetCommand, CreateVpcCommand, DescribeInternetGatewaysCommand, DescribeNatGatewaysCommand,
  DescribeRouteTablesCommand, DescribeSubnetsCommand,
} from '@aws-sdk/client-ec2';
import { ec2 as makeEc2, resetEmulator } from '../../../toolkit/aws.js';
import { main } from '../../../toolkit/part.js';

export const title = 'Challenge 4, part 2: build the VPC on the emulator';

export const VPC_CIDR = '10.20.0.0/16';
// The result of part 1, written out so this part stands on its own.
export const PLAN = [
  { name: 'app-a', zone: 'a', cidr: '10.20.0.0/22' },
  { name: 'app-b', zone: 'b', cidr: '10.20.4.0/22' },
  { name: 'public-a', zone: 'a', cidr: '10.20.8.0/24' },
  { name: 'public-b', zone: 'b', cidr: '10.20.9.0/24' },
  { name: 'data-a', zone: 'a', cidr: '10.20.10.0/26' },
  { name: 'data-b', zone: 'b', cidr: '10.20.10.64/26' },
];

const named = (ResourceType, Name) => [{ ResourceType, Tags: [{ Key: 'Name', Value: Name }] }];
const layer = (subnetName) => subnetName.split('-')[0]; // public, app or data

// STEP 2: the VPC, the subnets and the internet gateway. Provided.
async function buildBase(ec2, plan) {
  const { Vpc } = await ec2.send(new CreateVpcCommand({ CidrBlock: VPC_CIDR, TagSpecifications: named('vpc', 'daftar') }));
  const subnets = {};
  for (const p of plan) {
    const { Subnet } = await ec2.send(new CreateSubnetCommand({ VpcId: Vpc.VpcId, CidrBlock: p.cidr, AvailabilityZone: `us-east-1${p.zone}`, TagSpecifications: named('subnet', p.name) }));
    subnets[p.name] = Subnet.SubnetId;
  }
  const { InternetGateway } = await ec2.send(new CreateInternetGatewayCommand({ TagSpecifications: named('internet-gateway', 'daftar-igw') }));
  await ec2.send(new AttachInternetGatewayCommand({ InternetGatewayId: InternetGateway.InternetGatewayId, VpcId: Vpc.VpcId }));
  return { vpcId: Vpc.VpcId, subnets, igwId: InternetGateway.InternetGatewayId };
}

// STEP 3: route tables and the NAT gateway (your turn).
//   rt-public : 0.0.0.0/0 to the internet gateway, used by the public subnets
//   rt-app    : 0.0.0.0/0 to a NAT gateway that sits in public-a, used by the app subnets
//   rt-data   : no internet route at all, used by the data subnets (provided)
// Return { natId, tables: { 'rt-public': id, 'rt-app': id, 'rt-data': id } }.
async function buildRouting(ec2, { vpcId, subnets, igwId }) {
  const table = async (name) => (await ec2.send(new CreateRouteTableCommand({ VpcId: vpcId, TagSpecifications: named('route-table', name) }))).RouteTable.RouteTableId;
  const attach = (tableId, layerName) => Promise.all(
    Object.entries(subnets).filter(([name]) => layer(name) === layerName).map(([, SubnetId]) => ec2.send(new AssociateRouteTableCommand({ RouteTableId: tableId, SubnetId }))),
  );
  let publicTable;
  let appTable;
  let NatGateway;
  // YOUR TURN start
  // HINT: a route needs a target: CreateRouteCommand({ RouteTableId, DestinationCidrBlock, GatewayId }) for the internet gateway,
  // HINT: CreateRouteCommand({ ..., NatGatewayId }) for a NAT gateway. AssociateRouteTableCommand ties a table to a subnet.
  // HINT: a NAT gateway needs an Elastic IP first: AllocateAddressCommand({ Domain: 'vpc' }), then
  // HINT: CreateNatGatewayCommand({ SubnetId: <public-a>, AllocationId }).
  // YOUR TURN end
  const dataTable = await table('rt-data');
  await attach(dataTable, 'data');
  return { natId: NatGateway?.NatGatewayId, tables: { 'rt-public': publicTable, 'rt-app': appTable, 'rt-data': dataTable } };
}

export async function buildVpc(ec2, plan = PLAN) {
  const base = await buildBase(ec2, plan);
  const routing = await buildRouting(ec2, base);
  return { ...base, ...routing };
}

const tagName = (resource) => resource.Tags?.find((t) => t.Key === 'Name')?.Value;

// STEP 4: read the VPC back and turn it into the plain network shape the reachability model understands.
// The emulator keeps these settings. It does not move packets. The model, not the emulator, says what can reach what.
export async function describeNetwork(ec2, vpcId) {
  const filter = [{ Name: 'vpc-id', Values: [vpcId] }];
  const { Subnets } = await ec2.send(new DescribeSubnetsCommand({ Filters: filter }));
  const { RouteTables } = await ec2.send(new DescribeRouteTablesCommand({ Filters: filter }));
  const { InternetGateways } = await ec2.send(new DescribeInternetGatewaysCommand({ Filters: [{ Name: 'attachment.vpc-id', Values: [vpcId] }] }));
  const { NatGateways } = await ec2.send(new DescribeNatGatewaysCommand({ Filter: filter }));

  const subnetName = Object.fromEntries(Subnets.map((s) => [s.SubnetId, tagName(s)]));
  const natName = Object.fromEntries(NatGateways.map((n) => [n.NatGatewayId, `nat-${subnetName[n.SubnetId].split('-')[1]}`]));
  const tables = RouteTables.filter((t) => tagName(t)); // the unnamed one is the VPC's automatic main table
  const tableOf = {};
  for (const t of tables) for (const a of t.Associations ?? []) if (a.SubnetId) tableOf[a.SubnetId] = tagName(t);

  const prefix = (cidr) => Number(cidr.split('/')[1]);
  const target = (r) => (r.GatewayId === 'local' ? 'local' : r.GatewayId?.startsWith('igw-') ? 'igw' : r.NatGatewayId ? `nat:${natName[r.NatGatewayId]}` : 'blackhole');
  return {
    name: 'daftar',
    cidr: VPC_CIDR,
    internetGateway: InternetGateways.length > 0,
    natGateways: Object.fromEntries(NatGateways.map((n) => [natName[n.NatGatewayId], { subnet: subnetName[n.SubnetId] }])),
    subnets: Object.fromEntries(Subnets.map((s) => [tagName(s), { cidr: s.CidrBlock, routeTable: tableOf[s.SubnetId] }])),
    routeTables: Object.fromEntries(tables.map((t) => [
      tagName(t),
      t.Routes.map((r) => ({ destination: r.DestinationCidrBlock, target: target(r) })).sort((a, b) => prefix(b.destination) - prefix(a.destination)),
    ])),
    securityGroups: {},
    nacls: {},
    instances: {},
  };
}

export async function run() {
  const ec2 = makeEc2();
  await resetEmulator();
  const built = await buildVpc(ec2);
  const network = await describeNetwork(ec2, built.vpcId);
  const rows = [];
  for (const [name, subnet] of Object.entries(network.subnets).sort((a, b) => a[1].cidr.localeCompare(b[1].cidr, 'en', { numeric: true }))) {
    const routes = network.routeTables[subnet.routeTable].map((r) => `${r.destination} to ${r.target}`).join('; ');
    rows.push([name, subnet.cidr, subnet.routeTable, routes]);
  }
  return {
    facts: [
      ['VPC', `${network.name} ${network.cidr}`],
      ['Internet gateway attached', network.internetGateway ? 'yes' : 'no'],
      ['NAT gateways', Object.entries(network.natGateways).map(([n, g]) => `${n} in ${g.subnet}`).join(', ')],
    ],
    head: ['Subnet', 'Block', 'Route table', 'Routes'],
    rows,
  };
}

main(import.meta.url, run);
