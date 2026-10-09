// spire: the Security Spire's cast (browser; CharDefs for art/characters.js registerCharacter, TECH_PLAN
// 3.6, 3.12, WRITING.md 2.4 and 3.7).
//
// export const CHARACTERS   { id: CharDef } registered by art.js:
//   voss         Commander Ilse Voss: iron-grey hair swept back, a scar across her left eye, a charcoal
//                commander's coat with crimson piping, a long cape and her energy halberd (field poses
//                kneel and collapse carry it along; portrait expressions neutral smile sad determined
//                surprised, with the scar)
//   cadet_mika, cadet_jonah, cadet_priya, cadet_lars, cadet_wen
//                the five cadets who refused the Lullaby: pale grey trainee fatigues with red cuffs,
//                each with their own hair and skin (WRITING 3.7)
//
// Hooks draw on the field skeleton (f = indexed frame, sk = skeleton: cx, sh, hip, floor, view
// 'down' | 'side' | 'up', armR / armF hands, pose), so the cape and the halberd follow every pose.

const SKIN = {
  voss: ['#734a42', '#a8766a', '#cf9f8c', '#ecc8b6'],
  deep: ['#3a2117', '#5f3826', '#84533a', '#a87253'],
  tan: ['#5e3626', '#94593c', '#bd7e5a', '#dda67e'],
  brown: ['#4a2a1c', '#74452e', '#9c6646', '#c38a66'],
  pale: ['#8e5a4c', '#c98f7a', '#ebbca6', '#fcdccb'],
  warm: ['#7a4632', '#b06e50', '#d6987a', '#f0c4a6'],
};
const HAIR = {
  iron: ['#24262c', '#4a4d55', '#7b7f88', '#aeb2ba', '#dcdfe5'],
  black: ['#0b0c13', '#171a26', '#272c3d', '#3d4560', '#5a6483'],
  brown: ['#24140c', '#45261a', '#6b3d28', '#93573a', '#bb7a52'],
  blonde: ['#5a4218', '#8f6a26', '#c49a3c', '#e8c766', '#fbe7a6'],
};
const CHARCOAL = ['#0b0c11', '#15171e', '#20232c', '#30343f', '#474c5b'];
const CRIMSON = ['#2c0910', '#5c1220', '#8f1c2e', '#c42b42', '#ee5b65'];
const SILVER = ['#262a34', '#4e5566', '#8a93a6', '#c6cdd9', '#f4f7fb'];
const FATIGUE = ['#262a33', '#444a57', '#666e7e', '#8f97a8', '#c3c9d4'];
const DARK = ['#101218', '#1c2029', '#2b313d', '#3f4757'];
const LEATHER = ['#1a1214', '#2c2024', '#433036', '#5e464c'];
const HALBERD_GLOW = ['#2fb8ff', '#9ff0ff', '#ffffff'];
const EYE = ['#1a1f2a', '#5a6a80', '#ffffff'];

// ---------------------------------------------------------------- field hair (14-wide head box)

