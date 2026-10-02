// Bundles the game into two self-contained files (no network needed at runtime):
//   dist/index.html     standalone page, open it straight from disk
//   dist/artifact.html  page fragment for the Artifact viewer (it adds the doctype/head/body skeleton itself)
import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const dev = process.argv.includes('--dev');       // readable (unminified) standalone page at .cache/dev.html, dist/ untouched
const TITLE = 'Banana Depths';

const opts = {
  entryPoints: [resolve(root, 'src/main.js')],
  bundle: true,
  minify: !watch && !dev,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
};

function assemble(js) {
  const css = readFileSync(resolve(root, 'src/ui/style.css'), 'utf8');
  const safeJs = js.replace(/<\/script/gi, '<\\/script');
  const body = `<div id="app" role="application" aria-label="${TITLE}"></div>\n<script>${safeJs}</script>`;
  const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Fredoka:wdth,wght@75..125,400..700&display=swap">';

  const fragment = `<title>${TITLE}</title>\n${fonts}\n<style>${css}</style>\n${body}\n`;
  const standalone = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n` +
    `<title>${TITLE}</title>\n${fonts}\n<style>html{padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}</style>\n<style>${css}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  return { fragment, standalone };
}

async function run() {
  const result = await build(opts);
  const js = result.outputFiles[0].text;
  const { fragment, standalone } = assemble(js);
  if (dev) {
    mkdirSync(resolve(root, '.cache'), { recursive: true });
    writeFileSync(resolve(root, '.cache/dev.html'), standalone);
    console.log('built .cache/dev.html (unminified)');
    return;
  }
  mkdirSync(resolve(root, 'dist'), { recursive: true });
  writeFileSync(resolve(root, 'dist/index.html'), standalone);
  writeFileSync(resolve(root, 'dist/artifact.html'), fragment);
  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
  console.log(`built dist/index.html (${kb(standalone)}) and dist/artifact.html (${kb(fragment)})`);
}

if (watch) {
  const ctx = await context({ ...opts, plugins: [{ name: 'rebuild', setup(b) { b.onEnd(() => run().catch((e) => console.error(e))); } }] });
  await ctx.watch();
  console.log('watching src/ ...');
} else {
  await run();
}
