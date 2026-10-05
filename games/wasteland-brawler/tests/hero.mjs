// Scripted hero playtest: exercises every move against sandbox enemies with deterministic stepping.
// Usage: node tests/hero.mjs [outDir] [enemyType]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'tests', 'out'));
const foe = process.argv[3] || 'skid';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1152, height: 700 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto('file://' + join(root, 'wasteland-brawler.html'));
await page.waitForTimeout(300);
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const shot = async name => page.screenshot({ path: join(out, name + '.png'), clip: await page.evaluate(() => { const r = document.getElementById('screen').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) });
const snap = async label => { const s = await ev(() => window.__wb.snapshot()); console.log(label.padEnd(14), JSON.stringify({ p: [s.pstate, s.hp, s.grey, s.px, s.py, s.pz], rage: s.rage, combo: s.combo, score: s.score, foes: s.foes.map(f => f.type + ':' + f.hp + ':' + f.state) })); return s; };

await ev(() => { window.__wb.manual = true; });
await ev(t => window.__wb.sandbox([t, t, t]), foe);
await ev(() => window.__wb.step(5));
await snap('start');
await shot('h00-start');
// walk to the first enemy and run the full string
const S = (code) => ev(code);
await S(`(()=>{ const w=window.__wb, G=w.Game; const e=G.foes()[0]; const p=G.player; p.x=e.x-22; p.y=e.y; p.facing=1; e.cool=999; G.foes().forEach(f=>f.cool=999); w.step(1); })()`);
for (let i = 0; i < 4; i++) { await S(`window.__wb.tap('attack', 6)`); }
await S(`window.__wb.step(4)`); await shot('h01-string'); await S(`window.__wb.step(10)`);
await snap('after string');
// jump-cancel juggle: string then jump + air kick
await S(`window.__wb.step(40)`);
// grab + knees + toss
await S(`(()=>{ const w=window.__wb, G=w.Game; const e=G.foes().find(f=>!f.dying); if(!e) return; const p=G.player; e.setState('idle'); e.x=p.x+16; e.y=p.y; p.facing=1; w.input('right', 8); })()`);
await snap('grab?');
await S(`window.__wb.tap('attack', 14)`); await S(`window.__wb.tap('attack', 14)`); await shot('h02-grab');
await S(`window.__wb.tap('attack', 30)`);
await snap('after toss');
// scrap burst
await S(`window.__wb.step(30)`);
await S(`window.__wb.tap('special', 5)`); await shot('h03-burst'); await S(`window.__wb.step(30)`);
await snap('after burst');
// meteor fist
await S(`window.__wb.tap('jump', 14)`); await S(`window.__wb.tap('special', 12)`); await shot('h04-meteor'); await S(`window.__wb.step(30)`);
await snap('after meteor');
// run + ram
await S(`(()=>{ const w=window.__wb; const G=w.Game; G.player.x=G.cam.x+40; w.tap('right',2); w.input('right',2,false); w.input('right',10); })()`);
await S(`(()=>{ const w=window.__wb; w.input('right',2,false); w.Input.key.right=true; w.tap('attack',4); w.Input.key.right=false; })()`);
await shot('h05-ram'); await S(`window.__wb.step(30)`);
await snap('after ram');
// overdrive
await S(`(()=>{ const w=window.__wb; w.Game.rage=100; w.Game.foes().forEach(f=>{ if(!f.dying){ f.setState('idle'); f.x=w.Game.player.x+40+Math.random()*20; f.y=w.Game.player.y; }}); w.tap('special', 10); })()`);
await shot('h06-overdrive-freeze'); await S(`window.__wb.step(30)`); await shot('h07-overdrive-dash'); await S(`window.__wb.step(40)`);
await snap('after overdrive');
// weapon
await S(`(()=>{ const w=window.__wb, G=w.Game; G.add(new Item('pipe', G.player.x+4, G.player.y)); w.tap('attack', 12); })()`);
await snap('pipe?');
await S(`window.__wb.tap('attack', 20)`); await shot('h08-pipe');
await S(`window.__wb.tap('special', 20)`);
await snap('threw pipe');
// let enemies fight back for a while
await S(`(()=>{ const w=window.__wb, G=w.Game; for (let i=0;i<3;i++) G.spawn({type:'${foe}', side:'R'}); G.foes().forEach(f=>f.cool=0); w.step(400); })()`);
await shot('h09-crowd');
await snap('crowd');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
