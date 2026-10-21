#!/usr/bin/env node
// tools/judge-2h.mjs — organ 2h, the gate taken again on fresh cases with the join rule fixed, judged by its sealed
// rules.   --write | --check
import { judgeMain, isMain, L } from './organ.mjs';
import { DOMAINS } from './contest-2h.mjs';
const both = (r, f) => DOMAINS.every((d) => f(r[d], d));
const say = (r, f) => DOMAINS.map((d) => d + ': ' + f(r[d])).join('; ');
const neverFalls = (d) => d.growth.every((g, k) => k === 0 || g.testAuc >= d.growth[k - 1].testAuc);
export const RULES = {
  Q1: (r) => ({ pass: r.filesMatchSources === true && both(r, (d) => d.ownColumnsOnly === true && d.testNeverRead === true && d.tamperRefused === true && d.frontier.cases === 1200 && d.frontier.batches.every((b) => b.promptMatches === true && b.answered === 300)),
    saw: 'files as downloaded: ' + r.filesMatchSources + '; ' + say(r, (d) => 'live ' + d.live.join(', ') + ' (' + d.departments.map((x) => x.department.split('-').slice(1).join('-') + ' ' + x.fielded + ' ' + x.gateAuc + ' ' + x.state).join(', ') + '), own columns only ' + d.ownColumnsOnly + ', TEST never read ' + d.testNeverRead + ', a changed seed refused ' + d.tamperRefused + ', frontier batches answered to their sealed prompts ' + d.frontier.batches.map((b) => b.answered + (b.promptMatches ? '✓' : '✗')).join('/')) }),
  Q2: (r) => ({ pass: both(r, (d) => d.live.length >= 2 && d.vsBest.low95 > 0), saw: say(r, (d) => 'the mesh (' + d.chosen + ') against its best department (' + d.best.department + '): ' + L(d.vsBest)) }),
  Q3: (r) => ({ pass: both(r, (d) => d.frontier.vs.low95 > -0.02), saw: say(r, (d) => 'on the 1,200, the mesh against ' + d.frontier.model.name + ': ' + L(d.frontier.vs) + ' against −0.02 (' + d.frontier.batches.reduce((a, b) => a + b.unreadable, 0) + ' unreadable); the pooled model against it: ' + L(d.frontier.pooledVs)) }),
  Q4: (r) => ({ pass: both(r, (d) => d.live.length >= 2 && neverFalls(d) && d.fullVsFirst.low95 > 0), saw: say(r, (d) => d.growth.map((g) => g.departments + ' ' + g.testAuc).join(' → ') + '; the full mesh against its first department: ' + L(d.fullVsFirst)) }),
  Q5: (r) => ({ pass: both(r, (d) => d.monolith.boosted.low95 > -0.02), saw: say(r, (d) => 'against boosted trees on every column pooled: ' + L(d.monolith.boosted) + ' against −0.02; logistic regression pooled ' + d.monolith.logistic.b) }),
  Q6: (r) => ({ pass: both(r, (d) => d.vsShuffled.low95 > 0 && d.vsRoute.low95 > 0 && d.noiseLive.length === 0), saw: say(r, (d) => 'against a coupling taught shuffled outcomes: ' + L(d.vsShuffled) + '; against random routing: ' + L(d.vsRoute) + '; live on shuffled outcomes: ' + (d.noiseLive.join(', ') || 'none')) }),
  GATE: (r) => ({ pass: [RULES.Q2, RULES.Q3, RULES.Q4].every((f) => f(r).pass), saw: 'composition > parts ' + RULES.Q2(r).pass + ', approaches the frontier ' + RULES.Q3(r).pass + ', growth measurably raises it ' + RULES.Q4(r).pass }),
};
if (isMain(import.meta.url, 'judge-2h.mjs')) judgeMain('2h', RULES);
