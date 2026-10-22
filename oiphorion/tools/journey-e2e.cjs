// py build.py 후 실행. 실제 file:// 페이지, 고정 서울 날짜, 독립 브라우저 문맥으로 검증한다.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createFakeClaude, fixedTime, BASE } = require('./fake-claude');
const { chromium } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '../dist/index.html')).href;
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const cases = [];
let browser, fallback;
function test(name, fn) { cases.push({ name, fn }); }

async function session(at, options, fn) {
  const context = await (options.noGL ? fallback : browser).newContext({ timezoneId: 'Asia/Seoul', viewport: { width: 960, height: 720 }, deviceScaleFactor: 0.5 });
  const errors = [];
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    // 원격 폰트를 로컬 시험에서 제외하되 console.error 자체는 모두 실패로 처리한다.
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    const fake = createFakeClaude(options);
    await fake.install(page);
    if (options.clock) await page.clock.install({ time: fixedTime(at) });
    await page.clock.setFixedTime(fixedTime(at));
    await page.goto(url, { waitUntil: 'commit', timeout: 240000 });
    await page.waitForFunction(() => window.__journeyReady === true, null, { timeout: 240000 });
    await fn(page, fake);
    assert.deepEqual(errors, [], '브라우저 오류');
  } catch (e) {
    if (errors.length) e.message += '\n' + errors.join('\n');
    throw e;
  } finally { await context.close(); }
}
async function until(fn, message) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.fail(message);
}
async function dw(page, key, value) {
  try { await page.waitForFunction(({ key, value }) => window.__dw && window.__dw[key] === value, { key, value }); }
  catch (e) { throw new Error(`__dw.${key}: expected ${JSON.stringify(value)}, actual ${JSON.stringify(await page.evaluate(key => window.__dw?.[key], key))}`); }
}
async function toggle(page) {
  await page.click('#wkWeek');
  assert.equal(await page.locator('#wkPanel').isVisible(), true, '한 주 보기 표시');
  assert.equal(await page.locator('#dwarf').isVisible(), false, '한 주 보기 중 하루 난쟁이 숨김');
  assert.equal(await page.locator('#wkWeek').getAttribute('aria-pressed'), 'true');
  await page.click('#wkDay');
  assert.equal(await page.locator('#wkPanel').isVisible(), false, '하루 보기 복귀');
  assert.equal(await page.locator('#wkDay').getAttribute('aria-pressed'), 'true');
}
async function weekSegments(page) {
  await page.click('#wkWeek');
  const rows = page.locator('#wkDays > li');
  assert.equal(await rows.count(), 6);
  const lines = await rows.evaluateAll(els => els.map(el => el.getAttribute('data-line')));
  assert.deepEqual(lines.slice(0, 3), ['2', '1', '2']);
  assert.ok([null, '', 'null'].includes(lines[3]), '오늘 미입력 구간');
  assert.deepEqual(lines.slice(4), [null, null]);
  assert.match(await rows.nth(3).innerText(), /목/);
  assert.doesNotMatch(await rows.nth(3).innerText(), /[123]선/, '오늘 미입력은 pending');
  assert.match(await rows.nth(4).innerText(), /아직/);
  assert.match(await rows.nth(5).innerText(), /아직/);
  assert.equal(await rows.filter({ hasText: '모자 잃음' }).count(), 2);
  assert.equal(await rows.filter({ hasText: '트램펄린 부서짐' }).count(), 1);
  assert.match(await rows.nth(2).innerText(), /트램펄린 부서짐/);
  assert.match(await page.locator('#wkStatus').innerText(), /잃은 모자\s*2개/);
}

