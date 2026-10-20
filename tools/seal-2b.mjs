#!/usr/bin/env node
// tools/seal-2b.mjs — organ 2b's pre-registration (the composition fix), committed before it is measured.
import { seal } from './organ.mjs';
seal('2b', {
  organ: 'organ 2b, the composition fix — organ 2 found that nodes grown each on their own did not compose beyond the noise everywhere. Grown to complement each other instead, do they?',
  scenario: 'In each domain, the silo whose node scored best on GATE grows on its own (as in organ 2). Every next silo’s node is co-grown (src/cogrow.mjs): its recipe search — the same seeded search, population 40, elites 8, generations 30 — scores each candidate by the coupled AUC it adds on an inner split of its own FIT rows, given the scores the nodes already in the mesh give those same cases. Only scores cross. A co-grown node joins only if it adds on GATE, out of fold (two folds); it carries the lowest bar a genome may (0.5), because its real gate is what it adds. Then, on TEST: against the best single node (organ 2’s or this one’s), organ 2’s mesh, and every record pooled.',
  rules: [
    { id: 'H1', kind: 'property', claim: 'in both domains every co-grown node that joined adds on GATE out of fold, the mesh holds at least two nodes, the same mesh grows twice, and TEST is never read', seenBeforeSeal: 'organ 2’s record and verdict' },
    { id: 'H2', kind: 'prediction', claim: 'COMPOSITION, RETAKEN: in both domains the co-grown mesh beats the best single node on TEST: bound above 0', seenBeforeSeal: 'no' },
    { id: 'H3', kind: 'prediction', claim: 'in both domains the co-grown mesh is not worse than organ 2’s by more than 0.002: bound above −0.002', seenBeforeSeal: 'no' },
    { id: 'H4', kind: 'prediction', claim: 'in both domains the co-grown mesh is within 0.02 of every record pooled: bound above −0.02', seenBeforeSeal: 'no' },
  ],
  disclosure: 'Designed after organ 2’s verdict, knowing its numbers, which is why it is its own organ; organ 2’s verdict stands as it was. A failed prediction is kept.',
}, ['src/cogrow.mjs', 'src/population.mjs', 'src/wisp.mjs', 'vendor/living-seed/src/baseline.mjs', 'tools/measure-2b.mjs']);
