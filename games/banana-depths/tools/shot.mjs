// Screenshot helper: node tools/shot.mjs <file.html> <out.png> [--w=1280 --h=720 --wait=ready --eval="js" --query="?x=1"]
import { chromium } from './pw.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const GL_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'];

export async function launch(extra = {}) {
  return chromium.launch({ args: GL_ARGS, ...extra });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = Object.fromEntries(process.argv.slice(4).map((a) => { const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a, true]; }));
  const [file, out] = [process.argv[2], process.argv[3]];
  const w = +(args.w || 1280), h = +(args.h || 720);
  const b = await launch();
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const logs = [];
  p.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  p.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await p.goto(pathToFileURL(resolve(file)).href + (args.query || ''));
  const failed = new Promise((res) => p.on('pageerror', () => setTimeout(res, 500)));
  await Promise.race([
    p.waitForFunction(() => window.__ready === true, null, { timeout: +(args.timeout || 60000) }).catch(() => logs.push('[shot] timed out waiting for __ready')),
    failed,
  ]);
  if (args.eval) await p.evaluate(args.eval);
  await p.waitForTimeout(+(args.settle || 300));
  await p.screenshot({ path: out });
  console.log(logs.slice(0, 30).join('\n'));
  await b.close();
}
