// Bundles a dev page: node scripts/build-dev.mjs gallery  ->  .cache/gallery.html
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2] || 'gallery';
const r = await build({ entryPoints: [resolve(root, `src/dev/${name}.js`)], bundle: true, format: 'iife', target: 'es2020', write: false, minify: false, logLevel: 'warning', define: { 'process.env.NODE_ENV': '"development"' } });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
mkdirSync(resolve(root, '.cache'), { recursive: true });
writeFileSync(resolve(root, `.cache/${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#stage{position:fixed;inset:0}canvas{width:100%;height:100%;display:block}</style></head><body><div id="stage"></div><script>${js}</script></body></html>`);
console.log(`built .cache/${name}.html`);
