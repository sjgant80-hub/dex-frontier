#!/usr/bin/env node
// tools/seal-3.mjs — organ 3's pre-registration (breeding), committed before it is measured.
import { seal } from './organ.mjs';
seal(3, {
  organ: 'organ 3, breeding (μ ⋈κ f 𝟙) — does a gated, breeding population of nodes on each silo grow a mesh that beats organ 2’s on cases none of them saw?',
  scenario: 'Every silo organ 2 found live gets six founders from six contributors (seeds 1–6; founder 1 is organ 2’s node). Four generations of six breedings: parents picked with probability by rank of their GATE score (f); the child is the parents’ genomes crossed rule by rule (⋈) and, half the time, changed once (μ); sealed naming both parents; born only if it beats both on GATE (𝟙); the population keeps its six best. On TEST: the mesh of each silo’s champion, coupled on GATE as in organ 2, against organ 2’s mesh.',
  rules: [
    { id: 'C1', kind: 'property', claim: 'every child born beat both parents on GATE and names both; no silo’s best GATE score ever fell; at least one child is born in each domain; the same population twice; TEST never read', seenBeforeSeal: 'organ 2’s record and verdict' },
    { id: 'C2', kind: 'prediction', claim: 'in both domains the mesh of bred champions beats organ 2’s mesh on TEST: bound above 0', seenBeforeSeal: 'no' },
    { id: 'C3', kind: 'prediction', claim: 'in every live silo, the bred champion is not worse on TEST than the best founder by more than 0.005', seenBeforeSeal: 'no' },
  ],
  disclosure: 'Sealed after organ 2 was judged, knowing its numbers. The expectation written before the run: the gate makes GATE climb by construction, and whether that climb survives on TEST is the open question — living-seed’s organ 4 saw evolution climb on its validation slice and fall on unseen cases, so C2 may well fail.',
}, ['src/population.mjs']);
