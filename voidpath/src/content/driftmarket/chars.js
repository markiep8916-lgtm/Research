// driftmarket: the Ringborn cast (browser; CharDefs for art/characters.js registerCharacter, TECH_PLAN
// 3.12 and 11.2). Old Mother Ruse plus eight townsfolk looks, and tinted variants registered with
// `base` inheritance (WRITING.md section 7): every look has its own silhouette detail (shawl, coat
// tails, apron, robe, goggles, pressure suit, a kid's build) so the market reads as a crowd.
//
// export const CHARACTERS   { id: CharDef } registered by art.js:
//   ruse, rb_elder (Tobin), rb_elder_g (Rook, goggles), rb_kid (Pip), rb_suit (Marta),
//   rb_suit_b (Juno), rb_apron (Hesper), rb_apron_b (Bao), rb_robe (Ama), rb_salvager (Sorrel),
//   rb_salvager_b (the other Sorrel), rb_pilot (Oona), rb_pilot_b (Ilo), rb_guard (Harl)
//
// Hooks draw on the shared skeleton (f = indexed frame, sk = skeleton: cx, sh, hip, headY, floor,
// view 'down' | 'side' | 'up', sway, walk, i, pose), so poses and walks carry the clothes along.

// ---------------------------------------------------------------- ramps

const SKIN = {
  pale: ['#8e5a4c', '#c98f7a', '#ebbca6', '#fcdccb'],
  warm: ['#7a4632', '#b06e50', '#d6987a', '#f0c4a6'],
  tan: ['#5e3626', '#94593c', '#bd7e5a', '#dda67e'],
  deep: ['#3a2117', '#5f3826', '#84533a', '#a87253'],
  old: ['#7c5248', '#b2826f', '#d4a893', '#ecccbb'],
};
const HAIR = {
  grey: ['#3c3a44', '#6c6a78', '#a4a2ae', '#d6d4dc', '#f4f2f8'],
  white: ['#5a5868', '#8e8c9c', '#c4c2d0', '#e8e6f0', '#ffffff'],
  black: ['#0b0c13', '#171a26', '#272c3d', '#3d4560', '#5a6483'],
  brown: ['#24140c', '#45261a', '#6b3d28', '#93573a', '#bb7a52'],
  copper: ['#3a140a', '#6e2a12', '#a8461d', '#d9692e', '#f59a5a'],
  blonde: ['#5a4218', '#8f6a26', '#c49a3c', '#e8c766', '#fbe7a6'],
  teal: ['#08262c', '#0f4a52', '#1b7f84', '#3cbab5', '#8ce8de'],
};
const CLOTH = {
  rust: ['#2a0f08', '#4f1d10', '#7a2f17', '#a5451f', '#c9652e'],
  copper: ['#331a0e', '#4f2a16', '#6d3d1f', '#8f532a', '#b06d38'],
  brown: ['#1f140e', '#36231a', '#523628', '#714c37', '#93664a'],
  teal: ['#06262e', '#0b4350', '#0f6a78', '#16a0a8', '#3fd6d2'],
  navy: ['#0d1530', '#162453', '#213679', '#2e4ea6', '#4a72cf'],
  crimson: ['#2c0910', '#5c1220', '#9a1b30', '#d82d45', '#ff5d6c'],
  cream: ['#5a4a36', '#8a7656', '#b8a27a', '#ddc9a2', '#f4e6c6'],
  olive: ['#1c2210', '#30391a', '#4a5428', '#68733a', '#8c9752'],
  orange: ['#3a1a06', '#6e300c', '#a84a14', '#e06a1e', '#ff9a4a'],
  plum: ['#1e0f22', '#36193c', '#552a5c', '#784080', '#a062a8'],
  iron: ['#100c0e', '#1b1517', '#282023', '#372d30', '#4a3e3f'],
};
const BRASS = ['#2a1d09', '#523b11', '#80601c', '#ad8629', '#d6ad45'];
const GLOW_AMBER = ['#ff9b2e', '#ffc35a', '#fff0c4'];
const GLOW_TEAL = ['#16a0a8', '#4dffe0', '#e6fffb'];
const leather = ['#1a1210', '#2e211c', '#46322a', '#62483b'];

// ---------------------------------------------------------------- shared strokes