// Voss: short, swept back off the brow, close at the nape
const SWEPT = {
  down: { hairline: 4.6, list: [['ball', 7, 4.4, 6.8, 4.0], [2.6, 4.6, 1.8, 7.4, 1.6, 0.6], [11.4, 4.6, 12.2, 7.4, 1.6, 0.6], [4.6, 2.6, 9.4, 2.2, 1.8, 1.4]] },
  up: { hairline: 0, list: [['ball', 7, 5.6, 6.9, 5.2], [3.4, 9.0, 4.4, 11.2, 1.8, 1.0], [10.6, 9.0, 9.6, 11.2, 1.8, 1.0]] },
  side: { hairline: 5.4, list: [['ball', 5.2, 6.4, 4.8, 4.4], ['ball', 6.4, 4.2, 5.8, 3.4], [8.8, 2.8, 2.4, 3.6, 1.8, 1.2], [2.8, 7.6, 1.4, 10.0, 1.6, 0.7]] },
};
const CROP = {
  down: { hairline: 5.0, list: [['ball', 7, 4.8, 6.6, 4.0], [3.0, 3.6, 1.6, 6.8, 1.8, 0.6], [11.0, 3.6, 12.4, 6.8, 1.8, 0.6], [7.0, 2.4, 6.0, 5.6, 1.8, 0.5]] },
  up: { hairline: 0, list: [['ball', 7, 5.6, 6.8, 5.4], [4.2, 9.2, 4.6, 11.2, 1.8, 0.8], [9.8, 9.2, 9.4, 11.2, 1.8, 0.8]] },
  side: { hairline: 5.8, list: [['ball', 5.4, 6.6, 4.6, 4.4], ['ball', 6.6, 4.6, 5.8, 3.6], [3.2, 7.0, 0.8, 9.0, 1.6, 0.5]] },
};
const CURLS = {
  down: { hairline: 5.2, list: [['ball', 7, 4.6, 7.0, 4.4], ['ball', 2.6, 6.4, 2.2, 2.2], ['ball', 11.4, 6.4, 2.2, 2.2], ['ball', 4.6, 2.0, 2.4, 2.0], ['ball', 9.6, 2.2, 2.4, 2.0]] },
  up: { hairline: 0, list: [['ball', 7, 5.6, 7.2, 5.6], ['ball', 3.2, 9.6, 2.4, 2.2], ['ball', 10.8, 9.6, 2.4, 2.2]] },
  side: { hairline: 5.6, list: [['ball', 5.4, 6.4, 5.0, 4.6], ['ball', 6.6, 3.8, 5.6, 3.4], ['ball', 2.2, 8.4, 2.2, 2.4]] },
};
const BRAID = {
  down: { hairline: 5.4, list: [['ball', 7, 5.0, 6.8, 4.4], [1.8, 5.0, 1.6, 10.0, 1.8, 1.0], [12.2, 5.0, 12.4, 10.0, 1.8, 1.0], [7.0, 2.2, 5.4, 5.8, 1.6, 0.6]] },
  up: { hairline: 0, list: [['ball', 7, 5.8, 6.8, 5.6], [7.0, 9, 7.2, 16.0, 2.0, 1.2], [7.2, 15.6, 7.0, 18.6, 1.4, 0.9]] },
  side: { hairline: 5.8, list: [['ball', 5.6, 6.2, 5.0, 4.6], ['ball', 6.6, 4.4, 5.8, 3.6], [2.6, 7.0, 0.8, 15.0, 1.8, 1.0]] },
};
const BOB = {
  down: { hairline: 5.0, list: [['ball', 7, 5.0, 7.0, 4.6], [1.6, 4.6, 1.8, 9.4, 1.8, 1.4], [12.4, 4.6, 12.2, 9.4, 1.8, 1.4], [7.0, 2.0, 7.0, 5.0, 2.4, 1.2]] },
  up: { hairline: 0, list: [['ball', 7, 5.8, 7.0, 5.6], [3.2, 8.0, 3.4, 10.8, 2.2, 1.6], [10.8, 8.0, 10.6, 10.8, 2.2, 1.6]] },
  side: { hairline: 5.6, list: [['ball', 5.6, 6.2, 5.2, 4.8], ['ball', 6.8, 4.2, 5.6, 3.6], [2.6, 6.4, 2.4, 10.2, 2.0, 1.4]] },
};

// portrait hair (battle-head coordinates, mirrored into the 40 x 40 bust)
const P_SWEPT = [['ball', 12.0, 8.0, 3.6, 4.0], ['ball', 8.8, 4.8, 7.0, 4.0], [3.0, 4.6, 12.4, 2.6, 2.2, 1.8], [12.8, 7.0, 14.6, 10.4, 1.6, 0.8]];
const P_CROP = [['ball', 11.8, 8.4, 3.8, 4.4], ['ball', 8.6, 5.2, 7.0, 4.2], [4.2, 4.0, 1.6, 6.4, 1.8, 0.5]];
const P_CURLS = [['ball', 11.8, 8.4, 4.4, 4.8], ['ball', 8.4, 4.8, 7.4, 4.6], ['ball', 4.0, 3.6, 2.8, 2.6], ['ball', 13.4, 4.0, 2.6, 2.6]];
const P_BRAID = [['ball', 11.6, 9.4, 4.4, 5.2], ['ball', 8.5, 5.8, 7.4, 5.0], [12.8, 9.0, 13.6, 17.0, 2.0, 1.4], [2.4, 5.6, 1.6, 9.4, 1.6, 0.8]];
const P_BOB = [['ball', 11.8, 9.0, 4.6, 5.2], ['ball', 8.4, 5.4, 7.6, 5.0], [12.6, 8.0, 12.8, 13.0, 2.4, 1.8], [2.2, 5.6, 2.0, 10.6, 2.0, 1.4]];

