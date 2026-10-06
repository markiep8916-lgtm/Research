// UI preview: input + every field/menu UI component over a painted sci-fi backdrop.
// Scenes: window.__PREVIEW.show(name) or #name in the URL. Names: title, title-menu, dialog,
// dialog-line, hud, menu-party, menu-items, menu-use, menu-settings, menu-controls, gameover,
// complete, touch, touch-battle. Append ':fallback' (e.g. #menu-party:fallback) to see the UI
// without portrait / icon providers.
import { Input } from '../core/input.js';
import { UI } from '../ui/ui.js';
import { Painter } from '../art/painter.js';
import { RAMPS, OUTLINE, GLOW } from '../art/palette.js';
import { makeRng } from '../core/util.js';

// ------------------------------------------------------------------ painted backdrop (stand-in for the 3D view)

const view = document.getElementById('view');

function paintBackdrop() {
  const w = view.clientWidth, h = view.clientHeight;
  const dpr = Math.min(2, devicePixelRatio || 1);
  view.width = Math.round(w * dpr);
  view.height = Math.round(h * dpr);
  const g = view.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rnd = makeRng(7);
  const horizon = h * 0.56;

  // deep space through a panoramic window
  let gr = g.createLinearGradient(0, 0, 0, horizon);
  gr.addColorStop(0, '#04060d'); gr.addColorStop(0.6, '#0a1430'); gr.addColorStop(1, '#152447');
  g.fillStyle = gr; g.fillRect(0, 0, w, horizon);
  for (const [x, y, r, c] of [[0.2, 0.25, 0.45, 'rgba(255,79,192,.10)'], [0.75, 0.15, 0.5, 'rgba(70,160,255,.12)'], [0.5, 0.45, 0.4, 'rgba(127,227,255,.06)']]) {
    gr = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
    gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, horizon);
  }
  for (let i = 0; i < 260; i++) {
    const s = rnd() < 0.1 ? 2 : 1;
    g.fillStyle = `rgba(220,236,255,${(0.25 + rnd() * 0.75).toFixed(2)})`;
    g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * horizon), s, s);
  }
  // ringed gas giant
  const px = w * 0.74, py = horizon * 0.78, pr = Math.min(w, h) * 0.3;
  g.save();
  g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.clip();
  gr = g.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
  gr.addColorStop(0, '#f2a35a'); gr.addColorStop(0.45, '#b2552c'); gr.addColorStop(1, '#2a0f18');
  g.fillStyle = gr; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  for (let b = 0; b < 14; b++) {
    g.fillStyle = b % 2 ? 'rgba(255,214,160,.10)' : 'rgba(90,30,30,.14)';
    g.fillRect(px - pr, py - pr + b * pr * 0.15 + Math.sin(b) * 6, pr * 2, pr * 0.07);
  }
  gr = g.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.2, px, py, pr * 1.05);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(5,7,20,.85)');
  g.fillStyle = gr; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  g.restore();
  g.save();
  g.translate(px, py); g.rotate(-0.28); g.scale(1, 0.22);
  for (const [rr, a] of [[1.7, 0.35], [1.5, 0.5], [1.32, 0.28]]) {
    g.beginPath(); g.arc(0, 0, pr * rr, 0, Math.PI * 2);
    g.lineWidth = pr * 0.09; g.strokeStyle = `rgba(255,214,170,${a})`; g.stroke();
  }
  g.restore();

  // window mullions and the hull wall
  g.fillStyle = '#0a101e';
  for (let x = -20; x < w + 40; x += Math.max(160, w / 6)) g.fillRect(x, 0, 18, horizon);
  g.fillRect(0, horizon - 26, w, 26);
  g.fillStyle = 'rgba(127,227,255,.35)'; g.fillRect(0, horizon - 27, w, 1);

  // deck floor with perspective seams
  gr = g.createLinearGradient(0, horizon, 0, h);
  gr.addColorStop(0, '#1a2338'); gr.addColorStop(1, '#0a0e19');
  g.fillStyle = gr; g.fillRect(0, horizon, w, h - horizon);
  g.strokeStyle = 'rgba(140,190,255,.08)'; g.lineWidth = 1;
  const vx = w * 0.5, vy = horizon - h * 0.25;
  for (let i = -14; i <= 14; i++) {
    g.beginPath(); g.moveTo(vx + i * w * 0.02, horizon); g.lineTo(vx + i * w * 0.16, h); g.stroke();
  }
  for (let k = 1; k < 12; k++) {
    const y = horizon + (h - horizon) * Math.pow(k / 12, 1.8);
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
  }
  // amber work-lamp pools + cyan instrument glow
  for (const [x, y, r, c] of [[0.22, 0.78, 0.22, 'rgba(255,170,70,.30)'], [0.62, 0.86, 0.18, 'rgba(255,170,70,.22)'], [0.88, 0.7, 0.12, 'rgba(127,227,255,.22)']]) {
    gr = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
    gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, horizon, w, h - horizon);
  }
  // light shafts from the window
  g.globalCompositeOperation = 'lighter';
  for (const x of [0.12, 0.42, 0.7]) {
    gr = g.createLinearGradient(0, horizon * 0.3, 0, h);
    gr.addColorStop(0, 'rgba(150,210,255,.0)'); gr.addColorStop(0.5, 'rgba(150,210,255,.06)'); gr.addColorStop(1, 'rgba(150,210,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x * w, horizon * 0.2); g.lineTo(x * w + w * 0.08, horizon * 0.2); g.lineTo(x * w + w * 0.2, h); g.lineTo(x * w + w * 0.05, h); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // tilt-shift-ish vignette
  gr = g.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h * 0.55, Math.max(w, h) * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}

// ------------------------------------------------------------------ stand-in pixel portraits (art/characters will replace these)

const LOOKS = {
  kade: { skin: RAMPS.skinLight, hair: RAMPS.hairWhite, suit: RAMPS.navy, trim: RAMPS.amber, eye: GLOW.amber, visor: true, style: 'short' },
  nyx: { skin: RAMPS.skinMedium, hair: RAMPS.hairTeal, suit: RAMPS.gunmetal, trim: RAMPS.teal, eye: GLOW.cyan, lens: true, style: 'tail' },
  orion: { skin: RAMPS.skinLight, hair: RAMPS.hairCopper, suit: RAMPS.purple, trim: RAMPS.purple, eye: GLOW.violet, circuits: true, style: 'messy' },
  sera: { skin: RAMPS.skinDeep, hair: RAMPS.hairPink, suit: RAMPS.white, trim: RAMPS.cyan, eye: GLOW.cyan, halo: true, style: 'bob' },
};

function paintBust(id) {
  const p = new Painter(40, 40);
  if (id === 'bolt') {
    const s = RAMPS.steel;
    p.ellipse(20, 41, 15, 9, s[3]);
    p.rect(17, 28, 6, 6, s[2]);
    p.ellipse(20, 19, 11, 10, s[4]);
    p.ellipse(18, 16, 7, 5, s[5]);
    p.rect(11, 18, 18, 5, '#0b1a2a');
    p.rect(13, 19, 14, 3, GLOW.cyan);
    p.px(15, 20, '#ffffff'); p.px(24, 20, '#ffffff');
    p.vline(20, 4, 9, s[5]); p.circle(20, 4, 1, GLOW.amber);
    p.rect(8, 17, 3, 6, s[2]); p.rect(29, 17, 3, 6, s[2]);
    p.rimShade(); p.outline(OUTLINE);
    return p;
  }
  const L = LOOKS[id];
  p.ellipse(20, 42, 17, 11, L.suit[2]);
  p.ellipse(20, 41, 14, 8, L.suit[3]);
  p.poly([[14, 31], [26, 31], [24, 36], [16, 36]], L.trim[3]);
  if (L.circuits) { p.hline(8, 14, 38, GLOW.violet); p.vline(14, 34, 38, GLOW.violet); p.hline(26, 32, 37, GLOW.violet); }
  p.rect(17, 25, 6, 7, L.skin[1]);
  p.ellipse(21, 18, 8, 9, L.skin[3]);
  p.ellipse(23, 21, 4, 5, L.skin[4]);
  p.rect(21, 19, 2, 2, OUTLINE); p.rect(26, 19, 2, 2, OUTLINE);
  p.px(26, 19, L.eye);
  p.hline(24, 26, 24, L.skin[1]);
  const H = L.hair;
  if (L.style === 'short') { p.ellipse(19, 12, 10, 6, H[2]); p.poly([[10, 13], [14, 7], [17, 12], [21, 6], [24, 11], [29, 8], [30, 15], [10, 16]], H[3]); }
  if (L.style === 'tail') { p.ellipse(19, 12, 10, 7, H[2]); p.poly([[11, 12], [10, 30], [14, 34], [15, 16]], H[2]); p.ellipse(22, 10, 8, 4, H[3]); }
  if (L.style === 'messy') { p.ellipse(20, 11, 11, 7, H[2]); p.poly([[9, 14], [11, 4], [16, 9], [20, 2], [24, 8], [30, 5], [31, 15]], H[3]); }
  if (L.style === 'bob') { p.ellipse(20, 13, 11, 8, H[3]); p.rect(9, 13, 6, 13, H[2]); p.rect(27, 14, 4, 9, H[2]); p.ellipse(23, 10, 7, 3, H[4]); }
  if (L.visor) { p.rect(18, 18, 13, 3, GLOW.amber); p.hline(18, 30, 18, '#fff3cf'); }
  if (L.lens) { p.circle(26, 19, 2, GLOW.cyan); p.px(26, 19, '#ffffff'); }
  p.rimShade();
  p.outline(OUTLINE);
  if (L.halo) p.ring(20, 4, 7, GLOW.cyan, 1);
  return p;
}

const bustCache = new Map();
const standInPortrait = (id) => {
  if (!LOOKS[id] && id !== 'bolt') return null;
  if (!bustCache.has(id)) bustCache.set(id, paintBust(id).toCanvas(1));
  return bustCache.get(id);
};

// ------------------------------------------------------------------ mock game state

const member = (id, name, cls, level, hp, maxHp, ep, maxEp, stats, weapons, xp, xpNext, accent, alive = true) =>
  ({ id, name, cls, level, xp, xpNext, hp, maxHp, ep, maxEp, stats, weapons, skills: [], accent, alive });

const state = {
  party: [
    member('kade', 'KADE', 'Vanguard', 12, 486, 558, 61, 76, { atk: 68, def: 60, mag: 31, res: 40, spd: 44 }, ['blade', 'lance'], 214, 430, '#ffb54a'),
    member('nyx', 'NYX', 'Gunslinger', 11, 402, 438, 70, 93, { atk: 64, def: 40, mag: 44, res: 42, spd: 69 }, ['rifle', 'blade'], 88, 400, '#3fd6d2'),
    member('orion', 'ORION', 'Technomancer', 11, 96, 384, 118, 127, { atk: 36, def: 34, mag: 74, res: 57, spd: 52 }, ['gauntlet'], 301, 400, '#b98cff'),
    member('sera', 'SERA', 'Medic', 11, 0, 460, 74, 116, { atk: 46, def: 45, mag: 61, res: 63, spd: 48 }, ['lance'], 150, 400, '#ff7cbd', false),
  ],
  inventory: { medigel: 3, ether: 1, revive: 1, keycard: 1 },
  credits: 1240,
  flags: {},
  stats: { battles: 14, breaks: 23, maxDamage: 2861, steps: 3120, playTime: 1938 },
};

const ITEMS_TABLE = {
  medigel: { name: 'Medi-Gel', desc: 'Sealant gel. Restores 200 HP to one ally.', target: 'ally', key: false, effect: { heal: 200 } },
  ether: { name: 'Ether Cell', desc: 'Charged power cell. Restores 50 EP to one ally.', target: 'ally', key: false, effect: { ep: 50 } },
  revive: { name: 'Revive Kit', desc: 'Emergency restart. Revives a downed ally with half HP.', target: 'koAlly', key: false, effect: { revive: 0.5 } },
  keycard: { name: 'Bridge Keycard', desc: 'Command-level access. Opens the Observation Bridge.', target: null, key: true, effect: {} },
};

// local stand-in for core/state.js useItemOutOfBattle
function useItem(itemId, memberId) {
  const it = ITEMS_TABLE[itemId], m = state.party.find((x) => x.id === memberId);
  if (!it || !m || !state.inventory[itemId]) return { ok: false, message: 'Nothing happens.' };
  const take = () => { if (--state.inventory[itemId] <= 0) delete state.inventory[itemId]; };
  if (it.effect.revive) {
    if (m.alive) return { ok: false, message: `${m.name} doesn't need reviving.` };
    take(); m.alive = true; m.hp = Math.round(m.maxHp * it.effect.revive);
    return { ok: true, message: `${m.name} is back up with ${m.hp} HP.` };
  }
  if (!m.alive) return { ok: false, message: `${m.name} is down. Use a Revive Kit first.` };
  if (it.effect.heal) {
    if (m.hp >= m.maxHp) return { ok: false, message: `${m.name}'s HP is already full.` };
    const n = Math.min(it.effect.heal, m.maxHp - m.hp); take(); m.hp += n;
    return { ok: true, message: `${m.name} recovered ${n} HP.` };
  }
  const n = Math.min(it.effect.ep, m.maxEp - m.ep);
  if (n <= 0) return { ok: false, message: `${m.name}'s EP is already full.` };
  take(); m.ep += n;
  return { ok: true, message: `${m.name} recovered ${n} EP.` };
}

const audio = {
  muted: false, volume: { master: 1, music: 0.7, sfx: 0.8 }, log: [],
  init() {}, music() {},
  sfx(name) { this.log.push(name); if (this.log.length > 200) this.log.shift(); },
  setMuted(b) { this.muted = !!b; }, toggleMute() { this.muted = !this.muted; },
  setVolume(v) { Object.assign(this.volume, v); },
};
const engine = { quality: 'high', setQuality(q) { this.quality = q; } };

// ------------------------------------------------------------------ boot

paintBackdrop();
addEventListener('resize', paintBackdrop);
const input = new Input({ touchLayer: document.getElementById('touch-layer') });
const ui = new UI({ root: document.getElementById('ui-root'), input, audio, state, engine, onUseItem: useItem, items: ITEMS_TABLE });
input.onAny(() => audio.init());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.update();
  ui.update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ------------------------------------------------------------------ scenes

function reset(fallback) {
  ui.setPortraitProvider(fallback ? null : standInPortrait);
  ui.setIconProvider(null);           // icons: the UI's own pixel fallback glyphs
  ui.dialog.clear();
  ui.menu.close();
  ui.title.hide();
  ui.screens.close();
  ui.screens.fadeBlack(false, 0);
  ui.hud.setPrompt(null);
  ui.hud.setDanger(0);
  ui.hud.setVisible(true);
  ui.hud.area.classList.remove('is-on');
  ui.hud.stack.textContent = '';
  input.showTouch(null);
  input.setContext('explore');
}

function touchStick(dx, dy) {
  const zone = document.querySelector('.vp-tc-stick');
  const r = zone.getBoundingClientRect();
  const x = r.left + Math.min(150, r.width * 0.4), y = r.bottom - 150;
  const opts = { pointerId: 77, pointerType: 'touch', bubbles: true, isPrimary: true };
  zone.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: x, clientY: y }));
  zone.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: x + dx, clientY: y + dy }));
}

