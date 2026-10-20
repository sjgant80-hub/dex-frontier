#!/usr/bin/env node
// tools/seal-6.mjs — organ 6's pre-registration (scale), committed before it is measured.
import { seal } from './organ.mjs';
seal(6, {
  organ: 'organ 6, scale — cut finer, more silos and more nodes: does the composed answer keep climbing as nodes join, lose nothing to the coarse mesh, and stay near the model that pools everything?',
  scenario: 'The same data cut finer (src/scale.mjs): telco into 7 silos (demographics, phone, internet, protection, streaming, contract, charges), the shop into 6 (admin, info, product, engagement, value, context). Every fine silo grows its own node (seed 1, its own contributor) and is held to its bar; the live ones join one at a time in GATE order; the composed mesh is scored on TEST at every size, against organ 2’s coarse mesh and boosted trees on every column pooled.',
  rules: [
    { id: 'F1', kind: 'property', claim: 'each fine node holds only its own columns; the same nodes twice; TEST never read; at least four fine nodes live in each domain', seenBeforeSeal: 'organ 2’s record and verdict' },
    { id: 'F2', kind: 'prediction', claim: 'in both domains the composed TEST score never falls by more than 0.005 as a node joins, and the full fine mesh is at least 0.02 above its first node', seenBeforeSeal: 'no' },
    { id: 'F3', kind: 'prediction', claim: 'in both domains the fine mesh is not worse than organ 2’s coarse mesh by more than 0.005: bound above −0.005', seenBeforeSeal: 'no' },
    { id: 'F4', kind: 'prediction', claim: 'in both domains the fine mesh is within 0.02 of every record pooled: bound above −0.02', seenBeforeSeal: 'no' },
  ],
  disclosure: 'Sealed after organ 2 was judged, knowing its numbers. A finer silo knows less alone, and some will be cut. The expectation written before the run: F2 holds; F3 and F4 are open.',
}, ['src/scale.mjs', 'vendor/living-seed/src/baseline.mjs']);
