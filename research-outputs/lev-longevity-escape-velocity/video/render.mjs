// Minimal CDP frame renderer: node render.mjs --html file.html --out dir --start 0 --end 100 --fps 30 --port 9333 [--mode shot|canvas]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? acc.concat([[v.slice(2), arr[i + 1]]]) : acc), []));
const html = path.resolve(a.html), out = path.resolve(a.out);
const start = +(a.start ?? 0), end = +(a.end ?? 1), fps = +(a.fps ?? 30), port = +(a.port ?? 9333), mode = a.mode ?? 'shot';
const W = +(a.w ?? 1920), H = +(a.h ?? 1080);
fs.mkdirSync(out, { recursive: true });
// Set CHROME to a Chromium/Chrome binary; the default looks for a Playwright install, then common names.
const CHROME = process.env.CHROME || [].concat(
  fs.existsSync('/opt/pw-browsers') ? fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium')).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`) : [],
  ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']).find((p) => fs.existsSync(p));
if (!CHROME) { console.error('No Chromium found; set CHROME=/path/to/chrome'); process.exit(1); }
const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'lev-cdp-'));
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
const getJSON = (p) => new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: p }, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 100; i++) { try { const l = await getJSON('/json/list'); target = l.find((x) => x.type === 'page'); if (target) break; } catch {} await sleep(100); }
if (!target) { console.error('no page target'); chrome.kill(); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') console.error('PAGE ERROR:', JSON.stringify(m.params.exceptionDetails).slice(0, 700)); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error('CONSOLE:', JSON.stringify(m.params.args.map((x) => x.value ?? x.description)).slice(0, 500)); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file://' + html });
for (let i = 0; i < 300; i++) { const r = await send('Runtime.evaluate', { expression: "typeof window.__ready === 'object' && document.readyState === 'complete'", returnByValue: true }); if (r.result.value) break; await sleep(100); }
const ready = await send('Runtime.evaluate', { expression: 'window.__ready', awaitPromise: true, returnByValue: true });
if (ready.exceptionDetails) { console.error(JSON.stringify(ready.exceptionDetails)); chrome.kill(); process.exit(1); }
const t0 = Date.now();
const times = a.times ? a.times.split(',').map(Number) : null;
const total = times ? times.length : end - start;
for (let n = 0; n < total; n++) {
  const f = times ? n : start + n;
  const t = times ? times[n] : f / fps;
  const ev = await send('Runtime.evaluate', { expression: `window.__draw(${t})`, returnByValue: true });
  if (ev.exceptionDetails) { console.error('draw error at t=' + t, JSON.stringify(ev.exceptionDetails).slice(0, 600)); chrome.kill(); process.exit(2); }
  let b64;
  if (mode === 'canvas') { const r = await send('Runtime.evaluate', { expression: 'window.__png()', returnByValue: true }); b64 = r.result.value.split(',')[1]; }
  else { const r = await send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false }); b64 = r.data; }
  const name = times ? 't' + String(Math.round(t * 1000)).padStart(7, '0') : String(f).padStart(6, '0');
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(b64, 'base64'));
  if (!times && (n % 200 === 199)) console.error(`frames ${start}..${f} ${((Date.now() - t0) / (n + 1)).toFixed(0)} ms/frame`);
}
console.error(`done ${total} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
ws.close(); chrome.kill('SIGKILL'); try { fs.rmSync(udd, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
process.exit(0);
