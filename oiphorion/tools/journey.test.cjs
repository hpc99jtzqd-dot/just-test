'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// journey.js has no build.py placeholders or data.js/school.js dependencies.
// Run the real source; top-level const bindings must be read inside the VM.
const source = readFileSync(path.join(__dirname, '../src/journey.js'), 'utf8');
const BASE = 'data/users/test-user/journey/';
const DAY_MS = 86400000;
const addDays = (key, n) => new Date(Date.parse(key + 'T00:00:00Z') + n * DAY_MS)
  .toISOString().slice(0, 10);
const seoulNoon = key => key + 'T12:00:00+09:00';
const records = (monday, lines) => Object.fromEntries(lines.map((line, i) =>
  [addDays(monday, i), { woke: '07:30', line, savedAt: 0 }]));

async function fixture(t, { at, since = '2026-11-02', days = {} }) {
  let now = Date.parse(at);
  assert.ok(Number.isFinite(now), 'fixture time must have an explicit time zone');
  const documents = new Map([[BASE + 'meta/since', { day: since }]]);
  for (const [key, rec] of Object.entries(days)) documents.set(BASE + 'days/' + key, { ...rec });
  const writes = [];
  const db = {
    doc(key) {
      return {
        async get() {
          const value = documents.get(key);
          return { exists: value !== undefined, data: () => value && { ...value } };
        },
        async set(value) {
          writes.push({ key, value: { ...value } });
          documents.set(key, { ...value });
        },
      };
    },
  };
  const cache = new Map();
  const timers = new Set();
  t.after(() => { for (const timer of timers) clearTimeout(timer); });
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const ctx = vm.createContext({
    Date: FixedDate,
    console,
    setTimeout(fn, ms) {
      const timer = setTimeout(fn, ms);
      timers.add(timer);
      return timer;
    },
    localStorage: {
      getItem: key => cache.get(key) ?? null,
      setItem: (key, value) => cache.set(key, String(value)),
    },
    window: { claude: { async use(name) {
      if (name === 'db') return db;
      if (name === 'user') return { id: 'test-user' };
      throw new Error('Unexpected capability: ' + name);
    } } },
  });
  vm.runInContext(source, ctx, { filename: 'src/journey.js' });
  const journey = vm.runInContext('JOURNEY', ctx);
  await journey.ready;
  assert.equal(journey.online, true, 'fixture must reach online judgment, not cache fallback');
  return { journey, writes, setTime(at) {
    now = Date.parse(at);
    assert.ok(Number.isFinite(now));
  } };
}

test('서울 자정: 2026-11-01T15:00Z부터 11/02이며 이전 날만 빈 날 3선', async t => {
  const { journey, setTime } = await fixture(t, {
    at: '2026-11-01T14:59:59.999Z', since: '2026-10-31',
  });
  assert.equal(journey.todayKey(), '2026-11-01');
  assert.equal(journey.week().practice, true);
  assert.equal(journey.week('2026-11-02').days[0].future, true);
  setTime('2026-11-01T15:00:00.000Z');
  assert.equal(journey.todayKey(), '2026-11-02');
  const week = journey.week();
  assert.equal(week.monday, '2026-11-02');
  assert.equal(week.practice, false);
  assert.equal(week.weekNo, 1);
  assert.equal(week.days[0].line, null);
  assert.equal(week.days[0].inferred, false);
  assert.equal(week.days[0].future, false);
  assert.equal(week.result, 'pending');
});

test('U3/U4: 지난 빈 날은 3선, 오늘과 미래는 미정이며 주 결과는 pending', async t => {
  const { journey, writes } = await fixture(t, { at: seoulNoon('2026-11-03') });
  const week = journey.week();
  assert.equal(week.days[0].line, 3);
  assert.equal(week.days[0].inferred, true);
  assert.equal(week.trampolineLostOn, '2026-11-02');
  assert.equal(week.days[1].line, null);
  assert.equal(week.days[1].inferred, false);
  assert.equal(week.days[2].line, null);
  assert.equal(week.days[2].future, true);
  assert.equal(week.result, 'pending');
  assert.equal(writes.length, 0, 'reading inferred days must not write fake user input');
});

