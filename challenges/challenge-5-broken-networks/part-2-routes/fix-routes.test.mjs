import '../../../toolkit/guard-offline.js';
import { defineSetTests } from '../set-tests.mjs';
import { fixes, runbook, set } from './fix-routes.mjs';

defineSetTests({ set, fixes, runbook });
