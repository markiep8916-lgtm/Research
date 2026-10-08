// UI preview: input + every field/menu UI component over a painted sci-fi backdrop, with fixture
// data and stand-in rules (no S3 / S2a code needed).
// Scenes: window.__PREVIEW.show(name) or #name in the URL. __PREVIEW.scenes lists them all:
//   POC pages: title, title-menu, dialog, dialog-line, hud, menu-party, menu-items, menu-use,
//     menu-settings, menu-controls, gameover, complete, touch, touch-battle
//   full game: menu-party-formation, menu-equip, menu-equip-optimize, menu-journal, menu-map,
//     menu-items-gear, shop-buy, shop-sell, shop-equip-now, starchart, saves-save, saves-load,
//     card-chapter, card-logo, caption, credits, end, title-continue, gameover-load, gameover-phase,
//     party-toast, objective-toast, location-banner, letterbox, dialog-warden, dialog-expressions,
//     dialog-offscreen, dialog-100chars, icons
// Append ':fallback' (e.g. #menu-party:fallback) to see the UI without portrait / icon providers.
import { Input, ACTIONS } from '../core/input.js';
import { UI } from '../ui/ui.js';
import { Painter } from '../art/painter.js';
import { RAMPS, OUTLINE, GLOW } from '../art/palette.js';
import { makeRng, el } from '../core/util.js';
import { ICON_NAMES, iconURL, isSigil } from '../art/icons.js';

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
  const vx = w * 0.5;
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

// ------------------------------------------------------------------ stand-in pixel portraits (art/characters provides the real ones)

const LOOKS = {
  kade: { skin: RAMPS.skinLight, hair: RAMPS.hairWhite, suit: RAMPS.navy, trim: RAMPS.amber, eye: GLOW.amber, visor: true, style: 'short' },
  nyx: { skin: RAMPS.skinMedium, hair: RAMPS.hairTeal, suit: RAMPS.gunmetal, trim: RAMPS.teal, eye: GLOW.cyan, lens: true, style: 'tail' },
  orion: { skin: RAMPS.skinLight, hair: RAMPS.hairCopper, suit: RAMPS.purple, trim: RAMPS.purple, eye: GLOW.violet, circuits: true, style: 'messy' },
  sera: { skin: RAMPS.skinDeep, hair: RAMPS.hairPink, suit: RAMPS.white, trim: RAMPS.cyan, eye: GLOW.cyan, halo: true, style: 'bob' },
  ruse: { skin: RAMPS.skinMedium, hair: RAMPS.hairWhite, suit: RAMPS.magenta, trim: RAMPS.gold, eye: GLOW.amber, style: 'bun' },
};

function paintBust(id, expr) {
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
  const wide = expr === 'surprised';
  const eyeY = wide ? 18 : 19;
  p.rect(21, eyeY, 2, wide ? 3 : 2, OUTLINE); p.rect(26, eyeY, 2, wide ? 3 : 2, OUTLINE);
  p.px(26, eyeY, L.eye);
  // mouth and brows per expression
  if (expr === 'smile') { p.hline(23, 26, 24, L.skin[1]); p.px(22, 23, L.skin[1]); p.px(27, 23, L.skin[1]); } else if (expr === 'sad') { p.hline(23, 26, 25, L.skin[1]); p.px(22, 26, L.skin[1]); p.px(27, 26, L.skin[1]); p.px(20, 17, L.hair[1]); p.px(28, 17, L.hair[1]); } else if (wide) p.rect(24, 24, 2, 3, OUTLINE);
  else if (expr === 'determined') { p.hline(24, 26, 24, L.skin[1]); p.line(20, 16, 23, 17, L.hair[0]); p.line(29, 16, 26, 17, L.hair[0]); } else p.hline(24, 26, 24, L.skin[1]);
  const H = L.hair;
  if (L.style === 'short') { p.ellipse(19, 12, 10, 6, H[2]); p.poly([[10, 13], [14, 7], [17, 12], [21, 6], [24, 11], [29, 8], [30, 15], [10, 16]], H[3]); }
  if (L.style === 'tail') { p.ellipse(19, 12, 10, 7, H[2]); p.poly([[11, 12], [10, 30], [14, 34], [15, 16]], H[2]); p.ellipse(22, 10, 8, 4, H[3]); }
  if (L.style === 'messy') { p.ellipse(20, 11, 11, 7, H[2]); p.poly([[9, 14], [11, 4], [16, 9], [20, 2], [24, 8], [30, 5], [31, 15]], H[3]); }
  if (L.style === 'bob') { p.ellipse(20, 13, 11, 8, H[3]); p.rect(9, 13, 6, 13, H[2]); p.rect(27, 14, 4, 9, H[2]); p.ellipse(23, 10, 7, 3, H[4]); }
  if (L.style === 'bun') { p.ellipse(20, 12, 10, 6, H[2]); p.circle(12, 9, 4, H[3]); p.rect(11, 13, 4, 10, H[1]); p.hline(16, 28, 9, H[3]); }
  if (L.visor && !wide) { p.rect(18, 18, 13, 3, GLOW.amber); p.hline(18, 30, 18, '#fff3cf'); }
  if (L.lens) { p.circle(26, 19, 2, GLOW.cyan); p.px(26, 19, '#ffffff'); }
  p.rimShade();
  p.outline(OUTLINE);
  if (L.halo) p.ring(20, 4, 7, GLOW.cyan, 1);
  return p;
}