test('U5: 2선 한 번은 그날 모자만 잃고 다음 날은 새 모자', async t => {
  const { journey } = await fixture(t, {
    at: seoulNoon('2026-11-08'), days: records('2026-11-02', [2, 1, 1, 1, 1, 1]),
  });
  const week = journey.week();
  assert.equal(week.hatsLost, 1);
  assert.equal(week.days[0].hatLost, true);
  assert.equal(week.days[1].hatLost, false);
  assert.equal(week.trampolineAlive, true);
  assert.equal(week.trampolineLostOn, null);
  assert.equal(week.result, 'advance');
});

test('U6: 3선 한 번이면 트램펄린을 잃고 같은 맵에 남음', async t => {
  const { journey } = await fixture(t, {
    at: seoulNoon('2026-11-09'), days: records('2026-11-02', [1, 1, 3, 1, 1, 1]),
  });
  const week = journey.week('2026-11-02');
  assert.equal(week.trampolineLostOn, '2026-11-04');
  assert.equal(week.trampolineAlive, false);
  assert.equal(week.days[2].trampolineBreaks, true);
  assert.equal(week.days.filter(day => day.trampolineBreaks).length, 1);
  assert.equal(week.hatsLost, 0);
  assert.equal(week.result, 'stay');
  assert.equal(journey.progress().map, 1);
});

test('U7: 떨어져 있는 2선도 두 번이면 두 번째 날 트램펄린을 잃음', async t => {
  const { journey } = await fixture(t, {
    at: seoulNoon('2026-11-08'), days: records('2026-11-02', [2, 1, 2, 1, 1, 1]),
  });
  const week = journey.week();
  assert.equal(week.hatsLost, 2);
  assert.equal(week.days[0].trampolineBreaks, false);
  assert.equal(week.days[2].trampolineBreaks, true);
  assert.equal(week.trampolineLostOn, '2026-11-04');
  assert.equal(journey.trampolineFor('2026-11-03'), 'intact');
  assert.equal(journey.trampolineFor('2026-11-04'), 'gone', '두 번째 2선 당일부터 등과 발밑 모두 없음');
  assert.equal(journey.trampolineFor('2026-11-05'), 'gone');
  assert.equal(week.result, 'stay');
});

test('두 번째 2선 당일: 오늘 기록을 수정하면 즉시 상실 판정을 다시 계산', async t => {
  const { journey } = await fixture(t, {
    at: seoulNoon('2026-11-04'), days: records('2026-11-02', [2, 1, 2]),
  });
  assert.equal(journey.trampolineFor(), 'gone');
  await journey.recordToday('07:30', 1);
  assert.equal(journey.trampolineFor(), 'intact');
  await journey.recordToday('08:40', 2);
  assert.equal(journey.trampolineFor(), 'gone');
  await journey.recordToday('11:00', 3);
  assert.equal(journey.trampolineFor(), 'breaks-today');
});

test('U8: 처음 3선인 당일은 breaks-today, 다음 날부터 gone', async t => {
  const { journey, setTime } = await fixture(t, {
    at: seoulNoon('2026-11-03'), days: records('2026-11-02', [1, 3]),
  });
  assert.equal(journey.trampolineFor('2026-11-02'), 'intact');
  assert.equal(journey.trampolineFor(), 'breaks-today');
  assert.equal(journey.week().days[1].trampolineBreaks, true);
  setTime('2026-11-03T15:00:00Z');
  assert.equal(journey.trampolineFor(), 'gone');
});

for (const [cause, lines] of [['3선', [3, 3]], ['2선 두 번', [2, 2, 3]]]) {
  test(`U9: ${cause}으로 잃은 뒤의 3선은 gone으로 걷기 상태를 제공`, async t => {
    const key = addDays('2026-11-02', lines.length - 1);
    const { journey } = await fixture(t, {
      at: seoulNoon(key), days: records('2026-11-02', lines),
    });
    assert.equal(journey.week().days[lines.length - 1].line, 3);
    assert.equal(journey.trampolineFor(), 'gone');
    assert.equal(journey.week().days[lines.length - 1].trampolineBreaks, false);
  });
}

