// warden: battle choreography for WARDEN (browser, TECH_PLAN 7.4, 7.9). Each action plays every strike
// with d.strike (through playWaves) and ends with d.results, so the model's status, telegraph, break
// and say events ride in `post`. No choreography carries a line: WARDEN's lines are `say` events.
//
//   warden.hymn          Hymn of Rest: wings flare, the rings blaze, a chord of gold rolls over the squad
//   warden.lullaby       the Lullaby (both forms): the light softens, gold dust drifts down on the squad
//   warden.cradle        the Cradle (both forms): arms of light close round one of them, ring by ring
//   warden.lock          the Last Lullaby begins: the eye blazes white, the song turns toward one of them
//   warden.last_lullaby  the Last Lullaby: a long white-gold beam on the one it was sung for
//   warden.swell         Choir Swell (unbound): twelve thousand voices rise, dawn-white over gold
//   warden.fall          Falling Light (unbound): pieces of the Choir's light rain on one of them
//   warden.gather        the Unbound Requiem gathers: every voice drawn into the core
//   warden.requiem       the Unbound Requiem: the whole Choir in one note, white light on everyone
//   warden.defeat        the construct folds down, wing over wing, its light going quiet
//   cue.protect          the start: a silver glint over Kade (Voss keeping watch)
//   cue.protected        Voss's voice: a silver ward over Kade as the lethal blow breaks on it
//   cue.ultimatesRecharged   HALCYON's gift from BOLT: cyan light rises under every traveler
//   cue.choir_flood      the transform: the Choir's light floods the crown
//   cue.theo             Theo's voice: morning light on the squad
//   cue.choir_voices     the sleepers' voices rise (the arena raises the columns)
//   cue.cradle_close     at half, the crown's rings draw in round WARDEN
//   cue.lock_shield      the shield grown back after a Break: a ring of gold round its core

import { Vector3 } from 'three';
import { playWaves } from '../../battle/actionfx.js';
import { ease } from '../../core/util.js';

const GOLD = '#ffd27a';
const HOT = '#fff0c0';
const DAWN = '#d8e8ff';
const SILVER = '#e4ecff';
const HALCYON = '#6fe9ff';

const targetsOf = (d, act) => {
  const ids = new Set();
  for (const w of act.waves) for (const s of w.strikes) ids.add(s.hit.targetId);
  return [...(ids.size ? ids : act.event.targets || [])].map((id) => d.actor(id)).filter(Boolean);
};
const floorAt = (a) => a.object3d.position.clone().setY(0.04);
const unbound = (a) => a.key === 'warden_unbound';

async function hymn(d, act) {
  const a = act.actor;
  const color = unbound(a) ? DAWN : GOLD;
  a.oneShot('attack');
  a.sprite.setGlow(color, 1.6);
  d.sfx('choir', { pitch: 0.9 });
  const core = a.point('core');
  d.effects.sheet('ring', core, { scale: 3.4, color, intensity: 2.6 });
  d.particles.emit('wd_hymn', core, { count: 26 });
  d.stage.focus({ shiftX: -0.4, zoom: 0.96, rate: 3 });
  await d.wait(0.45);
  d.effects.sheet('ring', core, { scale: 5.4, color: HOT, intensity: 2 });
  await playWaves(d, act, {
    spacing: 0.05,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const c = t.point('center');
        d.effects.sheet('photon', c, { scale: 1.4 + t.size * 0.3, intensity: 2.2 });
        d.effects.sheet('ring', floorAt(t), { floor: true, scale: 2.2, color, intensity: 2.2 });
        d.particles.emit('wd_hymn', c, { count: 8 });
      }
      await d.wait(0.08);
    },
  });
  a.sprite.setGlow(a.glowColor || null);
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function lullaby(d, act) {
  const a = act.actor;
  a.oneShot('attack');
  a.sprite.setGlow(GOLD, 1.2);
  d.sfx('choir', { pitch: 0.7 });
  d.engine.flash('#ffe9b0', 0.45, 0.22);
  const foes = targetsOf(d, act);
  for (const t of foes) d.particles.emit('wd_motes', t.point('top').add(new Vector3(0, 1.4, 0)), { count: 16, spread: 0.8 });
  d.particles.emit('wd_voices', a.point('core'), { count: 20, spread: 1.4 });
  await d.wait(0.6);
  d.sfx('sleep');
  await playWaves(d, act, {
    spacing: 0.04,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        // a soft gold glint, not a white-out: the sleepers must still read under it
        d.effects.sheet('glint', t.point('center'), { scale: 1.1, color: GOLD, intensity: 1.3 });
        d.effects.sheet('ring', floorAt(t), { floor: true, scale: 1.8, color: GOLD, intensity: 1.8 });
      }
      await d.wait(0.06);
    },
  });
  a.sprite.setGlow(a.glowColor || null);
  await d.results(act.post, a);
  await d.wait(0.25);
}

