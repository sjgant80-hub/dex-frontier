// src/fresh4.mjs — two more real public datasets, for organ 2i: test cases none of organs 2 to 2h touched. Downloaded after
// organ 2h was judged, each cut into departments by what its columns mean, every encoding fixed here before any
// measurement. Pure and total: a bad file is refused with its reason, never thrown.
//   · hotel — Hotel booking demand (Antonio, Almeida & Nunes 2019, Data in Brief 22:41–49; CC BY 4.0): 119,390 bookings
//     of a resort hotel (H1) and a city hotel (H2) in Portugal, 2015–2017; cancelled = 1. A stratified seeded sample of
//     about 60,000, drawn before the split. Departments: reservations / guests / sales / stay. Not used, because each is
//     recorded only at arrival or at cancellation and so gives the outcome away: the reservation status and its date, the
//     room assigned, the count of changes to the booking, and the parking spaces (no booking with one was cancelled).
//     The agent's and company's codes are anonymised ids, so only whether there was one is used; the country only as
//     domestic (Portugal) or not recorded. A value outside a column's list is refused; the publisher pads text with spaces,
//     which are trimmed.
//   · news — UCI Online News Popularity (Fernandes, Vinagre & Cortez 2015; CC BY 4.0): 39,644 Mashable articles; popular
//     = 1,400 shares or more, the threshold the dataset's own paper uses. Departments: writing / links / keywords / desk /
//     topics / tone. The url and the days since publication are the dataset's two non-predictive columns and are not used;
//     the weekday is one number (Monday 1 … Sunday 7), not seven flags.
// No department holds more than 13 columns, so a department can take the scores of up to three others beside its own
// within a genome's 16. Each split as the other fresh datasets: a stratified 30% TEST, the rest 75 / 25 FIT / GATE.
import { splitRows } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { FRESH_SPLIT } from './fresh.mjs';

const trim = (v) => (typeof v === 'string' ? v.trim() : v);
const of = (map) => (v) => (Object.hasOwn(map, trim(v)) ? map[trim(v)] : NaN);
const int = (v) => (/^\d+$/.test(trim(v)) ? Number(trim(v)) : NaN);
const real = (v) => (/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(trim(v)) ? Number(trim(v)) : NaN);   // the publisher writes a few near-zero values in exponent form
const isOf = (name, all) => (v) => (trim(v) === name ? 1 : all.includes(trim(v)) ? 0 : NaN);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MEALS = ['BB', 'HB', 'FB', 'SC', 'Undefined'], SEGMENTS = ['Online TA', 'Offline TA/TO', 'Groups', 'Direct', 'Corporate', 'Complementary', 'Aviation', 'Undefined'];
const CHANNELS = ['TA/TO', 'Direct', 'Corporate', 'GDS', 'Undefined'], DEPOSITS = ['No Deposit', 'Non Refund', 'Refundable'], CUSTOMERS = ['Transient', 'Transient-Party', 'Contract', 'Group'];
const ROOMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'L', 'P'];
/** an anonymised id, or NULL for none */
const some = (v) => (trim(v) === 'NULL' ? 0 : /^\d+$/.test(trim(v)) ? 1 : NaN);

/** how each hotel column becomes a number (a value outside its list is refused) */
export const HOTEL_CODES = {
  lead_time: int, arrival_year: int, arrival_month: (v) => (MONTHS.includes(trim(v)) ? MONTHS.indexOf(trim(v)) + 1 : NaN), arrival_week: int, arrival_day: int,
  weekend_nights: int, week_nights: int, waiting_days: int,
  adults: int, children: (v) => (trim(v) === 'NA' ? -1 : int(v)), babies: int, repeated_guest: of({ 0: 0, 1: 1 }), previous_cancellations: int, previous_kept: int,
  domestic: (v) => (/^[A-Z]{2,3}$/.test(trim(v)) ? Number(trim(v) === 'PRT') : trim(v) === 'NULL' ? 0 : NaN), country_unknown: (v) => (trim(v) === 'NULL' ? 1 : /^[A-Z]{2,3}$/.test(trim(v)) ? 0 : NaN),
  contract: isOf('Contract', CUSTOMERS), group: isOf('Group', CUSTOMERS), transient_party: isOf('Transient-Party', CUSTOMERS),
  online_ta: isOf('Online TA', SEGMENTS), offline_ta: isOf('Offline TA/TO', SEGMENTS), groups: isOf('Groups', SEGMENTS), direct: isOf('Direct', SEGMENTS), corporate: isOf('Corporate', SEGMENTS),
  complementary: isOf('Complementary', SEGMENTS), aviation: isOf('Aviation', SEGMENTS), channel_direct: isOf('Direct', CHANNELS), channel_gds: isOf('GDS', CHANNELS),
  non_refund: isOf('Non Refund', DEPOSITS), refundable: isOf('Refundable', DEPOSITS), has_agent: some, has_company: some,
  half_board: isOf('HB', MEALS), full_board: isOf('FB', MEALS), self_catering: (v) => (['SC', 'Undefined'].includes(trim(v)) ? 1 : MEALS.includes(trim(v)) ? 0 : NaN),
  room: (v) => (ROOMS.includes(trim(v)) ? trim(v).charCodeAt(0) - 64 : NaN), adr: real, special_requests: int,
};
const HOTEL_RAW = { lead_time: 'LeadTime', arrival_year: 'ArrivalDateYear', arrival_month: 'ArrivalDateMonth', arrival_week: 'ArrivalDateWeekNumber', arrival_day: 'ArrivalDateDayOfMonth',
  weekend_nights: 'StaysInWeekendNights', week_nights: 'StaysInWeekNights', waiting_days: 'DaysInWaitingList', adults: 'Adults', children: 'Children', babies: 'Babies',
  repeated_guest: 'IsRepeatedGuest', previous_cancellations: 'PreviousCancellations', previous_kept: 'PreviousBookingsNotCanceled', domestic: 'Country', country_unknown: 'Country',
  contract: 'CustomerType', group: 'CustomerType', transient_party: 'CustomerType', online_ta: 'MarketSegment', offline_ta: 'MarketSegment', groups: 'MarketSegment', direct: 'MarketSegment',
  corporate: 'MarketSegment', complementary: 'MarketSegment', aviation: 'MarketSegment', channel_direct: 'DistributionChannel', channel_gds: 'DistributionChannel',
  non_refund: 'DepositType', refundable: 'DepositType', has_agent: 'Agent', has_company: 'Company', half_board: 'Meal', full_board: 'Meal', self_catering: 'Meal',
  room: 'ReservedRoomType', adr: 'ADR', special_requests: 'TotalOfSpecialRequests' };
