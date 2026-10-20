#!/usr/bin/env node
// tools/seal-2e.mjs — organ 2e's pre-registration (the mesh chooses its coupling, the fifth take), committed before it is measured.
import { seal } from './organ.mjs';
seal('2e', {
  organ: 'organ 2e, the mesh chooses its own coupling — with the choice made out of fold on GATE alone, do specialists compose into more than their best one in both domains?',
  why: 'Organ 2: the linear coupling composes the telco nodes (0.822 vs their best 0.813, bound +0.001) but not the shop’s. Organ 2d: trees over the scores compose the shop nodes (0.830 vs 0.810, bound +0.013; level with every record pooled, 0.827) but not telco’s (0.817). A mesh in the field has no TEST to choose by; it must choose on what it may learn from.',
  scenario: 'Organ 2’s live nodes, unchanged. Two couplings, one interface (src/select.mjs): linear (organ 2’s) and trees (organ 2d’s, the same settings). Each is scored out of fold on the domain’s GATE cases (four folds, every case predicted by a coupling that never learned from it); the better is learned on all of GATE — on a tie, linear. TEST is read only to score the result: against the best single node, and boosted trees on every column pooled.',
  rules: [
    { id: 'L1', kind: 'property', claim: 'each domain’s choice is made out of fold on GATE alone — scrambling every TEST record leaves both out-of-fold scores and the choice unchanged — and is the same twice', seenBeforeSeal: 'organs 2, 2b, 2c and 2d’s records and verdicts; not the out-of-fold scores' },
    { id: 'L2', kind: 'prediction', claim: 'THE GATE: in both domains the mesh, coupled as it chose, beats the best single node on TEST: bound above 0', seenBeforeSeal: 'no' },
    { id: 'L3', kind: 'prediction', claim: 'in both domains the mesh is within 0.02 of every record pooled: bound above −0.02', seenBeforeSeal: 'no' },
  ],
  disclosure: 'The fifth attempt at the gate, designed after organs 2, 2b, 2c and 2d were judged, knowing their TEST numbers — including that, on TEST, linear composes telco and trees compose the shop. That knowledge is exactly why the choice is taken from TEST and given to GATE alone, out of fold: L2 can pass only if GATE picks what TEST would have rewarded, and it may not. Five attempts at one gate are a reason to read a pass with care; every earlier verdict stands as it was. The expectation written before the run: L2 is open (it rests on the out-of-fold choice); L3 is likely to fail on telco.',
}, ['src/select.mjs', 'vendor/living-seed/src/baseline.mjs', 'tools/measure-2d.mjs']);