async function cradle(d, act) {
  const a = act.actor;
  const t = targetsOf(d, act)[0];
  const color = unbound(a) ? DAWN : GOLD;
  a.oneShot('cast');
  a.sprite.setGlow(color, 1.8);
  d.sfx('cast', { pitch: 0.75 });
  if (t) {
    const c = t.point('center');
    d.effects.beam(a.point('muzzle'), c, { color, width: 0.28, dur: 0.6, intensity: 2.6 });
    // arms of light closing round them, ring by ring
    for (const [k, sc] of [[0, 3.6], [1, 2.6], [2, 1.7]]) {
      d.effects.sheet('ring', c, { scale: sc, color: k === 2 ? HOT : color, intensity: 2.4 });
      d.effects.sheet('ring', floorAt(t), { floor: true, scale: sc * 0.9, color, intensity: 2 });
      await d.wait(0.13);
    }
  }
  await playWaves(d, act, {
    before: async (w) => {
      for (const s of w.strikes) {
        const tt = d.actor(s.hit.targetId);
        if (tt) d.effects.sheet('void', tt.point('center'), { scale: 1.6, intensity: 2.2 });
      }
    },
  });
  d.sfx('sleep', { pitch: 0.9 });
  a.sprite.setGlow(a.glowColor || null);
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function lock(d, act) {
  const a = act.actor;
  if (a.has('special')) a.oneShot('special');
  a.sprite.setGlow(HOT, 2.2);
  d.sfx('choir', { pitch: 1.2 });
  d.sfx('charge', { pitch: 0.7 });
  const core = a.point('core');
  d.particles.emit('wd_choir', core, { count: 30, spread: 1.2 });
  d.effects.sheet('ring', core, { scale: 3, color: HOT, intensity: 2.8 });
  d.stage.focus({ shiftX: -0.5, zoom: 0.95, rate: 3 });
  await d.wait(0.6);
  a.glowColor = GOLD;
  a.sprite.setGlow(GOLD, 1.3);
  await d.results(act.post, a);
  await d.wait(0.15);
}

async function lastLullaby(d, act) {
  const a = act.actor;
  if (a.has('special')) a.oneShot('special');
  a.sprite.setGlow(HOT, 2.4);
  d.stage.focus({ shiftX: -0.6, zoom: 0.94, rate: 4 });
  d.sfx('charge', { pitch: 0.5 });
  const core = a.point('core');
  d.particles.emit('wd_choir', core, { count: 40, spread: 1.6 });
  await d.wait(0.55);
  a.oneShot('attack');
  d.sfx('enemyBeam', { pitch: 0.7 });
  d.effects.sheet('ring', core, { scale: 3.4, color: HOT, intensity: 3 });
  await playWaves(d, act, {
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const c = t.point('center');
        d.effects.beam(core, c, { color: HOT, width: 1.2, dur: 0.8, intensity: 3.2 });
        d.engine.flash('#fff0c0', 0.3, 0.55);
        d.engine.shake(0.24, 0.5);
        await d.wait(0.16);
        d.effects.sheet('photon', c, { scale: 2.4, intensity: 2.8 });
        d.effects.sheet('ring', floorAt(t), { floor: true, scale: 3.2, color: GOLD, intensity: 2.6 });
        d.particles.emit('wd_choir', c, { count: 24 });
      }
    },
  });
  a.glowColor = null;
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.25);
}

