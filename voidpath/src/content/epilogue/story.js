// epilogue: scripts, dialogue and story tables (PURE, TECH_PLAN 2.4, 12.5). Early stub: the binding
// ids (epilogue.main, destination ione, objectives epi.wake / epi.shore, the halcyon flag trigger,
// recaps finale and epilogue, the credits); the vignettes come in M1.

const scripts = {
  'epilogue.main': async (cs) => {
    cs.flag('story:revival_authorized');
    await cs.goto('ione', 'shore');
    cs.flag('story:game_clear');
    cs.flag('unlock:ione');
    cs.objective('epi.shore');
    cs.save();
    await cs.ending();
  },
};

export default {
  scripts,
  scenes: [
    { id: 'epilogue.main', chapter: 'epilogue', order: 10, budget: { boxes: 20, sec: 150 } },
  ],
  objectives: {
    'epi.wake': { chapter: 'epilogue', text: 'Watch them wake.', hint: 'The Cryo Deck.', boltHint: 'They\'re waking up! Everyone who wants to!' },
    'epi.shore': { chapter: 'epilogue', text: 'Walk the shore of Ione.', hint: 'The Moth berth has a Starchart.', boltHint: 'Ione. We\'re here. Not mostly. All the way.', side: true },
  },
  destinations: [
    {
      id: 'ione', name: 'Ione', subtitle: 'Moon of Tethys', order: 6,
      desc: 'An ocean under ice. The Ringborn have seeded it for eighty years.',
      map: 'ione', spawn: 'shore', unlock: 'unlock:ione', visible: 'story:ione_revealed', lockedText: 'After the Heart',
    },
  ],
  extends: {
    halcyon: {
      triggers: [
        { id: 'epi.main', on: 'flag', when: 'chapter>=epilogue & !story:game_clear', once: true, script: 'epilogue.main' },
      ],
    },
  },
  recaps: {
    finale: 'They flew to the Heart and climbed. On the way WARDEN offered each of them what they wanted most, and each of them '
      + 'woke up. At the crown Nyx named it the Lock that sings ships to sleep. They fought it down, and HALCYON held her other '
      + 'half until the two were one. The Choir\'s light turned to morning.',
    epilogue: 'HALCYON asked every sleeper, and most chose to wake. Theo opened his eyes. Kade laid Voss\'s halberd before the wall '
      + 'of those who chose to keep dreaming. Ruse watched the Halcyon pass. Orion taught HALCYON to paint. Ringborn skiffs walked '
      + 'the ship to Ione, and four travelers stood on the ice at dawn.',
  },
  credits: [
    { head: 'VOIDPATH' },
    { text: 'A 2D-HD RPG' },
  ],
};
