#!/usr/bin/env node
// tools/seal-2d.mjs — organ 2d's pre-registration (a nonlinear coupling, the fourth take), committed before it is measured.
import { seal } from './organ.mjs';
seal('2d', {
  organ: 'organ 2d, a different composition mechanism — every additive mesh trailed the model that pools every record by 0.02–0.03: if the coupling can learn interactions between the nodes’ scores, do specialists then compose into more than their best one, and close on the pooled model?',
  why: 'Organs 2, 2b and 2c: telco composes narrowly (0.822 vs its best node 0.813, twice); the shop composed once (2b, 0.818 vs 0.810) and not in 2 or 2c; every additive mesh trailed every record pooled (telco 0.846, shop 0.827). Pooling has interactions across silos that a weighted sum of scores cannot represent.',
  scenario: 'Organ 2’s live nodes, unchanged (telco: account, services, customer; shop: analytics, browsing). The coupling is gradient-boosted trees (living-seed’s src/baseline.mjs, mutation-gated: depth 2, 100 trees, learning rate 0.1, 16 quantile cuts, L2 1 on leaves, settings fixed here before any run) over the nodes’ scores, learned on GATE only. Its only inputs are scores: no record column. Sham: the same trees taught shuffled GATE outcomes (seed 13). On TEST: against the best single node, organ 2’s linear coupling of the same nodes, and boosted trees on every column pooled.',
  rules: [
    { id: 'K1', kind: 'property', claim: 'the coupling reads only the live nodes’ scores, learns on GATE only (scrambling TEST changes nothing), is the same twice, and taught shuffled outcomes it scores under 0.6 on TEST', seenBeforeSeal: 'organs 2, 2b and 2c’s records and verdicts' },
    { id: 'K2', kind: 'prediction', claim: 'in both domains the nonlinear mesh beats the best single node on TEST: bound above 0', seenBeforeSeal: 'no' },
    { id: 'K3', kind: 'prediction', claim: 'INTERACTIONS ADD: in both domains the nonlinear coupling beats organ 2’s linear coupling of the same nodes: bound above 0', seenBeforeSeal: 'no' },
    { id: 'K4', kind: 'prediction', claim: 'in both domains the nonlinear mesh is within 0.02 of every record pooled: bound above −0.02', seenBeforeSeal: 'no' },
  ],
  disclosure: 'The fourth attempt at the gate, designed after organs 2, 2b and 2c were judged, knowing their numbers; every earlier verdict stands. Four attempts at one gate are themselves a reason to read a pass with care. What earns this one its place is that it is a different mechanism (interactions), aimed at the gap every earlier attempt left, and that nothing here is chosen on TEST. The expectation written before the run: trees learned on 1,232 and 1,901 GATE cases may overfit; K2 and K3 are genuinely open, K4 more so.',
}, ['vendor/living-seed/src/baseline.mjs']);
