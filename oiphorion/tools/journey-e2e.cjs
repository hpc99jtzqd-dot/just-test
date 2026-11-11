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
// E2E_ONLY=부분문자열 이면 이름에 그 글자가 든 시험만 돈다(수정 중 한 개만 확인할 때).
function test(name, fn) { if (!process.env.E2E_ONLY || name.includes(process.env.E2E_ONLY)) cases.push({ name, fn }); }

async function session(at, options, fn) {
  const context = await (options.noGL ? fallback : browser).newContext({ timezoneId: 'Asia/Seoul', viewport: options.viewport || { width: 960, height: 720 }, deviceScaleFactor: 0.5, reducedMotion:options.reduced?'reduce':'no-preference' });
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
  assert.equal(await p.locator('#dayFallbackPaths path').count(), 3, '같은 세 경로를 SVG로 표시');
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

test('V2 주간 3D·표시 상태·왕복 위치·기록 불변', () => session('2026-11-05T10:00', { fixture:'lose2', documents:{[BASE+'days/2026-11-05']:null} }, async (p,db) => {
  const before=await p.evaluate(()=>({x:DW.x,z:DW.z})),writes=db.writeCount();
  await p.click('#wkWeek');
  assert.equal(await p.locator('#wkPanel.wk-3d').count(),1);
  assert.equal(await p.locator('#nodes').isVisible(),false);
  assert.equal(await p.locator('#wkDays [data-state="pending"]').count(),1);
  assert.equal(await p.locator('#wkDays .wk-hat').count(),2);
  assert.equal(await p.locator('#wkDays .wk-broken').count(),1);
  assert.equal(await p.locator('#wkSummit').count(),1);
  await p.click('#wkDay');
  assert.deepEqual(await p.evaluate(()=>({x:DW.x,z:DW.z})),before);
  assert.equal(await p.locator('.day-places .node').count(),10);
  assert.equal(db.writeCount(),writes);
}));
test('V2 움직임 줄이기·야영 도착·두루마리', () => session('2026-11-03T10:00',{fixture:'lose3',reduced:true},async p=>{
  const place=await p.evaluate(()=>Array.from(document.querySelectorAll('[data-place]')).map(e=>e.dataset.place).find(id=>id!==at&&id!=='sunday'));
  assert.ok(place, '풍경 위에서 다음 장소를 직접 선택할 수 있다');
  // A route sign and a place sign may legitimately lead to the same stop.
  await p.locator(`[data-place="${place}"]`).first().click();await dw(p,'walking',false);
  assert.equal(await p.evaluate(()=>at),place,'풍경 표지도 동일한 걷기 동작');
  await p.locator('.node[data-id="camp"]').click();await dw(p,'walking',false);
  assert.equal(await p.evaluate(()=>at),'camp');
  assert.equal(await p.evaluate(()=>dayZone),2);
  await p.locator('.node[data-id="camp"]').click();
  assert.equal(await p.evaluate(()=>ov.hidden),false);
  await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>ov.hidden),true);
}));

// Regression for critic 1: same-zone arrival used to leave the boy offscreen.
// Test the rendered camera projection, rather than only the logical `at` value.
for(const noGL of [false,true])for(const reduced of [false,true]){
  test(`V2 폰 가시성·맵1/5·두루마리 GL=${!noGL} reduce=${reduced}`,()=>session('2026-11-05T07:30',{fixture:'keep',noGL,reduced,viewport:{width:400,height:820}},async(p,db)=>{
    for(const map of [1,5]){
      await p.evaluate(n=>window.__setMap(n),map);
      for(const id of ['dawn','morning','lunch','camp','minimum']){
        if(await p.evaluate(id=>at!==id,id))await p.locator(`.node[data-id="${id}"]`).click();
        await p.waitForFunction(id=>at===id&&!walking&&(!gl||raster.done),id,{timeout:240000});
        const visible=await p.evaluate(()=>{const p=project([DW.x,DW.y+1.8,DW.z]);return p[2]>0&&p[0]>24&&p[0]<VW.W-24&&p[1]>24&&p[1]<VW.H-24;});
        assert.equal(visible,true,`${map}/${id}: 소년 몸 중심이 화면 안`);
      }
      await p.locator('.node[data-id="minimum"]').click();
      assert.equal(await p.evaluate(()=>ov.hidden),false);
      await p.keyboard.press('Escape');
    }
    assert.equal(db.writeCount(),0);
  }));
}
test('V2 주간 폰 표지 충돌·pending/before/inferred/future',()=>session('2026-11-05T10:00',{fixture:'lose2',reduced:true,viewport:{width:400,height:820},documents:{[BASE+'meta/since']:{day:'2026-11-03'},[BASE+'days/2026-11-02']:null,[BASE+'days/2026-11-04']:null,[BASE+'days/2026-11-05']:null}},async(p,db)=>{
  await p.click('#wkWeek');
  const labels=p.locator('.wk-map-label');assert.equal(await labels.count(),7);
  for(const state of ['before','inferred','pending','future'])assert.ok(await p.locator(`.wk-map-label[data-state="${state}"]`).count(),state);
  const boxes=await labels.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  for(let i=0;i<boxes.length;i++){const a=boxes[i];assert.ok(a.x>=0&&a.right<=400,'수평 잘림 없음');for(let j=i+1;j<boxes.length;j++){const b=boxes[j];assert.equal(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y,false,'정상·요일 표지 겹침 없음');}}
  assert.equal(db.writeCount(),0);
}));

