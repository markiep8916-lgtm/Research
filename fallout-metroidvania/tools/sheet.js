#!/usr/bin/env node
// Compose several PNGs into one labelled contact sheet.  usage: node tools/sheet.js out.png cols cellW img1.png img2.png ...
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [out, colsS, cwS, ...imgs] = process.argv.slice(2);
const cols = +colsS, cw = +cwS;
(async () => {
  const items = imgs.map((f) => ({ f: path.resolve(f), name: path.basename(f, '.png') }));
  const html = '<html><body style="margin:0;background:#0b0d0f;font:12px monospace;color:#ddd"><div style="display:grid;grid-template-columns:repeat(' + cols + ',' + cw + 'px);gap:4px;padding:4px">' +
    items.map((i) => '<div><img src="file://' + i.f + '" style="width:' + cw + 'px;display:block"><div style="padding:1px 4px">' + i.name + '</div></div>').join('') + '</div></body></html>';
  const tmp = path.join(path.dirname(path.resolve(out)), '_sheet.html'); fs.writeFileSync(tmp, html);
  const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: cols * (cw + 4) + 4, height: 600 } });
  await page.goto('file://' + tmp); await page.waitForTimeout(600);
  await page.screenshot({ path: out, fullPage: true }); await browser.close(); fs.unlinkSync(tmp);
})();