function fold(f, x0, y0, x1, y1, mat, lit = true) {
  f.line(x0, y0, x1, y1, mat, 1, { on: mat });
  if (lit) f.line(x0 - 1, y0 + 1, x1 - 1, y1 - 1, mat, 3, { on: mat });
}

/** A skirt, robe or coat from the hips to `drop` below them (capped at the floor when kneeling). */
function skirtShape(f, sk, { drop = 12, flare = 2.2, mat = 'main', hemMat = null, hemRows = 1.2 } = {}) {
  const { cx, hip, view } = sk, s = sk.sway * 0.6;
  const hem = Math.min(hip + drop, sk.floor - 0.4);
  const tm = (x, y) => (hemMat && y >= hem - hemRows ? hemMat : mat);
  const w0 = 3.8, w1 = w0 + flare;
  if (view === 'side') {
    f.shape([[cx - 3.0, hip - 1], [cx + 3.2, hip - 1], [cx + 3.4 + flare * 0.6, hem], [cx - 3.6 - flare * 0.7 - s, hem]], tm);
    fold(f, cx, hip + 2, cx - 1 - Math.round(s), hem - 1, mat);
  } else {
    f.shape([[cx - w0, hip - 1], [cx + w0, hip - 1], [cx + w1 + s, hem], [cx - w1 + s, hem]], tm, { ny: (y) => (y > hip + 6 ? 0.15 : 0) });
    fold(f, cx - 2, hip + 2, cx - 3 + Math.round(s), hem - 1, mat);
    fold(f, cx + 2, hip + 3, cx + 3 + Math.round(s), hem - 1, mat, false);
  }
}

/** Coat tails split at the front (open coat over trousers). */
function coatTails(f, sk, { drop = 9, mat = 'main', trim = 'acc' } = {}) {
  const { cx, hip, view } = sk, s = sk.sway * 0.7;
  const hem = Math.min(hip + drop, sk.floor - (11.2 - drop));
  const tm = (x, y) => (y >= hem - 1 ? trim : mat);
  if (view === 'side') {
    f.shape([[cx - 3.0, hip - 1], [cx + 3.1, hip - 1], [cx + 3.4, hip + 3.5], [cx + 1.4, hem], [cx - 5.2 - s, hem + 0.4], [cx - 3.8, hip + 3]], tm);
    fold(f, cx - 1, hip + 2, cx - 3 - Math.round(s), hem - 1, mat);
  } else if (view === 'down') {
    f.shape([[cx - 3.9, hip - 1], [cx - 0.7, hip - 1], [cx - 1.4, hem], [cx - 5.4 + s, hem + 0.4]], tm);
    f.shape([[cx + 0.7, hip - 1], [cx + 3.9, hip - 1], [cx + 5.4 + s, hem + 0.4], [cx + 1.4, hem]], tm);
  } else {
    f.shape([[cx - 3.9, hip - 1], [cx + 3.9, hip - 1], [cx + 5.4 + s, hem + 0.4], [cx - 5.4 + s, hem + 0.4]], tm);
    f.line(cx, hip + 3, cx + Math.round(s), hem - 1, mat, 0, { on: mat });
  }
}

/** A shawl or mantle over the shoulders: wide, with a point at the front and a fringe. */
function shawl(f, sk, { mat = 'acc', drop = 6, width = 6.2 } = {}) {
  const { cx, sh, view } = sk;
  if (view === 'side') {
    f.shape([[cx - 3.2, sh - 2.2], [cx + 3.4, sh - 2.2], [cx + 4.2, sh + 2], [cx + 1.5, sh + drop * 0.8], [cx - 4.4, sh + drop * 0.6], [cx - 4.0, sh + 1]], mat, { ny: () => -0.25 });
  } else {
    f.shape([[cx - width, sh - 2], [cx + width, sh - 2], [cx + width + 0.6, sh + 2.6], [cx, sh + drop + (view === 'up' ? -1.5 : 0)], [cx - width - 0.6, sh + 2.6]], mat, { ny: (y) => (y < sh ? -0.4 : 0.1) });
    if (view === 'down') {
      for (let x = Math.ceil(cx - width + 1); x < cx + width; x += 2) {
        const y = sh + 2.6 + (drop - 2.6) * (1 - Math.abs(x + 0.5 - cx) / width);
        f.dot(x, y, mat, 3, { only: false });
      }
      f.line(cx - 1, sh - 1, cx, sh + drop - 1.5, mat, 1, { on: mat });
    }
  }
}

