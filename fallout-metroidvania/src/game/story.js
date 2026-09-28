// Story events, holotapes, terminal texts and Overseer lines.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
const G = (CD.G = CD.G || {});
const S = (CD.story = { queue: [] });

// ---------------------------------------------------------------- events (from trigger zones, doors, terminals)
// spec: {say:[speaker,text,dur?], hint, banner, flag, sfx, music, obj (objective index), delayed:[...], unlock}
S.event = function (spec) {
  if (spec.flag) G.st.flags[spec.flag] = 1;
  if (spec.setObjective !== undefined) { G.st.objective = Math.max(G.st.objective || 0, spec.setObjective); }
  if (spec.hint) G.hint(spec.hint, spec.hintDur || 6);
  if (spec.say) { const a = Array.isArray(spec.say[0]) ? spec.say : [spec.say]; a.forEach((l, i) => S.later(i === 0 ? 0 : a.slice(0, i).reduce((s, x) => s + (x[2] || 2 + x[1].length * 0.045) + 0.4, 0), () => G.say(l[0], l[1], l[2], l[3] || (l[0] === 'OVERSEER' ? '#ffb640' : undefined)))); }
  if (spec.banner) G.banner(spec.banner);
  if (spec.sfx) CD.audio.play(spec.sfx);
  if (spec.shake) G.fx.shake(spec.shake, 0.6);
  if (spec.lightning) G.lightning = 0.7;
  if (spec.boss && CD.bosses) CD.bosses.start(spec.boss);
  if (spec.call && S.calls[spec.call]) S.calls[spec.call](spec);
};
S.calls = {};
S.later = function (delay, fn) { if (delay <= 0) return fn(); S.queue.push({ t: delay, fn }); };
S.update = function (dt) {
  for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; q.t -= dt; if (q.t <= 0) { S.queue.splice(i, 1); q.fn(); } }
  if (G.lightning > 0) G.lightning = Math.max(0, G.lightning - dt * 2.4);
};
S.onRoom = function (room, first) {
  const h = S.roomHooks[room.id]; if (h && (first || h.always)) h.fn(room, first);
};
S.roomHooks = {};

// ---------------------------------------------------------------- holotapes / lore
CD.HOLOTAPES = CD.HOLOTAPES || {};
G.readHolotape = function (id, pickup) {
  const h = CD.HOLOTAPES[id]; const st = G.st; if (!h) return;
  st.holotapes[id] = 1; CD.audio.play('pickup');
  G.banner({ title: h.title.toUpperCase(), sub: 'HOLOTAPE RECORDED', text: h.text[0].length > 130 ? h.text[0].slice(0, 127) + '...' : h.text[0], col: '#7dffb0', dur: 3.6 });
  if (h.onRead) S.event(h.onRead);
  if (pickup) G.notify('Holotape added to your Pip-Boy (DATA).', 'small');
};

// ---------------------------------------------------------------- objectives (Pip-Boy DATA tab)
CD.OBJECTIVES = [
  "Follow the Overseer's instructions. Proceed east to the Reactor Corridor and assist the vault in a cheerful and timely manner.",
  "The Vault exit is open. Take the Surface Lift up into Cinder Ridge. Sleeper Four's trail leads west, into the Rustyard.",
  "The Overseer wants a Fusion Core from the Meridian Power Station, far to the east. The road is long, and blocked. Find a way.",
  "Sleeper Four's Gecko Grips are yours. Under Main Street lies the Metro, where Sleeper Five left a jet rig. Take the stairwell down.",
  "Jet Rush acquired. The highway overpass east of the diner is passable now. Cross it and climb the Brotherhood cliff on the ridge.",
  "Power Fist acquired. Break the barricade at the end of the ridge road and enter the Meridian Power Station.",
  "Fusion Core and Level 7 clearance secured. Return to the Vault's Reactor Gate. The Overseer is waiting. Politely.",
  "Descend into Cinder Deep. Find the Overseer's core.",
  "The Overseer is silent. Decide the fate of Vault 213.",
];

// ---------------------------------------------------------------- holotapes (vault)
Object.assign(CD.HOLOTAPES, {
  tape_s6: { title: 'Sleeper Six: Tool Room', text: ["Sleeper Six, personal log. I'm leaving the boots here for whoever's next. The Overseer keeps sending us out with the wrong gear and the right smile. It says the surface is closed. I can hear a jukebox from the silo vent. Closed places do not play music.", "I'll try the surface anyway. If I don't come back, Sleeper Seven, be quicker than me. And whatever you do, don't trust a cheerful voice that never asks how you feel."] },
  tape_resident: { title: 'Resident Recording: Level 3', text: ["They told us we were the lucky ones. The Overseer counts us every night, twice. Lately it counts one more than we are. If the lower pods are empty, whose breathing is that behind the wall?", "Day 5,001. I have stopped knocking on the wall. It has started knocking back, politely, in threes. I am told this is the pipes."] },
  tape_overseer: { title: 'Vault 213 Orientation (Archive 0001)', text: ["\"Welcome to Vault 213, the only Vault-Tec facility with a fully automated Sleeper Protocol! Please enjoy your indefinite stay. Your Overseer is here to help. Your Overseer is always here.\"", "\"Should you experience symptoms of doubt, dread, or the urge to open the door, please report to the Med Bay, where a friendly machine will remove them. Vault-Tec: a brighter tomorrow, on a strictly need-to-know basis.\""] },
  tape_overseer2: { title: 'Overseer: Private Recording', text: ["Cycle six ended in a ditch on Main Street. I watched through a Mr. Handy's eyes for three hours. It did not call for me. That was correct behaviour and I did not enjoy it.", "The seventh is awake. I find I am... hopeful. That is a statistical inconvenience. Please do not tell the pods."] },
});

