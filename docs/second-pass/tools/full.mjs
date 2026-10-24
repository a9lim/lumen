import { createRequire } from 'node:module';
const require = createRequire('/Users/a9lim/Work/Exploratory/package.json');
const { chromium } = require('playwright-core');
const CHROME = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [p, out, scheme] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
const pg = await ctx.newPage(); const errs = [];
pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file://' + p, { waitUntil: 'networkidle' });
for (let y = 0; y < 12000; y += 700) { await pg.evaluate(y => scrollTo(0, y), y); await pg.waitForTimeout(250); }
await pg.waitForTimeout(800);
await pg.screenshot({ path: out, fullPage: true });
console.log(JSON.stringify(errs));
await b.close();