/** An apron over the front: a bib on the chest and a skirt panel to the knees. */
function apron(f, sk, { mat = 'sec', drop = 8.5 } = {}) {
  const { cx, sh, hip, view } = sk;
  if (view === 'up') return;
  if (view === 'side') {
    f.shape([[cx + 1.5, sh + 2], [cx + 3.4, sh + 2.4], [cx + 3.8, hip + drop], [cx + 1.6, hip + drop]], mat);
    return;
  }
  f.shape([[cx - 2.4, sh + 1.8], [cx + 2.4, sh + 1.8], [cx + 2.8, hip], [cx + 3.6, hip + drop], [cx - 3.6, hip + drop], [cx - 2.8, hip]], mat, { ny: () => -0.1 });
  f.line(cx - 2, hip - 0.5, cx + 2, hip - 0.5, mat, 1, { on: mat });
  fold(f, cx - 1, hip + 1, cx - 1.5, hip + drop - 1, mat, false);
}

/** A scarf knot at the neck (and its tail in the down view). */
function scarf(f, sk, mat = 'acc') {
  const { cx, sh, view } = sk;
  if (view === 'side') f.ball(cx + 0.6, sh - 0.4, 3.4, 1.9, mat);
  else {
    f.ball(cx, sh - 0.4, 4.2, 1.9, mat);
    if (view === 'down') f.shape([[cx + 1.4, sh], [cx + 3.0, sh], [cx + 2.6, sh + 5], [cx + 1.2, sh + 4.6]], mat, { dim: 1 });
  }
}

/** A satchel strap across the chest and the bag at the hip. */
function satchel(f, sk, mat = 'lea') {
  const { cx, sh, hip, view } = sk;
  if (view === 'down') {
    f.line(cx - 4, sh, cx + 3, hip - 1, mat, 2, { only: true });
    f.ball(cx + 4.4, hip + 0.5, 2.0, 1.8, mat);
  } else if (view === 'side') {
    f.ball(cx - 2.6, hip + 0.4, 1.9, 2.0, mat);
  } else {
    f.line(cx + 4, sh, cx - 3, hip - 1, mat, 1, { only: true });
  }
}

// ---------------------------------------------------------------- field hair (14-wide head box)

