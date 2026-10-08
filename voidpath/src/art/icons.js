// UI icons for VOIDPATH: 16x16 pixel icons with a 1 px dark outline, readable at 1x and crisp at
// 2-3x (nearest-neighbour). Damage types are colour-coded with palette DAMAGE_COLORS; the rest use
// the UI accents (amber BP, cyan tech, magenta break).
//
// Most icons are authored as pixel maps (16 rows x 16 chars, '.' = empty) with a per-icon legend;
// geometric ones are painted with Painter primitives; item variants (Medi-Gel+, element charges)
// derive from a base icon. The builder adds the outline around the silhouette.
// Sigils (`warden_sigil`) are 40x40, the size of a dialog portrait, so iconURL(sigil, 3) fills the
// 120 px portrait frame exactly.
//
//   ICON_NAMES                 every name below (boot warms them)
//   iconCanvas(name, scale)    cached canvas (drawImage / textures)
//   iconURL(name, scale)       cached data: URL (DOM)
//   iconColor(name)            accent colour that goes with an icon
//   isSigil(name)              true for the 40 px sigils

import { Painter, shade, mix } from './painter.js';
import { DAMAGE_COLORS, GLOW, OUTLINE, RAMPS } from './palette.js';

const BASE_ICONS = [
  'blade', 'lance', 'rifle', 'gauntlet', 'thermal', 'cryo', 'volt', 'photon', 'void',
  'unknown', 'shield', 'shield_broken', 'bp', 'bp_empty', 'bp_boost',
  'medigel', 'ether', 'revive', 'keycard', 'cursor',
  'attack', 'skill', 'item', 'defend', 'flee', 'save', 'talk', 'inspect',
];
// full-game UI icons (TECH_PLAN 8.7) and the item ids of 5.7 that default their icon to the id
const UI_ICONS = [
  'weapon', 'armor', 'accessory', 'credits', 'journal', 'map', 'star', 'shard', 'lock', 'sleep', 'jam',
  'marked', 'ultimate', 'shop', 'travel', 'gear', 'charge', 'voice',
];
const ITEM_ICONS = [
  'medigel_plus', 'medigel_max', 'nanomist', 'ether_plus', 'revive_plus', 'stim',
  'thermal_charge', 'cryo_charge', 'volt_charge', 'photon_charge', 'void_charge', 'lattice_coil', 'command_key',
];
const SIGIL_ICONS = ['warden_sigil'];

export const ICON_NAMES = [...BASE_ICONS, ...UI_ICONS, ...ITEM_ICONS, ...SIGIL_ICONS];

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

// ------------------------------------------------------------------ painted icons (geometric shapes)

const T = (c) => tones(c);
const STEELR = RAMPS.steel;
const GOLDR = RAMPS.gold;
const AMB = RAMPS.amber;

/** 1-px highlight on the top and left edge of a filled rect, shadow on the bottom and right. */
function bevelRect(p, x, y, w, h, t) {
  p.rect(x, y, w, h, t.c);
  p.hline(x, x + w - 1, y, t.e);
  p.vline(x, y, y + h - 1, t.d);
  p.hline(x + 1, x + w - 1, y + h - 1, t.a);
  p.vline(x + w - 1, y + 1, y + h - 1, t.b);
}

