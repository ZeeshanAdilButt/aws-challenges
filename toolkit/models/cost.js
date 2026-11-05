// The monthly cost of the Daftar platform at a given traffic level (requests a second, all month).
// Unit prices: us-east-1, dollars, read 2026-10-24 (dossier appendices 01b and 01d). Source ids in comments.
// The traffic assumptions are the course's own and are stated in ASSUMPTIONS. They are not AWS numbers.
export const PRICE_DATE = '2026-10-24';
export const HOURS = 730;
export const SECONDS_PER_MONTH = HOURS * 3600;

export const UNIT = {
  fargateVcpuHour: 0.04048, // P6, VERIFIED (Linux x86)
  fargateGbHour: 0.004445, // P6, VERIFIED
  albHour: 0.0225, // P9, VERIFIED
  lcuHour: 0.008, // P9, VERIFIED
  natHour: 0.045, // P15, VERIFIED (tool-read)
  natGb: 0.045, // P15, VERIFIED (tool-read)
  logsIngestGb: 0.5, // P7, VERIFIED
  sqsMillionRequests: 0.4, // D4, VERIFIED (standard queue)
  dynamoWriteMillion: 0.625, // P10, VERIFIED (on-demand)
  dynamoReadMillion: 0.125, // P10, VERIFIED (on-demand)
  s3PutThousand: 0.005, // P11, VERIFIED
  rdsT4gMediumHour: 0.065, // P22, UNVERIFIED (Oregon price-feed branch; us-east-1 not confirmed)
};

export const ASSUMPTIONS = {
  rpsPerTask: 50, // one task (0.5 vCPU, 1 GB) answers 50 requests a second
  taskVcpu: 0.5,
  taskGb: 1,
  minTasks: 2, // one per zone
  requestsPerLcu: 100, // not sourced: the LCU rules are not in the course notes
  logKbPerRequest: 1, // log lines written per request
  natGateways: 1, // the part 1 code builds one NAT gateway, in one zone
  natKbPerRequest: 2, // average bytes through NAT per request (one request in ten calls an outside service for about 20 KB)
  queueShare: 0.1, // one request in ten sends a job to the queue (send, receive, delete = 3 requests)
  s3PutShare: 0.01, // one request in a hundred uploads a file
  dynamoWritesPerRequest: 0.2,
  dynamoReadsPerRequest: 1,
};

const cents = (n) => Math.round(n * 100) / 100;

// Returns { lines: [{ name, dollars, verified }], total (verified lines only), unverified (the database line), tasks }.
export function monthlyCost(rps, overrides = {}) {
  const a = { ...ASSUMPTIONS, ...overrides };
  const requests = rps * SECONDS_PER_MONTH;
  const tasks = Math.max(a.minTasks, Math.ceil(rps / a.rpsPerTask));
  const logGb = (requests * a.logKbPerRequest) / 1e6;
  const natGb = (requests * a.natKbPerRequest) / 1e6;
  const lines = [
    { name: 'Fargate tasks', dollars: tasks * HOURS * (a.taskVcpu * UNIT.fargateVcpuHour + a.taskGb * UNIT.fargateGbHour), verified: true },
    { name: 'Load balancer', dollars: HOURS * UNIT.albHour + Math.max(1, rps / a.requestsPerLcu) * HOURS * UNIT.lcuHour, verified: true },
    { name: 'NAT gateways', dollars: a.natGateways * HOURS * UNIT.natHour + natGb * UNIT.natGb, verified: true },
    { name: 'CloudWatch Logs', dollars: logGb * UNIT.logsIngestGb, verified: true },
    { name: 'SQS', dollars: ((requests * a.queueShare * 3) / 1e6) * UNIT.sqsMillionRequests, verified: true },
    { name: 'DynamoDB', dollars: ((requests * a.dynamoWritesPerRequest) / 1e6) * UNIT.dynamoWriteMillion + ((requests * a.dynamoReadsPerRequest) / 1e6) * UNIT.dynamoReadMillion, verified: true },
    { name: 'S3 requests', dollars: ((requests * a.s3PutShare) / 1e3) * UNIT.s3PutThousand, verified: true },
  ].map((l) => ({ ...l, dollars: cents(l.dollars) }));
  return {
    rps,
    tasks,
    lines,
    total: cents(lines.reduce((sum, l) => sum + l.dollars, 0)),
    unverified: { name: 'Database (db.t4g.medium, Single-AZ)', dollars: cents(HOURS * UNIT.rdsT4gMediumHour) },
  };
}

export const largestLine = (cost) => cost.lines.reduce((a, b) => (b.dollars > a.dollars ? b : a));
