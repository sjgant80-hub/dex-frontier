#!/usr/bin/env node
// tools/measure-1.mjs — organ 1, ONE SPECIALIST BODY: the billing department's node. A seed of a few dozen bytes for
// one silo (telco account: 7 columns), sealed by its contributor, grows its body from that silo's FIT records on this
// device, must clear its bar on GATE, and is then scored on TEST — against the 14B and a frontier model that both see
// every one of the 20 columns. Deterministic given the committed answers: node tools/measure-1.mjs [--check]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadTelco, silo } from '../src/silos.mjs';
import { contributor, sealNode, growNode, scores, advert } from '../src/node.mjs';
import { lead, median } from '../src/stats.mjs';
import { auc, round6, utf8Bytes } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { sampleOf } from './contest.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const SILO = 'account', SEED = 1;

/** the same dataset with every TEST record scrambled and relabelled: a node that never read TEST cannot tell */
export function scrambleTest(ds) {
  const cols = Object.fromEntries(Object.entries(ds.cols).map(([k, v]) => [k, Float64Array.from(v)])), y = Uint8Array.from(ds.y);
  for (const i of ds.testRows) { for (const k of Object.keys(cols)) cols[k][i] = (i % 11) * 13 - 2; y[i] = 1 - y[i]; }
  return { ...ds, cols, y };
}

export async function measure() {
  const T = loadTelco(read('data/telco-churn.csv')), view = silo(T, SILO), keys = await contributor(SILO);
  const g = await sealNode(view, keys, { seed: SEED }), n = await growNode(g.text, view), again = await growNode(g.text, view);
  const blind = await growNode(g.text, silo(scrambleTest(T), SILO));
  const testY = T.testRows.map((i) => T.y[i]), testS = scores(n.organism, view, T.testRows);
  const rows = sampleOf(T), y = rows.map((i) => T.y[i]), node = scores(n.organism, view, rows);
  const answers = (file) => { const d = JSON.parse(read(file)), m = new Map(d.calls.map((c) => [c.row, c])); return { d, p: rows.map((i) => (m.get(i) && m.get(i).p !== null ? m.get(i).p : 0.5)), unread: rows.filter((i) => !m.get(i) || m.get(i).p === null).length, answered: rows.filter((i) => m.has(i)).length }; };
  const local = answers('data/llm/qwen2.5-14b-telco.json'), front = answers('data/llm/frontier-telco.json');
  return {
    kind: 'dex-frontier.organ-1.record', v: 1, silo: view.name, columns: view.features,
    genome: { bytes: utf8Bytes(g.text), id: g.id, recipe: g.text.split('\n').find((l) => l.startsWith('organ ')).slice(6), maker: keys.pub },
    grown: { state: n.organ.state, gateAuc: n.organ.heldAuc, bar: n.organism.gate.auc, rules: n.organ.body ? n.organ.body.rules.length : 0, numbers: n.organ.body ? n.organ.body.rules.length * 3 + 2 : 0,
      body: n.organ.body ? n.organ.body.rules.map((r) => r.feat + ' ' + r.op + ' ' + r.v + ' → ' + r.w) : []},
    deterministic: again.organism.id === n.organism.id, testNeverRead: blind.organism.id === n.organism.id, organism: n.organism.id, advert: advert(n.organism, view),
    test: { cases: T.testRows.length, churners: testY.reduce((a, v) => a + v, 0), answered: testS.filter((s) => s !== null).length, auc: round6(auc(testS.map((s) => (s === null ? 0 : s)), testY)) },
    sample: { cases: rows.length, churners: y.reduce((a, v) => a + v, 0), sha: sha256Hex(JSON.stringify(rows)).slice(0, 16), nodeAuc: round6(auc(node, y)) },
    local: { model: local.d.model, answered: local.answered, unreadable: local.unread, longestPrompt: Math.max(...local.d.calls.map((c) => c.promptTokens)), numCtx: local.d.options.num_ctx, medianMs: median(local.d.calls.map((c) => c.wallMs)), vs: lead(node, local.p, y) },
    frontier: { model: front.d.model, answered: front.answered, unreadable: front.unread, vs: lead(node, front.p, y) },
  };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/measure-1.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) {
    const committed = read('data/organ-1/record.json');
    if (committed !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(committed).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); }
    console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16));
  } else { mkdirSync(new URL('data/organ-1/', ROOT), { recursive: true }); writeFileSync(new URL('data/organ-1/record.json', ROOT), text); console.log('wrote data/organ-1/record.json · ' + sha256Hex(text).slice(0, 16)); }
}