// ---------------------------------------------------------------- Voss's cape and halberd

/** The commander's cape: crimson-lined charcoal, hanging behind (down / side) or over the back (up). */
function capeBehind(f, sk) {
  const { cx, sh, view } = sk;
  const hem = Math.min(sk.floor - 2.2, sk.hip + 11.5);
  const s = sk.sway * 0.8;
  if (view === 'down') {
    f.shape([[cx - 5.6, sh - 1.4], [cx + 5.6, sh - 1.4], [cx + 7.2 + s, hem], [cx - 7.2 + s, hem]], (x, y) => (y > hem - 1.4 ? 'acc' : 'sec'), { ny: () => 0.1 });
  } else if (view === 'side') {
    f.shape([[cx - 2.8, sh - 1.8], [cx + 1.2, sh - 1.6], [cx - 3.8 - s, hem], [cx - 7.4 - s * 1.4, hem + 0.4]], (x, y) => (y > hem - 1.2 ? 'acc' : 'sec'));
    f.line(cx - 2, sh + 2, cx - 5 - Math.round(s), hem - 1, 'sec', 1, { on: 'sec' });
  }
}

function capeOver(f, sk) {
  if (sk.view !== 'up') return;
  const { cx, sh } = sk;
  const hem = Math.min(sk.floor - 2.2, sk.hip + 11.5);
  const s = sk.sway * 0.8;
  f.shape([[cx - 5.8, sh - 1.6], [cx + 5.8, sh - 1.6], [cx + 6.8 + s, hem], [cx - 6.8 + s, hem]], (x, y) => (y > hem - 1.4 ? 'acc' : 'sec'), { ny: () => -0.1 });
  f.line(cx - 2, sh + 1, cx - 3 + Math.round(s), hem - 1, 'sec', 1, { on: 'sec' });
  f.line(cx + 2, sh + 1, cx + 3 + Math.round(s), hem - 1, 'sec', 3, { on: 'sec' });
}

/** The energy halberd in her right hand: a dark haft from the floor past her head, a pale-cyan blade. */
function halberd(f, sk) {
  const arm = sk.view === 'side' ? sk.armF : sk.armR;
  if (!arm) return;
  const [hx, hy] = arm.ha;
  const kneel = sk.pose === 'kneel', lying = sk.pose === 'collapse';
  if (lying) {
    f.limb(hx - 1, hy + 1, hx + 13, hy + 2, 0.7, 0.7, 'metal');
    return;
  }
  const x = hx + (sk.view === 'side' ? 0.6 : 0.4);
  const foot = Math.min(sk.floor - 0.6, hy + (kneel ? 6 : 13));
  const top = Math.max(0.6, hy - (kneel ? 26 : 34));
  f.limb(x, foot, x, top + 7, 0.75, 0.75, 'lea');
  f.limb(x, top + 9, x, top + 7, 1.1, 1.1, 'metal', { spec: true });
  // the blade: a crescent edge on the outer side, and a spike up top
  const side = sk.view === 'side' ? 1 : 1;
  f.shape([[x, top + 7], [x + side * 4.6, top + 4.2], [x + side * 5.2, top + 8.4], [x + side * 1.2, top + 10.0]], 'glow', { sep: false });
  f.line(x, top + 7, x, top, 'glow', 2);
  f.dot(x, top, 'glow', 2);
}

// ---------------------------------------------------------------- characters

