#!/usr/bin/env node
// tools/seal-1.mjs — organ 1's pre-registration, committed BEFORE any contestant is asked a single TEST case.
import { writeFileSync, mkdirSync } from 'node:fs';
import { pin } from './order.mjs';

export const FILES = [
  'src/silos.mjs', 'src/node.mjs', 'src/stats.mjs', 'vendor/living-seed/src/genome.mjs', 'vendor/living-seed/src/germinate.mjs',
  'vendor/living-seed/vendor/seed-library/seedlib.mjs', 'vendor/living-seed/vendor/seed-library/sha256.mjs', 'vendor/living-seed/vendor/keys/keys.mjs', 'vendor/living-seed/vendor/keys/canon.mjs',
  'data/telco-churn.csv', 'tools/contest.mjs', 'tools/ask-llm.mjs', 'tools/frontier.mjs', 'tools/measure-1.mjs', 'tools/judge-1.mjs', 'tools/seal-1.mjs', 'tools/order.mjs',
];

const prereg = {
  kind: 'dex-frontier.organ-1.prereg', v: 1,
  organ: 'organ 1, one specialist body — does a node grown from a few dozen bytes of seed, on ONE department’s records, beat a 14-billion-parameter model that sees every department’s records, and hold its own against a frontier model?',
  scenario: 'IBM’s Telco Customer Churn sample (7,043 real customers; Apache-2.0; byte-identical to IBM’s file, git blob 3de7a612). The node is the billing department’s: the 7 account columns (tenure, contract, paperless billing, electronic cheque, automatic payment, monthly and total charges), sealed by its contributor as one grow-seed (population 40, elites 8, generations 30, seed 1), grown on the FIT customers (3,699), held to a bar of AUC 0.6 on the GATE customers (1,232), scored on the 2,112 TEST customers it never saw. Against it, on 300 of those TEST customers (100 who churned, 200 who did not, seeded): qwen2.5:14b on this laptop, shown 24 FIT customers with their outcomes and all 20 columns, one customer per prompt (temperature 0, seed 7, a 4,096-token window: the longest prompt, counted on the Qwen2.5 tokenizer before the seal, is 3,136 tokens); and Claude Opus 5.5, asked cold by a fresh subagent with the same columns and examples and all 300 customers in one prompt (so it may compare them, an advantage the local model does not have). Bounds: paired bootstrap, 2,000 resamples, seed 99.',
  rules: [
    { id: 'A1', kind: 'property', claim: 'the node travels as a genome of at most 400 bytes over the 7 account columns, grows live at or above its bar, grows the same organism twice, grows the same organism when every TEST record is scrambled (TEST is never read while growing), and answers every TEST customer', seenBeforeSeal: 'the node’s growth on FIT and its GATE score (0.814, live): yes, in a smoke run that scored no TEST customer' },
    { id: 'A2', kind: 'prediction', claim: 'on the 300, the node beats qwen2.5:14b shown 24 examples and all 20 columns: the 95% lower bound of its lead is above 0', seenBeforeSeal: 'no' },
    { id: 'A3', kind: 'prediction', claim: 'on the 300, the node is not worse than the frontier model by more than 0.02 AUC: the 95% lower bound of its lead is above −0.02', seenBeforeSeal: 'no' },
  ],
  disclosure: 'Designed by Kar and Claude together (docs/kar-plan.md is Kar’s plan, on its own local model). Written knowing living-seed’s organ 2b: on shop sessions a 20-number organ beat this 14B shown 24 examples (0.828 against 0.799). Here the node sees 7 of 20 columns and the models see all 20. The expectation written before the run: A2 holds (the account columns carry most of the churn signal), A3 is genuinely open. A failed prediction is kept.',
  judgedBy: 'tools/judge-1.mjs (pinned below)',
  files: pin(FILES),
};

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/seal-1.mjs');
if (isMain) {   // imported (by seal-2 for its file list) it writes nothing
  mkdirSync(new URL('../data/organ-1/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../data/organ-1/prereg.json', import.meta.url), JSON.stringify(prereg, null, 1) + '\n');
  console.log('sealed data/organ-1/prereg.json · ' + prereg.rules.length + ' rules (' + prereg.rules.filter((r) => r.kind === 'prediction').length + ' predictions) · ' + FILES.length + ' files pinned');
}