test('E1 오늘 입력·수정 저장', () => session('2026-11-02T09:00', {}, async (p, db) => {
  assert.equal(await p.inputValue('#woke'), '');
  await p.fill('#woke', '07:30'); await p.locator('#woke').blur();
  await until(() => db.get('days/2026-11-02')?.woke === '07:30', '07:30 기록 미저장');
  assert.equal(db.get('days/2026-11-02').line, 1);
  await p.fill('#woke', '08:40'); await p.locator('#woke').blur();
  await until(() => db.get('days/2026-11-02')?.woke === '08:40', '08:40 수정 미저장');
  assert.equal(db.get('days/2026-11-02').line, 2);
  assert.equal(db.writeCount('days/2026-11-02'), 2);
}));
test('E1 자정 전환·빈 오늘 입력', () => session('2026-11-02T23:59', { fixture: 'lose2', documents: { [BASE + 'days/2026-11-03']: null } }, async (p, db) => {
  await p.clock.setFixedTime(fixedTime('2026-11-03T00:01'));
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await until(async () => await p.inputValue('#woke') === '', 'visibilitychange 후 화요일 미입력 상태로 전환 실패');
  assert.equal(await p.locator('#days button[data-d="2"]').getAttribute('aria-pressed'), 'true');
  assert.equal(db.writeCount(), 0);
}));
test('E1 과거 날짜 편집 방지·저장 기록 표시', () => session('2026-11-03T10:00', { fixture: 'lose2' }, async (p, db) => {
  await p.click('#days button[data-d="1"]');
  assert.equal(await p.locator('#woke').isDisabled(), true, '과거 요일은 입력 금지');
  assert.equal(await p.inputValue('#woke'), '08:40', '월요일 기상 기록 표시');
  await p.click('#days button[data-d="2"]');
  assert.equal(await p.locator('#woke').isDisabled(), false, '오늘은 다시 입력 가능');
  assert.equal(await p.inputValue('#woke'), '07:30', '화요일 기상 기록 복원');
  assert.equal(db.writeCount(), 0);
}));

