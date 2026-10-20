#!/usr/bin/env node
// tools/judge-2c.mjs — organ 2c, the composition fix (third take), judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say, L } from './organ.mjs';
export const RULES = {
  J1: (r) => ({ pass: r.deterministic === true && r.testNeverRead === true && both(r, (d) => d.nonNegative && d.bothOffered && d.steps.slice(1).every((s) => s.joined === 'neither' || (s.joined === 'alone' ? s.alone.adds > 0 : s.coGrown.adds > 0))),
    saw: say(r, (d) => d.steps.map((s) => s.silo + ': ' + ('alone' in s ? 'alone adds ' + s.alone.adds + ', co-grown adds ' + s.coGrown.adds + ' → ' : '') + s.joined).join('; ') + '; weights never negative: ' + d.nonNegative) + '; the same twice: ' + r.deterministic + '; TEST never read: ' + r.testNeverRead }),
  J2: (r) => ({ pass: both(r, (d) => d.vsBest.low95 > 0), saw: say(r, (d) => 'the mesh (' + d.mesh.join(', ') + ') against the best single node (' + d.best.node + ', ' + d.best.how + '): ' + L(d.vsBest)) }),
  J3: (r) => ({ pass: both(r, (d) => d.vsBest.low95 > -0.002), saw: say(r, (d) => 'never worse than the best node by more than 0.002: bound ' + d.vsBest.low95) }),
  J4: (r) => ({ pass: both(r, (d) => d.vsMonolith.low95 > -0.02), saw: say(r, (d) => 'against every record pooled: ' + L(d.vsMonolith) + ' against −0.02') }),
};
if (isMain(import.meta.url, 'judge-2c.mjs')) judgeMain('2c', RULES);
