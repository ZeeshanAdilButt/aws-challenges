// The safety guard. Import this FIRST in every script and test that talks to the emulator:
//   import '../../toolkit/guard.js';
// It stops the program before any AWS call if there is any chance of touching a real account.
// The rules are in guard-lib.js and guard-core.js. Tests for them: guard.test.mjs.
import { runGuard } from './guard-lib.js';

if (!globalThis.__awsChallengesGuard) {
  globalThis.__awsChallengesGuard = runGuard();
}
await globalThis.__awsChallengesGuard;
