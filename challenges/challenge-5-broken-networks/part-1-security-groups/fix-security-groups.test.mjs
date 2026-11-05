import '../../../toolkit/guard-offline.js';
import { defineSetTests } from '../set-tests.mjs';
import { fixes, runbook, set } from './fix-security-groups.mjs';

defineSetTests({ set, fixes, runbook });
