// UI icons for VOIDPATH: 16x16 pixel icons with a 1 px dark outline, readable at 1x and crisp at
// 2-3x (nearest-neighbour). Damage types are colour-coded with palette DAMAGE_COLORS; the rest use
// the UI accents (amber BP, cyan tech, magenta break).
//
// Most icons are authored as pixel maps (16 rows x 16 chars, '.' = empty) with a per-icon legend;
// the builder paints the map, then adds the outline around the silhouette.

import { Painter, shade, mix } from './painter.js';
import { DAMAGE_COLORS, GLOW, OUTLINE, RAMPS } from './palette.js';

export const ICON_NAMES = [
  'blade', 'lance', 'rifle', 'gauntlet', 'thermal', 'cryo', 'volt', 'photon', 'void',
  'unknown', 'shield', 'shield_broken', 'bp', 'bp_empty', 'bp_boost',
  'medigel', 'ether', 'revive', 'keycard', 'cursor',
  'attack', 'skill', 'item', 'defend', 'flee', 'save', 'talk', 'inspect',
];

/** Five tones around a light base colour: deep shadow, shadow, mid, base, highlight. */
function tones(base) {
  return { a: shade(base, -0.56), b: shade(base, -0.4), c: shade(base, -0.22), d: base, e: mix(base, '#ffffff', 0.6) };
}

const W = '#ffffff';
const DARK = '#1b2133';
const GOLD = { m: RAMPS.gold[2], g: RAMPS.gold[3], h: RAMPS.gold[4] };
const STEEL = { s: RAMPS.steel[2], t: RAMPS.steel[4], u: RAMPS.steel[5], v: RAMPS.steel[6] };