test('V3 2선은 들꽃 샛길로 걷고, 잃은 모자·트램펄린은 그 주 내내 남는다', () => session('2026-11-05T08:00', { fixture: 'lose2' }, async p => {
  const r = await p.evaluate(() => {
    const dev = pts => Math.max(...pts.map(([x, z]) => Math.min(...ROAD.map(([a, c]) => Math.hypot(a - x, c - z)))));
    const saved = state.line, one = dev(route('lunch', 'afternoon'));
    state.line = 2; const two = dev(route('lunch', 'afternoon')); state.line = saved;
    return { one, two, lost: window.__lost() };
  });
  assert.ok(r.one < .01, '1선은 큰길 그대로');
  assert.ok(r.two > 3, '2선은 큰길에서 비켜난 샛길 ' + r.two);
  assert.equal(r.lost.hats.length, 2, '월·수에 잃은 모자 두 개가 목요일에도 남음');
  assert.ok(r.lost.broken, '수요일에 잃은 트램펄린이 망가진 채 남음');
}));
test('V3 3선 당일엔 발밑, 다음 날부터 망가진 트램펄린이 최소 기준선 옆에', async () => {
  await session('2026-11-03T10:00', { fixture: 'lose3' }, async p => {
    assert.equal(await p.evaluate(() => window.__lost().broken), null);
  });
  await session('2026-11-04T10:00', { fixture: 'lose3' }, async p => {
    const b = await p.evaluate(() => { const b = window.__lost().broken; return b && Math.hypot(b[0] - NXZ.minimum[0], b[2] - NXZ.minimum[1]); });
    assert.ok(b != null && b < 4.5, '최소 기준선 옆 ' + b);
  });
});

test('V3 자세한 순서 체크는 그날 칸·길별로 남고, 다 하면 카드에 ✓', () => session('2026-11-06T13:10', { fixture: 'keep' }, async (p, db) => {
  await p.locator('#iSteps summary').click();
  const boxes = p.locator('#iSteps input'), n = await boxes.count();
  assert.ok(n >= 3, '순서가 여러 단계');
  await boxes.nth(0).check();
  assert.match(await p.locator('#iSteps summary').textContent(), /1\/\d+ 했음/);
  assert.equal(await p.locator('.node.done').count(), 0);
  for (let i = 1; i < n; i++) await boxes.nth(i).check();
  assert.equal(await p.locator('.node.done[data-id="lunch"]').count(), 1, '다 하면 ✓');
  await p.locator('#enter').click();
  assert.equal(await p.evaluate(() => paper.scrollTop), 0, '두루마리는 맨 위부터');
  assert.equal(await p.locator('.plan.steps li.done').count(), n);
  assert.equal(db.writeCount(), 0, '개인 메모라 db에 쓰지 않음');
}));

