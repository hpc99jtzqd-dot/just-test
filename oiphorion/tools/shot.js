// 렌더 확인: node tools/shot.js [너비] [높이] [출력.png] [일어난시각(선택)]
// 예) node tools/shot.js 1280 800 out.png      /  node tools/shot.js 400 820 phone.png 11:00
// headless에서 WebGL을 쓰려면 SwiftShader 플래그가 필요하다 (Playwright 설치 필요).
const { chromium } = require('playwright');
const path = require('path');
const [,, w = 1280, h = 800, out = 'shot.png', woke] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html'));
  if (woke) await p.fill('#woke', woke);
  await p.waitForFunction(() => window.__rendered >= 1 || document.querySelector('.stage.nogl'), { timeout: 240000 });
  await p.waitForTimeout(300);
  await p.screenshot({ path: out, fullPage: +w < 900 });
  if (errs.length) console.log(errs.join('\n'));
  await b.close();
})();
