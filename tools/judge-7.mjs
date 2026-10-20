#!/usr/bin/env node
// tools/judge-7.mjs — organ 7, sovereign spread, judged by its sealed rules.   --write | --check
import { judgeMain, isMain, both, say } from './organ.mjs';
export const RULES = {
  G1: (r) => ({ pass: both(r, (d) => d.cards.every((c) => c.roundTrip && c.sameOrganism && c.untrustedRefused && c.changedRefused)), saw: say(r, (d) => d.cards.map((c) => c.node + ' card ' + c.cardBytes + ' bytes, back the same: ' + c.roundTrip + ', regrown identical: ' + c.sameOrganism + ', untrusted refused: ' + c.untrustedRefused + ', changed refused: ' + c.changedRefused).join('; ')) }),
  G2: (r) => ({ pass: both(r, (d) => d.revoked.every((x) => x.ok && x.answered && x.othersUnchanged)), saw: say(r, (d) => d.revoked.map((x) => 'without ' + x.node + ' ' + x.testAuc + ' (others regrown identical: ' + x.othersUnchanged + ')').join('; ')) }),
  G3: (r) => ({ pass: both(r, (d) => d.answer.onlyScores && d.answer.bytes < 64), saw: say(r, (d) => 'one answer crosses as ' + d.answer.numbers + ' scores in ' + d.answer.bytes + ' bytes') }),
  G4: (r) => ({ pass: both(r, (d) => d.ledgerTracksValue >= 0.8), saw: say(r, (d) => 'ledger ' + d.ledger.map((x) => x.node + ' ' + x.share).join(', ') + '; rank agreement with the TEST loss on revoking: ' + d.ledgerTracksValue) }),
};
if (isMain(import.meta.url, 'judge-7.mjs')) judgeMain(7, RULES);
