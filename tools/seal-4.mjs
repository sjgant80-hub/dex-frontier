#!/usr/bin/env node
// tools/seal-4.mjs — organ 4's pre-registration (grow by working), committed before it is measured.
import { seal } from './organ.mjs';
seal(4, {
  organ: 'organ 4, self-growing — does each node sharpen as its work arrives, and does the mesh with it?',
  scenario: 'FIT records arrive in four cumulative steps: telco in a seeded order (seed 4004; the data carries no dates); shop by month, February–March, then May–June, July–August, September–October. At each step every silo’s node re-grows from everything that has arrived (seed 1), is held to its bar on GATE, and the mesh is re-coupled on GATE; the mesh is scored on TEST.',
  rules: [
    { id: 'D1', kind: 'property', claim: 'each step grows only on what has arrived (scrambling every later record leaves the first step’s nodes unchanged), and each step holds more records than the one before', seenBeforeSeal: 'organ 2’s record and verdict' },
    { id: 'D2', kind: 'prediction', claim: 'in both domains the mesh after the last step scores at least 0.01 AUC higher on TEST than after the first', seenBeforeSeal: 'no' },
    { id: 'D3', kind: 'prediction', claim: 'in both domains no step lowers the mesh’s TEST score by more than 0.005 from the step before', seenBeforeSeal: 'no' },
  ],
  disclosure: 'Sealed after organ 2 was judged. The expectation written before the run: telco sharpens with more customers; the shop may not, because the later months are a different season and the TEST months are the holidays.',
}, ['src/wisp.mjs']);
