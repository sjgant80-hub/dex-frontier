#!/usr/bin/env node
// tools/judge-2d.mjs — organ 2d, a nonlinear coupling, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say, L } from './organ.mjs';
export const RULES = {
  K1: (r) => ({ pass: r.deterministic === true && r.testNeverRead === true && both(r, (d) => d.onlyScores && d.sham < 0.6),
    saw: say(r, (d) => 'the coupling (' + d.coupling.trees + ' trees, ' + d.coupling.numbers + ' numbers) reads only ' + d.coupling.reads.join(', ') + ': only scores: ' + d.onlyScores + '; taught shuffled outcomes it scores ' + d.sham) + '; the same twice: ' + r.deterministic + '; TEST never read: ' + r.testNeverRead }),
  K2: (r) => ({ pass: both(r, (d) => d.vsBest.low95 > 0), saw: say(r, (d) => 'against the best single node (' + d.best.node + '): ' + L(d.vsBest)) }),
  K3: (r) => ({ pass: both(r, (d) => d.vsLinear.low95 > 0), saw: say(r, (d) => 'against organ 2’s linear coupling of the same nodes: ' + L(d.vsLinear)) }),
  K4: (r) => ({ pass: both(r, (d) => d.vsMonolith.low95 > -0.02), saw: say(r, (d) => 'against every record pooled: ' + L(d.vsMonolith) + ' against −0.02') }),
};
if (isMain(import.meta.url, 'judge-2d.mjs')) judgeMain('2d', RULES);