async function fall(d, act) {
  const a = act.actor;
  a.oneShot('attack');
  a.sprite.setGlow(DAWN, 1.4);
  d.sfx('choir', { pitch: 1.1 });
  d.particles.emit('wd_choir', a.point('top'), { count: 20, spread: 1.6 });
  await d.wait(0.35);
  await playWaves(d, act, {
    spacing: 0.1,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const c = t.point('center');
        for (let k = 0; k < 3; k++) {
          const from = c.clone().add(new Vector3((Math.random() - 0.5) * 1.4, 5 + Math.random() * 2, 0));
          d.effects.streak(from, c.clone().add(new Vector3((Math.random() - 0.5) * 0.5, 0, 0)), { color: k ? GOLD : DAWN, dur: 0.12, length: 1.6, width: 0.2 });
        }
        d.sfx('impact', { pitch: 1.3 });
        d.effects.sheet('photon', c, { scale: 1.3, intensity: 2.4 });
      }
    },
  });
  a.sprite.setGlow(a.glowColor || null);
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function gather(d, act) {
  const a = act.actor;
  if (a.has('special')) a.oneShot('special');
  a.sprite.setGlow(DAWN, 2.2);
  d.sfx('choir', { pitch: 0.6 });
  d.sfx('charge', { pitch: 0.45 });
  const core = a.point('core');
  d.stage.focus({ shiftX: -0.5, zoom: 0.95, rate: 3 });
  // every voice drawn in: sparks from all round the crown converging on the core
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2, r = 4 + Math.random() * 2;
      const p = core.clone().add(new Vector3(Math.cos(ang) * r, Math.sin(ang) * r * 0.6, 0));
      d.particles.emit('wd_voices', p, { count: 4, direction: [core.x - p.x, core.y - p.y, 0], speed: 2.4 });
    }
    d.effects.sheet('ring', core, { scale: 4 - k * 0.8, color: k % 2 ? GOLD : DAWN, intensity: 2.4 });
    await d.wait(0.18);
  }
  a.glowColor = DAWN;
  a.sprite.setGlow(DAWN, 1.6);
  await d.results(act.post, a);
  await d.wait(0.15);
}

async function requiem(d, act) {
  const a = act.actor;
  a.oneShot('attack');
  a.sprite.setGlow('#ffffff', 2.6);
  d.sfx('enemyBeam', { pitch: 0.45 });
  d.sfx('choir', { pitch: 0.5 });
  const core = a.point('core');
  d.effects.sheet('ring', core, { scale: 6, color: '#ffffff', intensity: 3 });
  d.engine.flash('#fff4e0', 0.45, 0.7);
  d.engine.shake(0.45, 0.8);
  await d.wait(0.25);
  await playWaves(d, act, {
    spacing: 0.04,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const c = t.point('center');
        d.effects.beam(core, c, { color: DAWN, width: 0.8, dur: 0.5, intensity: 3 });
        d.effects.sheet('photon', c, { scale: 2.2 + t.size * 0.3, intensity: 2.8 });
        d.effects.sheet('ring', floorAt(t), { floor: true, scale: 3, color: HOT, intensity: 2.6 });
        d.particles.emit('wd_dawn', c, { count: 20 });
        await d.wait(0.05);
      }
    },
  });
  a.glowColor = null;
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.3);
}

/** The construct folds down, wing over wing, and its light goes quiet (before the victory pose). */
async function defeat(d, act) {
  const a = act.actor;
  const core = a.point('core');
  a.glowColor = null;
  d.sfx('choir', { pitch: 0.5 });
  for (let i = 0; i < 3; i++) {
    d.particles.emit('wd_choir', core.clone().add(new Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0.3)), { count: 24 });
    d.engine.shake(0.12, 0.3);
    if (a.has('hurt')) a.oneShot('hurt');
    await d.wait(0.26);
  }
  d.sfx('transform', { pitch: 0.6 });
  d.engine.flash('#fff0c0', 0.35, 0.8);
  a.sprite.setGlow(HOT, 1.6);
  if (a.has('fold')) a.sprite.play('fold', { restart: true });
  d.particles.emit('wd_dawn', core, { count: 40, spread: 2.4 });
  const s0 = a.object3d.scale.x;
  await d.stage.tween(1.6, (k) => {
    a.object3d.scale.setScalar(s0 * (1 - 0.3 * k));
    a.sprite.setOpacity(1 - 0.45 * k);
  }, ease.inOutQuad);
  a.sprite.setGlow(GOLD, 0.8);
  d.ui.removeFoe(a.id);
}

