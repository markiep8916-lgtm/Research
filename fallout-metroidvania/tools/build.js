#!/usr/bin/env node
// Single-file build: inlines every source file (in manifest order) into one self-contained HTML file.
// usage: node tools/build.js [out.html]        (default: dist/fallout-cinder-deep.html)
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist', 'fallout-cinder-deep.html');
const manifest = new Function('window', fs.readFileSync(path.join(root, 'src', 'manifest.js'), 'utf8') + '\nreturn window.CD_MANIFEST;')({});
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const strip = (code) => code.replace(/<\/script/gi, '<\\/script');
let bundle = '';
for (const f of manifest) {
  const p = path.join(root, 'src', f);
  if (!fs.existsSync(p)) { console.error('missing source file: ' + f); process.exit(1); }
  bundle += '\n/* ---- ' + f + ' ---- */\n' + strip(fs.readFileSync(p, 'utf8')) + '\n';
}
const build = new Date().toISOString();
const inline = '<script>window.CD_BUILD = ' + JSON.stringify(build) + ';\n' +
  "(function(){var err=document.getElementById('err');window.addEventListener('error',function(e){err.style.display='block';err.textContent+=(e.message||'error')+' @ '+(e.filename||'').split('/').pop()+':'+e.lineno+'\\n';});})();\n" +
  'window.CD_MANIFEST = ' + JSON.stringify(manifest) + ';</script>\n' +
  '<script>' + bundle + '\n;(function(){ var bar=document.getElementById("bootbar"); if (bar) bar.style.width="45%"; if (window.CD && CD.boot) CD.boot(); })();</script>';

// replace the manifest + loader scripts of index.html
const start = html.indexOf('<script src="src/manifest.js"></script>');
const end = html.lastIndexOf('</script>') + '</script>'.length;
if (start < 0 || end < start) { console.error('index.html layout not recognised'); process.exit(1); }
html = html.slice(0, start) + inline + html.slice(end);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('built ' + path.relative(root, out) + '  (' + (html.length / 1024).toFixed(0) + ' KB, ' + manifest.length + ' files, ' + build + ')');