const BUN = {
  down: { hairline: 5.4, list: [['ball', 7, 5.2, 6.7, 4.4], ['ball', 7, 0.8, 3.0, 2.4], [2.0, 5.0, 1.4, 8.6, 1.6, 0.9], [12.0, 5.0, 12.6, 8.6, 1.6, 0.9]] },
  up: { hairline: 0, list: [['ball', 7, 5.8, 6.8, 5.6], ['ball', 7, 1.4, 3.2, 2.6], [3.0, 9, 3.6, 11.8, 1.8, 1.2], [11.0, 9, 10.4, 11.8, 1.8, 1.2]] },
  side: { hairline: 6.0, list: [['ball', 5.6, 6.6, 5.0, 4.6], ['ball', 6.8, 4.6, 5.8, 3.8], ['ball', 2.4, 3.2, 2.8, 2.4]] },
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
const BALD = {
  down: { hairline: 7.4, list: [[1.6, 6.0, 2.0, 9.2, 1.4, 0.8], [12.4, 6.0, 12.0, 9.2, 1.4, 0.8]] },
  up: { hairline: 0, list: [[2.2, 7.2, 4.0, 10.6, 1.6, 0.8], [11.8, 7.2, 10.0, 10.6, 1.6, 0.8], [5.0, 10.4, 9.0, 10.4, 1.4, 1.4]] },
  side: { hairline: 7.4, list: [[2.2, 6.4, 1.8, 10.0, 1.6, 0.9], [4.0, 9.0, 1.6, 9.8, 1.2, 0.8]] },
};
const LONG = {
  down: { hairline: 5.4, list: [['ball', 7, 5.0, 6.8, 4.4], [1.8, 5.0, 1.2, 13.0, 1.8, 1.2], [12.2, 5.0, 12.8, 13.0, 1.8, 1.2], [7.0, 2.2, 5.4, 5.8, 1.6, 0.6]] },
  up: { hairline: 0, list: [['ball', 7, 5.8, 6.8, 5.6], [4.0, 8, 4.0, 15.0, 2.6, 2.0], [10.0, 8, 10.0, 15.0, 2.6, 2.0], [7.0, 8, 7.0, 15.4, 2.6, 2.0]] },
  side: { hairline: 5.8, list: [['ball', 5.6, 6.2, 5.0, 4.6], ['ball', 6.6, 4.4, 5.8, 3.6], [3.2, 6.0, 2.4, 14.0, 2.4, 1.6]] },
};

// portrait hair (battle-head coordinates, mirrored into the 40 x 40 bust)
const P_BUN = [['ball', 11.6, 9.0, 4.0, 4.6], ['ball', 8.6, 5.6, 7.2, 4.6], ['ball', 12.8, 2.6, 3.4, 3.0], [3.6, 5.2, 2.4, 9.6, 1.8, 0.8]];
const P_CROP = [['ball', 11.8, 8.4, 3.8, 4.4], ['ball', 8.6, 5.2, 7.0, 4.2], [4.2, 4.0, 1.6, 6.4, 1.8, 0.5]];
const P_CURLS = [['ball', 11.8, 8.4, 4.4, 4.8], ['ball', 8.4, 4.8, 7.4, 4.6], ['ball', 4.0, 3.6, 2.8, 2.6], ['ball', 13.4, 4.0, 2.6, 2.6]];
// a bald crown's fringe: thin locks behind the ear (a round mass over the ear read as a headset)
const P_BALD = [[14.2, 6.6, 13.6, 10.6, 1.0, 0.6], [12.8, 6.4, 13.9, 7.6, 0.9, 0.5]];
// Ruse: the bun without the lock that fell over her far eye, so both eyes and brows act
const P_RUSE = P_BUN.slice(0, 3);
const P_LONG = [['ball', 11.6, 9.4, 4.4, 5.2], ['ball', 8.5, 5.8, 7.4, 5.0], [12.6, 8.0, 13.6, 15.0, 2.6, 2.0], [2.4, 5.6, 1.6, 9.4, 1.6, 0.8]];

// ---------------------------------------------------------------- portrait parts

const bust = (main) => (f) => f.ball(21, 44, 16, 10.5, main);
const collarOf = (mat) => (f) => f.ball(22, 31, 7.4, 2.6, mat, { spec: true });

// ---------------------------------------------------------------- characters

const RUSE = {
  base: 'sera',
  mats: {
    skin: SKIN.old, hair: HAIR.grey, main: CLOTH.rust, sec: CLOTH.teal, acc: CLOTH.crimson, lea: leather,
    metal: BRASS, glow: GLOW_AMBER, eye: ['#2a1a12', '#7a5a2a', '#ffffff'],
  },
  build: { headY: 7, shY: 22, hipY: 32, shW: 4.6, waistW: 3.6, hipW: 4.0, chest: 3.4, back: 3.4 },
  style: { thigh: 'sec', shin: 'sec', boot: 'lea', bootFrom: 0.5, upper: 'main', fore: 'main', cuff: 'acc', hand: 'skin', torso: () => 'main' },
  locks: BUN,
  hooks: {
    front: null,
    torso: null,
    skirt: (f, sk) => skirtShape(f, sk, { drop: 13, flare: 2.6, mat: 'sec', hemMat: 'acc' }),
    neck: (f, sk) => {
      shawl(f, sk, { mat: 'acc', drop: 7, width: 6.0 });
      // a brass lantern pendant on the shawl
      if (sk.view === 'down') f.tpl(['.M.', 'MtM', '.M.'], sk.cx - 1, Math.floor(sk.sh) + 3, {});
    },
  },
  hairLocks: P_RUSE,
  hairline: 5.4,   // the bun pulled back off a high forehead, so her brows sit clear of the hair
  portrait: {
    bust: bust('main'),
    collar: (f) => {
      f.shape([[11, 30], [33, 30], [35, 40], [9, 40]], 'acc', { ny: () => -0.3 });
      f.tpl(['.M.', 'MtM', '.M.'], 21, 34, {});
    },
    after: null,
    over: [],
  },
  // her own faces (edits of the portrait face, art/characters.js FACE_P rows: 8-10 brows, 11-13 eyes,
  // 17-19 mouth): heavy brows that do the talking, a sideways smirk, never a grin
  expressions: {
    neutral: [[12, 6, 'w'], [18, 15, 'qqqqw']],                                  // a crow's foot, a flat mouth
    smile: [
      [9, 15, 'eeee'], [8, 15, 'aaaa'], [7, 17, 'aa'],                     // the far brow cocked
      [13, 8, 'iii'], [13, 16, 'ii'],                                      // a crinkled squint
      [18, 15, 'wqqqq'], [17, 19, 'q'], [17, 20, 'w'],                     // one corner up: a smirk
    ],
    sad: [
      [9, 10, 'ee'], [8, 9, 'aaa'], [9, 15, 'e'], [8, 15, 'aa'],          // inner ends lifted
      [12, 8, 'iii'], [12, 16, 'ii'],                                      // heavy lids, gaze down
      [18, 15, 'eqqqe'], [19, 15, 'q'], [19, 19, 'q'],                     // corners down
    ],
    determined: [
      [8, 7, 'aa'], [9, 7, 'ee'], [9, 10, 'ee'], [10, 10, 'aa'],           // brows drawn down to the nose
      [10, 15, 'a'], [9, 15, 'e'], [8, 17, 'aa'], [9, 17, 'ee'],
      [13, 8, 'iii'], [13, 16, 'ii'],                                      // narrowed
      [18, 14, 'qqqqqq'], [19, 16, 'ww'],                                  // a hard, set mouth
    ],
    surprised: [
      [9, 7, 'eeeee'], [8, 7, 'aaaaa'], [9, 15, 'eeee'], [8, 15, 'aaaa'],  // brows up
      [10, 8, 'iii'], [11, 8, 'ipo'], [10, 16, 'ii'], [11, 16, 'ip'],      // eyes wide
      [17, 16, 'qqq'], [18, 15, 'qlllq'], [19, 16, 'qqq'],                 // an open mouth
    ],
  },
};

// Tobin: an old beacon keeper in a patched coat, amber scarf, a white beard.
const ELDER = {
  base: 'kade',
  mats: {
    skin: SKIN.tan, hair: HAIR.white, main: CLOTH.brown, sec: CLOTH.iron, acc: CLOTH.orange, lea: leather,
    metal: BRASS, glow: GLOW_AMBER, eye: ['#1a1410', '#6a4a2a', '#ffffff'],
  },
  build: { headY: 4, shY: 19.5, hipY: 31, shW: 4.8, waistW: 4.0, hipW: 4.0 },
  style: { thigh: 'sec', shin: 'sec', boot: 'lea', bootFrom: 0.4, upper: 'main', fore: 'main', foreR: 0.3, hand: 'skin', torso: (ty) => (ty === 9 ? 'lea' : 'main') },
  locks: BALD,
  over: {
    down: [[0, 9, ['...dsssssd....', '..sdfffffdss..', '...sdfffdss...', '....sddsss....', '.....sss......']]],
    side: [[0, 9, ['......sdss....', '.....sdfdss...', '......sddss...', '.......sss....']]],
  },
  hooks: {
    behind: null,
    torso: null,
    arms: null,
    skirt: (f, sk) => coatTails(f, sk, { drop: 10, mat: 'main', trim: 'acc' }),
    neck: (f, sk) => scarf(f, sk, 'acc'),
  },
  hairLocks: P_BALD,
  hairline: 8,
  // a white moustache and beard around the mouth (rows 17-21 of the face, under the eyes)
  portrait: {
    bust: bust('main'),
    collar: collarOf('acc'),
    over: [[11, 23, [
      '..............sffffs....',
      '.........sdds.....ds....',
      '.......sdfffdddddffs....',
      '........sdffffffffds....',
      '..........sdffffds......',
      '............sdds........',
    ]]],
  },
};

// Rook: the blind old pilot; brass goggles with dead lenses, a navy flight coat.
const ELDER_G = {
  base: 'rb_elder',
  mats: { main: CLOTH.navy, acc: CLOTH.cream, hair: HAIR.grey, skin: SKIN.deep },
  over: {
    down: [[0, 7, ['.nMMMn..nMMMn.', '.nYYYMnnMYYYn.', '..nnn....nnn..']], [0, 9, ['..............', '...dsssssd....', '....sdddss....']]],
    side: [[0, 7, ['.......nMMMn..', '.......MYYYMn.', '........nnn...']]],
  },
  hooks: { neck: (f, sk) => scarf(f, sk, 'acc') },
  portrait: {
    over: [[11, 15, ['.....nnnn......nnnn.....', '....nMYYMnnnnnnMYYMn....', '.....nnnn......nnnn.....']]],
  },
};

// Pip: a Ringborn kid (9): small, big head, a red scarf, a slingshot of a grin.
const KID = {
  base: 'nyx',
  mats: {
    skin: SKIN.warm, hair: HAIR.copper, main: CLOTH.olive, sec: CLOTH.brown, acc: CLOTH.crimson, lea: leather,
    metal: BRASS, glow: GLOW_TEAL, eye: ['#1a1410', '#4a8a6a', '#ffffff'],
  },
  build: { headY: 11, shY: 26, hipY: 34.5, shW: 3.6, waistW: 2.9, hipW: 3.0, armX: 4.4, hipX: 1.6, thighR: 1.5, shinR: 1.35, armR: 1.15, chest: 2.6, back: 2.4 },
  style: { thigh: 'sec', shin: 'sec', boot: 'lea', bootFrom: 0.25, upper: 'main', fore: 'main', cuff: 'acc', hand: 'skin', torso: () => 'main' },
  locks: CURLS,
  over: {},
  hooks: {
    behind: null,
    front: null,
    skirt: null,
    neck: (f, sk) => scarf(f, sk, 'acc'),
  },
  hairLocks: P_CURLS,
  hairline: 6,
  portrait: { bust: bust('main'), collar: collarOf('acc'), behind: null, over: [] },
};

// Marta Kell, dockmaster: an orange pressure suit, a teal stripe, a brass headset.
const SUIT = {
  base: 'kade',
  mats: {
    skin: SKIN.pale, hair: HAIR.black, main: CLOTH.orange, sec: CLOTH.iron, acc: CLOTH.teal, lea: leather,
    metal: BRASS, glow: GLOW_TEAL, eye: ['#1a1410', '#3a5a7a', '#ffffff'],
  },
  build: { shW: 5.0, waistW: 4.2, hipW: 4.2 },
  style: { thigh: 'main', shin: 'main', boot: 'sec', bootFrom: 0.55, upper: 'main', fore: 'main', foreR: 0.55, hand: 'sec',
    torso: (ty, dx, view) => (ty === 6 ? 'acc' : ty >= 9 ? 'sec' : 'main') },
  locks: CROP,
  over: {
    down: [[0, 5, ['M............M', 'M............M', 'nt..........tn']]],
    side: [[0, 5, ['.......nMMn...', '.......MttM...']]],
  },
  hooks: {
    behind: null,
    skirt: null,
    torso: (f, sk) => { if (sk.view === 'down') f.tpl(['ZXXZ', 'XtyX', 'ZXXZ'], sk.cx - 2, Math.floor(sk.sh) + 2, { only: true }); },
    neck: (f, sk) => {
      const { cx, sh, view } = sk;
      f.ball(view === 'side' ? cx + 0.5 : cx, sh - 0.6, view === 'side' ? 3.4 : 4.6, 2.0, 'metal', { spec: true });
    },
  },
  hairLocks: P_CROP,
  hairline: 6,
  portrait: {
    bust: (f) => { f.ball(21, 44, 16.5, 10.5, 'main'); f.ball(33, 38, 5, 4, 'acc'); },
    collar: (f) => f.ball(22, 31, 8.4, 3.2, 'metal', { spec: true }),
    over: [[11, 11, ['MM......................', 'Mt......................']]],
  },
};

// Juno, mechanic: the same suit in olive, rolled sleeves, a copper ponytail and a tool belt.
const SUIT_B = {
  base: 'rb_suit',
  mats: { main: CLOTH.olive, acc: CLOTH.orange, hair: HAIR.copper, skin: SKIN.tan },
  locks: LONG,
  over: {},
  hooks: { neck: (f, sk) => satchel(f, sk, 'lea') },
  hairLocks: P_LONG,
  portrait: { over: [] },
};

// Hesper, innkeeper: a cream apron over a plum dress, sleeves rolled, a brown bun.
const APRON = {
  base: 'sera',
  mats: {
    skin: SKIN.warm, hair: HAIR.brown, main: CLOTH.plum, sec: CLOTH.cream, acc: CLOTH.crimson, lea: leather,
    metal: BRASS, glow: GLOW_AMBER, eye: ['#1a1410', '#6a4a2a', '#ffffff'],
  },
  build: { shW: 4.8, waistW: 3.8, hipW: 4.2 },
  style: { thigh: 'main', shin: 'main', boot: 'lea', bootFrom: 0.5, upper: 'main', fore: 'skin', foreR: 0.4, cuff: 'sec', hand: 'skin', torso: () => 'main' },
  locks: BUN,
  hooks: {
    front: null,
    torso: (f, sk) => apron(f, sk, { mat: 'sec', drop: 9 }),
    skirt: (f, sk) => skirtShape(f, sk, { drop: 11, flare: 1.8, mat: 'main' }),
    neck: null,
  },
  hairLocks: P_BUN,
  portrait: { bust: bust('main'), collar: collarOf('sec'), after: null, over: [] },
};

// Bao, noodle cook: the apron on a broader build, a crimson headband, black crop.
const APRON_B = {
  base: 'rb_apron',
  mats: { main: CLOTH.teal, acc: CLOTH.crimson, hair: HAIR.black, skin: SKIN.tan, sec: CLOTH.cream },
  build: { headY: 4, shY: 19.5, hipY: 31, shW: 5.2, waistW: 4.4, hipW: 4.4 },
  locks: CROP,
  over: {
    down: [[0, 4, ['.ZZZZZZZZZZZZ.', '..XXXXXXXXXX..']]],
    side: [[0, 4, ['..ZZZZZZZZZZ..', '...XXXXXXXXX..']]],
    up: [[0, 4, ['.ZZZZZZZZZZZZ.']]],
  },
  hooks: {
    torso: (f, sk) => apron(f, sk, { mat: 'sec', drop: 7 }),
    skirt: null,
  },
  hairLocks: P_CROP,
  portrait: { over: [[11, 9, ['.ZZZZZZZZZZZZZZZZZZZZZ..']]] },
};

// Ama, ribbon weaver: a long crimson robe hung with ribbons, white hair to the waist.
const ROBE = {
  base: 'sera',
  mats: {
    skin: SKIN.deep, hair: HAIR.white, main: CLOTH.crimson, sec: CLOTH.rust, acc: CLOTH.cream, lea: leather,
    metal: BRASS, glow: GLOW_AMBER, eye: ['#1a1410', '#5a3a2a', '#ffffff'],
  },
  style: { thigh: 'main', shin: 'main', boot: 'lea', bootFrom: 0.7, upper: 'main', fore: 'main', cuff: 'acc', hand: 'skin', torso: () => 'main' },
  locks: LONG,
  hooks: {
    front: null,
    torso: (f, sk) => {
      if (sk.view === 'down') for (const dx of [-2, 0, 2]) f.line(sk.cx + dx, sk.sh + 2, sk.cx + dx, sk.hip, 'acc', 1, { on: 'main' });
    },
    skirt: (f, sk) => {
      skirtShape(f, sk, { drop: 13.5, flare: 2.8, mat: 'main', hemMat: 'acc', hemRows: 1.5 });
      if (sk.view === 'down') for (const dx of [-3, -1, 1, 3]) f.line(sk.cx + dx, sk.hip + 2, sk.cx + dx + sk.sway, sk.hip + 9, 'acc', 2, { on: 'main' });
    },
    neck: (f, sk) => shawl(f, sk, { mat: 'sec', drop: 4, width: 5.0 }),
  },
  hairLocks: P_LONG,
  portrait: { bust: bust('main'), collar: collarOf('sec'), after: null, over: [] },
};

// Sorrel (the "strip it" twin): rust coat, goggles up on the forehead, a satchel.
const SALVAGER = {
  base: 'nyx',
  mats: {
    skin: SKIN.pale, hair: HAIR.black, main: CLOTH.rust, sec: CLOTH.iron, acc: CLOTH.copper, lea: leather,
    metal: BRASS, glow: GLOW_AMBER, eye: ['#1a1410', '#6a4a2a', '#ffffff'],
  },
  locks: CROP,
  over: {
    down: [[0, 3, ['..nVCnmmnVCn..', '..nCXnmmnCXn..']]],
    side: [[0, 3, ['.......mmnVCn.', '.......mmnCXn.']]],
    up: [[0, 3, ['.mmmmmmmmmmmm.']]],
  },
  hooks: {
    behind: null,
    front: null,
    skirt: (f, sk) => coatTails(f, sk, { drop: 8, mat: 'main', trim: 'acc' }),
    neck: (f, sk) => satchel(f, sk, 'lea'),
  },
  hairLocks: P_CROP,
  hairline: 6,
  portrait: { behind: null, bust: bust('main'), collar: collarOf('acc'), over: [[11, 5, ['..nnnnXNBMXnnnnXNBXn....', '..mmmmXMMMXmmmmXMMXm....']]] },
};

// the other Sorrel (the "don't" twin): the same cut in teal
const SALVAGER_B = {
  base: 'rb_salvager',
  mats: { main: CLOTH.teal, acc: CLOTH.cream },
};

// Oona, seeding pilot: a brown flight jacket with a fur collar, blonde crop, goggles at the neck.
const PILOT = {
  base: 'nyx',
  mats: {
    skin: SKIN.warm, hair: HAIR.blonde, main: CLOTH.brown, sec: CLOTH.navy, acc: CLOTH.cream, lea: leather,
    metal: BRASS, glow: GLOW_TEAL, eye: ['#1a1410', '#3a6a8a', '#ffffff'],
  },
  locks: CROP,
  over: {},
  hooks: {
    behind: null,
    front: null,
    skirt: null,
    neck: (f, sk) => {
      const { cx, sh, view } = sk;
      f.ball(view === 'side' ? cx + 0.4 : cx, sh - 0.5, view === 'side' ? 3.6 : 5.0, 2.2, 'acc');
      if (view === 'down') f.tpl(['nVCnmmnVCn', 'nCXnmmnCXn'], cx - 5, Math.floor(sh) + 1, {});
    },
  },
  hairLocks: P_CROP,
  hairline: 6,
  portrait: { behind: null, bust: bust('main'), collar: (f) => f.ball(22, 31, 9, 3.4, 'acc'), over: [] },
};

// Ilo, teen stargazer: slighter, dark curls, a blue jacket too big for him.
const PILOT_B = {
  base: 'rb_pilot',
  mats: { main: CLOTH.navy, acc: CLOTH.teal, hair: HAIR.black, skin: SKIN.deep },
  build: { headY: 7, shY: 22.5, hipY: 32.5, shW: 4.2, waistW: 3.2, hipW: 3.4 },
  locks: CURLS,
  hairLocks: P_CURLS,
};

// Harl, station guard: broad, copper plates over a red coat, shaved head, a short beard.
const GUARD = {
  base: 'kade',
  mats: {
    skin: SKIN.tan, hair: HAIR.brown, main: CLOTH.copper, sec: CLOTH.iron, acc: CLOTH.crimson, lea: leather,
    metal: ['#3a2410', '#6e4a22', '#a6773a', '#d8a85a', '#f6dc98'], glow: GLOW_AMBER, eye: ['#1a1410', '#4a3a2a', '#ffffff'],
  },
  build: { headY: 3, shY: 18.5, hipY: 30.5, shW: 5.6, waistW: 4.4, hipW: 4.4, armX: 6.0, thighR: 2.2, shinR: 2.0, armR: 1.7, chest: 3.8, back: 3.4 },
  locks: BALD,
  over: {
    down: [[0, 10, ['...ssssssss...', '....sddddss...', '.....ssss.....']]],
    side: [[0, 10, ['......ssss....', '.......sss....']]],
  },
  hooks: { behind: null },
  hairLocks: P_BALD,
  hairline: 8,
  // a short beard on the jaw, under the mouth (the eyes stay clear)
  portrait: { over: [[11, 24, [
    '........sdd......dds....',
    '.......sdddsssssdddds...',
    '........sdddddddddds....',
    '..........sddddddds.....',
  ]]] },
};

export const CHARACTERS = {
  ruse: RUSE,
  rb_elder: ELDER,
  rb_elder_g: ELDER_G,
  rb_kid: KID,
  rb_suit: SUIT,
  rb_suit_b: SUIT_B,
  rb_apron: APRON,
  rb_apron_b: APRON_B,
  rb_robe: ROBE,
  rb_salvager: SALVAGER,
  rb_salvager_b: SALVAGER_B,
  rb_pilot: PILOT,
  rb_pilot_b: PILOT_B,
  rb_guard: GUARD,
};
