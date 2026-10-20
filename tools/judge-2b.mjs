#!/usr/bin/env node
// tools/judge-2b.mjs — organ 2b, the composition fix, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say, L } from './organ.mjs';
export const RULES = {
  H1: (r) => ({ pass: r.deterministic === true && r.testNeverRead === true && both(r, (d) => d.steps.filter((s) => s.joined && s.how === 'co-grown').every((s) => s.addsOnGate > 0) && d.mesh.length >= 2),
    saw: say(r, (d) => d.steps.map((s) => s.silo + ' ' + s.how + (s.how === 'co-grown' ? ' (adds ' + s.addsOnGate + ' on GATE, alone ' + s.gateAlone + ') ' + (s.joined ? 'joined' : 'stayed out') : '')).join('; ')) + '; the same twice: ' + r.deterministic + '; TEST never read: ' + r.testNeverRead }),
  H2: (r) => ({ pass: both(r, (d) => d.vsBest.low95 > 0), saw: say(r, (d) => 'the co-grown mesh against the best single node on TEST: ' + L(d.vsBest)) }),
  H3: (r) => ({ pass: both(r, (d) => d.vsSolo.low95 > -0.002), saw: say(r, (d) => 'the co-grown mesh against organ 2’s: ' + L(d.vsSolo) + ' against −0.002') }),
  H4: (r) => ({ pass: both(r, (d) => d.vsMonolith.low95 > -0.02), saw: say(r, (d) => 'against every record pooled: ' + L(d.vsMonolith) + ' against −0.02') }),
};
if (isMain(import.meta.url, 'judge-2b.mjs')) judgeMain('2b', RULES);
