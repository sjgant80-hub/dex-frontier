#!/usr/bin/env node
// tools/judge-2i.mjs — organ 2i, the gate taken again on fresh cases with a relay, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, L } from './organ.mjs';
import { DOMAINS } from './contest-2i.mjs';
const both = (r, f) => DOMAINS.every((d) => f(r[d], d));
const say = (r, f) => DOMAINS.map((d) => d + ': ' + f(r[d])).join('; ');
const neverFalls = (d) => d.growth.every((g, k) => k === 0 || g.testAuc >= d.growth[k - 1].testAuc);
const short = (name) => name.split('-').slice(1).join('-');
export const RULES = {
  R1: (r) => ({ pass: r.filesMatchSources === true && both(r, (d) => d.ownColumnsOnly === true && d.testNeverRead === true && d.tamperRefused === true && d.frontier.cases === 1200 && d.frontier.batches.every((b) => b.promptMatches === true && b.answered === 300)),
    saw: 'files as downloaded: ' + r.filesMatchSources + '; ' + say(r, (d) => 'relay ' + d.relay.map((x) => short(x.department) + (x.took.length ? '←' + x.took.map(short).join('+') : '') + ' ' + x.fielded + ' ' + x.gateAuc).join(', ') + ' (cut: ' + (d.departments.filter((x) => x.state !== 'live').map((x) => short(x.department)).join(', ') || 'none') + '), own columns and sent scores only ' + d.ownColumnsOnly + ', TEST never read ' + d.testNeverRead + ', a changed seed refused ' + d.tamperRefused + ', frontier batches answered to their sealed prompts ' + d.frontier.batches.map((b) => b.answered + (b.promptMatches ? '✓' : '✗')).join('/')) }),
  R2: (r) => ({ pass: both(r, (d) => d.live.length >= 2 && d.vsBest.low95 > 0), saw: say(r, (d) => 'the mesh (' + d.chosen + ') against its best department alone (' + d.best.department + '): ' + L(d.vsBest)) }),
  R3: (r) => ({ pass: both(r, (d) => d.frontier.vs.low95 > -0.02), saw: say(r, (d) => 'on the 1,200, the mesh against ' + d.frontier.model.name + ': ' + L(d.frontier.vs) + ' against −0.02 (' + d.frontier.batches.reduce((a, b) => a + b.unreadable, 0) + ' unreadable); the pooled model against it: ' + L(d.frontier.pooledVs)) }),
  R4: (r) => ({ pass: both(r, (d) => d.live.length >= 2 && neverFalls(d) && d.fullVsFirst.low95 > 0), saw: say(r, (d) => d.growth.map((g) => g.departments + ' ' + g.testAuc).join(' → ') + '; the full mesh against its first department: ' + L(d.fullVsFirst)) }),
  R5: (r) => ({ pass: both(r, (d) => d.monolith.boosted.low95 > -0.02), saw: say(r, (d) => 'against boosted trees on every column pooled: ' + L(d.monolith.boosted) + ' against −0.02; logistic regression pooled ' + d.monolith.logistic.b) }),
  R6: (r) => ({ pass: both(r, (d) => d.vsShuffled.low95 > 0 && d.vsRoute.low95 > 0 && d.noiseLive.length === 0), saw: say(r, (d) => 'against a coupling taught shuffled outcomes: ' + L(d.vsShuffled) + '; against random routing: ' + L(d.vsRoute) + '; live on shuffled outcomes: ' + (d.noiseLive.join(', ') || 'none')) }),
  R7: (r) => ({ pass: both(r, (d) => d.live.length >= 2 && d.vsOneScore.low95 > 0), saw: say(r, (d) => 'the relay against organ 2h’s kind of mesh, the same departments alone, one score each (' + d.oneScore.chosen + '): ' + L(d.vsOneScore)) }),
  GATE: (r) => ({ pass: [RULES.R2, RULES.R3, RULES.R4].every((f) => f(r).pass), saw: 'composition > parts ' + RULES.R2(r).pass + ', approaches the frontier ' + RULES.R3(r).pass + ', growth measurably raises it ' + RULES.R4(r).pass }),
};
if (isMain(import.meta.url, 'judge-2i.mjs')) judgeMain('2i', RULES);