const PAINTED = {
  weapon(p) {                                      // upright sword: steel blade, gold guard
    const b = T('#cfe6ff');
    p.px(7, 1, W);
    for (let y = 2; y <= 9; y++) { p.px(6, y, b.e); p.px(7, y, b.d); p.px(8, y, b.b); }
    p.vline(7, 3, 8, b.c);
    p.hline(3, 11, 10, GOLDR[3]); p.hline(4, 10, 10, GOLDR[4]); p.px(3, 11, GOLDR[2]); p.px(11, 11, GOLDR[2]);
    p.hline(4, 10, 11, GOLDR[2]);
    p.rect(6, 12, 3, 2, '#4a2e1c'); p.px(7, 12, '#7a4c2c'); p.px(6, 13, '#7a4c2c');
    p.hline(6, 8, 14, GOLDR[3]); p.px(6, 14, GOLDR[4]);
  },
  armor(p) {                                       // cuirass with a cyan core
    const t = T('#8fb4e8');
    p.poly([[1, 3], [5, 2], [11, 2], [15, 3], [15, 6], [13, 7], [13, 13], [10, 15], [6, 15], [3, 13], [3, 7], [1, 6]], t.c);
    p.poly([[1, 3], [5, 2], [6, 3], [3, 7], [1, 6]], t.d);
    p.poly([[15, 3], [11, 2], [10, 3], [13, 7], [15, 6]], t.b);
    p.hline(5, 10, 2, t.e); p.hline(2, 4, 3, t.e);
    p.hline(6, 9, 3, '#1b2133'); p.hline(6, 9, 4, t.a);            // collar
    p.vline(4, 7, 12, t.d); p.vline(12, 7, 12, t.b);
    p.hline(4, 12, 11, t.b); p.hline(5, 11, 12, t.d);              // belt plate
    p.rect(7, 6, 2, 3, '#29a9e0'); p.px(7, 6, '#c8f3ff'); p.px(8, 8, '#1479b0');
    p.hline(6, 9, 14, t.a);
  },
  accessory(p) {                                   // pendant: gold chain, teal gem
    for (const [x, y] of [[4, 1], [4, 2], [5, 3], [5, 4], [6, 5], [11, 1], [11, 2], [10, 3], [10, 4], [9, 5]]) p.px(x, y, GOLDR[3]);
    p.px(4, 1, GOLDR[4]); p.px(11, 1, GOLDR[2]);
    p.ellipse(7.5, 10, 4, 4.5, GOLDR[2]);
    p.ellipse(7.5, 10, 3, 3.5, '#16a0a8');
    p.ellipse(7, 9.5, 2, 2.2, '#3fd6d2');
    p.px(6, 8, '#e6fffb'); p.px(7, 8, '#9df8ee'); p.px(9, 12, '#0b4350'); p.px(8, 12, '#0f6a78');
    p.hline(6, 9, 6, GOLDR[3]); p.px(6, 6, GOLDR[4]);
  },
  credits(p) {                                     // gold coin with an engraved C
    p.circle(7.5, 7.5, 6.6, GOLDR[2]);
    p.circle(7.2, 7.2, 5.9, GOLDR[3]);
    p.ring(7.5, 7.5, 6.6, GOLDR[1]);
    for (const [x, y] of [[3, 4], [4, 3], [5, 2], [2, 6], [2, 5]]) p.px(x, y, GOLDR[4]);
    p.px(4, 4, GOLDR[5]);
    for (const [x, y] of [[7, 4], [8, 4], [9, 4], [6, 5], [5, 6], [5, 7], [5, 8], [6, 9], [7, 10], [8, 10], [9, 10]]) p.px(x, y, GOLDR[1]);
    for (const [x, y] of [[7, 5], [8, 5], [6, 6], [6, 7], [6, 8], [7, 9], [8, 9]]) p.px(x, y, GOLDR[4]);
    p.px(10, 5, GOLDR[1]); p.px(10, 9, GOLDR[1]);
  },
  journal(p) {                                     // bound log book with an amber ribbon
    const c = T('#4a72cf');
    p.rect(3, 1, 11, 14, c.c);
    p.hline(3, 13, 1, c.e); p.vline(3, 1, 14, c.d); p.vline(4, 1, 14, c.a);
    p.vline(13, 2, 14, c.b); p.hline(4, 13, 14, c.a);
    p.rect(6, 4, 5, 3, c.b); p.hline(6, 10, 4, c.a); p.px(7, 5, '#c8f3ff'); p.px(8, 5, '#6fd6ff'); p.px(9, 5, '#6fd6ff');
    p.hline(6, 10, 9, c.d); p.hline(6, 9, 11, c.d);
    p.rect(14, 2, 1, 12, RAMPS.white[3]); p.px(14, 13, RAMPS.white[1]);
    p.rect(10, 12, 2, 3, AMB[4]); p.px(10, 15, AMB[3]); p.px(11, 15, AMB[2]);
  },
  map(p) {                                         // folded chart, route and marker
    const a = '#d9cfa8', b = '#b8ab7e', c = '#8f8259';
    p.poly([[1, 3], [5, 1], [10, 3], [15, 1], [15, 13], [10, 15], [5, 13], [1, 15]], a);
    p.poly([[5, 1], [10, 3], [10, 15], [5, 13]], b);
    p.vline(5, 1, 13, c); p.vline(10, 3, 15, c);
    for (const [x, y] of [[2, 12], [3, 11], [4, 10], [6, 9], [7, 8], [8, 8], [9, 7], [11, 6]]) p.px(x, y, '#2e7fd0');
    p.rect(11, 3, 3, 3, '#ff5d6c'); p.px(11, 3, '#ffa3aa'); p.px(12, 6, '#d82d45'); p.px(12, 7, '#9a1b30');
  },
  star(p) {
    p.poly([[7.5, 0.5], [9.6, 5.5], [15, 5.8], [10.8, 9.2], [12.3, 14.6], [7.5, 11.6], [2.7, 14.6], [4.2, 9.2], [0, 5.8], [5.4, 5.5]], GOLDR[3]);
    p.poly([[7.5, 0.5], [9.6, 5.5], [7.5, 8], [5.4, 5.5]], GOLDR[4]);
    p.poly([[7.5, 11.6], [12.3, 14.6], [10.8, 9.2]], GOLDR[2]);
    p.px(7, 3, GOLDR[5]); p.px(7, 4, GOLDR[5]);
  },
  shard(p) {                                       // memory crystal: cyan to violet
    p.poly([[7.5, 0], [12.5, 6], [8.5, 15.5], [6.5, 15.5], [2.5, 6]], '#6fd6ff');
    p.poly([[7.5, 0], [7.5, 15.5], [6.5, 15.5], [2.5, 6]], '#c8f3ff');
    p.poly([[7.5, 0], [12.5, 6], [8.5, 15.5], [7.5, 15.5]], '#8e6ee0');
    p.poly([[2.5, 6], [12.5, 6], [7.5, 8]], '#29a9e0');
    p.vline(7, 2, 5, W); p.px(10, 8, '#c3b1f7'); p.px(8, 13, '#422c7d');
  },
  lock(p) {                                        // padlock, amber keyhole
    const t = T('#9fb2cc');
    p.ring(7.5, 5.5, 4, t.d, 2);
    p.clear(0, 6, 16, 3);
    p.rect(3, 5, 2, 3, t.d); p.rect(11, 5, 2, 3, t.b);
    p.px(4, 2, t.e); p.px(5, 1, t.e);
    bevelRect(p, 2, 7, 12, 8, T('#c99a2a'));
    p.rect(7, 9, 2, 2, '#2f2208'); p.px(7, 11, '#2f2208'); p.px(8, 11, '#2f2208'); p.px(7, 12, '#2f2208');
  },
  sleep(p) {                                       // Zz
    const c = '#c3b1f7', d = '#8e6ee0', e = '#f0eaff';
    p.hline(1, 8, 4, e); p.hline(1, 8, 5, c);
    for (let k = 0; k < 5; k++) { p.px(7 - k, 6 + k, c); p.px(8 - k, 6 + k, d); }
    p.hline(1, 8, 11, c); p.hline(1, 8, 12, d);
    p.hline(10, 14, 6, e);
    for (let k = 0; k < 3; k++) p.px(13 - k, 7 + k, c);
    p.hline(10, 14, 10, d);
    p.px(13, 1, c); p.px(14, 2, d); p.px(12, 2, d); p.px(13, 3, d);
  },
  jam(p) {                                         // cog with a magenta fault crack
    const t = T('#9fb2cc');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      p.rect(Math.round(7 + Math.cos(a) * 6), Math.round(7 + Math.sin(a) * 6), 2, 2, t.c);
    }
    p.circle(7.5, 7.5, 5.2, t.c);
    p.circle(7, 7, 4.3, t.d);
    p.circle(7.5, 7.5, 2, '#141927');
    for (const [x, y] of [[11, 1], [10, 3], [11, 4], [9, 6], [10, 7], [8, 9], [9, 10], [7, 12], [8, 13]]) p.set(x, y, '#ff4fc0');
    p.set(10, 2, '#ffb0dc'); p.set(9, 5, '#ffb0dc');
  },
  marked(p) {                                      // crimson target reticle
    const r = '#ff5d6c', d = '#9a1b30';
    p.ring(7.5, 7.5, 5.5, r, 2);
    p.clear(7, 0, 2, 16); p.clear(0, 7, 16, 2);
    p.rect(7, 0, 2, 5, r); p.rect(7, 11, 2, 5, d); p.rect(0, 7, 5, 2, r); p.rect(11, 7, 5, 2, d);
    p.rect(7, 7, 2, 2, '#ffd0d4');
  },
  ultimate(p) {                                    // radiant burst: gold rays, white core
    const rays = [[7.5, 0], [10, 5], [15, 7.5], [10, 10], [7.5, 15], [5, 10], [0, 7.5], [5, 5]];
    p.poly(rays, AMB[4]);
    p.poly([[2, 2], [7.5, 5], [13, 2], [10, 7.5], [13, 13], [7.5, 10], [2, 13], [5, 7.5]], AMB[3]);
    p.poly(rays, AMB[4]);
    p.circle(7.5, 7.5, 3.2, AMB[5]);
    p.circle(7.5, 7.5, 1.8, W);
    p.px(7, 1, AMB[6]); p.px(1, 7, AMB[6]);
  },
  shop(p) {                                        // salvage satchel with a credits tag
    const t = T('#c48a4a');
    p.ring(7.5, 4, 3, '#6e4a2a', 1); p.clear(3, 4, 10, 2);
    p.poly([[2, 5], [13, 5], [14, 14], [1, 14]], t.c);
    p.hline(2, 13, 5, t.e); p.vline(2, 6, 13, t.d); p.hline(2, 13, 14, t.a); p.vline(13, 6, 13, t.b);
    p.hline(3, 12, 7, t.b);
    p.circle(7.5, 10.5, 2.4, GOLDR[3]); p.px(6, 9, GOLDR[5]); p.px(8, 11, GOLDR[1]); p.px(7, 10, GOLDR[2]);
  },
  travel(p) {                                      // the Moth: skiff with a cyan engine trail
    const t = T('#b8c0d0');
    p.poly([[3, 6], [12, 6], [15, 8], [12, 10], [3, 10]], t.c);
    p.hline(3, 12, 6, t.e); p.hline(4, 12, 10, t.a);
    p.poly([[5, 6], [8, 2], [10, 2], [9, 6]], t.d); p.poly([[5, 10], [8, 14], [10, 14], [9, 10]], t.b);
    p.rect(11, 7, 2, 2, '#6fd6ff'); p.px(11, 7, '#c8f3ff');
    p.rect(1, 7, 2, 2, '#29a9e0'); p.px(0, 7, '#1479b0'); p.px(0, 8, '#6fd6ff');
    p.px(3, 8, '#7ff4ff');
  },
  gear(p) {                                        // cog: equipment and fabricators
    const t = T('#7d90a8');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      p.rect(Math.round(7 + Math.cos(a) * 6), Math.round(7 + Math.sin(a) * 6), 2, 2, t.c);
    }
    p.circle(7.5, 7.5, 5.2, t.c);
    p.circle(7, 7, 4.2, t.d);
    p.circle(7.5, 7.5, 2.2, '#141927');
    p.px(7, 7, AMB[4]); p.px(4, 4, t.e); p.px(5, 3, t.e);
  },
  charge(p) {                                      // telegraph: energy gathering into a core
    const c = '#ff8a4a', d = '#d82d45';
    p.ring(7.5, 7.5, 6.5, d, 1);
    for (const [x, y] of [[7, 1], [8, 1], [1, 7], [1, 8], [14, 7], [14, 8], [7, 14], [8, 14]]) p.px(x, y, '#ffa3aa');
    for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12], [4, 4], [11, 4], [4, 11], [11, 11]]) p.px(x, y, c);
    p.circle(7.5, 7.5, 3, c);
    p.circle(7.5, 7.5, 1.8, '#ffd98a');
    p.rect(7, 7, 2, 2, W);
  },
  voice(p) {                                       // off-screen voice: speaker grille and waves
    const t = T('#9fb2cc');
    p.rect(1, 5, 4, 6, t.c); p.poly([[4, 5], [8, 1.5], [8, 14.5], [4, 11]], t.d);
    p.hline(1, 4, 5, t.e); p.vline(8, 2, 14, t.b);
    for (const [x, y] of [[10, 5], [11, 6], [11, 7], [11, 8], [11, 9], [10, 10]]) p.px(x, y, '#6fd6ff');
    for (const [x, y] of [[12, 2], [13, 3], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [13, 12], [12, 13]]) p.px(x, y, '#29a9e0');
  },
  nanomist(p) {                                    // spray canister with a green mist
    const t = T('#4fd889');
    bevelRect(p, 4, 6, 6, 9, t);
    p.rect(5, 3, 4, 3, STEELR[5]); p.hline(5, 8, 3, STEELR[6]); p.px(9, 4, STEELR[4]);
    p.rect(5, 9, 4, 3, '#e1e9f2'); p.hline(5, 8, 10, '#28a463');
    for (const [x, y] of [[11, 2], [13, 1], [12, 4], [14, 3], [11, 6], [14, 6], [13, 8]]) p.px(x, y, '#a9f7c4');
    p.px(10, 4, '#4fd889');
  },
  stim(p) {                                        // auto-injector: amber body, green dose window
    const t = T('#ffb54a');
    p.poly([[11, 1], [14, 4], [6, 12], [3, 9]], t.c);
    p.line(11, 1, 3, 9, t.e); p.line(14, 4, 6, 12, t.a);
    p.poly([[9, 5], [10, 6], [7, 9], [6, 8]], '#4fd889'); p.px(8, 6, '#a9f7c4');
    p.line(4, 11, 1, 14, STEELR[6]); p.px(0, 15, W);
    p.rect(12, 1, 2, 2, STEELR[5]);
  },
  lattice_coil(p) {                                // jump-drive coil: gold windings on a cyan core
    p.rect(6, 1, 4, 14, '#1479b0'); p.vline(7, 1, 14, '#6fd6ff'); p.vline(6, 1, 14, '#c8f3ff');
    for (let y = 2; y <= 13; y += 2) {
      p.hline(3, 12, y, GOLDR[3]); p.px(3, y, GOLDR[4]); p.px(12, y, GOLDR[2]);
      p.hline(4, 11, y + 1, GOLDR[1]);
    }
    p.rect(5, 0, 6, 1, STEELR[5]); p.rect(5, 15, 6, 1, STEELR[3]);
  },
};

