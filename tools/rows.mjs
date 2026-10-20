// tools/rows.mjs — one line per organ (what it had to show, its sealed rules, what happened), written from the records.
// The README table, llms.txt and the white paper all read these same rows.
import { format } from './format.mjs';

const STATE = (R, k) => (R[k] ? R[k].v.filter((v) => v.pass).length + ' of ' + R[k].v.length + ' sealed rules held' : 'sealed, being measured');

export function organRows(R) {
  const r1 = R['1'] && R['1'].r, r2 = R['2'] && R['2'].r;
  return [
    ['1', 'One specialist body', 'one department’s node against a 14B and a frontier model', STATE(R, '1'), r1 ? 'the 7-column node ' + format(r1.local.vs.a, 3) + ' vs the 14B ' + format(r1.local.vs.b, 3) + ' and the frontier ' + format(r1.frontier.vs.b, 3) + ' on 300 customers' : 'being asked'],
    ['2', 'The composition proof', 'specialists compose into more than the sum, before anything scales', STATE(R, '2'), r2 ? 'composed ' + format(r2.telco.composedAuc, 3) + ' / ' + format(r2.shop.composedAuc, 3) + ' vs best node ' + format(r2.telco.vsBest.b, 3) + ' / ' + format(r2.shop.vsBest.b, 3) + ' vs every record pooled ' + format(r2.telco.monolith.boosted.vs.b, 3) + ' / ' + format(r2.shop.monolith.boosted.vs.b, 3) + ' (telecom / shop)' : 'being asked'],
    ...[['2b', 'The composition fix', 'taken only if organ 2 finds composition does not net: nodes grown to complement', (r) => 'fixed mesh ' + format(r.telco.C.auc, 3) + ' / ' + format(r.shop.C.auc, 3) + ' vs best node ' + format(r.telco.best.testAuc, 3) + ' / ' + format(r.shop.best.testAuc, 3)],
      ['3', 'Breeding', 'a bred child beats both parents on cases neither saw; the population grows a better mesh', (r) => 'bred mesh ' + format(r.telco.bredMeshAuc, 3) + ' / ' + format(r.shop.bredMeshAuc, 3) + ' vs first ' + format(r.telco.firstMeshAuc, 3) + ' / ' + format(r.shop.firstMeshAuc, 3)],
      ['4', 'Growing by working', 'each node sharpens as its records arrive', (r) => format(r.telco.firstToLast.from, 3) + ' → ' + format(r.telco.firstToLast.to, 3) + ' / ' + format(r.shop.firstToLast.from, 3) + ' → ' + format(r.shop.firstToLast.to, 3)],
      ['5', 'The wisp', 'routing that learns from outcomes; a node gone bad is pruned', (r) => 'after a break, wisp ' + format(r.telco.broken.wispLate, 3) + ' / ' + format(r.shop.broken.wispLate, 3) + ' vs frozen ' + format(r.telco.broken.frozenLate, 3) + ' / ' + format(r.shop.broken.frozenLate, 3)],
      ['6', 'Scale', 'cut finer, more nodes: the composed answer keeps climbing', (r) => 'fine mesh ' + format(r.telco.fineAuc, 3) + ' / ' + format(r.shop.fineAuc, 3) + ' vs pooled ' + format(r.telco.vsMonolith.b, 3) + ' / ' + format(r.shop.vsMonolith.b, 3)],
      ['7', 'Sovereign spread', 'owned by contributors, carried by cards, revocable, scores only', (r) => 'cards round-trip; ' + r.telco.answer.bytes + ' / ' + r.shop.answer.bytes + ' bytes an answer']]
      .map(([k, name, what, said]) => [k, name, what, R[k] ? STATE(R, k) : k === '2b' ? 'not taken unless needed' : 'built; sealed only after organ 2 is judged', R[k] ? said(R[k].r) : '—']),
  ];
}