test('V4 블록 쪼개기: 진행 중인 칸의 남은 시간을 나누고, db에 남고, 다 하면 카드에 ✓', () => session('2026-11-06T16:10', { fixture: 'keep' }, async (p, db) => {
  assert.match(await p.locator('#nowStrip').innerText(), /지금 칸[\s\S]*오후 블록[\s\S]*1시간 50분/);
  await p.locator('#iDesk .dk-open').click();
  assert.equal(await p.locator('#deskOv').isVisible(), true);
  await p.locator('#dkQuick [data-q="n2"]').click();
  const rows = p.locator('#dkList .dk-row');
  assert.equal(await rows.count(), 2);
  assert.equal(await p.locator('#dkTail').innerText(), '18:00 칸 끝');
  assert.equal(await rows.nth(0).locator('.dk-time').innerText(), '16:10', '지금부터 나눈다');
  assert.equal(await rows.nth(1).locator('.dk-time').innerText(), '17:05');
  assert.equal(await p.locator('#dkList .dk-edit').count(), 1, '고치는 칸은 한 줄에만');
  assert.equal(await rows.nth(0).locator('.dk-title').evaluate(e => e === document.activeElement), true, '새 조각의 할 일 칸에 커서');
  await rows.nth(0).locator('.dk-title').fill('미적 3.2 예제');
  await rows.nth(0).locator('.dk-note').fill('7번부터 이어서');
  await rows.nth(0).locator('[data-act="split"]').click();
  assert.equal(await rows.count(), 3, '조각을 반으로');
  assert.equal(await rows.nth(1).locator('.dk-title').inputValue(), '미적 3.2 예제');
  await rows.nth(1).locator('.dk-title').press('Enter');
  assert.equal(await rows.nth(2).locator('.dk-edit').count(), 1, 'Enter로 다음 이름 없는 조각');
  await rows.nth(2).locator('.dk-title').fill('공수1 복습'); await rows.nth(2).locator('.dk-title').press('Enter');
  assert.equal(await p.locator('#dkList .dk-edit').count(), 0, '다 적으면 접힌다');
  assert.equal(await rows.nth(0).locator('.dk-memo').innerText(), '7번부터 이어서', '메모 첫 줄이 요약에 보인다');
  assert.match(await p.locator('#dkCur').innerText(), /미적 3\.2 예제/, '지금 조각');
  assert.match(await p.locator('#dkClock').innerText(), /^\d+:\d\d$/);
  await p.fill('#dkParkIn', '과제 공지 확인'); await p.press('#dkParkIn', 'Enter');
  assert.equal(await p.locator('#dkParkList li').count(), 1);
  await until(() => db.get('plans/2026-11-06')?.b?.afternoon?.p?.length === 3 && db.get('plans/2026-11-06').park.length === 1, '계획이 db에 저장됨');
  assert.equal(db.get('plans/2026-11-06').b.afternoon.s, 970, '시작은 지금(16:10)');
  assert.equal(db.writeCount('days/2026-11-06'), 0, '판정 기록은 건드리지 않음');
  for (let i = 0; i < 3; i++) await rows.nth(i).locator('.dk-chk input').check({ force: true });
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('#deskOv').isVisible(), false);
  assert.equal(await p.locator('.node.done[data-id="afternoon"]').count(), 1, '조각을 다 하면 ✓');
  assert.match(await p.locator('#iDesk').innerText(), /조각 3\/3[\s\S]*주차장 1/);
  await until(() => db.get('plans/2026-11-06').b.afternoon.p.every(x => x.d === 1), '했음이 저장됨');
  await p.reload({ waitUntil: 'commit' });
  await p.waitForFunction(() => window.__journeyReady === true);
  assert.equal(await p.locator('#iDesk .dk-mini li.done').count(), 3, '다시 열어도 남아 있다');
  assert.equal(await p.locator('#deskOv').isVisible(), false, '닫고 떠났으면 닫힌 채');
  await p.locator('#nowStrip button').click();
  await p.reload({ waitUntil: 'commit' });
  await p.waitForFunction(() => window.__journeyReady === true);
  assert.equal(await p.locator('#deskOv').isVisible(), true, '책상을 편 채 떠났고 조각이 진행 중이면 책상부터');
}));
test('V4 오늘 기록이 없으면 단추 한 번으로 적는다', () => session('2026-11-09T09:00', { fixture: 'keep' }, async (p, db) => {
  const nudge = p.locator('#wakeNudge');
  assert.equal(await nudge.isVisible(), true);
  await nudge.locator('[data-w="goal"]').click();
  assert.equal(await p.inputValue('#woke'), '07:30');
  await until(() => db.get('days/2026-11-09')?.woke === '07:30', '오늘 기록 저장');
  assert.equal(await nudge.isVisible(), false);
}));

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
