// 디자인 점검용 캡처: node tools/gallery.js <출력폴더> [너비] [높이]
// 메인 화면 + 책상·채석장·실험·주간 화면을 차례로 찍는다.
const { createFakeClaude, fixedTime } = require('./fake-claude');
const { chromium } = require('playwright');
const path = require('path'); const { pathToFileURL } = require('url');
const [outDir = '.', w = 1280, h = 860] = process.argv.slice(2);
(async () => {
  const fake = createFakeClaude({});
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  try {
    const p = await b.newPage({ viewport: { width:+w, height:+h }, timezoneId:'Asia/Seoul', deviceScaleFactor:1, reducedMotion:'reduce' });
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r=>r.fulfill({contentType:'text/css',body:''}));
    await fake.install(p);
    await p.clock.setFixedTime(fixedTime('2026-11-16T20:10'));
    await p.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href,{waitUntil:'commit',timeout:240000});
    await p.waitForFunction(()=>window.__journeyReady===true&&(window.__rendered>=1||document.querySelector('.stage.nogl')),null,{timeout:240000});
    await p.fill('#woke','08:00'); await p.locator('#woke').blur();
    await p.waitForTimeout(800);
    await p.waitForFunction(()=>!document.querySelector('#stage.painting'),null,{timeout:240000});
    const shot=async n=>{await p.waitForTimeout(250);await p.screenshot({path:path.join(outDir,n+'.png'),fullPage:false});console.log('saved',n);};
    await shot('1-main');
    await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await shot('2-main-bottom');
    await p.evaluate(()=>window.scrollTo(0,0));
    for (const [n,fn] of [['3-desk','document.querySelector("#nowStrip button").click()'],['4-quarry','QUARRY.open()'],['5-exper','EXPER.open()']]) {
      try { await p.evaluate(fn); await shot(n); await p.keyboard.press('Escape'); await p.evaluate(()=>document.querySelectorAll('.ov,[id$=Ov]').forEach(o=>o.hidden=true)); } catch(e){ console.log(n,'fail',e.message); }
    }
    try { await p.click('#wkWeek'); await p.waitForTimeout(600); await p.waitForFunction(()=>!document.querySelector('#stage.painting'),null,{timeout:240000}); await shot('6-week'); } catch(e){console.log('week fail',e.message)}
    if (errs.length) console.log('ERRORS', errs);
  } finally { await b.close(); }
})();
