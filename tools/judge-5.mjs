#!/usr/bin/env node
// tools/judge-5.mjs — organ 5, the wisp, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say, L } from './organ.mjs';
export const RULES = {
  E1: (r) => ({ pass: both(r, (d) => d.firstWindowAgrees && d.untouchedBeforeBreak && d.broken.prunedInWindow !== null && d.broken.windowsAfterBreak >= 0) && r.deterministic === true,
    saw: say(r, (d) => 'first window the same in every mesh: ' + d.firstWindowAgrees + '; ' + d.brokenNode + ' broken at case ' + d.breakAt + ', pruned in window ' + d.broken.prunedInWindow + ' (' + d.broken.windowsAfterBreak + ' after the break)') + '; the same twice: ' + r.deterministic }),
  E2: (r) => ({ pass: both(r, (d) => d.broken.vs.low95 > 0), saw: say(r, (d) => 'after the break, the wisp against the frozen mesh: ' + L(d.broken.vs)) }),
  E3: (r) => ({ pass: both(r, (d) => d.calm.vs.low95 > -0.005), saw: say(r, (d) => 'no break, second half, learning against frozen: ' + L(d.calm.vs) + ' against −0.005') }),
};
if (isMain(import.meta.url, 'judge-5.mjs')) judgeMain(5, RULES);