const bustCache = new Map();
const standInPortrait = (spec) => {
  const [id, expr] = String(spec).split(':');
  if (!LOOKS[id] && id !== 'bolt') return null;
  if (!bustCache.has(spec)) bustCache.set(spec, paintBust(id, expr).toCanvas(1));
  return bustCache.get(spec);
};

// ------------------------------------------------------------------ fixture items and rules

const STATS0 = { maxHp: 0, maxEp: 0, atk: 0, def: 0, mag: 0, res: 0, spd: 0 };
const gear = (id, name, slot, stats, extra = {}) => ({ id, name, desc: extra.desc || '', target: null, battle: false, key: false, price: extra.price || 400, icon: slot,
  equip: { slot, for: extra.for, stats: { ...STATS0, ...stats }, ...extra.fx } });

const ITEMS_TABLE = {
  medigel: { name: 'Medi-Gel', desc: 'Sealant gel. Restores 200 HP to one ally.', target: 'ally', key: false, price: 60, effect: { heal: 200 } },
  medigel_plus: { name: 'Medi-Gel+', desc: 'Concentrated gel. Restores 600 HP to one ally.', target: 'ally', key: false, price: 180, effect: { heal: 600 } },
  nanomist: { name: 'Nanomist', desc: 'A cloud of repair nanites. Restores 300 HP to every ally.', target: 'allies', key: false, price: 320, effect: { heal: 300 } },
  ether: { name: 'Ether Cell', desc: 'Charged power cell. Restores 50 EP to one ally.', target: 'ally', key: false, price: 120, effect: { ep: 50 } },
  revive: { name: 'Revive Kit', desc: 'Emergency restart. Revives a downed ally with half HP.', target: 'koAlly', key: false, price: 400, effect: { revive: 0.5 } },
  stim: { name: 'Stim', desc: 'Adrenal jolt. Cures sleep and jam on one ally.', target: 'ally', key: false, price: 90, effect: { cleanse: true } },
  thermal_charge: { name: 'Thermal Charge', desc: 'Throwable cell. 420 thermal damage to one foe.', target: 'enemy', key: false, price: 150, effect: { damage: { amount: 420, type: 'thermal' } } },
  keycard: { name: 'Bridge Keycard', desc: 'Command-level access. Opens the Observation Bridge.', target: null, key: true, effect: {} },
  lattice_coil: { name: 'Lattice Coil', desc: 'The Meridian’s jump-drive coil, still humming after 80 years.', target: null, key: true, effect: {} },
  eq_w_kade_1: gear('eq_w_kade_1', 'Service Blade', 'weapon', { atk: 10 }, { for: ['kade'], desc: 'Halcyon Security issue. Reliable, unremarkable.', price: 200 }),
  eq_w_kade_2: gear('eq_w_kade_2', 'Arc Saber', 'weapon', { atk: 18, spd: 2 }, { for: ['kade'], desc: 'A volt-edged saber salvaged from a Ringborn armory.', price: 900 }),
  eq_w_nyx_2: gear('eq_w_nyx_2', 'Ring Rifle', 'weapon', { atk: 16, spd: 3 }, { for: ['nyx'], desc: 'Long barrel, ring-forged sights.', price: 950 }),
  eq_w_nyx_3: gear('eq_w_nyx_3', 'Varo’s Long Gun', 'weapon', { atk: 22, spd: 4 }, { for: ['nyx'], price: 1800, desc: 'Captain Ines Varo’s rifle. It has been waiting.', fx: { boost: { rifle: 0.12 } } }),
  eq_a_1: gear('eq_a_1', 'Crew Jumpsuit', 'armor', { def: 4, res: 2 }, { desc: 'Standard wake-crew coverall.', price: 150 }),
  eq_a_2: gear('eq_a_2', 'Pressure Suit', 'armor', { def: 10, res: 6, maxHp: 40 }, { desc: 'Ringborn vacuum suit, patched and proud.', price: 800, fx: { resist: { cryo: 0.15 } } }),
  eq_x_stim_chip: gear('eq_x_stim_chip', 'Stimulus Chip', 'accessory', { spd: 2 }, { desc: 'Wired to the nervous system. Start every battle a little ahead.', price: 600, fx: { startBp: 1 } }),
  eq_x_swift_band: gear('eq_x_swift_band', 'Swift Band', 'accessory', { spd: 6 }, { desc: 'A reflex band. Faster turns.', price: 700 }),
  eq_x_lullaby_ward: gear('eq_x_lullaby_ward', 'Lullaby Ward', 'accessory', { res: 4 }, { desc: 'Hums a counter-melody. The Choir cannot sing you to sleep.', price: 2400, fx: { immune: ['sleep'] } }),
  eq_x_ghost_signal: gear('eq_x_ghost_signal', 'Ghost Signal', 'accessory', { mag: 2 }, { desc: 'Masks your heat signature from drifting foes.', price: 1500, fx: { encounterRate: 0.5 } }),
};
for (const [id, it] of Object.entries(ITEMS_TABLE)) it.id = id;

