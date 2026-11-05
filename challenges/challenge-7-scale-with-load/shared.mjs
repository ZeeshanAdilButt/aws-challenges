// Shared by the three parts of challenge 7: the sale profile, the fleet settings and the server price.
import fs from 'node:fs';
import { simulate } from '../../toolkit/models/scaling.js';

export const PROFILE_FILE = new URL('../../datasets/sale-profile.json', import.meta.url);
export const loadProfile = () => JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));

// A server is an m7g.large: 0.0816 dollars an hour, us-east-1, read 2026-10-24 (dossier P13, VERIFIED tool-read).
export const SERVER_PRICE_PER_HOUR = 0.0816;

// The fleet settings of the exercise: one server answers 50 requests a second, target tracking aims for 50 percent,
// between 4 and 50 servers. A new server needs warmupSeconds before it answers anything.
export const FLEET = { target: 50, min: 4, max: 50 };

// The sale is announced for minute 8. A scheduled action raises the minimum to 40 servers at minute 5 (120 seconds of
// warm-up and some safety) and puts it back at minute 21.
export const SALE_SCHEDULE = [{ atSecond: 300, min: 40 }, { atSecond: 1260, min: 4 }];

export function replay(options = {}) {
  const profile = loadProfile();
  return simulate({ profile: profile.rps, stepSeconds: profile.stepSeconds, perServerRps: profile.perServerRps, ...FLEET, ...options });
}

export const dollars = (serverHours) => Math.round(serverHours * SERVER_PRICE_PER_HOUR * 100) / 100;
export const dropPercent = (result) => Math.round((result.dropped / result.offeredTotal) * 10000) / 100;
