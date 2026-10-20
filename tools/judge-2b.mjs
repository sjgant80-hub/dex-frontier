#!/usr/bin/env node
// tools/judge-2b.mjs — organ 2b, the composition fix, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say, L } from './organ.mjs';
export const RULES = {
  H1: (r) => ({ pass: r.deterministic === true && r.testNeverRead === true && both(r, (d) => d.nonNegative && d.steps.filter((s) => s.joined && s.how === 'co-grown').every((s) => s.addsOnGate > 0)),
    saw: say(r, (d) => d.steps.map((s) => s.silo + ' ' + s.how + (s.how === 'co-grown' ? ' (adds ' + s.addsOnGate + ' on GATE, alone ' + s.gateAlone + ') ' + (s.joined ? 'joined' : 'stayed out') : '')).join('; ') + '; weights never negative: ' + d.nonNegative) + '; the same twice: ' + r.deterministic + '; TEST never read: ' + r.testNeverRead }),
  H2: (r) => ({ pass: both(r, (d) => d.C.vsBest.low95 > 0), saw: say(r, (d) => 'the fixed mesh against the best single node (' + d.best.node + ', ' + d.best.how + '): ' + L(d.C.vsBest)) }),
  H3: (r) => ({ pass: both(r, (d) => d.C.vsBest.low95 > -0.002), saw: say(r, (d) => 'never worse than the best node by more than 0.002: bound ' + d.C.vsBest.low95) }),
  H4: (r) => ({ pass: both(r, (d) => d.C.vsMonolith.low95 > -0.02), saw: say(r, (d) => 'against every record pooled: ' + L(d.C.vsMonolith) + ' against −0.02') }),
  H5: (r) => ({ pass: both(r, (d) => d.B.vsA.low95 > -0.002), saw: say(r, (d) => 'the non-negative coupling alone against organ 2’s free one: ' + L(d.B.vsA) + ' (silenced: ' + (d.B.silenced.join(', ') || 'none') + ')') }),
};
if (isMain(import.meta.url, 'judge-2b.mjs')) judgeMain('2b', RULES);
