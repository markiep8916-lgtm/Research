// vault: the Vault's cast (browser; CharDefs for art/characters.js registerCharacter, TECH_PLAN 3.12,
// WRITING.md 2.5, 2.8, 3.7). The crew memory echoes are holograms, so the engine draws them in one
// cyan ramp: what tells them apart in the field is the silhouette their `base` gives them (Sera's
// pinned hair, Nyx's braid, Kade's crop, Orion's mop); their colours show in the dialog portraits.
//
// export const CHARACTERS   { id: CharDef } registered by art.js:
//   young_orion, young_sera                    the launch and Theo's birthday, 143 years ago
//   crew_sato, crew_jun, crew_ilka, crew_castellan, crew_brandt, crew_okoye, crew_ferro, crew_voss,
//   crew_cadet                                 the crew memory echoes (3.7)
//   echo_face   ECHO's dialog portrait: HALCYON's face turned inside out (custom painter)
//   ione_holo   Ione as a small turning hologram globe over the Starchart (custom painter)

import { Painter, rng } from '../../art/painter.js';
import { OUTLINE } from '../../art/palette.js';

const SKIN = {
  pale: ['#8e5a4c', '#c98f7a', '#ebbca6', '#fcdccb'],
  warm: ['#7a4632', '#b06e50', '#d6987a', '#f0c4a6'],
  deep: ['#3a2117', '#5f3826', '#84533a', '#a87253'],
  tan: ['#5e3626', '#94593c', '#bd7e5a', '#dda67e'],
};
const HAIR = {
  black: ['#0b0c13', '#171a26', '#272c3d', '#3d4560', '#5a6483'],
  brown: ['#24140c', '#45261a', '#6b3d28', '#93573a', '#bb7a52'],
  copper: ['#3a140a', '#6e2a12', '#a8461d', '#d9692e', '#f59a5a'],
  grey: ['#3c3a44', '#6c6a78', '#a4a2ae', '#d6d4dc', '#f4f2f8'],
  blonde: ['#5a4218', '#8f6a26', '#c49a3c', '#e8c766', '#fbe7a6'],
  dark: ['#1a0e08', '#2e1a10', '#4a2a18', '#6a3e22', '#8c5630'],
};
// Halcyon crew uniforms 143 years ago: wake-crew navy, engineering orange, hydroponics green
const NAVY = ['#0f1630', '#1a2650', '#28407e', '#3e5fae', '#7a9ee0'];
const ORANGE = ['#3a1606', '#6e2c0c', '#a8461a', '#e06a2a', '#ffa060'];
const GREEN = ['#0c2216', '#163a24', '#24583a', '#3a8256', '#6ab886'];
const WHITE = ['#5a6378', '#8a93a8', '#c8d0de', '#eef2f8', '#ffffff'];
const SECGREY = ['#161b27', '#262e40', '#38435b', '#526182'];

const look = (base, mats, extra = {}) => ({ base, mats, ...extra });

// ---------------------------------------------------------------- custom painters

/** ECHO: HALCYON's portrait inverted: a dark face, the gown's collar, magenta tears through it. */
function echoPortrait(expr) {
  const p = new Painter(40, 40);
  const r = rng(expr === 'flicker' ? 17 : 11);
  const DARK = ['#07040f', '#120a24', '#1e1238', '#2c1a52'];
  // shoulders and gown
  p.ellipse(21, 44, 15, 10, DARK[2]);
  p.ellipse(21, 43, 13, 8, DARK[1]);
  // neck and face (a smooth dark oval, no features but two pale eyes)
  p.rect(19, 24, 5, 7, DARK[2]);
  p.ellipse(21, 17, 7, 8, DARK[3]);
  p.ellipse(20, 16, 6, 7, DARK[2]);
  // long hair falling either side, edged in violet
  for (let y = 8; y < 34; y++) {
    const w = y < 12 ? 9 : 8 + Math.sin(y * 0.4) * 1.2;
    p.px(Math.round(21 - w), y, '#5a2a9a').px(Math.round(21 + w), y, '#5a2a9a');
    p.px(Math.round(21 - w + 1), y, DARK[1]).px(Math.round(21 + w - 1), y, DARK[1]);
  }
  p.hline(13, 29, 8, '#7a3ac8');
  // the eyes: two thin cyan-white slits, the only light in the face
  p.hline(17, 19, 16, '#c8fbff').hline(23, 25, 16, '#c8fbff');
  p.px(18, 17, '#4fe3ff').px(24, 17, '#4fe3ff');
  // the circlet, broken
  p.hline(14, 18, 10, '#ff4fd0').hline(22, 28, 10, '#ff4fd0');
  // the chest core, cracked
  p.rect(19, 31, 5, 3, '#ff4fd0').px(21, 30, '#ffc2ee').px(20, 34, '#ff4fd0');
  // magenta and cyan tears: rows shifted sideways with a chromatic fringe
  for (const y of [6, 13, 21, 27, 33]) {
    const dx = (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3));
    for (let x = 8; x < 34; x++) {
      const c = p.get(x, y);
      if (!c[3]) continue;
      p.px(x + dx, y, x % 3 ? '#ff4fd0' : '#4fe3ff');
    }
  }
  if (expr === 'flicker') for (let y = 0; y < 40; y += 3) for (let x = 0; x < 40; x++) p.set(x, y, null);
  // outline
  const out = new Painter(40, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    if (p.alpha(x, y)) { out.px(x, y, p.get(x, y)); continue; }
    if (p.alpha(x + 1, y) || p.alpha(x - 1, y) || p.alpha(x, y + 1) || p.alpha(x, y - 1)) out.px(x, y, OUTLINE);
  }
  return out;
}

