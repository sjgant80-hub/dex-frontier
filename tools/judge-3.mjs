#!/usr/bin/env node
// tools/judge-3.mjs — organ 3, breeding, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say, L } from './organ.mjs';
export const RULES = {
  C1: (r) => ({ pass: both(r, (d) => d.silos.every((s) => s.everyChildBeatBoth) && d.monotone && d.silos.some((s) => s.born > 0)) && r.deterministic === true && r.testNeverRead === true,
    saw: say(r, (d) => d.silos.map((s) => s.silo + ' ' + s.born + ' born, ' + s.refused + ' refused, GATE best ' + s.gateHistory.join(' → ')).join('; ')) + '; every child beat both parents: ' + both(r, (d) => d.silos.every((s) => s.everyChildBeatBoth)) + '; the same twice: ' + r.deterministic + '; TEST never read: ' + r.testNeverRead }),
  C2: (r) => ({ pass: both(r, (d) => d.vsFirst.low95 > 0), saw: say(r, (d) => 'the bred mesh against organ 2’s: ' + L(d.vsFirst)) }),
  C3: (r) => ({ pass: both(r, (d) => d.silos.every((s) => s.champion.testAuc >= s.bestFounder.testAuc - 0.005)), saw: say(r, (d) => d.silos.map((s) => s.silo + ' champion ' + s.champion.testAuc + ' vs best founder ' + s.bestFounder.testAuc).join('; ')) }),
};
if (isMain(import.meta.url, 'judge-3.mjs')) judgeMain(3, RULES);