const member = (id, name, cls, level, hp, maxHp, ep, maxEp, stats, weapons, xp, xpNext, accent, equip, alive = true) =>
  ({ id, name, cls, level, xp, xpNext, hp, maxHp, ep, maxEp, stats, weapons, skills: [], accent, alive, equip, campaign: true });

const state = {};
const base = {};   // each member's stat line without gear, so equip deltas stay exact

function resetState() {
  Object.assign(state, {
    party: [
      member('kade', 'KADE', 'Vanguard', 12, 486, 558, 61, 76, { atk: 68, def: 60, mag: 31, res: 40, spd: 44 }, ['blade', 'lance'], 214, 430, '#ffb54a',
        { weapon: 'eq_w_kade_1', armor: 'eq_a_1', accessory: null }),
      member('nyx', 'NYX', 'Gunslinger', 11, 402, 438, 70, 93, { atk: 64, def: 40, mag: 44, res: 42, spd: 69 }, ['rifle', 'blade'], 88, 400, '#3fd6d2',
        { weapon: 'eq_w_nyx_2', armor: null, accessory: 'eq_x_swift_band' }),
      member('orion', 'ORION', 'Technomancer', 11, 96, 384, 118, 127, { atk: 36, def: 34, mag: 74, res: 57, spd: 52 }, ['gauntlet'], 301, 400, '#b98cff',
        { weapon: null, armor: 'eq_a_1', accessory: null }),
      member('sera', 'SERA', 'Medic', 11, 0, 460, 74, 116, { atk: 46, def: 45, mag: 61, res: 63, spd: 48 }, ['lance'], 150, 400, '#ff7cbd',
        { weapon: null, armor: null, accessory: null }, false),
    ],
    leader: 'nyx',
    inventory: { medigel: 3, medigel_plus: 1, nanomist: 2, ether: 1, revive: 1, stim: 2, thermal_charge: 2, keycard: 1, lattice_coil: 1,
      eq_w_kade_2: 1, eq_a_2: 1, eq_x_stim_chip: 1, eq_x_ghost_signal: 1 },
    credits: 2840,
    flags: { 'area:halcyon:cryo': true, 'area:halcyon:corridor': true, 'area:halcyon:engineering': true, 'area:halcyon:antechamber': true,
      'chest:halcyon:cryo_1': true, 'chest:halcyon:eng_1': true },
    stats: { battles: 14, breaks: 23, maxDamage: 2861, steps: 3120, playTime: 1938 },
  });
  state.roster = Object.fromEntries(state.party.map((m) => [m.id, m]));
  for (const m of state.party) {
    const b = { maxHp: m.maxHp, maxEp: m.maxEp, ...m.stats };
    for (const id of Object.values(m.equip)) if (id) for (const [k, v] of Object.entries(ITEMS_TABLE[id].equip.stats)) b[k] -= v;
    base[m.id] = b;
  }
}
resetState();

function refresh(m) {
  const t = { ...base[m.id] };
  for (const id of Object.values(m.equip)) if (id) for (const [k, v] of Object.entries(ITEMS_TABLE[id].equip.stats)) t[k] += v;
  m.maxHp = t.maxHp; m.maxEp = t.maxEp;
  m.stats = { atk: t.atk, def: t.def, mag: t.mag, res: t.res, spd: t.spd };
  m.hp = Math.min(m.hp, m.maxHp); m.ep = Math.min(m.ep, m.maxEp);
}

