// fresh4.test.mjs — organ 2i's datasets are read one way, sampled and split one way, and refused when wrong. Structure only:
// no test here scores a held-out row, so nothing here can steer a measurement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadHotel, hotelRows, hotelBooking, loadNews, newsRows, newsArticle, HOTEL_CODES, HOTEL_SILOS, HOTEL_SAMPLE, NEWS_SILOS, WEEKDAYS, POPULAR } from '../src/fresh4.mjs';
import { silo } from '../src/silos.mjs';
import { MAXFEATS } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';

const at = (p) => new URL('../data/' + p, import.meta.url);
const H1 = readFileSync(at('hotel-H1.csv'), 'utf8'), H2 = readFileSync(at('hotel-H2.csv'), 'utf8'), NEWS = readFileSync(at('OnlineNewsPopularity.csv'), 'utf8');
const H = loadHotel(H1, H2), N = loadNews(NEWS), HR = hotelRows(H1, H2);
const disjoint = (ds) => { const all = [...ds.fitRows, ...ds.gateRows, ...ds.testRows]; return new Set(all).size === all.length && all.length === ds.n; };
const rate = (ds, rows) => rows.reduce((a, i) => a + ds.y[i], 0) / rows.length;
const row = (ds, i) => Object.fromEntries(ds.features.map((f) => [f, ds.cols[f][i]]));
const lines = (t) => t.split(/\r?\n/).filter(Boolean);

test('the files are the ones downloaded, byte for byte, as data/fresh4-sources.json records', () => {
  const src = JSON.parse(readFileSync(at('fresh4-sources.json'), 'utf8'));
  for (const f of src.files) assert.equal(createHash('sha256').update(readFileSync(new URL('../' + f.path, import.meta.url))).digest('hex'), f.sha256, f.path);
  assert.deepEqual(src.files.map((f) => f.licence), ['CC BY 4.0', 'CC BY 4.0', 'CC BY 4.0']);
  assert.deepEqual(src.files.map((f) => f.rows), [40060, 79330, 39644]);
});

test('hotel: 119,390 real bookings read, a stratified 59,999 sampled, 39 features in four departments, the first booking exactly', () => {
  assert.ok(H.ok, H.error);
  assert.equal(H.all, 119390); assert.equal(H.n, 59999);
  assert.deepEqual(H.features, Object.values(HOTEL_SILOS).flat());
  assert.deepEqual(Object.fromEntries(Object.entries(HOTEL_SILOS).map(([k, v]) => [k, v.length])), { reservations: 8, guests: 11, sales: 13, stay: 7 });
  assert.equal(H.y.reduce((a, v) => a + v, 0), 22224);
  assert.ok(Math.abs(22224 / 59999 - 44224 / 119390) < 0.0005, 'the sample keeps the share cancelled');
  assert.deepEqual(HOTEL_SAMPLE, { share: 60000 / 119390, seed: 2029 });
  const r = HR, first = hotelBooking(r.rows[0]);
  assert.deepEqual(first, { y: 0, x: { city_hotel: 0, lead_time: 342, arrival_year: 2015, arrival_month: 7, arrival_week: 27, arrival_day: 1, weekend_nights: 0, week_nights: 0, waiting_days: 0,
    adults: 2, children: 0, babies: 0, repeated_guest: 0, previous_cancellations: 0, previous_kept: 0, domestic: 1, country_unknown: 0, contract: 0, group: 0, transient_party: 0,
    online_ta: 0, offline_ta: 0, groups: 0, direct: 1, corporate: 0, complementary: 0, aviation: 0, channel_direct: 1, channel_gds: 0, non_refund: 0, refundable: 0, has_agent: 0, has_company: 0,
    half_board: 0, full_board: 0, self_catering: 0, room: 3, adr: 0, special_requests: 0 } });
  assert.equal(r.rows.length, 119390); assert.equal(r.rows[40060].Hotel, 'City'); assert.equal(r.rows[40059].Hotel, 'Resort');
  assert.deepEqual(H.picked.slice(0, 5), [3, 7, 10, 17, 19], 'the draw, pinned');
  for (const k of [0, 1, 2, 59998]) assert.deepEqual(row(H, k), Object.fromEntries(H.features.map((f) => [f, hotelBooking(r.rows[H.picked[k]]).x[f]])), 'sampled row ' + k + ' is the booking it was drawn from');
  assert.ok(disjoint(H)); assert.deepEqual([H.fitRows.length, H.gateRows.length, H.testRows.length], [31501, 10499, 17999]);
  for (const rows of [H.fitRows, H.gateRows, H.testRows]) assert.ok(Math.abs(rate(H, rows) - 22224 / 59999) < 0.002, 'stratified');
  for (const [name, feats] of Object.entries(HOTEL_SILOS)) { assert.deepEqual(Object.keys(silo(H, name).cols), feats); assert.ok(feats.length <= MAXFEATS - 3, name + ' leaves room for three sent scores'); }
});

