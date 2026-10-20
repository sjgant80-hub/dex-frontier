#!/usr/bin/env node
// tools/seal-7.mjs — organ 7's pre-registration (sovereign spread), committed before it is measured.
import { seal } from './organ.mjs';
seal(7, {
  organ: 'organ 7, sovereign spread — each node owned by its contributor, carried by a card, accounted for, revocable without touching anyone else, and talking in scores only.',
  scenario: 'Organ 2’s live nodes. Each node’s sealed genome becomes a card (living-seed’s: the genome in the pixels of a PNG) and is read back and grown again on its silo; a device that trusts only a stranger’s key reads the same card; one bit of the card is flipped. The ledger: each node’s two-fold out-of-fold contribution to the coupled GATE AUC and its share of the positive contributions. Each node in turn is revoked: the coupling re-learns on GATE without it, the mesh answers every TEST case, and the other nodes are grown again from scratch without it. One answer’s message is counted.',
  rules: [
    { id: 'G1', kind: 'property', claim: 'every live node’s card comes back byte for byte and grows the identical organism; an untrusted maker’s card is refused; a changed card is refused', seenBeforeSeal: 'organ 2’s record and verdict' },
    { id: 'G2', kind: 'property', claim: 'revoking any one node, the mesh still answers every TEST case, and every other node grows the same without it', seenBeforeSeal: 'no' },
    { id: 'G3', kind: 'property', claim: 'one answer crosses as one score per live node, under 64 bytes: no record crosses', seenBeforeSeal: 'no' },
    { id: 'G4', kind: 'prediction', claim: 'the ledger pays for real value: in both domains the nodes ranked by their GATE contribution rank the same as by the TEST score lost when each is revoked (Spearman ≥ 0.8)', seenBeforeSeal: 'no' },
  ],
  disclosure: 'Sealed after organ 2 was judged. With two or three nodes a domain, rank agreement is coarse: it means the ranking is exactly right.',
}, ['src/spread.mjs', 'src/wisp.mjs', 'vendor/living-seed/src/card.mjs']);
