// 렌더 확인: node tools/shot.js [너비] [높이] [출력.png] [일어난시각(선택)]
// 예) node tools/shot.js 1280 800 out.png      /  node tools/shot.js 400 820 phone.png 11:00
// headless에서 WebGL을 쓰려면 SwiftShader 플래그가 필요하다 (Playwright 설치 필요).
// 추가 옵션: --at=2026-11-05T10:00 --fixture=lose2|lose3|keep --view=week
const { createFakeClaude, fixedTime } = require('./fake-claude');
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const positional = [], options = {};
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) positional.push(arg);
  else {
    const m = /^--(at|fixture|view)=(.+)$/.exec(arg);
    if (!m) throw new Error('Unknown option: ' + arg);
    options[m[1]] = m[2];
  }
}
const [w = 1280, h = 800, out = 'shot.png', woke] = positional;
if (options.view && options.view !== 'week') throw new Error('--view must be week');
(async () => {
  const fake = createFakeClaude({ fixture: options.fixture });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const p = await b.newPage({ viewport: { width: +w, height: +h }, timezoneId: 'Asia/Seoul', deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    p.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
    await p.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    await fake.install(p);
    await p.clock.setFixedTime(options.at ? fixedTime(options.at) : new Date());
    await p.goto(pathToFileURL(path.resolve(__dirname, '../dist/index.html')).href+(process.env.SHOT_QUERY||''), { waitUntil: 'commit', timeout: 240000 });
    await p.waitForFunction(() => window.__journeyReady === true && (window.__rendered >= 1 || document.querySelector('.stage.nogl')), null, { timeout: 240000 });
    if(options.fixture && !await p.evaluate(()=>JOURNEY.online))throw new Error('Fixture DB timed out; refusing an inaccurate screenshot');
    if (woke) { await p.fill('#woke', woke); await p.locator('#woke').blur(); }
    if (options.view === 'week') await p.click('#wkWeek');
    await p.waitForTimeout(woke ? 1200 : 300);
    await p.waitForFunction(() => !document.querySelector('#stage.painting'), null, { timeout: 240000 });
    await p.screenshot({ path: out, fullPage: +w < 900, timeout: 240000 });
    if (errs.length) throw new Error(errs.join('\n'));
    console.log('Saved ' + out + ' ' + JSON.stringify(await p.evaluate(()=>({scene:window.__renderScene,firstRenderMs:Math.round(window.__firstRenderMs||0),gpuCompleteMs:Math.round(window.__renderMs||0),canvas:[document.getElementById('gl').width,document.getElementById('gl').height]}))));
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
