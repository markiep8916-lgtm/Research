// shoals: Captain Ines Varo (CharDef for art/characters.js registerCharacter, TECH_PLAN 3.12,
// WRITING.md section 7). Registered with `base: 'nyx'`: her great-granddaughter's face, eighty years
// older in spirit if not in the log; grey hair pinned in a bun, a Meridian captain's coat in deep teal
// with sodium-orange piping, brass epaulettes. The log scene spawns her as a hologram.
//
// export const CHARACTERS   { varo }

const GREY = ['#3c3a44', '#6c6a78', '#a4a2ae', '#d6d4dc', '#f4f2f8'];
const BRASS = ['#2a1d09', '#523b11', '#80601c', '#ad8629', '#d6ad45'];

// a low bun (14-wide field head box) and its portrait twin (battle-head coordinates)
const BUN = {
  down: { hairline: 5.6, list: [['ball', 7, 5.2, 6.7, 4.4], ['ball', 7, 1.0, 2.8, 2.2], [2.0, 5.0, 1.6, 8.0, 1.5, 0.8], [12.0, 5.0, 12.4, 8.0, 1.5, 0.8]] },
  up: { hairline: 0, list: [['ball', 7, 5.8, 6.8, 5.6], ['ball', 7, 10.6, 3.6, 3.0], [3.2, 8.6, 4.0, 11.0, 1.6, 1.0], [10.8, 8.6, 10.0, 11.0, 1.6, 1.0]] },
  side: { hairline: 6.0, list: [['ball', 5.6, 6.6, 5.0, 4.6], ['ball', 6.8, 4.6, 5.8, 3.8], ['ball', 1.6, 7.6, 2.8, 2.6]] },
};
const P_BUN = [['ball', 11.6, 9.0, 4.0, 4.6], ['ball', 8.6, 5.6, 7.2, 4.6], ['ball', 13.6, 8.8, 3.2, 3.0], [3.6, 5.2, 2.6, 9.4, 1.8, 0.8]];

const VARO = {
  base: 'nyx',
  mats: {
    skin: ['#7c5248', '#b2826f', '#d4a893', '#ecccbb'],
    hair: GREY,
    main: ['#061a20', '#0c2c34', '#15424c', '#205a64', '#32767c'],
    sec: ['#0e1218', '#181e28', '#252d3a', '#36404f'],
    acc: ['#5a2208', '#a8460f', '#e06a1e', '#ff9a3c'],
    lea: ['#1a1210', '#2e211c', '#46322a', '#62483b'],
    metal: BRASS,
    glow: ['#ff9b2e', '#ffc35a', '#fff0c4'],
  },
  build: { shW: 4.7, waistW: 3.6, hipW: 3.9, chest: 3.2 },
  style: { hand: 'skin', cuff: 'acc' },
  locks: BUN,
  hooks: {
    behind: null,
    front: null,
    neck(f, sk) {
      const { cx, sh, view } = sk;
      // a high captain's collar with orange piping, brass epaulettes on the shoulders
      if (view === 'side') f.shape([[cx - 2.4, sh - 3.2], [cx + 3.0, sh - 2.6], [cx + 3.2, sh + 1.2], [cx - 2.8, sh + 1.2]], (x, y) => (y < sh - 2.4 ? 'acc' : 'main'));
      else f.shape([[cx - 4.0, sh - 3.4], [cx + 4.0, sh - 3.4], [cx + 4.4, sh + 1.2], [cx - 4.4, sh + 1.2]], (x, y) => (y < sh - 2.6 ? 'acc' : 'main'), { ny: () => -0.3 });
      if (view !== 'side') {
        f.ball(cx - 5.2, sh - 0.4, 2.2, 1.3, 'metal', { spec: true });
        f.ball(cx + 5.2, sh - 0.4, 2.2, 1.3, 'metal', { spec: true });
      } else f.ball(cx + 0.4, sh - 0.4, 2.4, 1.3, 'metal', { spec: true });
      if (view === 'down') for (const dy of [2, 5, 8]) f.dot(cx + 1, sh + dy, 'metal', 2, { only: true });
    },
  },
  hairLocks: P_BUN,
  hairline: 6.2,
  portrait: {
    behind: null,
    bust(f) {
      f.ball(21, 44, 16.5, 10.5, 'main');
      f.ball(33, 38, 5.2, 3.6, (nx, ny) => (ny > 0.4 ? 'acc' : 'metal'), { spec: true });
      f.ball(9, 37, 6.4, 4.2, (nx, ny) => (ny > 0.4 ? 'acc' : 'metal'), { spec: true });
    },
    collar(f) {
      f.shape([[12.5, 25.5], [30.5, 24.5], [32.5, 34], [11.5, 34]], (x, y) => (y < 27.5 ? 'acc' : 'main'), { ny: () => -0.3 });
      f.ball(16, 31, 1.8, 1.4, 'metal', { spec: true });
      f.line(23, 28, 23, 34, 'acc', 2, { on: 'main' });
    },
    over: [],
  },
};

export const CHARACTERS = { varo: VARO };
