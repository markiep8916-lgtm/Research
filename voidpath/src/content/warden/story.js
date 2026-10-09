// warden: story tables (PURE, TECH_PLAN 2.4). The Warden fight's lines live in data.js (encounter
// intro/outro, boss-script `say`); the scenes around it (the approach and the resolution) are
// dreams.crown's (C8). This file registers the CHOIR speaker (WRITING 2.8), preloads the boss and its
// arena onto the Heart, where dreams.crown starts the battle (the travel prewarm of `heart` paints
// both forms, the crown's textures and the portraits the boss script speaks with behind the Moth
// flight, so neither the transform nor a mid-battle line paints anything, 11.5), and defines
// the `fin.warden` jump: the squad as a first-timer meets the Warden (level 30, the finale kit worn,
// the four dream keepsakes still in the bag), for `debug.startBattle(enc, { jump: 'fin.warden' })`.

export default {
  speakers: {
    CHOIR: { sigil: 'warden_sigil', accent: '#ffe9b0', sfx: 'choir' },
  },
  preload: {
    heart: [
      'enemy:warden_lock', 'enemy:warden_unbound',
      'tex:wd_crown_floor', 'tex:wd_crown_floor_b', 'tex:wd_crown_floor_c', 'tex:wd_crown_rim',
      'tex:wd_crown_under', 'tex:wd_pod_wall', 'tex:wd_ray',
      'portrait:voss', 'portrait:theo', 'portrait:holo', 'portrait:kade:sad', 'portrait:sera:determined',
    ],
  },
  jumps: {
    'fin.warden': {
      chapter: 'finale', level: 30,
      flags: ['story:dream_kade', 'story:dream_nyx', 'story:dream_orion', 'story:dream_sera'],
      items: { eq_x_keepsake_kade: 1, eq_x_keepsake_nyx: 1, eq_x_keepsake_orion: 1, eq_x_keepsake_sera: 1 },
    },
  },
  doneFlags: { finale: ['tut:warden_shift'] },
};