test('hotel: what is recorded only at arrival or cancellation is never read', () => {
  const read = new Set(Object.values(HOTEL_SILOS).flat().map((f) => f));
  for (const f of ['reservation_status', 'reservation_status_date', 'assigned_room', 'booking_changes', 'parking']) assert.ok(!read.has(f), f);
  const [head, first] = lines(H1), cells = first.split(','), col = (name) => head.split(',').indexOf(name);
  for (const leak of ['ReservationStatus', 'ReservationStatusDate', 'AssignedRoomType', 'BookingChanges', 'RequiredCarParkingSpaces']) {
    const changed = [...cells]; changed[col(leak)] = leak === 'ReservationStatus' ? 'Canceled' : leak === 'ReservationStatusDate' ? '1999-01-01' : leak === 'AssignedRoomType' ? 'Z' : '7';
    assert.deepEqual(hotelBooking(hotelRows(head + '\n' + changed.join(','), head + '\n' + first).rows[0]).x, hotelBooking(HR.rows[0]).x, leak + ' changes nothing');
  }
});

test('hotel encodings: every value to its number, the padding trimmed, anything else refused', () => {
  const E = HOTEL_CODES;
  assert.deepEqual(['January', 'July', 'December', 'Jul', ''].map(E.arrival_month).map(String), ['1', '7', '12', 'NaN', 'NaN']);
  assert.deepEqual(['0', '2', 'NA', '-1', '1.5'].map(E.children).map(String), ['0', '2', '-1', 'NaN', 'NaN']);
  assert.deepEqual(['              0', '              1', '2'].map(E.repeated_guest).map(String), ['0', '1', 'NaN']);
  assert.deepEqual(['PRT', 'GBR', 'CN', 'NULL', 'prt', 'PORTUGAL'].map((v) => [E.domestic(v), E.country_unknown(v)].join()), ['1,0', '0,0', '0,0', '0,1', 'NaN,NaN', 'NaN,NaN']);
  assert.deepEqual(['Transient', 'Transient-Party', 'Contract', 'Group', 'Walk-in'].map((v) => [E.contract(v), E.group(v), E.transient_party(v)].join('')), ['000', '001', '100', '010', 'NaNNaNNaN']);
  assert.deepEqual(['Online TA', 'Offline TA/TO', 'Groups', 'Direct', 'Corporate', 'Complementary', 'Aviation', 'Undefined', 'Radio'].map((v) => ['online_ta', 'offline_ta', 'groups', 'direct', 'corporate', 'complementary', 'aviation'].map((f) => E[f](v)).join('')),
    ['1000000', '0100000', '0010000', '0001000', '0000100', '0000010', '0000001', '0000000', 'NaNNaNNaNNaNNaNNaNNaN']);
  assert.deepEqual(['TA/TO', 'Direct', 'Corporate', 'GDS', 'Undefined', 'Phone'].map((v) => [E.channel_direct(v), E.channel_gds(v)].join('')), ['00', '10', '00', '01', '00', 'NaNNaN']);
  assert.deepEqual(['No Deposit     ', 'Non Refund     ', 'Refundable     ', 'Cash'].map((v) => [E.non_refund(v), E.refundable(v)].join('')), ['00', '10', '01', 'NaNNaN']);
  assert.deepEqual(['       NULL', '          9', 'none'].map(E.has_agent).map(String), ['0', '1', 'NaN']);
  assert.deepEqual(['BB       ', 'HB       ', 'FB       ', 'SC       ', 'Undefined', 'AI'].map((v) => [E.half_board(v), E.full_board(v), E.self_catering(v)].join('')), ['000', '100', '010', '001', '001', 'NaNNaNNaN']);
  assert.deepEqual(['A               ', 'C', 'H', 'L', 'P', 'K', 'Z'].map(E.room).map(String), ['1', '3', '8', '12', '16', 'NaN', 'NaN']);
  assert.deepEqual(['0', '76.5', '-6.38', 'x'].map(E.adr).map(String), ['0', '76.5', '-6.38', 'NaN']);
  assert.deepEqual(['0', '342', '-1', '3.5'].map(E.lead_time).map(String), ['0', '342', 'NaN', 'NaN']);
  const [head, first] = lines(H1);
  assert.equal(loadHotel(head + '\n' + first.replace(',July,', ',Juli,'), head).error, 'the city hotel: no bookings');
  assert.equal(loadHotel(head + '\n' + first.replace(',July,', ',Juli,'), H2).error, 'booking 1: arrival_month is not readable');
  assert.equal(loadHotel(head + '\n' + first.replace(/^0,/, '2,'), H2).error, 'booking 1: the outcome is not readable');
  assert.equal(hotelBooking({ ...HR.rows[0], Hotel: 'Hostel' }).error, 'city_hotel');
  assert.equal(hotelRows('', H2).error, 'the resort hotel: no bookings');
  assert.equal(hotelRows(head + '\n1,2', H2).error, 'the resort hotel: booking 1 has 2 cells, not 31');
  assert.equal(hotelRows(H1, H2.replace('LeadTime', 'Lead')).error, 'the two hotels’ files have different columns');
  assert.equal(hotelRows(H1.replace('LeadTime', 'Lead'), H2.replace('LeadTime', 'Lead')).error, 'missing columns: LeadTime');
});