// stand-ins for core/progression.js and core/shop.js
const score = (id) => { const s = id ? ITEMS_TABLE[id].equip.stats : STATS0; return s.atk + s.def + s.mag + s.res + s.spd + s.maxHp / 10; };
const rules = {
  canEquip(m, id) { const eq = ITEMS_TABLE[id]?.equip; return !!eq && (!eq.for || eq.for.includes(m.id)); },
  equipDelta(m, slot, id) {
    const out = { ...STATS0 };
    const cur = m.equip[slot] ? ITEMS_TABLE[m.equip[slot]].equip.stats : STATS0;
    const nxt = id ? ITEMS_TABLE[id].equip.stats : STATS0;
    for (const k of Object.keys(out)) out[k] = (nxt[k] || 0) - (cur[k] || 0);
    return out;
  },
  equip(m, slot, id) {
    const inv = state.inventory;
    if (id && !(inv[id] > 0)) return { ok: false, message: 'Not in the pack.' };
    if (m.equip[slot]) inv[m.equip[slot]] = (inv[m.equip[slot]] || 0) + 1;
    if (id) inv[id]--;
    m.equip[slot] = id;
    refresh(m);
    return { ok: true, message: id ? `${m.name} equipped ${ITEMS_TABLE[id].name}.` : `${m.name} took it off.` };
  },
  optimize(m, inv) {
    const out = {};
    for (const slot of ['weapon', 'armor', 'accessory']) {
      let best = m.equip[slot];
      for (const id of Object.keys(inv)) if (inv[id] > 0 && ITEMS_TABLE[id]?.equip?.slot === slot && rules.canEquip(m, id) && score(id) > score(best)) best = id;
      out[slot] = best;
    }
    return out;
  },
  buy(id, n, price) {
    if (state.credits < n * price) return { ok: false, message: 'Credits first. That’s the rule.' };
    state.credits -= n * price;
    state.inventory[id] = (state.inventory[id] || 0) + n;
    return { ok: true, message: '' };
  },
  sell(id, n, rate) {
    if (!(state.inventory[id] >= n)) return { ok: false, message: 'You don’t have that many.' };
    state.inventory[id] -= n;
    state.credits += Math.floor((ITEMS_TABLE[id].price || 0) * rate) * n;
    return { ok: true, message: '' };
  },
};

// local stand-in for core/state.js useItemOutOfBattle
function useItem(itemId, memberId) {
  const it = ITEMS_TABLE[itemId], m = state.party.find((x) => x.id === memberId);
  if (!it || !m || !state.inventory[itemId]) return { ok: false, message: 'Nothing happens.' };
  const take = () => { if (--state.inventory[itemId] <= 0) delete state.inventory[itemId]; };
  const fx = it.effect;
  if (fx.revive) {
    if (m.alive) return { ok: false, message: `${m.name} doesn't need reviving.` };
    take(); m.alive = true; m.hp = Math.round(m.maxHp * fx.revive);
    return { ok: true, message: `${m.name} is back up with ${m.hp} HP.` };
  }
  if (it.target === 'allies') {
    take();
    for (const p of state.party) if (p.alive) p.hp = Math.min(p.maxHp, p.hp + fx.heal);
    return { ok: true, message: `The party recovered up to ${fx.heal} HP.` };
  }
  if (!m.alive) return { ok: false, message: `${m.name} is down. Use a Revive Kit first.` };
  if (fx.cleanse) { take(); return { ok: true, message: `${m.name} shakes off every ailment.` }; }
  if (fx.heal) {
    if (m.hp >= m.maxHp) return { ok: false, message: `${m.name}'s HP is already full.` };
    const n = Math.min(fx.heal, m.maxHp - m.hp); take(); m.hp += n;
    return { ok: true, message: `${m.name} recovered ${n} HP.` };
  }
  const n = Math.min(fx.ep, m.maxEp - m.ep);
  if (n <= 0) return { ok: false, message: `${m.name}'s EP is already full.` };
  take(); m.ep += n;
  return { ok: true, message: `${m.name} recovered ${n} EP.` };
}

// ------------------------------------------------------------------ fixture story data

const JOURNAL = {
  chapter: { id: 'ch1', kicker: 'CHAPTER ONE', title: 'RINGBORN', traveler: 'nyx' },
  objective: { id: 'ch1.reach_wreck', text: 'Reach the *Meridian* wreck.', hint: 'Through the Shoals, east of the docks. Mind the ice.' },
  side: [{ id: 'dm.lantern', text: 'Find three lantern bulbs for the stallkeeper Pell.' }, { id: 'dm.ribbon', text: 'Tie a prayer ribbon at the hull shrine.' }],
  done: [{ id: 'ch1.go_driftmarket', text: 'Fly the Moth to Driftmarket.' }, { id: 'ch1.find_ruse', text: 'Find Old Mother Ruse.' }],
  recaps: [{ chapter: 'prologue', title: 'Prologue · Waking', text: 'Kade woke 412 days late. With Sera, Orion and a reluctant Ringborn salvager named Nyx, he took back the bridge from a Sentinel. A fragment of HALCYON spoke of something called WARDEN. The jump drive is cold: its lattice coil is gone.' }],
  chapters: [
    { id: 'prologue', kicker: 'Prologue', title: 'Waking', state: 'done' }, { id: 'ch1', kicker: 'Chapter One', title: 'Ringborn', state: 'current' },
    { id: 'ch2', kicker: 'Chapter Two', title: 'The Choir', state: 'locked' }, { id: 'ch3', kicker: 'Chapter Three', title: 'The Oath', state: 'locked' },
    { id: 'ch4', kicker: 'Chapter Four', title: 'Echoes', state: 'locked' }, { id: 'finale', kicker: 'Final Chapter', title: 'Voidpath', state: 'locked' },
    { id: 'epilogue', kicker: 'Epilogue', title: 'Ione', state: 'locked' },
  ],
};

