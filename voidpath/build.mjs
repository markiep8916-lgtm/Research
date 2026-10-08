// VOIDPATH build: bundles ES modules with esbuild and inlines them into HTML.
//
//   node build.mjs          -> minified build
//   node build.mjs --dev    -> readable build (no minify), faster to debug
//
//   node build.mjs --only main / --only preview-engine   one entry
//
// Outputs
//   dist/index.html          full standalone document with three.js bundled in, so it also
//                            opens offline straight from disk (POC review R24)
//   dist/artifact.html       the page as a fragment (no doctype/html/head/body) for publishing
//                            as a claude.ai Artifact; loads three.js from the pinned CDN
//   dist/tools/<name>.html   one page per src/tools/<name>.js preview entry (three.js from the CDN)
//
// CDN builds rewrite every `import ... from 'three'` to the pinned jsdelivr ES module URL below,
// so those pages stay small. `three/addons/...` imports are always bundled (they in turn import
// 'three', which resolves the same way). tools/play.mjs serves the local node_modules copy for
// that URL so headless tests work offline. Every page must stay under 16 MB.

import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const THREE_VERSION = '0.170.0';
export const THREE_URL = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.min.js`;

const dev = process.argv.includes('--dev');
const MAX_BYTES = 16 * 1024 * 1024;
const only = (() => {
  const i = process.argv.indexOf('--only');
  return i >= 0 ? process.argv[i + 1] : null; // e.g. --only main  or  --only preview-art
})();

const externalThree = {
  name: 'external-three',
  setup(build) {
    build.onResolve({ filter: /^three$/ }, () => ({ path: THREE_URL, external: true }));
  },
};

const template = fs.readFileSync(path.join(ROOT, 'src/index.template.html'), 'utf8');

function between(src, a, b) {
  const i = src.indexOf(a);
  const j = src.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`template marker missing: ${a} / ${b}`);
  return src.slice(i + a.length, j);
}

function scriptTag(js) {
  // Make the bundle safe to inline inside <script>.
  const safe = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  return `<script type="module">\n${safe}\n</script>`;
}

function fullDocument(js, { title }) {
  return template
    .replace('<!--BUNDLE-->', () => scriptTag(js)) // function replacer: minified JS may contain `$&`
    .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`);
}

function artifactFragment(js) {
  // The Artifact host wraps the page in its own doctype/html/head/body skeleton,
  // so publish only the head contents (title first) followed by the body contents.
  const head = between(template, '<!--HEAD-START-->', '<!--HEAD-END-->');
  const body = between(template, '<!--BODY-START-->', '<!--BODY-END-->').replace('<!--BUNDLE-->', () => scriptTag(js));
  return `${head.trim()}\n${body.trim()}\n`;
}

async function bundle(entry, { inlineThree = false } = {}) {
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    target: ['es2020'],
    minify: !dev,
    sourcemap: false,
    write: false,
    legalComments: 'none',
    plugins: inlineThree ? [] : [externalThree],
    logLevel: 'silent',
    define: { __DEV__: dev ? 'true' : 'false' },
  });
  return result.outputFiles[0].text;
}

function write(file, html) {
  if (Buffer.byteLength(html) > MAX_BYTES) throw new Error(`${path.relative(ROOT, file)} is ${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB (limit 16 MB)`);
  fs.writeFileSync(file, html);
}

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(path.join(ROOT, 'dist/tools'), { recursive: true });
  const jobs = [];
  if (!only || only === 'main') {
    jobs.push((async () => {
      const entry = path.join(ROOT, 'src/main.js');
      const [js, standalone] = await Promise.all([bundle(entry), bundle(entry, { inlineThree: true })]);
      write(path.join(ROOT, 'dist/index.html'), fullDocument(standalone, { title: 'Voidpath' }));
      write(path.join(ROOT, 'dist/artifact.html'), artifactFragment(js));
      return `main (${(js.length / 1024).toFixed(0)} KB; standalone with three.js ${(standalone.length / 1024).toFixed(0)} KB)`;
    })());
  }
  const toolDir = path.join(ROOT, 'src/tools');
  for (const f of fs.existsSync(toolDir) ? fs.readdirSync(toolDir) : []) {
    if (!f.endsWith('.js')) continue;
    const name = f.slice(0, -3);
    if (only && only !== name) continue;
    jobs.push((async () => {
      const js = await bundle(path.join(toolDir, f));
      write(path.join(ROOT, `dist/tools/${name}.html`), fullDocument(js, { title: `Voidpath: ${name}` }));
      return name;
    })());
  }
  const results = await Promise.allSettled(jobs);
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') console.log(`  built ${r.value}`);
    else {
      failed++;
      const errs = r.reason?.errors;
      if (errs?.length) {
        for (const e of errs) console.error(`  ERROR ${e.location ? `${e.location.file}:${e.location.line}:${e.location.column} ` : ''}${e.text}`);
      } else console.error('  ERROR', r.reason?.message || r.reason);
    }
  }
  console.log(`build ${failed ? 'FAILED' : 'ok'} in ${Date.now() - t0} ms${dev ? ' (dev)' : ''}`);
  if (failed) process.exit(1);
}

main();
