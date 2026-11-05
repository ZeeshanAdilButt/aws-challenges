// For tests of pure models that never call AWS: the same environment checks as guard.js,
// but no call to the emulator, so these tests run without Docker.
// A model test still refuses to start if the environment is unsafe.
import { guardEnvironment } from './guard-lib.js';

guardEnvironment();
