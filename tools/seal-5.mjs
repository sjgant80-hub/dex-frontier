#!/usr/bin/env node
// tools/seal-5.mjs — organ 5's pre-registration (the wisp), committed before it is measured.
import { seal } from './organ.mjs';
seal(5, {
  organ: 'organ 5, the wisp — does routing that learns from outcomes keep the mesh right when a node goes bad, and cost nothing when none does?',
  scenario: 'Each domain’s TEST cases arrive as a stream (telco in a seeded order, seed 5005; shop in the file’s order), answered in windows of 300, each window’s outcomes known after it. Frozen: the coupling learned on GATE, never changed. Learning: re-learned before each window from GATE and every outcome so far. Half-way, the domain’s strongest node goes bad (its scores turn to noise on their own scale, seed 55): the frozen mesh against the learning mesh that may also prune a node whose two-fold out-of-fold contribution to the last 900 outcomes is not above zero.',
  rules: [
    { id: 'E1', kind: 'property', claim: 'the first window is answered the same by every mesh (no outcome is known yet); the broken node is untouched before the break; the learning mesh prunes it after the break in both domains; the same run twice', seenBeforeSeal: 'organ 2’s record and verdict' },
    { id: 'E2', kind: 'prediction', claim: 'in both domains, after the break, the learning-and-pruning mesh beats the frozen mesh on the stream’s second half: bound above 0', seenBeforeSeal: 'no' },
    { id: 'E3', kind: 'prediction', claim: 'in both domains with no break, learning costs nothing: it is not worse than frozen on the second half by more than 0.005 (bound above −0.005)', seenBeforeSeal: 'no' },
  ],
  disclosure: 'Sealed after organ 2 was judged. The broken node is a simulation of a failure or a take-over, said plainly. The expectation written before the run: E2 holds (the frozen mesh keeps trusting noise); E3 is open on the shop, where December differs from November.',
}, ['src/wisp.mjs']);
