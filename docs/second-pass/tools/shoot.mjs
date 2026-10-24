// usage: node shoot.mjs PAGE OUTDIR [scheme=light] [width=1280] [wait=2500] [selectors=canvas ids,...] [js]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire('/Users/a9lim/Work/Exploratory/package.json');
const { chromium } = require('playwright-core');
const CHROME = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [page0, out, scheme = 'light', width = '1280', wait = '2500', sels = '', js = ''] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const w = +width;
const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme, deviceScaleFactor: +(process.env.DPR || 2), isMobile: w < 600, hasTouch: w < 600 });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 400)));
await page.goto('file://' + page0, { waitUntil: 'networkidle' });
let idx = 0;
for (const id of sels.split(",").filter(Boolean)) { idx++;
  const [sel, pre] = id.split('|');
  await page.locator('#' + sel).scrollIntoViewIfNeeded();
  if (pre) await page.evaluate(pre);
  await page.waitForTimeout(+wait);
  if (js) await page.evaluate(js);
  const el = await page.locator('#' + sel).evaluateHandle(e => e.closest('figure') || e);
  await el.asElement().screenshot({ path: `${out}/${scheme[0]}${w}-${sel}${pre ? '-' + idx : ''}.png` });
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
console.log(JSON.stringify({ errs: errs.slice(0, 12), overflow }));
await browser.close();