export const HOTEL_SILOS = {
  reservations: ['lead_time', 'arrival_year', 'arrival_month', 'arrival_week', 'arrival_day', 'weekend_nights', 'week_nights', 'waiting_days'],
  guests: ['adults', 'children', 'babies', 'repeated_guest', 'previous_cancellations', 'previous_kept', 'domestic', 'country_unknown', 'contract', 'group', 'transient_party'],
  sales: ['online_ta', 'offline_ta', 'groups', 'direct', 'corporate', 'complementary', 'aviation', 'channel_direct', 'channel_gds', 'non_refund', 'refundable', 'has_agent', 'has_company'],
  stay: ['city_hotel', 'half_board', 'full_board', 'self_catering', 'room', 'adr', 'special_requests'],
};
export const HOTEL_SAMPLE = { share: 60000 / 119390, seed: 2029 };

/** how each news column becomes a number; the dataset holds no missing values, so every one is a plain number */
export const NEWS_SILOS = {
  writing: ['n_tokens_title', 'n_tokens_content', 'n_unique_tokens', 'n_non_stop_words', 'n_non_stop_unique_tokens', 'average_token_length', 'num_imgs', 'num_videos'],
  links: ['num_hrefs', 'num_self_hrefs', 'self_reference_min_shares', 'self_reference_max_shares', 'self_reference_avg_sharess'],
  keywords: ['num_keywords', 'kw_min_min', 'kw_max_min', 'kw_avg_min', 'kw_min_max', 'kw_max_max', 'kw_avg_max', 'kw_min_avg', 'kw_max_avg', 'kw_avg_avg'],
  desk: ['weekday', 'data_channel_is_lifestyle', 'data_channel_is_entertainment', 'data_channel_is_bus', 'data_channel_is_socmed', 'data_channel_is_tech', 'data_channel_is_world'],
  topics: ['LDA_00', 'LDA_01', 'LDA_02', 'LDA_03', 'LDA_04', 'title_subjectivity', 'title_sentiment_polarity', 'abs_title_subjectivity', 'abs_title_sentiment_polarity'],
  tone: ['global_subjectivity', 'global_sentiment_polarity', 'global_rate_positive_words', 'global_rate_negative_words', 'rate_positive_words', 'rate_negative_words',
    'avg_positive_polarity', 'min_positive_polarity', 'max_positive_polarity', 'avg_negative_polarity', 'min_negative_polarity', 'max_negative_polarity'],
};
export const WEEKDAYS = ['weekday_is_monday', 'weekday_is_tuesday', 'weekday_is_wednesday', 'weekday_is_thursday', 'weekday_is_friday', 'weekday_is_saturday', 'weekday_is_sunday'];
export const POPULAR = 1400;

function finish(ds) {
  const all = Array.from({ length: ds.n }, (_, i) => i), t = splitRows({ y: ds.y }, all, FRESH_SPLIT.test, FRESH_SPLIT.testSeed), g = splitRows(ds, t.rest, FRESH_SPLIT.gate, FRESH_SPLIT.gateSeed);
  return { ok: true, ...ds, fitRows: g.rest, gateRows: g.held, testRows: t.held };
}