test('E1 1분 interval 자정 전환·포커스 중인 이전 값 초기화', () => session('2026-11-02T23:59', { clock: true, fixture: 'lose2', documents: { [BASE + 'days/2026-11-03']: null } }, async (p, db) => {
  await p.locator('#woke').focus();
  await p.clock.setFixedTime(fixedTime('2026-11-03T00:01'));
  await p.clock.fastForward(60000);
  assert.equal(await p.inputValue('#woke'), '');
  assert.equal(await p.locator('#woke').isDisabled(), false);
  assert.equal(await p.locator('#days button[data-d="2"]').getAttribute('aria-pressed'), 'true');
  assert.equal(db.writeCount(), 0);
}));
test('E2 빈 날 3선 계산·표시, DB 쓰기 0회', () => session('2026-11-04T10:00', { fixture: 'keep', documents: { [BASE + 'days/2026-11-03']: null } }, async (p, db) => {
  const day = await p.evaluate(() => JOURNEY.week().days[1]);
  assert.equal(day.line, 3); assert.equal(day.inferred, true);
  await p.click('#wkWeek');
  const tue = p.locator('#wkDays > li').nth(1);
  assert.equal(await tue.getAttribute('data-line'), '3');
  assert.match(await tue.innerText(), /기록 없음/); assert.match(await tue.innerText(), /3선/);
  await p.reload({ waitUntil: 'commit', timeout: 240000 }); await p.waitForFunction(() => window.__journeyReady === true, null, { timeout: 240000 });
  assert.equal(db.writeCount(), 0, '재접속 후에도 빈 날을 쓰지 않는다');
  assert.equal(db.get('days/2026-11-03'), null);
}));
test('E4 2선 모자 없음·이동 후 유지·다음 날 복원', async () => {
  await session('2026-11-02T10:00', { fixture: 'lose2' }, async p => {
    await dw(p, 'hat', false);
    await p.locator('.node[data-id="evening"]').click();
    await dw(p, 'walking', false); await dw(p, 'hat', false);
    await p.locator('.node[data-id="camp"]').click();
    await dw(p, 'walking', false); await dw(p, 'hat', false);
  });
  await session('2026-11-03T10:00', { fixture: 'lose2' }, p => dw(p, 'hat', true));
});
for (const [f, at] of [['lose2', '2026-11-04T10:00'], ['lose2', '2026-11-05T10:00'], ['lose3', '2026-11-04T10:00']]) {
  test(`E5 트램펄린 상실 ${f} ${at.slice(0, 10)}`, () => session(at, { fixture: f }, async p => {
    await dw(p, 'tramp', 'none'); await dw(p, 'feet', false);
  }));
}
test('E8 한 주 보기 왕복', () => session('2026-11-05T10:00', { fixture: 'keep' }, toggle));
test('E9 한 주 구간·모자·부서진 트램펄린', () => session('2026-11-05T10:00', { fixture: 'lose2', documents: { [BASE + 'days/2026-11-05']: null } }, weekSegments));
test('E18 DB 없음·준비 신호·안내·쓰기 0회', () => session('2026-11-04T10:00', { db: null }, async (p, db) => {
  assert.equal(await p.evaluate(() => window.__journeyReady), true);
  assert.equal(await p.evaluate(() => JOURNEY.online), false);
  await p.click('#wkWeek'); assert.equal(await p.locator('#wkOffline').isVisible(), true);
  assert.match(await p.locator('#wkOffline').innerText(), /기록.*저장되지/);
  assert.equal(db.writeCount(), 0);
}));
test('E18 fromCache 강제: 자동 쓰기 0회', () => session('2026-11-04T10:00', { fromCache: true }, async (p, db) => {
  const snapshot = await p.evaluate(async () => (await (await window.claude.use('db')).doc('data/users/e2e-user/journey/meta/since').get()).metadata);
  assert.equal(snapshot.fromCache, true);
  await p.click('#wkWeek'); assert.equal(db.writeCount(), 0);
}));
test('E20 WebGL 없음: 모자·SVG 이동·보기 왕복', () => session('2026-11-02T10:00', { noGL: true, fixture: 'lose2' }, async p => {
  assert.equal(await p.locator('.stage.nogl').count(), 1);
  assert.equal(await p.locator('#dwarf .dw-hat').evaluate(el => getComputedStyle(el).display), 'none');
  const before = await p.locator('#dwarf').getAttribute('style');
  const bodyBefore = await p.locator('#dwarf .body').evaluate(el => el.style.transform);
  await p.locator('.node[data-id="evening"]').click();
  await p.waitForFunction(before => document.querySelector('#dwarf .body').style.transform !== before, bodyBefore);
  await dw(p, 'walking', false);
  assert.notEqual(await p.locator('#dwarf').getAttribute('style'), before, 'SVG 위치 이동');
  await toggle(p);
}));
test('E20 WebGL 없음: 상실 후 SVG 트램펄린 숨김', () => session('2026-11-04T10:00', { noGL: true, fixture: 'lose2' }, async p => {
  assert.equal(await p.locator('#dwarf .dw-tramp').evaluate(el => getComputedStyle(el).display), 'none');
  assert.equal(await p.locator('#dwarf .dw-feet').evaluate(el => getComputedStyle(el).display), 'none');
}));
test('E20 WebGL 없음: 3선 첫날 발밑 트램펄린', () => session('2026-11-03T10:00', { noGL: true, fixture: 'lose3' }, async p => {
  await dw(p, 'tramp', 'feet');
  assert.notEqual(await p.locator('#dwarf .dw-feet').evaluate(el => getComputedStyle(el).display), 'none');
}));
test('E20 WebGL 없음: E9 구간 동일', () => session('2026-11-05T10:00', { noGL: true, fixture: 'lose2', documents: { [BASE + 'days/2026-11-05']: null } }, weekSegments));

(async () => {
  let failed = 0;
  browser = await chromium.launch({ args });
  try {
    fallback = await chromium.launch({ args: ['--disable-webgl'] });
    for (const { name, fn } of cases) {
      try { await fn(); console.log('PASS ' + name); }
      catch (e) { failed++; console.error('FAIL ' + name + '\n' + e.message); }
    }
  } finally { await fallback?.close(); await browser.close(); }
  console.log(`${cases.length - failed}/${cases.length} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
