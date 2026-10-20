#!/usr/bin/env node
// tools/seal-2.mjs — organ 2's pre-registration (the composition proof), committed BEFORE any TEST case is scored.
import { writeFileSync, mkdirSync } from 'node:fs';
import { pin } from './order.mjs';
import { FILES as ONE } from './seal-1.mjs';

const FILES = [...new Set([...ONE.filter((f) => f !== 'tools/seal-1.mjs' && f !== 'tools/judge-1.mjs'), 'src/compose.mjs', 'vendor/living-seed/src/baseline.mjs', 'data/online_shoppers_intention.csv',
  'tools/measure-2.mjs', 'tools/judge-2.mjs', 'tools/seal-2.mjs', 'tools/seal-1.mjs'])];

const prereg = {
  kind: 'dex-frontier.organ-2.prereg', v: 1,
  organ: 'organ 2, THE COMPOSITION PROOF — the critical gate before anything scales: do specialist nodes, each grown on one department’s records and coupled at κ, compose into more than the sum, approach what a model pooling every record in one place gets, and hold their own against a 14B and a frontier model?',
  scenario: 'Two real domains, each cut into the silos a business keeps apart. Telco (IBM, 7,043 customers): customer (4 columns), services (9), account (7); FIT 3,699 / GATE 1,232 / TEST 2,112, seeded and stratified. Shop (UCI, 12,330 sessions): browsing (6), analytics (3), context (7); FIT 5,704 / GATE 1,901 from February–October, TEST the 4,725 November–December sessions. Every silo grows a node from its contributor’s sealed grow-seed (seed 1) on its own FIT records only; a node that does not clear AUC 0.6 on GATE is cut and abstains. The coupling (κ): a logistic regression over the live nodes’ standardised scores, L2 1, learned on GATE outcomes only. The best single node is the best on TEST, the strictest rival. Shams: random routing (seed 7), a coupling taught shuffled outcomes (seed 13), a mesh grown on shuffled outcomes (seed 17). The monolith is the poured way: boosted trees (200 depth-2 trees) and logistic regression on every column, FIT and GATE pooled in one place. On the 300 of each domain (100 with the outcome, 200 without): qwen2.5:14b and Claude Opus 5.5, exactly as in organ 1. Breadth: both domains’ TEST cases in one unlabelled stream, routed by fit (a node takes a case only if the case carries every column of its silo). Bounds: paired bootstrap, 2,000 resamples, seed 99.',
  rules: [
    { id: 'B1', kind: 'property', claim: 'in both domains: TEST is never read while the nodes grow or the coupling learns (scrambling every TEST record changes no node), each node holds only its own silo’s columns, the same mesh grows twice, every TEST case is answered, no node grown on shuffled outcomes goes live (the gate refuses a mesh that learned nothing), and at least two nodes are live', seenBeforeSeal: 'the six nodes’ growth on FIT and their GATE scores: yes (telco 0.662 / 0.729 / 0.814, all live; shop browsing 0.665 and analytics 0.918 live, context 0.587 cut) — in a smoke run that scored no TEST case' },
    { id: 'B2', kind: 'prediction', claim: 'COMPOSITION > PARTS: in both domains the composed mesh beats its best single node on TEST: the 95% lower bound of its lead is above 0', seenBeforeSeal: 'no' },
    { id: 'B3', kind: 'prediction', claim: 'in both domains the composed mesh beats random routing AND a coupling taught shuffled outcomes: both bounds above 0', seenBeforeSeal: 'no' },
    { id: 'B4', kind: 'prediction', claim: 'GROWTH COMPOUNDS: in both domains, adding the live nodes one at a time (in GATE order) never lowers the composed TEST AUC, and the full mesh is at least 0.01 above its first node', seenBeforeSeal: 'no' },
    { id: 'B5', kind: 'prediction', claim: 'APPROACHES THE POURED MONOLITH: in both domains the composed mesh is not worse than boosted trees on every column pooled in one place by more than 0.02 AUC: the bound of its lead is above −0.02', seenBeforeSeal: 'no' },
    { id: 'B6', kind: 'prediction', claim: 'in both domains, on the 300, the composed mesh beats qwen2.5:14b shown 24 examples and every column: bound above 0', seenBeforeSeal: 'no' },
    { id: 'B7', kind: 'prediction', claim: 'APPROACHES THE FRONTIER: in both domains, on the 300, the composed mesh is not worse than the frontier model by more than 0.02 AUC: bound above −0.02', seenBeforeSeal: 'no' },
    { id: 'B8', kind: 'property', claim: 'BREADTH: in one unlabelled stream of both domains’ TEST cases, every case reaches all of its own domain’s live nodes and none of the other’s; no node covers more than one domain; the mesh covers both', seenBeforeSeal: 'no' },
  ],
  disclosure: 'Designed by Kar and Claude together, sealed with organ 1 before either was measured. The expectation written before the run: telco composes (account and services carry different signal), so B2 holds there; the shop’s analytics node carries most of the signal on its own, so whether the browsing node adds to it beyond the noise is genuinely open, and B2 or B4 may fail on the shop. The 300-case comparisons are narrow, and the frontier model is given an advantage (it sees all 300 at once). This is the gate the spec puts before scaling: if composition does not net, the finding is kept and the next organ fixes composition before anything scales.',
  judgedBy: 'tools/judge-2.mjs (pinned below)',
  files: pin(FILES),
};

mkdirSync(new URL('../data/organ-2/', import.meta.url), { recursive: true });
writeFileSync(new URL('../data/organ-2/prereg.json', import.meta.url), JSON.stringify(prereg, null, 1) + '\n');
console.log('sealed data/organ-2/prereg.json · ' + prereg.rules.length + ' rules (' + prereg.rules.filter((r) => r.kind === 'prediction').length + ' predictions) · ' + FILES.length + ' files pinned');
