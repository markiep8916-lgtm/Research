// Master palette for VOIDPATH. Ramps run dark -> light. Art modules should draw from these
// ramps (or derive with painter.shade/ramp) so characters, enemies and environments read as one world.
// Mood: cold steel-blue ship interiors lit by amber work lamps, cyan instrument glow and magenta warning light.

export const OUTLINE = '#0b0e17';       // universal sprite outline (near-black, blue-biased)
export const OUTLINE_SOFT = '#1b2133';  // interior lines / selective outline on light areas

export const RAMPS = {
  steel:   ['#141927', '#1e2536', '#2a3349', '#3b4762', '#55667f', '#7d90a8', '#b2c2d4', '#e1e9f2'],
  gunmetal:['#0f1219', '#191e29', '#242b3a', '#323b4e', '#475267', '#66738a'],
  navy:    ['#0d1530', '#162453', '#213679', '#2e4ea6', '#4a72cf', '#7ea0e8'],
  teal:    ['#06262e', '#0b4350', '#0f6a78', '#16a0a8', '#3fd6d2', '#9df8ee', '#e6fffb'],
  cyan:    ['#08304a', '#0d4f78', '#1479b0', '#29a9e0', '#6fd6ff', '#c8f3ff'],
  amber:   ['#3a1d0b', '#6f350f', '#b25a17', '#e8892a', '#ffb54a', '#ffd98a', '#fff3cf'],
  magenta: ['#2e0a2a', '#5c1450', '#95207a', '#d23596', '#ff63b6', '#ffb0dc'],
  crimson: ['#2c0910', '#5c1220', '#9a1b30', '#d82d45', '#ff5d6c', '#ffa3aa'],
  green:   ['#0a2418', '#124430', '#1b6f47', '#28a463', '#4fd889', '#a9f7c4'],
  purple:  ['#170f2c', '#2a1b4f', '#422c7d', '#6343b0', '#8e6ee0', '#c3b1f7'],
  gold:    ['#2f2208', '#5a4210', '#8f6a19', '#c99a2a', '#f0c94d', '#fff0a8'],
  white:   ['#5a6378', '#8a93a8', '#b8c0d0', '#dde3ee', '#f6f8fc'],
  // skin ramps (shadow -> highlight)
  skinLight:  ['#4e2c24', '#86503e', '#bf7a5f', '#e5a988', '#f7d4b8'],
  skinMedium: ['#3d2219', '#6e3f2c', '#a0603f', '#c98a62', '#e8b48d'],
  skinDeep:   ['#24140f', '#462619', '#6b3d26', '#91573a', '#b67a56'],
  // hair
  hairWhite:  ['#4c5267', '#7d859c', '#b5bdd0', '#e6ebf5'],
  hairTeal:   ['#08262c', '#0f4a52', '#1b7f84', '#3cbab5', '#8ce8de'],
  hairPink:   ['#4a1236', '#83245f', '#c2438f', '#ef7cbd', '#ffbfe0'],
  hairBlack:  ['#0b0c13', '#171a26', '#272c3d', '#3d4560'],
  hairCopper: ['#3a140a', '#6e2a12', '#a8461d', '#d9692e', '#f59a5a'],
};

// Glow colors used for emissive pixels (visors, LEDs, screens). Keep them saturated and bright:
// emissive pixels are what the bloom pass picks up.
export const GLOW = {
  cyan: '#7ff4ff',
  teal: '#4dffe0',
  amber: '#ffbf4d',
  magenta: '#ff4fc0',
  red: '#ff3b4e',
  green: '#5dff9c',
  white: '#f2fbff',
  violet: '#b98cff',
};

// Damage-type colors (UI icons, hit sparks, element bursts).
export const DAMAGE_COLORS = {
  blade: '#d8e6ff',
  lance: '#b9d0ff',
  rifle: '#ffd28a',
  gauntlet: '#ffb08a',
  thermal: '#ff7a2f',
  cryo: '#8fe6ff',
  volt: '#ffe94d',
  photon: '#fff6c8',
  void: '#b06bff',
};