// the POC Halcyon grid (TECH_PLAN 3.1 format) with areas, an exit, chests and a locked door
const HALCYON = {
  id: 'halcyon', name: 'ISV Halcyon', region: 'Crew Decks',
  grid: [
    '                                                ',
    '                                  #sWWWWWWWWWWs#',
    '                                  #bbbbbbbbbbbb#',
    '                                  #bbbbbbbbbbbb#',
    '                                  #bbbbbbbbbbbb#',
    '                                  #bbbbbbbbbbbb#',
    '                                  #bbbbbbbbbbbb#',
    '                                  #bbbbbbbbbbbb#',
    '                                  #bbbbbbbbbbbb#',
    '                                  #bbbbbbbbbbbb#',
    '                                  #bbbbbhhbbbbb#',
    '#vWWsWW#WWvWWsWW#WWvWWsWW#WWvWWsp####s#pLLp#sv##',
    '#...................................#...hh....# ',
    '#.............................................# ',
    '#.............................................# ',
    '#.............................................# ',
    '#.....hh............hh..............#.........# ',
    '##s#v#DD#s#vs##pp#v#DD#s##s###v#pp############# ',
    '#ccccchhcccccc#.....hh............#             ',
    '#ccccc..cccccc#...................#             ',
    '#ccccc..cccccc#...................#             ',
    '#ccccc..cccccc#.......ggggggg..g..#             ',
    '#ccccc..cccccc#.......ggggggg.....#             ',
    '#ccccc..cccccc#.......ggggggg.....#             ',
    '#ccccc..cccccc#.......ggggggg.....#             ',
    '#ccccc..cccccc#.......ggggggg.....#             ',
    '#ccccc..cccccc#..g....ggggggg.....#             ',
    '#ccccc..cccccc#...............g...#             ',
    '#ccccc..cccccc#...................#             ',
    '###################################             ',
  ],
  legend: { L: { t: 'door', lock: { flag: 'story:bridge_unlocked' } } },
  areas: [
    { id: 'cryo', name: 'Cryo Deck', rect: [1, 18, 14, 29] },
    { id: 'corridor', name: 'Spine Corridor', rect: [1, 12, 36.5, 17] },
    { id: 'engineering', name: 'Engineering Bay', rect: [15, 18, 34, 29] },
    { id: 'antechamber', name: 'Bridge Antechamber', rect: [36.5, 12, 46, 17] },
    { id: 'bridge', name: 'Observation Bridge', rect: [35, 2, 47, 11] },
  ],
  exits: [{ id: 'to_moth', rect: [45, 13, 46, 15], to: { map: 'moth', spawn: 'hatch' } }],
  chests: [{ id: 'cryo_1', x: 1.55, z: 28.2 }, { id: 'cor_1', x: 1.55, z: 16.3 }, { id: 'eng_1', x: 16.05, z: 20.6 }, { id: 'eng_2', x: 32.9, z: 27.95 }, { id: 'eng_4', x: 33.0, z: 19.45 }],
  interactables: [{ id: 'fabricator', x: 42.5, z: 13.2 }],
};
const MAP_DATA = {
  map: HALCYON, leader: { x: 24.5, z: 14.6, facing: 'right' },
  objective: { text: 'Use the fabricator by the bridge door.', target: { map: 'halcyon', interactable: 'fabricator' } },
  test: (c) => !!state.flags[c], get flags() { return state.flags; }, mapName: (id) => ({ moth: 'The Moth' }[id] || id),
};

const SHOP = { name: 'Ruse’s Salvage', keeper: 'RUSE', portrait: 'ruse', greeting: 'Credits first. Questions never.', sellRate: 0.5 };
const STOCK = ['medigel', 'medigel_plus', 'ether', 'stim', 'thermal_charge', 'eq_w_kade_2', 'eq_w_nyx_3', 'eq_a_2', 'eq_x_lullaby_ward']
  .map((item) => ({ item, price: ITEMS_TABLE[item].price, owned: 0 }));