const VOSS = {
  base: 'kade',
  mats: {
    skin: SKIN.voss, hair: HAIR.iron, main: CHARCOAL, sec: CHARCOAL, acc: CRIMSON, lea: DARK, metal: SILVER,
    glow: HALBERD_GLOW, eye: EYE,
  },
  build: { headY: 3.4, shY: 18.6, hipY: 30.6, shW: 4.9, waistW: 3.6, hipW: 3.9, chest: 3.4, back: 3.3 },
  style: {
    thigh: 'main', shin: 'main', boot: 'lea', bootFrom: 0.35, upper: 'main', fore: 'main', foreR: 0.3, cuff: 'acc', hand: 'lea',
    torso: (ty, dx, view) => (ty === 6 ? 'acc' : ty === 9 ? 'lea' : view === 'down' && Math.abs(dx) < 0.6 && ty > 1 && ty < 9 ? 'acc' : 'main'),
  },
  locks: SWEPT,
  over: {
    // a pale scar across her left eye (screen right in the down view)
    down: [[0, 6, ['.........r....', '.........r....', '..........r...']]],
    side: [],
  },
  hooks: {
    behind: capeBehind,
    front: capeOver,
    arms: halberd,
    neck(f, sk) {
      // silver epaulettes over the cape's shoulders
      const { cx, sh, view } = sk;
      if (view === 'side') f.ball(cx + 0.2, sh - 0.4, 2.4, 1.4, 'metal', { spec: true });
      else {
        f.ball(cx - 5.0, sh - 0.2, 2.2, 1.3, 'metal', { spec: true });
        f.ball(cx + 5.0, sh - 0.2, 2.2, 1.3, 'metal', { spec: true });
      }
    },
  },
  hairLocks: P_SWEPT,
  hairline: 5.6,
  portrait: {
    bust(f) {
      f.ball(21, 44, 16.8, 10.8, (nx, ny) => (nx < -0.62 ? 'acc' : 'main'));
      f.ball(33, 37.6, 5.4, 3.8, (nx, ny) => (ny > 0.4 ? 'acc' : 'metal'), { spec: true });
      f.ball(9, 36.6, 6.6, 4.4, (nx, ny) => (ny > 0.4 ? 'acc' : 'metal'), { spec: true });
    },
    collar(f) {
      f.shape([[13, 25.5], [30, 24.5], [32, 34], [12, 34]], (x, y) => (y < 27.5 ? 'acc' : 'main'), { ny: () => -0.3 });
      f.line(23, 28, 23, 34, 'acc', 2, { on: 'main' });
      f.dot(17, 31, 'metal', 4);
      f.dot(18, 31, 'metal', 3);
    },
    // the scar: a pale seam from the brow, through the near eye, to the cheek
    over: [[17, 12, ['r....', 'qr...', '.r...', '.qr..', '..r..', '..qr.', '...r.', '...qr', '....r']]],
  },
};

/** A cadet: Kade's build and service cut in pale trainee fatigues; hair and skin per cadet. */
function cadet(skin, hair, locks, pLocks, { build = {}, tint = FATIGUE } = {}) {
  return {
    base: 'kade',
    mats: { skin, hair, main: tint, sec: DARK, acc: CRIMSON, lea: LEATHER, metal: SILVER, eye: EYE, glow: ['#ff5d6c', '#ffb4a8', '#fff0ea'] },
    build: { shW: 4.7, waistW: 3.5, hipW: 3.8, ...build },
    style: {
      thigh: 'main', shin: 'main', boot: 'lea', bootFrom: 0.3, upper: 'main', fore: 'main', foreR: 0.3, cuff: 'acc', hand: 'skin',
      torso: (ty) => (ty === 6 ? 'acc' : ty === 9 ? 'lea' : 'main'),
    },
    locks,
    over: {},
    hooks: { behind: null, front: null, arms: null, neck: null },
    hairLocks: pLocks,
    hairline: 6,
    portrait: {
      bust(f) { f.ball(21, 44, 16, 10.5, 'main'); },
      collar(f) {
        f.ball(22, 31, 7.4, 2.6, 'acc', { spec: true });
        f.dot(28, 37, 'metal', 3);
      },
      over: [],
    },
  };
}

export const CHARACTERS = {
  voss: VOSS,
  cadet_mika: cadet(SKIN.deep, HAIR.black, CURLS, P_CURLS),
  cadet_jonah: cadet(SKIN.tan, HAIR.brown, CROP, P_CROP, { build: { shW: 5.1, waistW: 3.9 } }),
  cadet_priya: cadet(SKIN.brown, HAIR.black, BRAID, P_BRAID, { build: { shW: 4.4, waistW: 3.3, hipW: 3.7 } }),
  cadet_lars: cadet(SKIN.pale, HAIR.blonde, CROP, P_CROP, { build: { headY: 2.4, shY: 18.0, shW: 5.0 } }),
  cadet_wen: cadet(SKIN.warm, HAIR.black, BOB, P_BOB, { build: { headY: 3.8, shY: 19.0, shW: 4.3, waistW: 3.2 } }),
};
