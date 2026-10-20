// tools/contest.mjs — the head-to-head, defined once, pinned by the seals: which TEST cases the language models are
// asked (per domain: 100 that ended in the outcome and 200 that did not, seeded), the 24 FIT cases they are shown first,
// the exact prompt, and how a reply is read. Every model sees every column of the domain — more than any one node does.
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

export const LOCAL = 'qwen2.5:14b';                         // the largest model this laptop runs
export const FRONTIER = 'claude-opus-5-5';                   // a frontier model, asked cold by a fresh subagent
export const SEEDS = { telco: [3101, 3102, 3103], shop: [3201, 3202, 3203] };
export const SHOTS = { telco: [41, 42, 43], shop: [51, 52, 53] };

export const TEXT = {
  telco: {
    head: 'You are predicting whether a telecom customer leaves the company (churns). The data are real customers of one telecom company (IBM\x27s Telco Customer Churn sample). Each customer is described by:',
    yes: 'churned', no: 'stayed', ask: 'What is the probability, from 0 to 100, that this customer churns? Reply with one number only.',
    features: {
      gender: '1 = female, 0 = male', SeniorCitizen: '1 = a senior citizen', Partner: '1 = has a partner', Dependents: '1 = has dependents',
      PhoneService: '1 = has phone service', MultipleLines: '1 = has several phone lines', InternetService: '0 = none, 1 = DSL, 2 = fibre optic',
      OnlineSecurity: '1 = pays for online security', OnlineBackup: '1 = pays for online backup', DeviceProtection: '1 = pays for device protection',
      TechSupport: '1 = pays for tech support', StreamingTV: '1 = streams TV', StreamingMovies: '1 = streams films',
      tenure: 'months as a customer', Contract: '0 = month to month, 1 = one year, 2 = two years', PaperlessBilling: '1 = paperless billing',
      ElectronicCheck: '1 = pays by electronic cheque', AutoPay: '1 = pays by automatic bank transfer or card', MonthlyCharges: 'monthly bill in dollars', TotalCharges: 'total billed so far in dollars',
    },
  },
  shop: {
    head: 'You are predicting whether a visit to an online shop ends in a purchase. The data are real sessions on one retail website (the UCI Online Shoppers Purchasing Intention dataset). Each session is described by:',
    yes: 'purchase', no: 'no purchase', ask: 'What is the probability, from 0 to 100, that this session ends in a purchase? Reply with one number only.',
    features: {
      Administrative: 'account-management pages visited', Administrative_Duration: 'seconds on them', Informational: 'information pages visited', Informational_Duration: 'seconds on them',
      ProductRelated: 'product pages visited', ProductRelated_Duration: 'seconds on them', BounceRates: 'average bounce rate of the pages (0 to 1)', ExitRates: 'average exit rate of the pages (0 to 1)',
      PageValues: 'average value of the pages visited before a transaction', SpecialDay: 'closeness to a special day such as Valentine\x27s Day (0 to 1)',
      OperatingSystems: 'operating system (a code)', Browser: 'browser (a code)', Region: 'region (a code)', TrafficType: 'how the visitor arrived (a code)',
      VisitorType: '1 = returning, 0 = new, 0.5 = other', Weekend: '1 = at the weekend',
    },
  },
};

function draw(rows, k, seed) {
  const r = rng(seed), xs = rows.slice();
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs.slice(0, k);
}

/** the 300 TEST cases every language model is graded on, in one seeded order */
export function sampleOf(ds) {
  const [a, b, c] = SEEDS[ds.name], yes = ds.testRows.filter((i) => ds.y[i] === 1), no = ds.testRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, 100, a), ...draw(no, 200, b)], 300, c);
}

/** the 24 FIT cases shown first: 12 with the outcome, 12 without, in a seeded order */
export function examplesOf(ds) {
  const [a, b, c] = SHOTS[ds.name], yes = ds.fitRows.filter((i) => ds.y[i] === 1), no = ds.fitRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, 12, a), ...draw(no, 12, b)], 24, c).map((i) => ({ line: caseLine(ds, i), outcome: ds.y[i] === 1 }));
}

/** one case as the models read it: every column of the domain by name with its value */
export const caseLine = (ds, i) => ds.features.map((f) => f + '=' + ds.cols[f][i]).join(', ');

/** the exact prompt: the columns explained, the 24 examples, then the case (one long shared prefix) */
export function promptFor(ds, line, examples) {
  const t = TEXT[ds.name];
  return t.head + '\n' + ds.features.map((f) => '- ' + f + ': ' + t.features[f]).join('\n') + '\n\nHere are 24 past cases and what happened:\n'
    + examples.map((e) => e.line + ' -> ' + (e.outcome ? t.yes : t.no)).join('\n') + '\n\nCase: ' + line + '\n' + t.ask;
}

/** a reply as a probability in [0, 1]: its first number, if it lies in 0 … 100 — else null, scored as a coin (0.5) */
export function parseProbability(reply) {
  const m = /-?\d+(?:\.\d+)?/.exec(String(reply));
  const v = m ? Number(m[0]) : NaN;
  return v >= 0 && v <= 100 ? Math.round(v * 1e4) / 1e6 : null;
}
