// Writes the ten broken networks into the three part folders (configs.json in each).
// Every one starts as the healthy Daftar network and has exactly one thing wrong.
//   node challenges/challenge-5-broken-networks/make-configs.mjs
import '../../toolkit/guard-offline.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exampleNetwork } from '../../toolkit/models/example-network.js';
import { checkPath } from '../../toolkit/models/reach.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const broken = (id, story, probe, expect, mutate) => {
  const network = exampleNetwork();
  mutate(network);
  return { id, story, probe, expect, network };
};

export const sets = {
  'part-1-security-groups': [
    broken('sg-wrong-port', 'After a deploy the load balancer says every app target is unhealthy.',
      { from: 'alb', to: 'app', port: 8080 }, { code: 'sg-ingress-denied', where: 'sg-app' },
      (n) => { n.securityGroups['sg-app'].ingress[0].from = 8000; n.securityGroups['sg-app'].ingress[0].to = 8000; }),
    broken('sg-wrong-source', 'The app cannot connect to the database. The database group was copied from another project.',
      { from: 'app', to: 'db', port: 5432 }, { code: 'sg-ingress-denied', where: 'sg-db' },
      (n) => { n.securityGroups['sg-db'].ingress[0].peer = 'sg-alb'; }),
    broken('sg-egress-missing', 'A security review removed "unneeded" outbound rules from the app group. Now it cannot reach the database.',
      { from: 'app', to: 'db', port: 5432 }, { code: 'sg-egress-denied', where: 'sg-app' },
      (n) => { n.securityGroups['sg-app'].egress = n.securityGroups['sg-app'].egress.filter((r) => r.from !== 5432); }),
    broken('sg-https-closed', 'Customers outside the office cannot open Daftar. Colleagues on the office network can.',
      { from: 'internet:198.51.100.7', to: 'alb', port: 443 }, { code: 'sg-ingress-denied', where: 'sg-alb' },
      (n) => { n.securityGroups['sg-alb'].ingress[0].peer = '10.0.0.0/8'; }),
  ],
  'part-2-routes': [
    broken('route-blackhole', 'Someone deleted the NAT gateway to save money. The app cannot download updates or call the payment service.',
      { from: 'app', to: 'internet:203.0.113.20', port: 443 }, { code: 'blackhole', where: 'rt-app' },
      (n) => { n.routeTables['rt-app'].find((r) => r.destination === '0.0.0.0/0').target = 'blackhole'; }),
    broken('route-missing-default', 'A change to the public route table removed one line. The site is down for everyone.',
      { from: 'internet:198.51.100.7', to: 'alb', port: 443 }, { code: 'no-route', where: 'rt-public' },
      (n) => { n.routeTables['rt-public'] = n.routeTables['rt-public'].filter((r) => r.destination !== '0.0.0.0/0'); }),
    broken('route-wrong-table', 'A new app subnet in zone a was tied to the wrong route table. Servers there cannot reach the internet. Zone b is fine.',
      { from: 'app', to: 'internet:203.0.113.20', port: 443 }, { code: 'no-route', where: 'rt-data' },
      (n) => { n.subnets['app-a'].routeTable = 'rt-data'; }),
  ],
  'part-3-gateways-and-nacls': [
    broken('nat-in-private-subnet', 'The NAT gateway exists and the route to it is right, but the app still has no internet.',
      { from: 'app', to: 'internet:203.0.113.20', port: 443 }, { code: 'nat-not-public', where: 'app-a' },
      (n) => { n.natGateways['nat-a'].subnet = 'app-a'; }),
    broken('no-public-address', 'The load balancer was recreated. Its security group and routes are right, but nobody outside can reach it.',
      { from: 'internet:198.51.100.7', to: 'alb', port: 443 }, { code: 'no-public-ip', where: 'alb' },
      (n) => { delete n.instances.alb.publicIp; }),
    broken('nacl-no-reply', 'A network ACL was added to the public subnet "for safety". Requests arrive, but customers never get an answer.',
      { from: 'internet:198.51.100.7', to: 'alb', port: 443 }, { code: 'nacl-return-denied', where: 'nacl-public' },
      (n) => {
        n.nacls['nacl-public'] = {
          inbound: [
            { rule: 100, action: 'allow', protocol: 'tcp', from: 443, to: 443, cidr: '0.0.0.0/0' },
            { rule: 110, action: 'allow', protocol: 'tcp', from: 1024, to: 65535, cidr: '0.0.0.0/0' },
          ],
          outbound: [{ rule: 100, action: 'allow', protocol: 'tcp', from: 80, to: 80, cidr: '0.0.0.0/0' }],
        };
        n.subnets['public-a'].nacl = 'nacl-public';
      }),
  ],
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [folder, configs] of Object.entries(sets)) {
    for (const c of configs) {
      const result = checkPath(c.network, c.probe);
      if (result.reachable || result.fault.code !== c.expect.code || result.fault.where !== c.expect.where) {
        throw new Error(`${c.id}: the model says ${result.reachable ? 'reachable' : `${result.fault.code} at ${result.fault.where}`}`);
      }
    }
    fs.writeFileSync(path.join(here, folder, 'configs.json'), JSON.stringify({ set: folder, configs }, null, 2) + '\n');
    console.log(`wrote ${folder}/configs.json (${configs.length} configurations)`);
  }
}