test('U11: 다섯 성공 주 후 5→1 맵, 2회차와 엔딩 점프', async t => {
  const days = {};
  for (let i = 0; i < 5; i++) Object.assign(days, records(addDays('2026-11-02', i * 7), [1, 1, 1, 1, 1, 1]));
  const { journey, setTime } = await fixture(t, { at: seoulNoon('2026-12-06'), days });
  assert.equal(journey.progress().map, 5, 'Sunday preview must not advance the map early');
  assert.equal(journey.progress().round, 1);
  setTime('2026-12-06T15:00:00Z');
  const progress = journey.progress();
  assert.equal(progress.map, 1);
  assert.equal(progress.round, 2);
  assert.equal(progress.pendingJump.monday, '2026-11-30');
  assert.equal(progress.pendingJump.result, 'advance');
  assert.equal(progress.pendingJump.ending, true);
  await journey.markJumpSeen();
  assert.equal(journey.progress().pendingJump, null);
  assert.equal(journey.progress().round, 2);
});

test('U12: 성공한 연습 주도 맵과 회차를 올리지 않음', async t => {
  const { journey, setTime } = await fixture(t, {
    at: seoulNoon('2026-11-01'), since: '2026-10-26',
    days: records('2026-10-26', [1, 1, 1, 1, 1, 1]),
  });
  assert.equal(journey.week().practice, true);
  assert.equal(journey.week().weekNo, null);
  assert.equal(journey.week().result, 'advance');
  assert.equal(journey.progress().map, 1);
  setTime('2026-11-01T15:00:00Z');
  assert.equal(journey.progress().map, 1);
  assert.equal(journey.progress().round, 1);
  assert.equal(journey.progress().pendingJump.ending, false);
});

test('U14: 시작 전의 빈 날은 3선이나 손실로 세지 않음', async t => {
  const { journey } = await fixture(t, {
    at: seoulNoon('2026-11-08'), since: '2026-11-04',
    days: records('2026-11-04', [1, 1, 1, 1]),
  });
  const week = journey.week();
  for (const day of week.days.slice(0, 2)) {
    assert.equal(day.line, null);
    assert.equal(day.inferred, false);
    assert.equal(day.trampolineBreaks, false);
  }
  assert.equal(week.trampolineAlive, true);
  assert.equal(week.result, 'advance');
});

test('U15: 일요일 3선 기록은 월~토 손실과 성공 판정에서 제외', async t => {
  const { journey } = await fixture(t, {
    at: seoulNoon('2026-11-09'), days: records('2026-11-02', [1, 1, 1, 1, 1, 1, 3]),
  });
  const week = journey.week('2026-11-08');
  assert.equal(week.days.length, 6);
  assert.equal(week.days[5].key, '2026-11-07');
  assert.equal(week.days[5].dow, 6);
  assert.equal(week.trampolineAlive, true);
  assert.equal(week.result, 'advance');
  assert.equal(journey.progress().map, 2);
  assert.equal(journey.trampolineFor(), 'intact', 'new week starts with a new trampoline');
});

test('U17: 2선 한 번 뒤 처음 3선은 그날 breaks-today', async t => {
  const { journey } = await fixture(t, {
    at: seoulNoon('2026-11-03'), days: records('2026-11-02', [2, 3]),
  });
  assert.equal(journey.week().hatsLost, 1);
  assert.equal(journey.week().trampolineLostOn, '2026-11-03');
  assert.equal(journey.trampolineFor(), 'breaks-today');
});

test('U18: 두 주 공백을 순서대로 실패 판정하고 맵 유지', async t => {
  const { journey } = await fixture(t, { at: seoulNoon('2026-11-16') });
  for (const monday of ['2026-11-02', '2026-11-09']) {
    const week = journey.week(monday);
    assert.equal(week.days.filter(day => day.line === 3 && day.inferred).length, 6);
    assert.equal(week.trampolineLostOn, monday);
    assert.equal(week.result, 'stay');
  }
  assert.equal(journey.progress().map, 1);
  assert.equal(journey.progress().round, 1);
  assert.equal(journey.progress().pendingJump.monday, '2026-11-09');
  assert.equal(journey.progress().pendingJump.result, 'stay');
});