// Each entry: { map: [16 strings], legend: { char: colour } }.
const DEFS = {
  blade: {
    legend: { ...tones(DAMAGE_COLORS.blade), w: W, ...GOLD, k: '#3a2a26' },
    map: [
      '................',
      '.............ew.',
      '............edb.',
      '...........edb..',
      '..........edb...',
      '.........edb....',
      '........edb.....',
      '.......edb......',
      '..h...edb.......',
      '...h.edb........',
      '...mhdb.........',
      '....mhg.........',
      '....kmmh........',
      '...kk...m.......',
      '..hk............',
      '................',
    ],
  },
  lance: {
    legend: { ...tones(DAMAGE_COLORS.lance), w: W, ...GOLD, k: RAMPS.steel[3], l: RAMPS.steel[5] },
    map: [
      '................',
      '..............w.',
      '............eed.',
      '...........eddb.',
      '..........eddb..',
      '..........ddbb..',
      '.........hdbb...',
      '........lhg.....',
      '.......lk.......',
      '......lk........',
      '.....lk.........',
      '....lk..........',
      '...lk...........',
      '..lk............',
      '..g.............',
      '................',
    ],
  },
  rifle: {
    legend: { ...tones(DAMAGE_COLORS.rifle), w: W, k: '#2a2230' },
    map: [
      '................',
      '................',
      '................',
      '.....bbbbbe.....',
      '......cc.c......',
      '..ddeeeeeeeeddd.',
      '.cdcdddddddcccc.',
      '.bcbbbcddcccb...',
      '.bccbbkbbbbb....',
      '.ab...kcb.......',
      '.ab...kcb.......',
      '.......bb.......',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  gauntlet: {
    legend: { ...tones(DAMAGE_COLORS.gauntlet), w: W, k: '#3b1f18' },
    map: [
      '................',
      '................',
      '....ee.ee.ee....',
      '...eddkddkddd...',
      '...dddkddkddc...',
      '..edcckcckccb...',
      '..ddeeeeedcbb...',
      '..dcdddddccbb...',
      '..dcccccccbbb...',
      '...cccccbbbb....',
      '...akkkkkkka....',
      '...bccccccbb....',
      '...bdddcccba....',
      '...bbbbbbbba....',
      '................',
      '................',
    ],
  },
  thermal: {
    legend: { a: '#8a1c0c', b: '#d2401a', c: DAMAGE_COLORS.thermal, d: '#ffc35a', e: '#fff3cf' },
    map: [
      '................',
      '.......a........',
      '.......ba.......',
      '......abba...a..',
      '.....abcba..ab..',
      '.....bccba..bba.',
      '....abcccbaabca.',
      '...abccdccbbcca.',
      '...bccddcccccca.',
      '..abcddeddcccba.',
      '..bcdddeeddccba.',
      '..bcddeeeedccb..',
      '..abcdeeeedcba..',
      '...abcddddcba...',
      '....aabbbbaa....',
      '................',
    ],
  },
  cryo: {
    legend: { ...tones(DAMAGE_COLORS.cryo), w: W },
    map: [
      '................',
      '.......e........',
      '.....b.d.b......',
      '......cdc.......',
      '..b....d....b...',
      '...dc..d..cd....',
      '....ddcecdd.....',
      '.edddddwdddde...',
      '....ddcecdd.....',
      '...dc..d..cd....',
      '..b....d....b...',
      '......cdc.......',
      '.....b.d.b......',
      '.......e........',
      '................',
      '................',
    ],
  },
  volt: {
    legend: { a: '#8f6a19', b: '#c99a2a', c: '#f0c94d', d: DAMAGE_COLORS.volt, e: '#fffbe0', w: W },
    map: [
      '................',
      '........abbb....',
      '.......bddc.....',
      '......bddc......',
      '.....bddc.......',
      '....bddcbbbb....',
      '...bdddddddc....',
      '...bbbbedddb....',
      '.......edda.....',
      '......eddb......',
      '.....edda.......',
      '....eddb........',
      '...wdda.........',
      '...wda..........',
      '...ba...........',
      '................',
    ],
  },
  photon: {
    legend: { a: '#c99a2a', b: '#f0c94d', c: '#ffe680', d: DAMAGE_COLORS.photon, w: W },
    map: [
      '................',
      '.......b........',
      '.......c........',
      '..a....c....a...',
      '...b...d...b....',
      '....c.bdb.c.....',
      '.....cdwdc......',
      '.bccddwwwddccb..',
      '.....cdwdc......',
      '....c.bdb.c.....',
      '...b...d...b....',
      '..a....c....a...',
      '.......c........',
      '.......b........',
      '................',
      '................',
    ],
  },
  void: {
    legend: { a: '#120a24', b: '#2a1650', c: '#5b2ea0', d: DAMAGE_COLORS.void, e: '#e2c8ff', k: '#07040e' },
    map: [
      '................',
      '.....bccdd......',
      '...bccbbbcde....',
      '..bcb.....bde...',
      '..cb..aab..dd...',
      '.bc..akkkb..dc..',
      '.cb.akkkkkb.dc..',
      '.cb.akkkkkb.cc..',
      '.cc.akkkkka.cb..',
      '..dc.akkka..cb..',
      '..ddb.aaa..bc...',
      '...ded....bcb...',
      '....dccbbccb....',
      '......cbbb......',
      '................',
      '................',
    ],
  },
  unknown: {
    legend: { a: '#1b2133', b: '#2a3349', c: '#3b4762', d: '#9fb2cc', e: '#e9f2ff' },
    map: [
      '................',
      '..cccccccccccc..',
      '.cbbbbbbbbbbbbb.',
      '.cbbbbeeeebbbba.',
      '.cbbbedddeebbba.',
      '.cbbbedbbbdebba.',
      '.cbbbbbbbbdebba.',
      '.cbbbbbbbeddbba.',
      '.cbbbbbbeddbbba.',
      '.cbbbbbbeddbbba.',
      '.cbbbbbbbbbbbba.',
      '.cbbbbbbeebbbba.',
      '.cbbbbbbddbbbba.',
      '.cbbbbbbbbbbbba.',
      '..aaaaaaaaaaaa..',
      '................',
    ],
  },
  shield: {
    legend: { a: '#24395c', b: '#3c5c8c', c: '#6f9fd8', d: '#b7d6ff', e: '#eaf4ff', k: '#0f1626' },
    map: [
      '................',
      '.......ee.......',
      '.....eeedcc.....',
      '....eedkkdcb....',
      '..eedkkkkkkcbb..',
      '..edkkkkkkkkcb..',
      '..edkkkkkkkkcb..',
      '..edkkkkkkkkcb..',
      '..edkkkkkkkkcb..',
      '..edkkkkkkkkcb..',
      '..edkkkkkkkkcb..',
      '..ccbkkkkkkbba..',
      '....ccbkkbba....',
      '.....cbbbba.....',
      '.......aa.......',
      '................',
    ],
  },
  shield_broken: {
    legend: { a: '#5c1450', b: '#95207a', c: '#d23596', d: '#ff63b6', e: '#ffd0ea', k: '#1a0717', w: W },
    map: [
      '................',
      '.......e........',
      '.....eee.cc.....',
      '....eedk.dcb....',
      '..eedkkkw.kcbb..',
      '..edkkkkk.kkcb..',
      '..edkkkkw.kkcb..',
      '..edkkkk..kkcb..',
      '..edkkkk.wkkcb..',
      '..edkkk..kkkcb..',
      '..edkkkw.kkkcb..',
      '..ccbkk.kkkbba..',
      '....ccb.kbba....',
      '.....cb.bba.....',
      '.......a........',
      '................',
    ],
  },
  bp: {
    legend: { a: RAMPS.amber[1], b: RAMPS.amber[2], c: RAMPS.amber[3], d: RAMPS.amber[4], e: RAMPS.amber[5], w: W },
    map: [
      '................',
      '................',
      '................',
      '.......dd.......',
      '......deec......',
      '.....dewdcc.....',
      '....deedccbc....',
      '...cddddcccbb...',
      '...bccccbbbba...',
      '....bcccbbba....',
      '.....bccbba.....',
      '......bbaa......',
      '.......aa.......',
      '................',
      '................',
      '................',
    ],
  },
  bp_empty: {
    legend: { a: '#141927', b: '#1e2536', c: '#2a3349', d: '#3b4762', e: '#55667f' },
    map: [
      '................',
      '................',
      '................',
      '.......ee.......',
      '......eddd......',
      '.....edbbcd.....',
      '....edbaabcd....',
      '...edbaaaabcd...',
      '...dcbaaaabcc...',
      '....dcbaabcc....',
      '.....dcbbcc.....',
      '......dccc......',
      '.......cc.......',
      '................',
      '................',
      '................',
    ],
  },
  bp_boost: {
    legend: { a: RAMPS.amber[2], b: RAMPS.amber[3], c: RAMPS.amber[4], d: RAMPS.amber[5], e: RAMPS.amber[6], w: W },
    map: [
      '................',
      '.......e........',
      '..d....w....d...',
      '...e...dd...e...',
      '......dwwc......',
      '.....dwwwwc.....',
      '....dwwwwwcc....',
      '.ewcdwwwwcccbwe.',
      '...cddddcccbb...',
      '....cdddccbb....',
      '...e.cddcbb.e...',
      '..d...cbba...d..',
      '.......ba.......',
      '.......w........',
      '.......e........',
      '................',
    ],
  },
  medigel: {
    legend: { a: '#124430', b: '#1b6f47', c: '#28a463', d: '#4fd889', e: '#a9f7c4', s: RAMPS.steel[3], t: RAMPS.steel[5], u: RAMPS.steel[6], w: W },
    map: [
      '................',
      '.............uu.',
      '............uts.',
      '...........tts..',
      '..........eus...',
      '.........edtu...',
      '........edcbs...',
      '.......edcbs....',
      '......edcbs.....',
      '.....edcbs......',
      '....edcbs.......',
      '...udcbs........',
      '...tusb.........',
      '..s.ss..........',
      '.s..............',
      '................',
    ],
  },
  ether: {
    legend: { a: '#0d4f78', b: '#1479b0', c: '#29a9e0', d: '#6fd6ff', e: '#c8f3ff', s: RAMPS.steel[3], t: RAMPS.steel[5], u: RAMPS.steel[6], w: W },
    map: [
      '................',
      '......uttt......',
      '......tsss......',
      '....uuttttss....',
      '....tssssssa....',
      '....teddccba....',
      '....tedcccba....',
      '....tdccwcba....',
      '....tdcwwcba....',
      '....tdccwcba....',
      '....tdcccbba....',
      '....tdccbbba....',
      '....uuttttss....',
      '.....ssssss.....',
      '................',
      '................',
    ],
  },
  revive: {
    legend: { a: '#5c1220', b: '#9a1b30', c: '#d82d45', d: '#ff5d6c', e: '#ffa3aa', s: RAMPS.white[0], t: RAMPS.white[1], u: RAMPS.white[2], v: RAMPS.white[3], w: W },
    map: [
      '................',
      '......vvvv......',
      '.....vwwwvu.....',
      '....vwwwvvut....',
      '....vwwddvut....',
      '....vwwddvut....',
      '....wddddddt....',
      '....vddddddt....',
      '....vvvddvut....',
      '....vvvddvut....',
      '....vvvvvuut....',
      '....uuuuuutt....',
      '.....tttttt.....',
      '......ss.s......',
      '.......s........',
      '................',
    ],
  },
  keycard: {
    legend: { a: '#0d4f78', b: '#1479b0', c: '#29a9e0', d: '#6fd6ff', e: '#c8f3ff', ...GOLD, k: '#0b1424', w: W },
    map: [
      '................',
      '................',
      '................',
      '.eeeeeeeeeeeed..',
      '.eddddddddddcb..',
      '.edhhhgddkkdcb..',
      '.edhmhgddddcbb..',
      '.edgggmdkkkdcb..',
      '.eddddddddddcb..',
      '.edkkkkkkkkkcb..',
      '.ddcccccccccbb..',
      '.cbbbbbbbbbbba..',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  cursor: {
    legend: { a: RAMPS.amber[1], b: RAMPS.amber[2], c: RAMPS.amber[3], d: RAMPS.amber[4], e: RAMPS.amber[6], w: W },
    map: [
      '................',
      '................',
      '..ed............',
      '..eddd..........',
      '..edddcc........',
      '..eddddccbb.....',
      '..eddddcccbbb...',
      '..wddddcccbbbba.',
      '..dddddcccbbba..',
      '..dddccccbbb....',
      '..dccccbbb......',
      '..ccbbbb........',
      '..cbb...........',
      '..b.............',
      '................',
      '................',
    ],
  },
  attack: {
    legend: { a: RAMPS.amber[1], b: RAMPS.amber[2], c: RAMPS.amber[3], d: RAMPS.amber[4], e: RAMPS.amber[6], w: W, s: RAMPS.steel[3], t: RAMPS.steel[5], u: RAMPS.steel[6] },
    map: [
      '................',
      '.............w..',
      '............uwt.',
      '...........uut..',
      '..........uut...',
      '.........uut....',
      '........uut.....',
      '.......uut......',
      '..d...uut.......',
      '...d.uut........',
      '...cdut.........',
      '....cde.........',
      '....bccd........',
      '...bb...c.......',
      '..db............',
      '................',
    ],
  },
  skill: {
    legend: { a: '#0d4f78', b: '#1479b0', c: '#29a9e0', d: '#6fd6ff', e: '#c8f3ff', w: W },
    map: [
      '................',
      '................',
      '...d...c........',
      '..dwd..d........',
      '...d..cec.......',
      '......dwd.......',
      '.....cewec......',
      '.bcddewwwedddcb.',
      '.....cewec......',
      '......dwd.......',
      '......cec.......',
      '.......d....d...',
      '.......c...dwd..',
      '............d...',
      '................',
      '................',
    ],
  },
  item: {
    legend: { a: '#124430', b: '#1b6f47', c: '#28a463', d: '#4fd889', e: '#a9f7c4', s: RAMPS.white[1], t: RAMPS.white[2], u: RAMPS.white[3], v: RAMPS.white[4], w: W },
    map: [
      '................',
      '................',
      '..........vvu...',
      '.........vwwvu..',
      '........vwwvvut.',
      '.......vwvvvuut.',
      '......edvvvuuts.',
      '.....eddcvuuts..',
      '....eddccbuts...',
      '...edddcbbas....',
      '..eddccbba......',
      '..ddcccba.......',
      '..cdccbba.......',
      '...cbbaa........',
      '................',
      '................',
    ],
  },
  defend: {
    legend: { a: '#162453', b: '#213679', c: '#2e4ea6', d: '#4a72cf', e: '#7ea0e8', w: W, ...GOLD },
    map: [
      '................',
      '..eeeeeeeeeeed..',
      '..ewwddhhdddcb..',
      '..ewdddhhdddcb..',
      '..eddhhhhhhdcb..',
      '..eddhhhhhhdcb..',
      '..eddddhhdddcb..',
      '..eddddhhdddcb..',
      '..dddddhhddccb..',
      '...dddddddccb...',
      '...cdddddccbb...',
      '....cdddccbb....',
      '.....cddcbb.....',
      '......cbba......',
      '.......aa.......',
      '................',
    ],
  },
  flee: {
    legend: { a: '#0d4f78', b: '#1479b0', c: '#29a9e0', d: '#6fd6ff', e: '#c8f3ff', w: W, s: RAMPS.steel[4], t: RAMPS.steel[5] },
    map: [
      '................',
      '................',
      '................',
      '....ed..ed......',
      '.....ed..ed.....',
      '.tt...ed..ed....',
      '.......ed..ed...',
      '.sss....dd..dd..',
      '.......dc..dc...',
      '.tt...dc..dc....',
      '.....dc..dc.....',
      '....dc..dc......',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  save: {
    legend: { a: '#08304a', b: '#0d4f78', c: '#1479b0', d: '#29a9e0', e: '#6fd6ff', s: RAMPS.steel[4], t: RAMPS.steel[5], u: RAMPS.steel[6], v: RAMPS.white[3], w: W },
    map: [
      '................',
      '.eeeeeeeeeeee...',
      '.edtuuuuuuttd...',
      '.edtssssssstdc..',
      '.edtssssbsstdc..',
      '.edtssssbsstdc..',
      '.edtssssssstdc..',
      '.eddddddddddddc.',
      '.edvvvvvvvvvvdc.',
      '.edvwwwwwwwwvdc.',
      '.edvccccccccvdc.',
      '.edvwwwwwwwwvdc.',
      '.edvvvvvvvvvvdc.',
      '.dccccccccccccb.',
      '..bbbbbbbbbbbb..',
      '................',
    ],
  },
  talk: {
    legend: { a: '#3b4762', b: '#7d90a8', c: '#b2c2d4', d: '#e1e9f2', e: W, k: '#1e2536' },
    map: [
      '................',
      '................',
      '...eeeeeeeeee...',
      '..edddddddddcb..',
      '.edddddddddddcb.',
      '.eddddddddddddb.',
      '.edkkddkkddkkdb.',
      '.edkkddkkddkkdb.',
      '.edddddddddddcb.',
      '.cdddddddddddcb.',
      '..ccdddddddccb..',
      '...bbbdddcbbb...',
      '......bdcb......',
      '.......cb.......',
      '.......b........',
      '................',
    ],
  },
  inspect: {
    legend: { a: '#08304a', b: '#1479b0', c: '#29a9e0', d: '#6fd6ff', e: '#c8f3ff', w: W, s: RAMPS.steel[2], t: RAMPS.steel[4], u: RAMPS.steel[6], k: '#3a2a26', m: '#6e4a2a' },
    map: [
      '................',
      '....uuuuu.......',
      '...ueeddduu.....',
      '..uewwddccbu....',
      '..uewddcccbu....',
      '.uedddcccbbtu...',
      '.uddccccbbbtu...',
      '.udccccbbbbtu...',
      '.udcccbbbaat....',
      '..ttcbbbaatt....',
      '..uttbaaatt.....',
      '....ttttttmm....',
      '..........mkm...',
      '...........mkm..',
      '............mk..',
      '................',
    ],
  },
};

function paintIcon(name) {
  const def = DEFS[name] || DEFS.unknown;
  const p = new Painter(16, 16);
  def.map.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch && ch !== '.') p.set(x, y, def.legend[ch] || DARK);
    }
  });
  p.outline(OUTLINE);
  return p;
}

const painters = new Map();
const canvases = new Map();
const urls = new Map();

function painter(name) {
  let p = painters.get(name);
  if (!p) {
    p = paintIcon(name);
    painters.set(name, p);
  }
  return p;
}

/**
 * 16x16 icon scaled by an integer factor (nearest-neighbour). Cached: the same canvas is returned
 * for the same (name, scale), so use it as a drawImage / texture source; for DOM use iconURL().
 * Unknown names fall back to the 'unknown' icon.
 */
export function iconCanvas(name, scale = 1) {
  const key = `${name}@${scale}`;
  let c = canvases.get(key);
  if (!c) {
    c = painter(name).toCanvas(Math.max(1, Math.round(scale)));
    canvases.set(key, c);
  }
  return c;
}

/** data: URL of the icon at the given integer scale (cached), for <img> and CSS backgrounds. */
export function iconURL(name, scale = 2) {
  const key = `${name}@${scale}`;
  let u = urls.get(key);
  if (!u) {
    u = painter(name).toDataURL(Math.max(1, Math.round(scale)));
    urls.set(key, u);
  }
  return u;
}

/** Glow colour that goes with an icon (for UI accents next to damage-type icons). */
export function iconColor(name) {
  return DAMAGE_COLORS[name] || (name.startsWith('bp') || name === 'cursor' ? GLOW.amber : name === 'shield_broken' ? GLOW.magenta : GLOW.cyan);
}
