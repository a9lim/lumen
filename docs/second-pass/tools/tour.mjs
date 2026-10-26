// usage: node tour.mjs OUTDIR scenarios.json [width=1440] [height=900] [dpr=2] [base=http://localhost:8793/lumen/]
// Scenario: { name, scheme?, org?, margin?, width?, height?, dpr?, reduced?, steps?: [{ js, wait, shot? }], ev? }
// In-page helpers: __t.org(key), __t.tog(id,on), __t.click(id), __t.margin(open), __t.tab(name), __t.mods() -> modules
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/Users/a9lim/Work/Exploratory/package.json');
const { chromium } = require('playwright-core');
const CHROME = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [out, file, width = '1440', height = '900', dpr = '2', base = 'http://localhost:8793/lumen/'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const scenarios = JSON.parse(readFileSync(file, 'utf8'));
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const HELPERS = `
window.__t = {
  org(k) { document.querySelector('[data-org="' + k + '"]').click(); },
  tog(id, on) { const e = document.getElementById(id); if (e.checked !== on) e.click(); },
  click(id) { document.getElementById(id).click(); },
  margin(open) { if (document.body.classList.contains('lu-closed') === open) (open ? document.getElementById('menu-btn') : document.getElementById('close-legend')).click(); },
  tab(n) { document.querySelector('.tab-btn[data-tab="' + n + '"]').click(); },
  async mods() {
    const b = '/lumen/src/';
    return { state: await import(b + 'state.js'), R: (await import(b + 'renderer.js')).default, M: (await import(b + 'membrane.js')).Membrane, map: (await import(b + 'map.js')).MapView, flux: await import(b + 'flux.js'), P: (await import(b + 'particles.js')).default };
  },
};`;
const results = {};
for (const sc of scenarios) {
  const w = sc.width || +width, h = sc.height || +height;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: sc.scheme || 'light', deviceScaleFactor: sc.dpr || +dpr, isMobile: w < 600, hasTouch: w < 600, reducedMotion: sc.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 240)); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 240)));
  page.on('response', r => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  await page.goto((sc.url || base) + (sc.query || ''), { waitUntil: 'networkidle' });
  await page.evaluate(HELPERS);
  if (sc.margin !== undefined) await page.evaluate(m => window.__t.margin(m), sc.margin);
  if (sc.org) await page.evaluate(n => window.__t.org(n), sc.org);
  const steps = sc.steps || [{ js: sc.js || '', wait: sc.wait ?? 2500 }];
  let i = 0;
  for (const st of steps) {
    if (st.js) { try { await page.evaluate(st.js); } catch (e) { errs.push('step ' + i + ': ' + e.message.slice(0, 200)); } }
    await page.waitForTimeout(st.wait ?? 1500);
    if (st.shot !== false) await page.screenshot({ path: `${out}/${sc.name}${steps.length > 1 ? '-' + i : ''}.png`, clip: st.clip });
    i++;
  }
  let ev = null;
  if (sc.ev) { try { ev = await page.evaluate(sc.ev); } catch (e) { ev = 'ERR ' + e.message; } }
  results[sc.name] = { errs: errs.slice(0, 8), ev };
  await ctx.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