/** a comma-separated file with a header row; the cells as the publisher wrote them, the header's names trimmed */
function table(text, what) {
  const lines = String(text).split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { ok: false, error: 'no ' + what };
  const head = lines[0].split(',').map((h) => h.trim()), rows = [];
  for (let k = 1; k < lines.length; k++) { const c = lines[k].split(','); if (c.length !== head.length) return { ok: false, error: what.replace(/s$/, '') + ' ' + k + ' has ' + c.length + ' cells, not ' + head.length }; rows.push(Object.fromEntries(head.map((h, j) => [h, c[j]]))); }
  return { ok: true, head, rows };
}

/** the bookings of both hotels, the resort's first: each a row of the raw cells with the hotel it came from */
export function hotelRows(resort, city) {
  const a = table(resort, 'bookings'), b = table(city, 'bookings');
  if (!a.ok) return { ok: false, error: 'the resort hotel: ' + a.error };
  if (!b.ok) return { ok: false, error: 'the city hotel: ' + b.error };
  if (a.head.join() !== b.head.join()) return { ok: false, error: 'the two hotels’ files have different columns' };
  const need = [...new Set([...Object.values(HOTEL_RAW), 'IsCanceled'])], missing = need.filter((c) => !a.head.includes(c));
  if (missing.length) return { ok: false, error: 'missing columns: ' + missing.join(', ') };
  return { ok: true, rows: [...a.rows.map((r) => ({ ...r, Hotel: 'Resort' })), ...b.rows.map((r) => ({ ...r, Hotel: 'City' }))] };
}

/** a booking's numbers, or the first column that is not readable */
export function hotelBooking(row) {
  const out = { city_hotel: row.Hotel === 'City' ? 1 : row.Hotel === 'Resort' ? 0 : NaN };
  if (!Number.isFinite(out.city_hotel)) return { error: 'city_hotel' };
  for (const [f, code] of Object.entries(HOTEL_CODES)) { const v = code(row[HOTEL_RAW[f]]); if (!Number.isFinite(v)) return { error: f }; out[f] = v; }
  const y = of({ 0: 0, 1: 1 })(row.IsCanceled);
  return Number.isFinite(y) ? { x: out, y } : { error: 'the outcome' };
}

/** both hotels: the sample first (stratified, seeded, from every booking), then the split */
export function loadHotel(resort, city) {
  const h = hotelRows(resort, city);
  if (!h.ok) return h;
  const xs = [], ys = [];
  for (const [k, r] of h.rows.entries()) { const b = hotelBooking(r); if (b.error) return { ok: false, error: 'booking ' + (k + 1) + ': ' + b.error + ' is not readable' }; xs.push(b.x); ys.push(b.y); }
  const keep = splitRows({ y: Uint8Array.from(ys) }, xs.map((_, i) => i), HOTEL_SAMPLE.share, HOTEL_SAMPLE.seed).held.sort((a, b) => a - b);
  const features = Object.values(HOTEL_SILOS).flat(), n = keep.length, cols = Object.fromEntries(features.map((f) => [f, Float64Array.from(keep, (i) => xs[i][f])]));
  return finish({ name: 'hotel', title: 'Hotel bookings', outcome: 'cancelled', features, n, cols, y: Uint8Array.from(keep, (i) => ys[i]), silos: HOTEL_SILOS, all: xs.length, picked: keep });
}

/** an article's numbers, or the first column that is not readable; the weekday from its seven flags (exactly one set) */
export function newsArticle(row) {
  const out = {};
  for (const f of Object.values(NEWS_SILOS).flat().filter((f) => f !== 'weekday')) { const v = real(row[f]); if (!Number.isFinite(v)) return { error: f }; out[f] = v; }
  const days = WEEKDAYS.map((d) => real(row[d]));
  if (!days.every((v) => v === 0 || v === 1) || days.reduce((a, v) => a + v, 0) !== 1) return { error: 'weekday' };
  out.weekday = days.indexOf(1) + 1;
  const shares = real(row.shares);
  return Number.isFinite(shares) && shares >= 0 ? { x: out, y: Number(shares >= POPULAR) } : { error: 'the outcome' };
}

export function newsRows(csv) {
  const t = table(csv, 'articles');
  if (!t.ok) return t;
  const need = [...Object.values(NEWS_SILOS).flat().filter((f) => f !== 'weekday'), ...WEEKDAYS, 'shares'], missing = need.filter((c) => !t.head.includes(c));
  return missing.length ? { ok: false, error: 'missing columns: ' + missing.join(', ') } : t;
}

export function loadNews(csv) {
  const t = newsRows(csv);
  if (!t.ok) return t;
  const xs = [], ys = [];
  for (const [k, r] of t.rows.entries()) { const a = newsArticle(r); if (a.error) return { ok: false, error: 'article ' + (k + 1) + ': ' + a.error + ' is not readable' }; xs.push(a.x); ys.push(a.y); }
  const features = Object.values(NEWS_SILOS).flat(), n = xs.length, cols = Object.fromEntries(features.map((f) => [f, Float64Array.from(xs, (x) => x[f])]));
  return finish({ name: 'news', title: 'News articles', outcome: 'popular (1,400 shares or more)', features, n, cols, y: Uint8Array.from(ys), silos: NEWS_SILOS });
}
