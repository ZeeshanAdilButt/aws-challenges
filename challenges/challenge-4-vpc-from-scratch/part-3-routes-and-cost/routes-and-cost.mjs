// STEP 1: the guard first. The network is built on the emulator, then judged by the reachability model.
import '../../../toolkit/guard.js';
import { ec2 as makeEc2, resetEmulator } from '../../../toolkit/aws.js';
import { exampleNetwork } from '../../../toolkit/models/example-network.js';
import { checkPath } from '../../../toolkit/models/reach.js';
import { HOURS_PER_MONTH, PRICES, PRICE_DATE } from '../../../toolkit/prices.js';
import { main } from '../../../toolkit/part.js';
import { buildVpc, describeNetwork } from '../part-2-build-vpc/build-vpc.mjs';

export const title = 'Challenge 4, part 3: test the routes and price the NAT gateways';

// STEP 2: build the VPC on the emulator, read it back, and add the servers and security groups.
// The settings come from the emulator; the servers and groups come from the example network, because the
// emulator cannot show what a security group lets through. Provided.
export async function networkFromEmulator() {
  const ec2 = makeEc2();
  await resetEmulator();
  const built = await buildVpc(ec2);
  const network = await describeNetwork(ec2, built.vpcId);
  const example = exampleNetwork();
  return { ...network, securityGroups: example.securityGroups, instances: example.instances };
}

// STEP 3: the paths that must work and the paths that must not (your turn).
// Each probe: { from, to, port, expect } where expect is 'ok' or the fault code the model should report.
// Use the names alb, app and db, and 'internet:<address>' for the outside world. Cover at least six paths, both kinds.
export const probes = [
  // YOUR TURN start
  // HINT: the model's fault codes: sg-egress-denied, sg-ingress-denied, no-route, no-public-ip, blackhole, no-igw, nat-missing, nat-not-public.
  // HINT: think about who may talk to whom: internet to alb, alb to app, app to db, app to the internet, db to the internet, internet to app.
  // YOUR TURN end
];

export function runProbes(network, list = probes) {
  return list.map((p) => {
    const result = checkPath(network, { from: p.from, to: p.to, port: p.port });
    const got = result.reachable ? 'ok' : result.fault.code;
    return { ...p, got, match: got === p.expect };
  });
}

// STEP 4: what NAT gateways cost for one month (your turn).
//   gateways       how many NAT gateways (1, or 2 for one per zone)
//   gbPerMonth     data the private subnets send out through NAT
//   crossZoneShare the share of that data that must cross to another zone to reach a NAT gateway
// Returns { gatewayFees, processing, crossZone, total } in dollars, each rounded to cents.
// Prices come from toolkit/prices.js: per hour per gateway, per GB processed, and per GB each way between zones.
export function natMonthlyCost({ gateways, gbPerMonth, crossZoneShare = 0 }) {
  // YOUR TURN start
  // HINT: gatewayFees = gateways * HOURS_PER_MONTH * hourly price. processing = GB * processing price.
  // HINT: data that crosses zones is charged on the way out and on the way in, so use the per-GB price twice.
  // YOUR TURN end
}

// One NAT gateway in zone a: half of the app servers (zone b) cross to reach it. One per zone: none cross.
export const oneNat = (gb) => natMonthlyCost({ gateways: 1, gbPerMonth: gb, crossZoneShare: 0.5 });
export const perZoneNat = (gb) => natMonthlyCost({ gateways: 2, gbPerMonth: gb, crossZoneShare: 0 });

// The monthly traffic at which a second NAT gateway pays for itself: its fee divided by what it saves per GB.
export function breakEvenGb() {
  const fee = HOURS_PER_MONTH * PRICES.natGatewayPerHour.value;
  const savedPerGb = 0.5 * PRICES.interZonePerGbEachWay.value * 2;
  return Math.round(fee / savedPerGb);
}

export async function run() {
  const network = await networkFromEmulator();
  const results = runProbes(network);
  const volumes = [100, 1000, 5000];
  const rows = volumes.map((gb) => [`${gb} GB`, `${oneNat(gb).total.toFixed(2)}`, `${perZoneNat(gb).total.toFixed(2)}`, (perZoneNat(gb).total - oneNat(gb).total).toFixed(2)]);
  return {
    facts: [
      ['Paths tested', `${results.length}, all as expected: ${results.every((r) => r.match) ? 'yes' : 'NO'}`],
      ['One NAT gateway, fee only', `${oneNat(0).total.toFixed(2)} dollars a month`],
      ['Two NAT gateways, fee only', `${perZoneNat(0).total.toFixed(2)} dollars a month`],
      ['A second gateway pays for itself above', `${breakEvenGb()} GB a month`],
      ['Prices', `us-east-1, read ${PRICE_DATE}; the zone-crossing price is ${PRICES.interZonePerGbEachWay.tag}`],
    ],
    head: ['Path', 'Port', 'Expected', 'Model says', 'Match?'],
    rows: results.map((r) => [`${r.from} to ${r.to}`, r.port, r.expect, r.got, r.match ? 'yes' : 'NO']),
    extra: { head: ['Traffic per month', 'One NAT (dollars)', 'One per zone (dollars)', 'Difference'], rows },
    chart: {
      title: 'NAT cost per month in dollars: one gateway or one per zone',
      unit: 'dollars',
      format: (v) => v.toFixed(2),
      bars: volumes.flatMap((gb) => [
        { label: `${gb} GB, one NAT`, value: oneNat(gb).total },
        { label: `${gb} GB, one per zone`, value: perZoneNat(gb).total },
      ]),
    },
  };
}

main(import.meta.url, run);
