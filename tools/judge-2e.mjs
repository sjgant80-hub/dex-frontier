#!/usr/bin/env node
// tools/judge-2e.mjs — organ 2e, the mesh chooses its coupling, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say, L } from './organ.mjs';
export const RULES = {
  L1: (r) => ({ pass: r.deterministic === true && r.choiceNeverReadTest === true && both(r, (d) => ['linear', 'trees'].includes(d.chosen) && d.outOfFold.length === 2),
    saw: say(r, (d) => 'out of fold on GATE ' + d.outOfFold.map((o) => o.coupling + ' ' + o.gateAuc).join(', ') + ' → ' + d.chosen) + '; the choice never read TEST: ' + r.choiceNeverReadTest + '; the same twice: ' + r.deterministic }),
  L2: (r) => ({ pass: both(r, (d) => d.vsBest.low95 > 0), saw: say(r, (d) => 'the mesh, ' + d.chosen + '-coupled, against the best single node (' + d.best.node + '): ' + L(d.vsBest)) }),
  L3: (r) => ({ pass: both(r, (d) => d.vsMonolith.low95 > -0.02), saw: say(r, (d) => 'against every record pooled: ' + L(d.vsMonolith) + ' against −0.02') }),
};
if (isMain(import.meta.url, 'judge-2e.mjs')) judgeMain('2e', RULES);