/** Element charge: a capsule cell tinted with the damage colour, with a bright band. */
function chargeCell(color) {
  return (p) => {
    const t = T(color);
    p.rect(5, 2, 6, 12, t.c);
    p.rect(6, 1, 4, 14, t.c);
    p.vline(5, 3, 12, t.e); p.vline(6, 2, 13, t.d); p.vline(10, 3, 12, t.b); p.vline(9, 2, 13, t.c);
    p.hline(6, 9, 1, t.e); p.hline(6, 9, 14, t.a);
    p.rect(4, 6, 8, 4, STEELR[4]); p.hline(4, 11, 6, STEELR[6]); p.hline(4, 11, 9, STEELR[2]);
    p.rect(6, 7, 4, 2, t.e); p.px(7, 7, W);
  };
}
for (const el of ['thermal', 'cryo', 'volt', 'photon', 'void']) PAINTED[`${el}_charge`] = chargeCell(DAMAGE_COLORS[el]);

// Upgraded consumables: the base icon plus a corner badge ('+' or a double chevron for max).
const BADGED = {
  medigel_plus: ['medigel', 'plus'], medigel_max: ['medigel', 'max'], ether_plus: ['ether', 'plus'], revive_plus: ['revive', 'plus'],
};

function badge(p, kind) {
  p.rect(9, 9, 7, 7, OUTLINE);
  const g = GOLDR[4], h = GOLDR[5];
  if (kind === 'plus') {
    p.hline(10, 14, 12, g); p.vline(12, 10, 14, g); p.px(12, 10, h); p.px(10, 12, h);
  } else {
    for (const y of [10, 13]) { p.px(10, y + 1, g); p.px(11, y, h); p.px(12, y - 1, h); p.px(13, y, h); p.px(14, y + 1, g); }
  }
}