const SCENES = {
  title: () => ui.title.show({ onStart: () => ui.hud.toast('A new journey begins.') }),
  'title-menu': () => { ui.title.show({ onStart: () => ui.hud.toast('A new journey begins.') }); ui.title._toMenu(); },
  dialog: () => {
    ui.hud.showArea('Cryo Deck', 'ISV Halcyon · Deck 2');
    ui.dialog.choice('Command access is locked down. The *Bridge Keycard* was last logged in an Engineering supply crate. Shall I flag the crates on your map?',
      ['Flag the crates', 'What happened to the crew?', 'Not now'], { speaker: 'BOLT', portrait: 'bolt', cancelIndex: 2 });
  },
  'dialog-line': () => {
    ui.dialog.show([
      { speaker: 'KADE', text: 'The *Spine Corridor* still holds pressure. Stay close, keep your visors sealed, and watch for Sec-Drones.' },
      'If the reactor goes critical before we reach the bridge, none of this matters.',
      { speaker: 'NYX', text: 'Then let’s not keep the reactor waiting.' },
      { speaker: null, text: 'Somewhere aft, an alarm begins to wail.' },
    ]);
  },
  hud: () => {
    ui.hud.showArea('Spine Corridor', 'ISV Halcyon · Deck 3');
    ui.hud.setPrompt('Talk', 'talk');
    ui.hud.toast('Obtained *Medi-Gel* ×2', { icon: 'medigel' });
    setTimeout(() => ui.hud.toast('Progress saved at the *Med-Station*', { icon: 'save' }), 300);
    ui.hud.setDanger(0.62);
  },
  'menu-party': () => ui.menu.open('party'),
  'menu-items': () => { ui.menu.open('items'); ui.menu.focus = 'body'; ui.menu._refreshFocus(); },
  'menu-use': () => { ui.menu.open('items'); ui.menu.focus = 'body'; ui.menu._refreshFocus(); ui.menu._useSelected(); },
  'menu-settings': () => { ui.menu.open('settings'); ui.menu.focus = 'body'; ui.menu._setSel = 1; ui.menu._refreshFocus(); },
  'menu-controls': () => ui.menu.open('controls'),
  gameover: () => ui.screens.gameOver({ onRetry: () => ui.hud.toast('Respawning at the Med-Station…') }),
  complete: () => ui.screens.complete({ stats: state.stats, onContinue: () => ui.hud.toast('Exploration resumed.') }),
  touch: () => {
    input.showTouch(true);
    ui.hud.setPrompt('Inspect', 'inspect');
    ui.hud.setDanger(0.3);
    ui.hud.showArea('Engineering Bay', 'ISV Halcyon · Deck 4');
    touchStick(30, -26);
  },
  'touch-battle': () => { input.showTouch(true); input.setContext('battle'); },
};

function show(spec) {
  const [name, flag] = String(spec || 'title').split(':');
  reset(flag === 'fallback');
  (SCENES[name] || SCENES.title)();
  window.__PREVIEW.scene = name;
}

window.__PREVIEW = { ready: false, show, ui, input, audio, state, scenes: Object.keys(SCENES) };
addEventListener('hashchange', () => show(location.hash.slice(1)));
document.getElementById('vp-boot').classList.add('vp-hide');
show(location.hash.slice(1) || 'title');
window.__PREVIEW.ready = true;
