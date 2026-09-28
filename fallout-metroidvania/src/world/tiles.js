// Tile ids, materials, glyph legend. DOM-free (also loaded by Node tools).
(function () {
'use strict';
const CD = window.CD;

CD.TILE = { AIR: 0, SOLID: 1, PLAT: 2, SPIKE: 3, SPIKE_D: 4, BREAK: 5, LADDER: 6, WATER: 7, DOOR: 8, SOLID_NC: 9 };
CD.MATS = ['none', 'vault', 'concrete', 'brick', 'rock', 'scrap', 'rust', 'soil', 'asphalt', 'lino', 'wood', 'lab', 'redrock', 'subway'];
CD.MAT_ID = {}; CD.MATS.forEach((m, i) => (CD.MAT_ID[m] = i));
CD.BGS = ['none', 'bw_vault', 'bw_concrete', 'bw_brick', 'bw_rock', 'bw_scrap', 'bw_rust', 'bw_lab', 'bw_wood', 'bw_diner', 'bw_tunnel', 'bw_redrock'];
CD.BG_ID = {}; CD.BGS.forEach((m, i) => (CD.BG_ID[m] = i));

// Terrain glyphs -> [tile, material name | '#' (region default)]
CD.GLYPH_TERRAIN = {
  '#': [CD.TILE.SOLID, '#'],
  'V': [CD.TILE.SOLID, 'vault'], 'C': [CD.TILE.SOLID, 'concrete'], 'B': [CD.TILE.SOLID, 'brick'], 'R': [CD.TILE.SOLID, 'rock'],
  'S': [CD.TILE.SOLID, 'scrap'], 'M': [CD.TILE.SOLID, 'rust'], 'G': [CD.TILE.SOLID, 'soil'], 'A': [CD.TILE.SOLID, 'asphalt'],
  'L': [CD.TILE.SOLID, 'lino'], 'W': [CD.TILE.SOLID, 'wood'], 'Y': [CD.TILE.SOLID, 'lab'], 'E': [CD.TILE.SOLID, 'redrock'], 'U': [CD.TILE.SOLID, 'subway'],
  '=': [CD.TILE.PLAT, null],
  '^': [CD.TILE.SPIKE, null],
  'v': [CD.TILE.SPIKE_D, null],
  'X': [CD.TILE.BREAK, '#'],
  'H': [CD.TILE.LADDER, null],
  '~': [CD.TILE.WATER, null],
};

// Entity glyphs -> spawn type (cell becomes air)
CD.GLYPH_ENTITY = {
  '@': 'start', 'Z': 'bed', 'T': 'terminal', 'N': 'nuka', 'F': 'firebarrel', 'K': 'crate', 'Q': 'locker', 'O': 'lamp', '*': 'fluoro',
  'r': 'radroach', 'f': 'bloatfly', 'm': 'molerat', 'g': 'ghoul', 'a': 'raider', 'y': 'brute', 'u': 'mutant', 'p': 'protectron',
  'o': 'eyebot', 'q': 'turret', 's': 'scorpion', 'c': 'mirelurk', 'h': 'handy', 'z': 'glowing', 'l': 'walllamp', 'j': 'raider_rifle', 'x': 'raider_smg',
  '$': 'caps', '+': 'stimpak', '%': 'ammo', '&': 'radaway', '!': 'junk',
};

CD.isSolidTile = (t) => t === CD.TILE.SOLID || t === CD.TILE.BREAK || t === CD.TILE.DOOR || t === CD.TILE.SOLID_NC;
CD.isHazardTile = (t) => t === CD.TILE.SPIKE || t === CD.TILE.SPIKE_D;

})();
