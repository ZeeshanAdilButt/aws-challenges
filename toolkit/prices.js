// Prices used by the challenges. us-east-1, dollars, read 2026-10-24 (research dossier, section 3).
// Prices change: the date is part of the data. Tag VERIFIED means read from the AWS page;
// UNVERIFIED means the dossier could not confirm it, so the course says so wherever it is used.
export const PRICE_DATE = '2026-10-24';

export const PRICES = {
  natGatewayPerHour: { value: 0.045, tag: 'VERIFIED' },
  natGatewayPerGbProcessed: { value: 0.045, tag: 'VERIFIED' },
  publicIpv4PerHour: { value: 0.005, tag: 'VERIFIED' },
  // Data moving between two zones is charged in each direction. The dossier lists inter-AZ rates as UNVERIFIED.
  interZonePerGbEachWay: { value: 0.01, tag: 'UNVERIFIED' },
  cloudWatchLogsIngestPerGb: { value: 0.5, tag: 'VERIFIED' },
};

export const HOURS_PER_MONTH = 730;