const DESTINATIONS = [
  { id: 'halcyon', name: 'ISV Halcyon', subtitle: 'Bridge · Moth berth', desc: 'Home berth on the colony ship. The Starchart table hums on the bridge.', current: true },
  { id: 'driftmarket', name: 'Driftmarket', subtitle: 'Ring station', desc: 'A Ringborn town built from the Meridian’s wreck plates. Lanterns, prayer ribbons, and a shop.' },
  { id: 'arboretum', name: 'Arboretum', subtitle: 'Biodome deck', desc: 'The Halcyon’s gardens, overgrown after 412 days. Four thousand pods were moved here.', isNew: true },
  { id: 'spire', name: 'Security Spire', subtitle: 'Command tower', desc: 'Red alert. WARDEN’s voice loops on every screen.', locked: true, lockedText: 'After the Choir' },
  { id: 'heart', name: 'The Heart', subtitle: 'WARDEN’s domain', desc: 'A reactor-cathedral at the centre of the ship. Thousands of pods hang like stars.', warn: 'The way back closes at the crown.' },
  { id: 'ione', name: 'Ione', subtitle: 'Ocean moon', desc: 'An ocean under ice.', locked: true, lockedText: 'After the Heart' },
];

const party4 = [{ id: 'kade', level: 9 }, { id: 'nyx', level: 9 }, { id: 'orion', level: 8 }, { id: 'sera', level: 9 }];
const SLOTS = [
  { slot: 'auto', empty: false, damaged: false, summary: { chapterLabel: 'Chapter One · Ringborn', location: 'Driftmarket', playTime: 1834, leader: 'nyx', party: party4, cleared: false, savedAt: '2026-10-08T12:00:00.000Z' } },
  { slot: 'slot1', empty: false, damaged: false, summary: { chapterLabel: 'Prologue · Waking', location: 'ISV Halcyon', playTime: 1120, leader: 'kade', party: party4.slice(0, 3), cleared: false, savedAt: '2026-10-07T21:14:00.000Z' } },
  { slot: 'slot2', empty: false, damaged: false, summary: { chapterLabel: 'Epilogue · Ione', location: 'Ione Shore', playTime: 8420, leader: 'sera', party: party4.map((p) => ({ ...p, level: 32 })), cleared: true, savedAt: '2026-10-02T18:40:00.000Z' } },
  { slot: 'slot3', empty: true, damaged: false, summary: null },
];

const CREDITS = [
  { head: 'VOIDPATH' }, { gap: 2 },
  { cast: 'kade', name: 'KADE ARDEN', role: 'Vanguard' }, { cast: 'nyx', name: 'NYX VARO', role: 'Gunslinger' },
  { cast: 'orion', name: 'ORION SALL', role: 'Technomancer' }, { cast: 'sera', name: 'SERA LINDQVIST', role: 'Medic' },
  { cast: 'bolt', name: 'BOLT', role: 'Maintenance unit, brave' }, { gap: 2 },
  { role: 'Story', name: 'The Halcyon crew' }, { role: 'Pixel art', name: 'Procedural painters' }, { role: 'Music', name: 'WebAudio score' },
  { gap: 1 }, { text: 'For everyone who stayed awake for someone else.' },
];

// ------------------------------------------------------------------ boot

const audio = {
  muted: false, volume: { master: 1, music: 0.7, sfx: 0.8 }, log: [],
  init() {}, music() {},
  sfx(name) { this.log.push(name); if (this.log.length > 200) this.log.shift(); },
  setMuted(b) { this.muted = !!b; }, toggleMute() { this.muted = !this.muted; },
  setVolume(v) { Object.assign(this.volume, v); },
};
const engine = { quality: 'high', setQuality(q) { this.quality = q; } };
const hookLog = [];

paintBackdrop();
addEventListener('resize', paintBackdrop);
const input = new Input({ touchLayer: document.getElementById('touch-layer') });
const ui = new UI({ root: document.getElementById('ui-root'), input, audio, state, engine, onUseItem: useItem, items: ITEMS_TABLE, rules });
input.onAny(() => audio.init());
ui.setHooks({
  journal: () => JOURNAL,
  mapData: () => MAP_DATA,
  settings: (patch) => hookLog.push(['settings', patch]),
  quitToTitle: () => { hookLog.push(['quitToTitle']); ui.hud.toast('Returning to title…'); },
});
ui.registerSpeaker('WARDEN', { sigil: 'warden_sigil', accent: '#ffd27a', textSpeed: 0.6, sfx: 'choir', mood: 'warden' });
ui.registerSpeaker('HALCYON', { portrait: 'holo', accent: '#6fe9ff' });
ui.registerSpeaker('BOLT', { portrait: 'bolt', accent: '#7fe3ff' });
ui.registerSpeaker('RUSE', { portrait: 'ruse', accent: '#e8a25a' });

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
  resetState();
  ui.setPortraitProvider(fallback ? null : standInPortrait);
  ui.setIconProvider(fallback ? null : (n) => iconURL(n, 2));
  ui.dialog.clear();
  ui.menu.close();
  ui.shop.close();
  ui.starchart._done(null);
  ui.saves._done(null);
  ui.cards.clear();
  ui.title.hide();
  ui.screens.close();
  ui.screens.fadeBlack(false, 0);
  ui.hud.setPrompt(null);
  ui.hud.setDanger(0);
  ui.hud.setVisible(true);
  ui.hud.letterbox(false, 0);
  ui.hud.skipHint(false);
  ui.hud.area.classList.remove('is-on');
  ui.hud.stack.textContent = '';
  ui.locationName = 'Driftmarket';
  ui.areaName = 'Lantern Row';
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

