#!/usr/bin/env node
// tools/contest-2i.mjs — organ 2i's frontier rival, defined once and pinned by its seal, as organs 2g and 2h's: 1,200 TEST
// cases a domain (400 that ended in the outcome, 800 that did not, seeded), asked in four batches of 300, each batch a fresh
// cold subagent (Claude Opus 5.5) that sees only its prompt: the fields explained, the same 24 FIT cases, then its 300.
// Each case is one line of values in the order the fields are listed, so a batch stays near a hundred thousand
// characters: the hotel's bookings in the dataset's own words (every column the departments hold between them, and also
// the full country code and the agent's and company's ids, which the departments hold only as domestic or not and as
// whether there was one — an advantage the frontier model is given, and said); the news articles as the dataset's
// statistics, a long decimal to four significant figures and a value under a millionth as 0.
//   node tools/contest-2i.mjs prompt <hotel|news> <1-4>          → data/llm/frontier-<domain>-<batch>.prompt.txt
//   node tools/contest-2i.mjs record <hotel|news> <1-4> <reply>  → data/llm/frontier-<domain>-<batch>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { rng } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { loadHotel, hotelRows, loadNews } from '../src/fresh4.mjs';
import { FRONTIER, parseProbability } from './contest.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const DOMAINS = ['hotel', 'news'], BATCH = 300, CASES = { yes: 400, no: 800 };
export const SEEDS = { hotel: [3901, 3902, 3903], news: [4001, 4002, 4003] };
export const SHOTS = { hotel: [121, 122, 123], news: [131, 132, 133] };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** a number as the prompt shows it: whole as written, a long decimal to four significant figures, a value under a millionth as 0 */
export const shown = (v) => (Number.isInteger(v) ? String(v) : Math.abs(v) < 1e-6 ? '0' : String(Number(v.toPrecision(4))));

const NEWS_WORDS = {
  n_tokens_title: 'words in the title', n_tokens_content: 'words in the article', n_unique_tokens: 'share of the words that are unique', n_non_stop_words: 'share of non-stop words', n_non_stop_unique_tokens: 'share of unique non-stop words',
  average_token_length: 'average word length', num_imgs: 'images', num_videos: 'videos', num_hrefs: 'links', num_self_hrefs: 'links to other Mashable articles',
  self_reference_min_shares: 'fewest shares of a Mashable article it links to', self_reference_max_shares: 'most shares of a Mashable article it links to', self_reference_avg_sharess: 'average shares of the Mashable articles it links to',
  num_keywords: 'keywords in its metadata', kw_min_min: 'worst keyword: fewest shares', kw_max_min: 'worst keyword: most shares', kw_avg_min: 'worst keyword: average shares',
  kw_min_max: 'best keyword: fewest shares', kw_max_max: 'best keyword: most shares', kw_avg_max: 'best keyword: average shares', kw_min_avg: 'average keyword: fewest shares', kw_max_avg: 'average keyword: most shares', kw_avg_avg: 'average keyword: average shares',
  weekday: 'day published', data_channel_is_lifestyle: '1 = Lifestyle channel', data_channel_is_entertainment: '1 = Entertainment channel', data_channel_is_bus: '1 = Business channel', data_channel_is_socmed: '1 = Social Media channel', data_channel_is_tech: '1 = Tech channel', data_channel_is_world: '1 = World channel',
  LDA_00: 'closeness to topic 0 (of five topics found by LDA)', LDA_01: 'closeness to topic 1', LDA_02: 'closeness to topic 2', LDA_03: 'closeness to topic 3', LDA_04: 'closeness to topic 4',
  title_subjectivity: 'title subjectivity (0–1)', title_sentiment_polarity: 'title polarity (−1 to 1)', abs_title_subjectivity: 'how far the title’s subjectivity is from neutral', abs_title_sentiment_polarity: 'title polarity, unsigned',
  global_subjectivity: 'article subjectivity (0–1)', global_sentiment_polarity: 'article polarity (−1 to 1)', global_rate_positive_words: 'share of positive words', global_rate_negative_words: 'share of negative words',
  rate_positive_words: 'positive words among the non-neutral', rate_negative_words: 'negative words among the non-neutral', avg_positive_polarity: 'average polarity of its positive words', min_positive_polarity: 'least positive word', max_positive_polarity: 'most positive word',
  avg_negative_polarity: 'average polarity of its negative words', min_negative_polarity: 'most negative word', max_negative_polarity: 'least negative word',
};

