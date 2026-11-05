// The Daftar network from challenge 4, as data for the reachability model.
// One VPC, two zones (a and b), three layers: public (load balancer, NAT), app, data.
// Every challenge that needs a healthy network starts from a copy of this one.
export function exampleNetwork() {
  return {
    name: 'daftar',
    cidr: '10.20.0.0/16',
    internetGateway: true,
    natGateways: { 'nat-a': { subnet: 'public-a' } },
    subnets: {
      'app-a': { cidr: '10.20.0.0/22', routeTable: 'rt-app' },
      'app-b': { cidr: '10.20.4.0/22', routeTable: 'rt-app' },
      'public-a': { cidr: '10.20.8.0/24', routeTable: 'rt-public' },
      'public-b': { cidr: '10.20.9.0/24', routeTable: 'rt-public' },
      'data-a': { cidr: '10.20.10.0/26', routeTable: 'rt-data' },
      'data-b': { cidr: '10.20.10.64/26', routeTable: 'rt-data' },
    },
    routeTables: {
      'rt-public': [
        { destination: '10.20.0.0/16', target: 'local' },
        { destination: '0.0.0.0/0', target: 'igw' },
      ],
      'rt-app': [
        { destination: '10.20.0.0/16', target: 'local' },
        { destination: '0.0.0.0/0', target: 'nat:nat-a' },
      ],
      'rt-data': [{ destination: '10.20.0.0/16', target: 'local' }],
    },
    securityGroups: {
      'sg-alb': {
        ingress: [{ protocol: 'tcp', from: 443, to: 443, peer: '0.0.0.0/0' }],
        egress: [{ protocol: 'tcp', from: 8080, to: 8080, peer: 'sg-app' }],
      },
      'sg-app': {
        ingress: [{ protocol: 'tcp', from: 8080, to: 8080, peer: 'sg-alb' }],
        egress: [
          { protocol: 'tcp', from: 5432, to: 5432, peer: 'sg-db' },
          { protocol: 'tcp', from: 443, to: 443, peer: '0.0.0.0/0' },
        ],
      },
      'sg-db': {
        ingress: [{ protocol: 'tcp', from: 5432, to: 5432, peer: 'sg-app' }],
        egress: [],
      },
    },
    nacls: {},
    instances: {
      alb: { subnet: 'public-a', ip: '10.20.8.10', publicIp: '54.0.2.10', securityGroups: ['sg-alb'] },
      app: { subnet: 'app-a', ip: '10.20.0.10', securityGroups: ['sg-app'] },
      db: { subnet: 'data-a', ip: '10.20.10.10', securityGroups: ['sg-db'] },
    },
  };
}