test('news: 39,644 real articles, 51 features in six departments, the first article exactly, the weekday from its flags', () => {
  assert.ok(N.ok, N.error);
  assert.equal(N.n, 39644);
  assert.deepEqual(N.features, Object.values(NEWS_SILOS).flat());
  assert.deepEqual(Object.fromEntries(Object.entries(NEWS_SILOS).map(([k, v]) => [k, v.length])), { writing: 8, links: 5, keywords: 10, desk: 7, topics: 9, tone: 12 });
  assert.equal(N.y.reduce((a, v) => a + v, 0), 21154, 'the dataset’s notes: 21,154 articles at 1,400 shares or more');
  assert.equal(POPULAR, 1400);
  assert.deepEqual(row(N, 0), { n_tokens_title: 12, n_tokens_content: 219, n_unique_tokens: 0.663594466988, n_non_stop_words: 0.999999992308, n_non_stop_unique_tokens: 0.815384609112, average_token_length: 4.6803652968, num_imgs: 1, num_videos: 0,
    num_hrefs: 4, num_self_hrefs: 2, self_reference_min_shares: 496, self_reference_max_shares: 496, self_reference_avg_sharess: 496,
    num_keywords: 5, kw_min_min: 0, kw_max_min: 0, kw_avg_min: 0, kw_min_max: 0, kw_max_max: 0, kw_avg_max: 0, kw_min_avg: 0, kw_max_avg: 0, kw_avg_avg: 0,
    weekday: 1, data_channel_is_lifestyle: 0, data_channel_is_entertainment: 1, data_channel_is_bus: 0, data_channel_is_socmed: 0, data_channel_is_tech: 0, data_channel_is_world: 0,
    LDA_00: 0.500331204081, LDA_01: 0.378278929586, LDA_02: 0.0400046751006, LDA_03: 0.0412626477296, LDA_04: 0.0401225435029, title_subjectivity: 0.5, title_sentiment_polarity: -0.1875, abs_title_subjectivity: 0, abs_title_sentiment_polarity: 0.1875,
    global_subjectivity: 0.521617145481, global_sentiment_polarity: 0.0925619834711, global_rate_positive_words: 0.0456621004566, global_rate_negative_words: 0.013698630137, rate_positive_words: 0.769230769231, rate_negative_words: 0.230769230769,
    avg_positive_polarity: 0.378636363636, min_positive_polarity: 0.1, max_positive_polarity: 0.7, avg_negative_polarity: -0.35, min_negative_polarity: -0.6, max_negative_polarity: -0.2 });
  assert.equal(N.y[0], 0, '593 shares');
  assert.ok(disjoint(N)); assert.deepEqual([N.fitRows.length, N.gateRows.length, N.testRows.length], [20814, 6937, 11893]);
  for (const rows of [N.fitRows, N.gateRows, N.testRows]) assert.ok(Math.abs(rate(N, rows) - 21154 / 39644) < 0.002, 'stratified');
  for (const [name, feats] of Object.entries(NEWS_SILOS)) { assert.deepEqual(Object.keys(silo(N, name).cols), feats); assert.ok(feats.length <= MAXFEATS - 3, name + ' leaves room for three sent scores'); }
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => N.cols.weekday.filter((v) => v === d).length).reduce((a, v) => a + v, 0), 39644);
});

test('news encodings: plain numbers, a few in exponent form, exactly one weekday; anything else refused', () => {
  const t = newsRows(NEWS), r0 = t.rows[0];
  assert.equal(newsArticle({ ...r0, title_sentiment_polarity: ' 2.77555756156e-17' }).x.title_sentiment_polarity, 2.77555756156e-17);
  assert.equal(newsArticle({ ...r0, n_tokens_title: ' twelve' }).error, 'n_tokens_title');
  assert.equal(newsArticle({ ...r0, weekday_is_tuesday: ' 1.0' }).error, 'weekday', 'two weekdays');
  assert.equal(newsArticle({ ...r0, weekday_is_monday: ' 0.0' }).error, 'weekday', 'no weekday');
  assert.equal(newsArticle({ ...r0, weekday_is_monday: ' 0.5' }).error, 'weekday', 'half a weekday');
  assert.deepEqual(WEEKDAYS.map((d) => newsArticle({ ...r0, ...Object.fromEntries(WEEKDAYS.map((w) => [w, w === d ? '1.0' : '0.0'])) }).x.weekday), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual([' 0', ' 1399', ' 1400', ' 843300', ' -1', ' x'].map((s) => { const a = newsArticle({ ...r0, shares: s }); return a.error || a.y; }), [0, 0, 1, 1, 'the outcome', 'the outcome']);
  const [head, first] = lines(NEWS);
  assert.equal(loadNews(head + '\n' + first.replace(', 12.0,', ', twelve,')).error, 'article 1: n_tokens_title is not readable');
  assert.equal(newsRows(head.replace(' shares', ' likes') + '\n' + first).error, 'missing columns: shares');
  assert.equal(newsRows(head + '\n1,2').error, 'article 1 has 2 cells, not 61');
  assert.equal(newsRows('').error, 'no articles'); assert.equal(newsRows(head).error, 'no articles');
});