async function protect(d, act) {
  const a = act.actor;
  if (!a) return;
  d.effects.sheet('glint', a.point('top').add(new Vector3(0, 0.4, 0)), { scale: 1.4, color: SILVER, intensity: 2.2 });
  await d.wait(0.2);
}

async function protectedWard(d, act) {
  const a = act.actor;
  if (!a) return;
  d.sfx('defend', { pitch: 0.8 });
  d.sfx('shard', { pitch: 1.2 });
  d.engine.flash('#e4ecff', 0.22, 0.45);
  const c = a.point('center');
  d.effects.sheet('ring', c, { scale: 3.2, color: SILVER, intensity: 3 });
  d.effects.sheet('ring', floorAt(a), { floor: true, scale: 3.4, color: SILVER, intensity: 2.6 });
  d.effects.shards(c, { count: 14, scale: 1.1, color: SILVER });
  d.particles.emit('wd_dawn', c, { count: 26 });
  a.sprite.flash(SILVER, 0.6);
  await d.wait(0.6);
}

async function recharged(d) {
  d.sfx('awaken', { pitch: 1.1 });
  d.engine.flash('#c8f6ff', 0.2, 0.4);
  for (const m of d.stage.party) {
    if (!m.alive) continue;
    d.effects.sheet('ring', floorAt(m), { floor: true, scale: 2.6, color: HALCYON, intensity: 2.6 });
    d.particles.emit('holo', m.object3d.position, { count: 18 });
    m.sprite.flash(HALCYON, 0.5);
  }
  await d.wait(0.55);
}

async function flood(d, act) {
  const a = act.actor;
  d.sfx('choir', { pitch: 0.5 });
  d.engine.flash('#fff0c0', 0.5, 0.75);
  d.engine.shake(0.3, 0.7);
  if (a) {
    d.particles.emit('wd_choir', a.point('core'), { count: 70, spread: 3 });
    d.effects.sheet('ring', a.point('core'), { scale: 7, color: HOT, intensity: 3 });
  }
  await d.wait(0.6);
}

async function theo(d) {
  d.sfx('wake', { pitch: 1.1 });
  d.engine.flash('#eaf2ff', 0.3, 0.5);
  for (const m of d.stage.party) if (m.alive) d.particles.emit('wd_dawn', m.point('top'), { count: 14 });
  await d.wait(0.4);
}

async function voices(d) {
  d.sfx('choir', { pitch: 1.3 });
  await d.wait(0.3);
}

async function cradleClose(d, act) {
  d.sfx('choir', { pitch: 0.8 });
  if (act.actor) act.actor.sprite.flash(GOLD, 0.5);
  await d.wait(0.3);
}

async function lockShield(d, act) {
  const a = act.actor;
  if (!a) return;
  d.effects.sheet('ring', a.point('core'), { scale: 4, color: GOLD, intensity: 2.4 });
  await d.wait(0.15);
}

export default {
  'warden.hymn': hymn,
  'warden.swell': hymn,
  'warden.lullaby': lullaby,
  'warden.cradle': cradle,
  'warden.lock': lock,
  'warden.last_lullaby': lastLullaby,
  'warden.fall': fall,
  'warden.gather': gather,
  'warden.requiem': requiem,
  'warden.defeat': defeat,
  'cue.protect': protect,
  'cue.protected': protectedWard,
  'cue.ultimatesRecharged': recharged,
  'cue.choir_flood': flood,
  'cue.theo': theo,
  'cue.choir_voices': voices,
  'cue.cradle_close': cradleClose,
  'cue.lock_shield': lockShield,
};