const body = (tab, sel) => { ui.menu.open(tab); ui.menu.enterBody(); if (sel != null) { ui.menu.page._sel = sel; ui.menu._refreshFocus(); } };
const typed = () => ui.dialog._reveal(ui.dialog._len);   // finish the typewriter so shots show the whole box
const LONG = 'Pod 2271 is empty. Theo was moved, and I wasn’t here to stop it. I promised I’d be there when he woke.';

const SCENES = {
  // --- POC pages
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
  'menu-items': () => body('items'),
  'menu-use': () => { body('items'); ui.menu.page._useSelected(); },
  'menu-settings': () => body('settings', 1),
  'menu-controls': () => ui.menu.open('controls'),
  gameover: () => ui.screens.gameOver({ onRetry: () => ui.hud.toast('Respawning at the Med-Station…') }),
  complete: () => ui.screens.complete({ stats: state.stats, onContinue: () => ui.hud.toast('Back to the shore.') }),
  touch: () => {
    input.showTouch(true);
    ui.hud.setPrompt('Inspect', 'inspect');
    ui.hud.setDanger(0.3);
    ui.hud.showArea('Engineering Bay', 'ISV Halcyon · Deck 4');
    touchStick(30, -26);
  },
  'touch-battle': () => { input.showTouch(true); input.setContext('battle'); },

  // --- pause menu
  'menu-party-formation': () => { body('party', 2); ui.menu.page._actions(); },
  'menu-equip': () => { body('equip'); ui.menu.page._openList(); },
  'menu-equip-optimize': () => { body('equip'); ui.menu.page._slot = 3; ui.menu.page._optimize(); },
  'menu-journal': () => ui.menu.open('journal'),
  'menu-map': () => ui.menu.open('map'),
  'menu-items-gear': () => { body('items'); const p = ui.menu.page; p._sel = p._items.indexOf('eq_x_ghost_signal'); p.paint(); },

  // --- shop, chart, saves
  'shop-buy': () => { ui.shop.open({ shop: SHOP, stock: STOCK }); ui.shop._select(1, false); ui.shop._choose(); ui.shop._step(2); },
  'shop-sell': () => { ui.shop.open({ shop: SHOP, stock: STOCK }); ui.shop._setTab('sell', false); },
  'shop-equip-now': () => { ui.shop.open({ shop: SHOP, stock: STOCK }); ui.shop._select(5, false); ui.shop._choose(); },
  starchart: () => {
    ui.starchart.open({ destinations: DESTINATIONS }).then((id) => { if (id) ui.hud.toast(`Course set: *${id}*`); });
    ui.starchart._select(DESTINATIONS.findIndex((d) => d.id === 'heart'), false);   // shows the Heart's warning
  },
  'saves-save': () => { ui.saves.open({ mode: 'save', slots: SLOTS, storage: 'memory' }); },
  'saves-load': () => { ui.saves.open({ mode: 'load', slots: [...SLOTS.slice(0, 3), { slot: 'slot3', empty: false, damaged: true, summary: null }], storage: 'local' }); },

  // --- cards and screens
  'card-chapter': () => ui.cards.chapter({ kicker: 'CHAPTER ONE', title: 'RINGBORN', traveler: 'nyx', hold: true }),
  'card-logo': () => ui.cards.logo({ hold: true }),
  caption: () => { ui.hud.letterbox(true, 0); ui.cards.caption('En route to Driftmarket', { ms: 60000 }); },
  credits: () => { ui.cards.credits({ lines: CREDITS, transparent: true }); ui.cards._cur.y = 520; },
  end: () => ui.cards.end(),
  'title-continue': () => { ui.title.show({ onStart: () => {}, onContinue: () => ui.hud.toast('Continue'), onLoad: () => ui.saves.open({ mode: 'load', slots: SLOTS }), hasSave: true }); ui.title._toMenu(); },
  'gameover-load': () => {
    ui.screens.gameOver({ onRetry: () => {}, onLoad: () => ui.saves.open({ mode: 'load', slots: SLOTS }), onTitle: () => {} });
    ui.screens._lock = 0;
    ui.screens._select(1, false);
    ui.screens._activate(1);
  },
  'gameover-phase': () => ui.screens.gameOver({ onRetry: () => {}, onRetryPhase: () => {}, onLoad: () => {}, onTitle: () => {} }),

  // --- HUD
  'party-toast': () => { ui.hud.partyToast('sera', 'join'); setTimeout(() => ui.hud.autosaved(), 200); },
  'objective-toast': () => ui.hud.objectiveToast('Reach the *Meridian* wreck.'),
  'location-banner': () => ui.hud.showLocation('Driftmarket', 'Ring Station · Tethys Rings', 'Find *Old Mother Ruse* in the market.'),
  letterbox: () => {
    ui.hud.letterbox(true, 0);
    ui.hud.skipHint(true);
    ui.dialog.show([{ speaker: null, text: 'The lights dim. Every speaker on the ship clicks on at once.' }]);
    typed();
  },

  // --- dialog
  'dialog-warden': () => {
    ui.hud.letterbox(true, 0);
    ui.dialog.show([
      { speaker: 'WARDEN', text: 'You should not be awake. Please. Go back to sleep.' },
      { speaker: 'WARDEN', text: 'I am sorry. I am so sorry. This will not hurt for long.' },
    ]);
    typed();
  },
  'dialog-expressions': () => {
    ui.dialog.show([
      { speaker: 'SERA', text: 'Pod 2271. My brother. If anything’s happened to him...', expr: 'sad' },
      { speaker: 'SERA', text: 'Then we find him. *Today*.', expr: 'determined' },
      { speaker: 'NYX', text: 'Relax, ship-people. I’m just *borrowing* your bridge.', expr: 'smile' },
      { speaker: 'ORION', text: 'Oh! Oh, you lovely reactor. Nobody’s going to vent you.', expr: 'surprised' },
    ]);
    typed();
  },
  'dialog-offscreen': () => { ui.dialog.show([{ speaker: 'BOLT', text: 'Kade? Kade, can you hear me? The comms are... mostly working.', offscreen: true }]); typed(); },
  'dialog-100chars': () => { ui.dialog.show([{ speaker: 'SERA', text: LONG, expr: 'sad' }]); typed(); },

  // --- icon sheet
  icons: () => {
    const sheet = el('div', { class: 'vp-panel', style: { position: 'absolute', inset: '16px', padding: '14px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignContent: 'flex-start', overflow: 'auto', zIndex: 70 } });
    for (const n of ICON_NAMES) {
      sheet.appendChild(el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '86px', font: '11px var(--vp-font-ui)', color: 'var(--vp-ink-dim)' } }, [
        el('div', { style: { display: 'flex', gap: '6px', alignItems: 'flex-end' } }, [
          el('img', { src: iconURL(n, 1), class: 'vp-ico' }), el('img', { src: iconURL(n, isSigil(n) ? 2 : 4), class: 'vp-ico', style: { width: '64px', height: '64px' } })]),
        n,
      ]));
    }
    document.getElementById('ui-root').appendChild(sheet);
    window.__PREVIEW.cleanup = () => sheet.remove();
  },
};