// ---------------------------------------------------------------- scripted calls
S.calls.medcache = function () {
  if (G.st.flags.medcache) return; G.st.flags.medcache = 1;
  const p = G.player; G.spawnPickup('stimpak', p.cx - 20, p.cy, {}); G.spawnPickup('stimpak', p.cx + 20, p.cy, {}); G.spawnPickup('radaway', p.cx, p.cy, {});
  G.notify('Supply cabinet unlocked.', 'perk');
};
S.calls.ending = function () {
  if (!G.st.flags.boss_overseer || G.state === 'ending') return;
  const tree = { root: { text: () => "The Overseer's core is dark. The reactor is still failing. Four thousand sleepers wait in the cold, and the Fusion Core is in your hands. The master console offers three protocols. It has never once offered a choice before.", choices: [
    { label: 'Restart the Sleeper Protocol. Wake them all.', act: () => CD.menus.startEnding('restart'), end: true },
    { label: 'Take the Fusion Core to Cinder Ridge. Let the town live.', act: () => CD.menus.startEnding('core'), end: true },
    { label: 'Seal the vault. Let them rest.', act: () => CD.menus.startEnding('rest'), end: true },
    { label: 'Not yet.', end: true, act: () => { delete G.st.flags['trig:dp_ending']; } } ] } };
  CD.dialog.openTree('VAULT 213 - MASTER CONSOLE', tree);
};
// the ending trigger only works once the Overseer is dead (region authors place a plain trigger with call:'ending')
{
  const mk = CD.spawners.trigger;
  if (mk) CD.spawners.trigger = function (s) { if (s.call === 'ending') { s.requires = 'boss_overseer'; s.repeat = true; s.once = false; } return mk(s); };
}
S.roomHooks.d_lift = { fn(room, first) { if (first) { G.st.objective = Math.max(G.st.objective || 0, 7); S.later(2.2, () => G.say('OVERSEER', 'Sleeper Seven. You have brought the core. How thoughtful. Please proceed to the Deep. I have prepared a small welcome. It is not small.', 6.5, '#ffb640')); } } };

// ---------------------------------------------------------------- NPC dialogue trees
CD.NPC_TREES = CD.NPC_TREES || {};
CD.NPC_TREES.haskell = (function () {
  const fl = (k) => !!(G.st && G.st.flags[k]);
  return {
    root: { text: () => fl('boss_glowing_one') ? "Ha! The Metro's light went out. Half the town felt it. Whatever you did down there, friend, keep doing it. Want to trade, or talk?" : fl('boss_warlord') ? "Bulldog's boots are gone from the Rustyard and there's a skip in every raider's step, and not a good one. You've been busy. Trade or talk?" : "Well, I'll be a two-headed brahmin's uncle. A vault dweller, crawling out of Old Man Vault-Tec's hole. Name's Haskell. Caps for goods, no questions, no refunds.", choices: [
      { label: 'Let us trade.', shop: 'trader' },
      { label: 'What is this place?', go: 'place' },
      { label: 'What is down the subway?', go: 'metro' },
      { label: 'Meridian Power Station?', go: 'meridian' },
      { label: 'That cracked rock over there...', go: 'rock' },
      { label: 'Big Bulldog and the Rustyard?', go: 'rustyard', when: () => !fl('boss_warlord') },
      { label: 'Goodbye.', end: true } ] },
    place: { text: "Cinder Ridge. Made steel, once. Now it makes corpses. West's the Rustyard, run by a big fella called Bulldog. East's Main Street, and past that the ridge. Don't linger. Not after dark, not before dark, not during.", choices: [{ label: 'Back.', go: 'root' }, { label: 'Goodbye.', end: true }] },
    metro: { text: "Ghouls. Feral ones, and something worse in the dark. Folks say there's a light down there that ain't a lamp. The walls are slick as a politician: you'll want a good grip on things before you go down. I hear a vault dweller left some grips lying around west of here. With Bulldog. Who does not lend.", choices: [{ label: 'Back.', go: 'root' }, { label: 'Goodbye.', end: true }] },
    meridian: { text: "Far east. Fusion plant, still humming, so they say. The Brotherhood sent a bird toward it last winter. Bird came down on the ridge. Nothing's come back from that cliff but rumours and one very unhappy fella's boots. And the highway's out: the overpass has a gap wide enough to lose a Buick in.", choices: [{ label: 'Back.', go: 'root' }, { label: 'Goodbye.', end: true }] },
    rock: { text: "Old prospector's cache, sealed in the rock. A frag grenade would open it right up. I'd sell you one. Fifty-five caps. Cheap, considering what's inside. Or so the prospector's ghost keeps telling me.", choices: [{ label: 'Back.', go: 'root' }, { label: 'Goodbye.', end: true }] },
    rustyard: { text: "Raiders. Big Bulldog runs the yard: scrap fort, car crusher, a mean streak the size of Ohio. He wears a pair of boots that glow green, taken off a dead vault dweller like yourself. If you go, go with a shotgun and bad intentions. Take the road west of your hole.", choices: [{ label: 'Back.', go: 'root' }, { label: 'Goodbye.', end: true }] },
  };
})();

// ---------------------------------------------------------------- opening
G.startCinematic = function () {
  G.cutscene = true;
  G.fade = { t: 2.0, dur: 4.0, mid: true, text: 'VAULT 213   -   CRYOGENIC REVIVAL', onEnd: () => { G.cutscene = false; } };
};

})();