export const TEXT = {
  hotel: {
    head: 'You are predicting whether a hotel booking is cancelled. The data are real bookings at two hotels in Portugal, a resort hotel and a city hotel, with arrivals from July 2015 to August 2017 (the hotel booking demand datasets of Antonio, Almeida and Nunes, 2019). Each booking is one line of values, in this order:',
    yes: 'cancelled', no: 'not cancelled', fields: {
      Hotel: 'which hotel (Resort or City)', LeadTime: 'days between booking and arrival', ArrivalDateYear: 'arrival year', ArrivalDateMonth: 'arrival month', ArrivalDateWeekNumber: 'arrival week of the year', ArrivalDateDayOfMonth: 'arrival day of the month',
      StaysInWeekendNights: 'weekend nights booked', StaysInWeekNights: 'week nights booked', Adults: 'adults', Children: 'children (NA = not recorded)', Babies: 'babies',
      Meal: 'meal plan (BB bed and breakfast, HB half board, FB full board, SC or Undefined no meals)', Country: 'country of origin (ISO code; NULL = not recorded)', MarketSegment: 'market segment (TA travel agent, TO tour operator)', DistributionChannel: 'distribution channel',
      IsRepeatedGuest: '1 = has stayed before', PreviousCancellations: 'earlier bookings this guest cancelled', PreviousBookingsNotCanceled: 'earlier bookings this guest kept', ReservedRoomType: 'room type reserved (a code)', DepositType: 'deposit',
      Agent: 'booking agent (an anonymised id; NULL = none)', Company: 'company paying (an anonymised id; NULL = none)', DaysInWaitingList: 'days on the waiting list before confirmation', CustomerType: 'customer type', ADR: 'average daily rate (euros)', TotalOfSpecialRequests: 'special requests made',
    },
  },
  news: {
    head: 'You are predicting whether an article published by Mashable becomes popular: shared 1,400 times or more. The data are real statistics of Mashable articles from 2013 and 2014 (the UCI Online News Popularity dataset; the text itself is not included). Each article is one line of values, in this order:',
    yes: 'popular', no: 'not popular', fields: NEWS_WORDS,
  },
};

/** the domain loaded, with each row's fields as the prompt shows them (row i is the loader's row i) */
export function load(domain) {
  if (domain === 'hotel') {
    const r1 = read('data/hotel-H1.csv'), r2 = read('data/hotel-H2.csv'), ds = loadHotel(r1, r2), rows = hotelRows(r1, r2).rows;
    return { ds, raw: ds.picked.map((i) => Object.fromEntries(Object.keys(TEXT.hotel.fields).map((f) => [f, String(rows[i][f]).trim()]))) };
  }
  const csv = read('data/OnlineNewsPopularity.csv'), ds = loadNews(csv);
  return { ds, raw: Array.from({ length: ds.n }, (_, i) => Object.fromEntries(Object.keys(NEWS_WORDS).map((f) => [f, f === 'weekday' ? DAYS[ds.cols.weekday[i] - 1] : shown(ds.cols[f][i])]))) };
}

function draw(rows, k, seed) {
  const r = rng(seed), xs = rows.slice();
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs.slice(0, k);
}