function show(spec) {
  if (window.__PREVIEW.cleanup) { window.__PREVIEW.cleanup(); window.__PREVIEW.cleanup = null; }
  const [name, flag] = String(spec || 'title').split(':');
  reset(flag === 'fallback');
  (SCENES[name] || SCENES.title)();
  window.__PREVIEW.scene = name;
}

// virtual standard-mapping gamepad, so headless runs can drive pages through the pad mapping:
// await __PREVIEW.pad('down') presses a button for exactly one input update
const PAD = { A: [0, 'confirm'], B: [1, 'cancel'], Y: [3, 'menu'], LB: [4, 'boostDown'], RB: [5, 'boostUp'],
  up: [12, 'up'], down: [13, 'down'], left: [14, 'left'], right: [15, 'right'] };
const fakePad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
async function pad(name) {
  if (!navigator.__vpPad) {
    navigator.getGamepads = () => [fakePad];
    navigator.__vpPad = true;
    dispatchEvent(new Event('gamepadconnected'));
  }
  const [button, action] = PAD[name];
  const b = fakePad.buttons[button];
  b.pressed = true; b.value = 1;
  while (!input._held[ACTIONS.indexOf(action)]) await nextFrame();
  b.pressed = false; b.value = 0;
  while (input._held[ACTIONS.indexOf(action)]) await nextFrame();
}

window.__PREVIEW = { ready: false, show, ui, input, audio, state, hookLog, pad, scenes: Object.keys(SCENES) };
addEventListener('hashchange', () => show(location.hash.slice(1)));
document.getElementById('vp-boot').classList.add('vp-hide');
show(location.hash.slice(1) || 'title');
window.__PREVIEW.ready = true;
