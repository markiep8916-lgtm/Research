// Builds the game into self-contained HTML files.
//   wasteland-brawler.html  standalone page (open directly in a browser)
//   dist/artifact.html      page fragment for the Claude Artifact publisher
//
// Options (for isolated testing while content modules are being written):
//   --out DIR          write the outputs into DIR instead of the project folder
//   --only a.js,b.js   include only these content modules (engine modules are always included)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const outDir = opt('--out') ? resolve(opt('--out')) : root;
const only = opt('--only') ? opt('--only').split(',').map(s => s.trim()) : null;

// Engine modules. Everything else in src/ is content.
const ENGINE = ['00_core.js', '10_audio.js', '20_gfx.js', '30_fx.js', '40_entity.js', '45_rig.js', '46_scorpion.js', '50_player.js',
  '60_enemy.js', '70_objects.js', '80_game.js', '85_ui.js', '99_main.js'];

const srcDir = join(root, 'src');
const files = readdirSync(srcDir).filter(f => f.endsWith('.js')).sort()
  .filter(f => ENGINE.includes(f) || !only || only.includes(f));
const js = files
  .map(f => `// ---- ${f} ----\n${readFileSync(join(srcDir, f), 'utf8')}`)
  .join('\n');

const template = readFileSync(join(root, 'template.html'), 'utf8');
if (!template.includes('/*__GAME_SCRIPT__*/')) throw new Error('template is missing the script marker');
const fragment = template.replace('/*__GAME_SCRIPT__*/', () => `\n${js}\n`);

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${fragment}
</html>
`;

mkdirSync(join(outDir, 'dist'), { recursive: true });
writeFileSync(join(outDir, 'dist', 'artifact.html'), fragment);
writeFileSync(join(outDir, 'wasteland-brawler.html'), standalone);
console.log(`built ${files.length} modules (${files.filter(f => !ENGINE.includes(f)).join(', ') || 'engine only'}), ${js.split('\n').length} lines of JS, ${(standalone.length / 1024).toFixed(1)} KB -> ${outDir}`);