// Recolours of a map icon: the Command Key is the Bridge Keycard in Security crimson.
const RECOLOR = {
  command_key: ['keycard', { a: '#5c1220', b: '#9a1b30', c: '#d82d45', d: '#ff5d6c', e: '#ffa3aa' }],
};

// ------------------------------------------------------------------ sigils (40x40)

const SIGILS = {
  warden_sigil(p) {                                // WARDEN: a gold iris, diaphragm blades around a lit pupil
    const G = GOLDR, cx = 19.5, cy = 19.5;
    p.ring(cx, cy, 18.4, G[2], 2);
    p.ring(cx, cy, 16, G[1], 1);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const r0 = k % 2 ? 16.6 : 15.8;
      p.px(Math.floor(cx + Math.cos(a) * r0), Math.floor(cy + Math.sin(a) * r0), k % 2 ? G[3] : G[4]);
    }
    for (let k = 0; k < 8; k++) {                  // eight overlapping diaphragm blades
      const a0 = (k / 8) * Math.PI * 2, a1 = a0 + Math.PI / 4 + 0.32;
      const pt = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      p.poly([pt(a0, 14.6), pt(a1, 14.6), pt(a1 - 0.2, 6.8), pt(a0 + 0.55, 5.6)], k % 2 ? G[3] : G[2]);
      p.line(...pt(a0, 14.2).map(Math.round), ...pt(a0 + 0.55, 6).map(Math.round), G[4]);
    }
    p.circle(cx, cy, 6.2, '#1a1206');
    p.ring(cx, cy, 6.2, G[1], 1);
    p.circle(cx, cy, 3.6, '#ffbf4d');
    p.circle(cx - 0.4, cy - 0.4, 2.2, '#fff0a8');
    p.rect(18, 18, 2, 2, W);
    for (const [x, y] of [[19, 0], [20, 0], [19, 39], [20, 39], [0, 19], [0, 20], [39, 19], [39, 20]]) p.px(x, y, G[4]);
  },
};

