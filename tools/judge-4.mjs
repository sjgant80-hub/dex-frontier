#!/usr/bin/env node
// tools/judge-4.mjs — organ 4, grow by working, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say } from './organ.mjs';
export const RULES = {
  D1: (r) => ({ pass: r.onlyWhatArrived === true && r.cumulative === true, saw: 'each step grew only on what had arrived: ' + r.onlyWhatArrived + '; arrivals cumulative: ' + r.cumulative }),
  D2: (r) => ({ pass: both(r, (d) => d.firstToLast.to - d.firstToLast.from >= 0.01), saw: say(r, (d) => d.steps.map((s) => s.rowsSeen + ' rows → ' + s.testAuc).join(', ')) }),
  D3: (r) => ({ pass: both(r, (d) => d.steps.every((s, k) => k === 0 || s.testAuc >= d.steps[k - 1].testAuc - 0.005)), saw: say(r, (d) => 'step to step ' + d.steps.slice(1).map((s, k) => (s.testAuc - d.steps[k].testAuc).toFixed(4)).join(', ')) }),
};
if (isMain(import.meta.url, 'judge-4.mjs')) judgeMain(4, RULES);