/** A plain 32x48 field frame (ECHO's portrait id needs one; it never walks). */
function echoField() {
  const p = new Painter(32, 48);
  p.ellipse(16, 40, 8, 7, '#120a24');
  p.rect(13, 18, 7, 20, '#1e1238');
  p.ellipse(16, 12, 5, 6, '#2c1a52');
  p.hline(14, 15, 12, '#c8fbff').hline(17, 18, 12, '#c8fbff');
  return p;
}

/** Ione: a small globe hanging at chest height, ice shelves over a dark ocean, turning (i). */
function ioneField(view, kind, i) {
  const p = new Painter(48, 48);
  const cx = 24, cy = 16, R = 10;
  const spin = (i || 0) * 3;
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y);
      if (d > R) continue;
      const lon = Math.round((Math.asin(x / Math.max(1, Math.sqrt(R * R - y * y))) * 10) + spin);
      const lat = y / R;
      const ice = Math.abs(lat) > 0.62 || ((lon * 7 + Math.round(y * 1.3)) % 9 === 0);
      const light = clampLight(1 - (x + y) / (R * 2.4));
      const base = ice ? [200, 236, 255] : [40, 120, 190];
      const k = 0.45 + light * 0.55;
      p.px(cx + x, cy + y, [Math.round(base[0] * k), Math.round(base[1] * k), Math.round(base[2] * k), 255]);
      if (d > R - 1) p.px(cx + x, cy + y, '#e8fbff');
    }
  }
  // an orbit line and a faint stand of light down to the table
  for (let x = -R - 4; x <= R + 4; x++) {
    const y = Math.round(cy + 3 + x * 0.18);
    if (Math.abs(x) > R - 1 || y > cy + 6) p.px(cx + x, y, '#9fe8ff');
  }
  for (let y = cy + R + 2; y < 46; y += 2) p.px(cx, y, '#4fb8e8');
  return p;
}

const clampLight = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Ione's portrait slot (unused in dialog; a still of the globe keeps the custom def complete). */
function ionePortrait() {
  const p = new Painter(40, 40);
  p.blit(ioneField('down', 'idle', 0), -4, 6);
  return p;
}

export const CHARACTERS = {
  young_orion: look('orion', {
    hair: HAIR.dark,
    main: ['#141a38', '#22305e', '#344a8e', '#4c6ab8', '#86a2e6'],
    skin: ['#6e3d2b', '#a8694a', '#cf9470', '#ecbf98'],
  }),
  young_sera: look('sera', {
    hair: ['#4a1838', '#7a2a5a', '#b04a88', '#d877b0', '#f6b8d8'],
    main: NAVY,
  }),
  crew_sato: look('sera', { skin: SKIN.warm, hair: HAIR.black, main: NAVY, sec: ['#0d1a3a', '#162a5a', '#22408a', '#4a72c8'], acc: ['#5a3a0a', '#a8741c', '#e0a83a', '#ffd27a'] }),
  crew_jun: look('kade', { skin: SKIN.tan, hair: HAIR.brown, main: GREEN, sec: SECGREY, acc: ['#2a3a1a', '#4a6a2a', '#7aa04a', '#b4d88a'] }, { over: {} }),
  crew_ilka: look('nyx', { skin: SKIN.pale, hair: HAIR.blonde, main: GREEN, acc: ['#2a3a1a', '#4a6a2a', '#7aa04a', '#b4d88a'] }),
  crew_castellan: look('kade', { skin: SKIN.deep, hair: HAIR.grey, main: WHITE, sec: NAVY.slice(0, 4), acc: ['#5a3a0a', '#a8741c', '#e0a83a', '#ffd27a'] }, { over: {} }),
  crew_brandt: look('sera', { skin: SKIN.pale, hair: HAIR.copper, main: ORANGE, sec: SECGREY, acc: ['#2a2a30', '#4a4a56', '#7a7a8a', '#b4b4c4'] }),
  crew_okoye: look('orion', { skin: SKIN.deep, hair: HAIR.black, main: GREEN, acc: ['#5a3a0a', '#a8741c', '#e0a83a', '#ffd27a'] }, { over: {} }),
  crew_ferro: look('nyx', { skin: SKIN.warm, hair: HAIR.brown, main: NAVY, acc: ['#0b4350', '#0f6a78', '#17a2a9', '#45dad3'] }),
  crew_voss: look('kade', {
    skin: SKIN.pale, hair: HAIR.grey, main: ['#121822', '#1f2835', '#2f3c4d', '#46596e', '#6c829c'],
    acc: ['#470d1c', '#86182f', '#c42b45', '#ee5b65'],
  }, { over: {} }),
  crew_cadet: look('sera', { skin: SKIN.tan, hair: HAIR.dark, main: ['#121822', '#1f2835', '#2f3c4d', '#46596e', '#6c829c'] }),
  echo_face: { custom: { field: echoField, portrait: echoPortrait }, expressions: { flicker: true } },
  ione_holo: { custom: { field: ioneField, portrait: ionePortrait } },
};
