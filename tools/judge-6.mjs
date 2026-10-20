#!/usr/bin/env node
// tools/judge-6.mjs — organ 6, scale, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say, L } from './organ.mjs';
export const RULES = {
  F1: (r) => ({ pass: r.ownColumnsOnly === true && r.deterministic === true && r.testNeverRead === true && both(r, (d) => d.live.length >= 4),
    saw: say(r, (d) => d.live.length + ' of ' + d.fine.length + ' fine nodes live') + '; own columns only: ' + r.ownColumnsOnly + '; the same twice: ' + r.deterministic + '; TEST never read: ' + r.testNeverRead }),
  F2: (r) => ({ pass: both(r, (d) => d.curve.every((c, k) => k === 0 || c.testAuc >= d.curve[k - 1].testAuc - 0.005) && d.curve[d.curve.length - 1].testAuc - d.curve[0].testAuc >= 0.02), saw: say(r, (d) => d.curve.map((c) => c.nodes + ' → ' + c.testAuc).join(', ')) }),
  F3: (r) => ({ pass: both(r, (d) => d.vsCoarse.low95 > -0.005), saw: say(r, (d) => 'the fine mesh against organ 2’s coarse one: ' + L(d.vsCoarse) + ' against −0.005') }),
  F4: (r) => ({ pass: both(r, (d) => d.vsMonolith.low95 > -0.02), saw: say(r, (d) => 'the fine mesh against every record pooled: ' + L(d.vsMonolith) + ' against −0.02') }),
};
if (isMain(import.meta.url, 'judge-6.mjs')) judgeMain(6, RULES);