/** the 1,200 TEST cases the frontier model is graded on, in one seeded order; batch b is cases 300b+1 … 300b+300 */
export function sampleOf(ds) {
  const [a, b, c] = SEEDS[ds.name], yes = ds.testRows.filter((i) => ds.y[i] === 1), no = ds.testRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, CASES.yes, a), ...draw(no, CASES.no, b)], CASES.yes + CASES.no, c);
}
export const batchOf = (ds, b) => sampleOf(ds).slice(b * BATCH, (b + 1) * BATCH);

/** the 24 FIT cases shown first in every batch: 12 with the outcome, 12 without, in a seeded order */
export function examplesOf(ds) {
  const [a, b, c] = SHOTS[ds.name], yes = ds.fitRows.filter((i) => ds.y[i] === 1), no = ds.fitRows.filter((i) => ds.y[i] === 0);
  return draw([...draw(yes, 12, a), ...draw(no, 12, b)], 24, c);
}

export const caseLine = (name, row) => Object.keys(TEXT[name].fields).map((f) => row[f]).join(', ');

/** batch b's prompt: the fields explained in order, the 24 examples, then its 300 cases numbered 1 … 300 */
export function batchPrompt(ds, raw, b) {
  const t = TEXT[ds.name];
  return t.head + '\n' + Object.entries(t.fields).map(([f, d], k) => (k + 1) + '. ' + f + ': ' + d).join('\n') + '\n\nHere are 24 past cases and what happened:\n'
    + examplesOf(ds).map((i) => caseLine(ds.name, raw[i]) + ' -> ' + (ds.y[i] ? t.yes : t.no)).join('\n') + '\n\nNow 300 new cases. For each, give the probability from 0 to 100 that the answer is ' + t.yes + '.\n'
    + batchOf(ds, b).map((i, k) => (k + 1) + '. ' + caseLine(ds.name, raw[i])).join('\n')
    + '\n\nAnswer from this text alone: use no tools and read no files. Reply with exactly 300 lines and nothing else, one per case in order, each "<case number>: <probability>".';
}

/** read a batch's reply: line "n: p" for every case n; a missing or unreadable one is null (scored as a coin) */
export function readReply(ds, reply, b) {
  const got = new Map();
  for (const line of String(reply).split(/\r?\n/)) { const m = /^\s*(\d+)\s*[:.)-]\s*(.+)$/.exec(line); if (m) got.set(Number(m[1]), parseProbability(m[2])); }
  return batchOf(ds, b).map((row, k) => ({ row, p: got.has(k + 1) ? got.get(k + 1) : null }));
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/contest-2i.mjs');
if (isMain) {
  const [what, domain, batch, file] = process.argv.slice(2), b = Number(batch) - 1;
  if (!['prompt', 'record'].includes(what) || !DOMAINS.includes(domain) || !(b >= 0 && b < 4)) { console.log('usage: node tools/contest-2i.mjs <prompt|record> <hotel|news> <1-4> [reply file]'); process.exit(2); }
  const { ds, raw } = load(domain), prompt = batchPrompt(ds, raw, b), name = 'data/llm/frontier-' + domain + '-' + (b + 1);
  mkdirSync(new URL('data/llm/', ROOT), { recursive: true });
  if (what === 'prompt') { writeFileSync(new URL(name + '.prompt.txt', ROOT), prompt + '\n'); console.log('wrote ' + name + '.prompt.txt · ' + prompt.length + ' chars · ' + sha256Hex(prompt).slice(0, 16)); }
  else {
    const reply = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), calls = readReply(ds, reply, b);
    writeFileSync(new URL(name + '.json', ROOT), JSON.stringify({ kind: 'dex-frontier.frontier-answers', v: 1, domain, batch: b + 1, model: { name: FRONTIER, asked: 'a fresh Claude Code subagent, cold: this prompt only, no tools' }, prompt: sha256Hex(prompt).slice(0, 16), reply, calls }, null, 1) + '\n');
    console.log('recorded ' + calls.filter((c) => c.p !== null).length + ' of 300 readable answers');
  }
}
