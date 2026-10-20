#!/usr/bin/env node
// tools/judge-2f.mjs — organ 2f, the gate retaken in full on fresh cases, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, L } from './organ.mjs';
const FRESH = ['bank', 'adult'];
const both = (r, f) => FRESH.every((d) => f(r[d], d));
const say = (r, f) => FRESH.map((d) => d + ': ' + f(r[d])).join('; ');
const compounds = (d) => d.growth.every((g, k) => k === 0 || g.testAuc >= d.growth[k - 1].testAuc) && d.growth[d.growth.length - 1].testAuc >= d.growth[0].testAuc + 0.01;
const curve = (d) => d.growth.map((g) => g.departments + ' ' + g.testAuc).join(' → ');
export const RULES = {
  N1: (r) => ({ pass: r.filesMatchSources === true && both(r, (d) => d.ownColumnsOnly === true && d.testNeverRead === true && d.tamperRefused === true && d.frontier.promptMatches === true && d.frontier.answered === 300 && d.live.length >= 2),
    saw: 'files as downloaded: ' + r.filesMatchSources + '; ' + say(r, (d) => 'live ' + d.live.join(', ') + ' (' + d.departments.map((x) => x.department.split('-')[1] + ' ' + x.fielded + ' ' + x.gateAuc + ' ' + x.state).join(', ') + '), own columns only ' + d.ownColumnsOnly + ', TEST never read ' + d.testNeverRead + ', a changed seed refused ' + d.tamperRefused + ', frontier answered ' + d.frontier.answered + ' to the sealed prompt ' + d.frontier.promptMatches) }),
  N2: (r) => ({ pass: both(r, (d) => d.vsBest.low95 > 0), saw: say(r, (d) => 'the mesh (' + d.chosen + ') against its best department (' + d.best.department + '): ' + L(d.vsBest)) }),
  N3: (r) => ({ pass: both(r, (d) => d.frontier.vs.low95 > -0.02), saw: say(r, (d) => 'on the 300, the mesh against ' + d.frontier.model.name + ': ' + L(d.frontier.vs) + ' against −0.02 (' + d.frontier.unreadable + ' unreadable)') }),
  N4: (r) => ({ pass: both(r, compounds), saw: say(r, curve) }),
  N5: (r) => ({ pass: both(r, (d) => d.monolith.boosted.low95 > -0.02), saw: say(r, (d) => 'against boosted trees on every column pooled: ' + L(d.monolith.boosted) + ' against −0.02; logistic regression pooled ' + d.monolith.logistic.b) }),
  N6: (r) => ({ pass: both(r, (d) => d.vsShuffled.low95 > 0 && d.vsRoute.low95 > 0 && d.noiseLive.length === 0), saw: say(r, (d) => 'against a coupling taught shuffled outcomes: ' + L(d.vsShuffled) + '; against random routing: ' + L(d.vsRoute) + '; live on shuffled outcomes: ' + (d.noiseLive.join(', ') || 'none')) }),
  GATE: (r) => ({ pass: [RULES.N2, RULES.N3, RULES.N4].every((f) => f(r).pass), saw: 'composition > parts ' + RULES.N2(r).pass + ', approaches the frontier ' + RULES.N3(r).pass + ', growth compounds ' + RULES.N4(r).pass }),
};
if (isMain(import.meta.url, 'judge-2f.mjs')) judgeMain('2f', RULES);