export const isSigil = (name) => name in SIGILS;

function paintMap(def) {
  const p = new Painter(16, 16);
  def.map.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch && ch !== '.') p.set(x, y, def.legend[ch] || DARK);
    }
  });
  return p;
}

function paintIcon(name) {
  if (SIGILS[name]) {
    const p = new Painter(40, 40);
    SIGILS[name](p);
    return p;
  }
  let p;
  if (PAINTED[name]) { p = new Painter(16, 16); PAINTED[name](p); }
  else if (BADGED[name]) { p = paintMap(DEFS[BADGED[name][0]]); badge(p, BADGED[name][1]); }
  else if (RECOLOR[name]) { const [base, legend] = RECOLOR[name]; p = paintMap({ ...DEFS[base], legend: { ...DEFS[base].legend, ...legend } }); }
  else p = paintMap(DEFS[name] || DEFS.unknown);
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
 * Icon scaled by an integer factor (nearest-neighbour): 16 px per scale step, sigils 40 px.
 * Cached: the same canvas is returned for the same (name, scale), so use it as a drawImage /
 * texture source; for DOM use iconURL(). Unknown names fall back to the 'unknown' icon.
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

const ICON_ACCENT = {
  credits: GLOW.amber, star: GLOW.amber, ultimate: GLOW.amber, warden_sigil: GLOW.amber, lock: '#9fb2cc',
  sleep: GLOW.violet, jam: GLOW.magenta, marked: GLOW.red, charge: GLOW.red, shard: GLOW.violet,
};

/** Glow colour that goes with an icon (for UI accents next to damage-type icons). */
export function iconColor(name) {
  if (DAMAGE_COLORS[name]) return DAMAGE_COLORS[name];
  if (ICON_ACCENT[name]) return ICON_ACCENT[name];
  return name.startsWith('bp') || name === 'cursor' ? GLOW.amber : name === 'shield_broken' ? GLOW.magenta : GLOW.cyan;
}
