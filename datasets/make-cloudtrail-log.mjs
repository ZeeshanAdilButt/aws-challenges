// Generates datasets/cloudtrail-leaked-key.jsonl: a week of CloudTrail-style events for Daftar's account,
// with one leaked access key (the CI deploy user's) used by a stranger for a few hours.
// Seeded, so the file is the same on every run:  node datasets/make-cloudtrail-log.mjs
// Also writes cloudtrail-leaked-key.facts.json: what was injected, counted here, used by the tests.
// All names, keys and addresses are made up. The addresses are from the ranges reserved for documentation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng } from '../toolkit/random.js';

export const SEED = 7;
export const LEAKED_KEY = 'AKIADAFTARLEAK000001';
export const CI_IP = '198.51.100.10';
export const STRANGER_IP = '192.0.2.77';
const here = path.dirname(fileURLToPath(import.meta.url));

export function generate() {
  const random = rng(SEED);
  const events = [];
  const at = (iso, plusSeconds) => new Date(Date.parse(iso) + plusSeconds * 1000).toISOString();

  const add = ({ time, source, name, region = 'us-east-1', ip, agent, who, params = {}, error, response, readOnly }) => {
    events.push({
      eventVersion: '1.09',
      eventTime: time,
      eventSource: `${source}.amazonaws.com`,
      eventName: name,
      awsRegion: region,
      sourceIPAddress: ip,
      userAgent: agent,
      userIdentity: who,
      readOnly: readOnly ?? /^(Get|List|Describe)/.test(name),
      requestParameters: params,
      ...(response ? { responseElements: response } : {}),
      ...(error ? { errorCode: error } : {}),
    });
  };

  const person = (userName, accessKeyId) => ({ type: 'IAMUser', userName, accessKeyId });
  const weekStart = '2026-10-15T00:00:00Z';
  const anyTime = () => at(weekStart, random.int(0, 7 * 86400 - 1));

  // Normal life: three people and a service, a week long.
  const asif = person('asif', 'AKIADAFTARASIF000001');
  const aqib = person('aqib', 'AKIADAFTARAQIB000001');
  for (let i = 0; i < 160; i++) {
    const name = random.pick(['ListBuckets', 'GetObject', 'DescribeInstances', 'GetObject', 'PutObject']);
    const s3 = name.endsWith('Object') || name === 'ListBuckets';
    add({ time: anyTime(), source: s3 ? 's3' : 'ec2', name, ip: '203.0.113.25', agent: 'aws-cli/2.17.0 Linux', who: asif, params: s3 && name !== 'ListBuckets' ? { bucketName: 'daftar-notes-prod', key: `notes/${random.int(1, 40)}` } : {} });
  }
  for (let i = 0; i < 90; i++) {
    const name = random.pick(['GetObject', 'ListObjectsV2', 'GetObject']);
    add({ time: anyTime(), source: 's3', name, ip: '203.0.113.40', agent: 'aws-sdk-js/3.600.0', who: aqib, params: { bucketName: 'daftar-notes-prod', key: `notes/${random.int(1, 40)}` } });
  }
  for (let i = 0; i < 300; i++) {
    const name = random.pick(['GetObject', 'GetObject', 'PutObject', 'SendMessage']);
    const sqs = name === 'SendMessage';
    const session = random.int(1, 9); // each session key stays on one task address
    add({
      time: anyTime(), source: sqs ? 'sqs' : 's3', name, ip: `10.20.${session % 4}.${10 + session}`, agent: 'aws-sdk-js/3.600.0',
      who: { type: 'AssumedRole', userName: 'daftar-api', accessKeyId: `ASIADAFTARAPI${String(session).padStart(7, '0')}` },
      params: sqs ? { queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/daftar-jobs' } : { bucketName: 'daftar-notes-prod', key: `notes/${random.int(1, 40)}` },
    });
  }

  // The CI deploy user, using its own key from the CI server, the whole week (this key is the one that leaks).
  const ci = person('ci-deploy', LEAKED_KEY);
  for (let i = 0; i < 180; i++) {
    const [source, name, params] = random.pick([
      ['ecr', 'GetAuthorizationToken', {}],
      ['s3', 'PutObject', { bucketName: 'daftar-releases', key: `builds/${random.int(100, 160)}.tar` }],
      ['ecs', 'UpdateService', { service: 'daftar-api' }],
      ['ecs', 'DescribeServices', { services: ['daftar-api'] }],
    ]);
    add({ time: anyTime(), source, name, ip: CI_IP, agent: 'aws-sdk-js/3.600.0', who: ci, params });
  }

  // The leak: from 2026-10-19 02:14 UTC a stranger uses the same key.
  const stranger = (clock, source, name, extra = {}) =>
    add({ time: at('2026-10-19T02:14:07Z', clock), source, name, ip: STRANGER_IP, agent: 'python-requests/2.31 Boto3/1.34', who: ci, ...extra });
  let t = 0;
  const tick = () => (t += random.int(8, 150));
  stranger(0, 'sts', 'GetCallerIdentity');
  stranger(tick(), 's3', 'ListBuckets');
  stranger(tick(), 'iam', 'ListUsers', { error: 'AccessDenied' });
  stranger(tick(), 'iam', 'GetAccountSummary', { error: 'AccessDenied' });
  stranger(tick(), 'ec2', 'DescribeInstances');
  for (let i = 0; i < 3; i++) stranger(tick(), 's3', 'ListObjectsV2', { params: { bucketName: 'daftar-notes-prod' } });
  for (let i = 0; i < 2; i++) stranger(tick(), 's3', 'ListObjectsV2', { params: { bucketName: 'daftar-billing' }, error: 'AccessDenied' });
  for (let n = 1; n <= 120; n++) stranger(tick(), 's3', 'GetObject', { params: { bucketName: 'daftar-notes-prod', key: `notes/${n}` } });
  for (let n = 1; n <= 6; n++) stranger(tick(), 's3', 'GetObject', { params: { bucketName: 'daftar-billing', key: `invoices/${n}.pdf` }, error: 'AccessDenied' });
  for (let i = 0; i < 2; i++) stranger(tick(), 'iam', 'CreateUser', { params: { userName: 'backup-svc' }, error: 'AccessDenied' });
  stranger(tick(), 'iam', 'CreateAccessKey', { params: { userName: 'backup-svc' }, error: 'AccessDenied' });
  for (let i = 1; i <= 4; i++) {
    stranger(tick(), 'ec2', 'RunInstances', { region: 'ap-southeast-1', params: { instanceType: 'c5.18xlarge', minCount: 1 }, response: { instances: [`i-0leak00000000000${i}`] } });
  }
  for (let i = 0; i < 3; i++) stranger(tick(), 'ec2', 'RunInstances', { params: { instanceType: 'c5.18xlarge', minCount: 1 }, error: 'VcpuLimitExceeded' });
  for (let i = 0; i < 10; i++) stranger(tick(), 'ec2', 'DescribeInstances', { region: 'ap-southeast-1' });

  events.sort((a, b) => a.eventTime.localeCompare(b.eventTime));
  return events;
}

// Counted straight from the events that were injected, so the tests have an answer that is not the learner's code.
export function facts(events) {
  const mine = events.filter((e) => e.userIdentity.accessKeyId === LEAKED_KEY && e.sourceIPAddress === STRANGER_IP);
  const times = mine.map((e) => e.eventTime).sort();
  const ok = mine.filter((e) => !e.errorCode);
  return {
    leakedKey: LEAKED_KEY,
    owner: 'ci-deploy',
    trustedIps: [CI_IP],
    totalEventsInLog: events.length,
    eventsWithTheKey: events.filter((e) => e.userIdentity.accessKeyId === LEAKED_KEY).length,
    suspect: {
      calls: mine.length,
      failed: mine.length - ok.length,
      firstSeen: times[0],
      lastSeen: times.at(-1),
      sourceIps: [STRANGER_IP],
      regions: [...new Set(mine.map((e) => e.awsRegion))].sort(),
      objectsRead: new Set(ok.filter((e) => e.eventName === 'GetObject').map((e) => `${e.requestParameters.bucketName}/${e.requestParameters.key}`)).size,
      instancesLaunched: ok.filter((e) => e.eventName === 'RunInstances').flatMap((e) => e.responseElements.instances).length,
      writes: [...new Set(ok.filter((e) => !e.readOnly).map((e) => e.eventName))].sort(),
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const events = generate();
  fs.writeFileSync(path.join(here, 'cloudtrail-leaked-key.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  fs.writeFileSync(path.join(here, 'cloudtrail-leaked-key.facts.json'), JSON.stringify(facts(events), null, 2) + '\n');
  console.log(`wrote ${events.length} events`);
}
