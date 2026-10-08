// shoals: battle choreography for THE MAW (browser, TECH_PLAN 7.4, 7.9). Each plays every strike
// with d.strike and ends with d.results (the model's untargetable / surface events ride in `post`).
//
//   maw.ice_breath   it rears, frost gathers in its throat, then a freezing gale across the squad
//   maw.tail_slam    the tail bursts out of the ice ahead of it and falls on one of them
//   maw.submerge     it dives into the black ice: a ring of light, shards, frost
//   maw.circle       something vast turns under the squad: the floor shakes and rings of frost cross it
//   maw.breach       it erupts through the ice beneath every one of them, then surfaces
//   maw.defeat       wounded, it sinks back into the ice (it is not dead)
//   cue.maw_enrage   at half health its eyes flare violet and the hall shakes

import { Vector3 } from 'three';
import { playWaves } from '../../battle/actionfx.js';
import { ease } from '../../core/util.js';

const FROST = '#9ff0ff';
const VOID = '#a35cff';

const targetsOf = (d, act) => {
  const ids = new Set();
  for (const w of act.waves) for (const s of w.strikes) ids.add(s.hit.targetId);
  return [...(ids.size ? ids : act.event.targets || [])].map((id) => d.actor(id)).filter(Boolean);
};

/** Where the Maw would surface under the party: their centroid on the floor. */
function partyFloor(d, act) {
  const ts = targetsOf(d, act);
  const c = new Vector3();
  for (const t of ts) c.add(t.object3d.position);
  return ts.length ? c.multiplyScalar(1 / ts.length).setY(0.05) : new Vector3(3, 0.05, 0);
}

async function iceBreath(d, act) {
  const a = act.actor;
  a.sprite.setGlow(FROST, 1.6);
  a.oneShot('attack');
  d.sfx('charge', { pitch: 0.7 });
  const m = a.point('muzzle');
  d.particles.emit('frost', m, { count: 26, spread: 0.8 });
  d.effects.sheet('ring', m, { scale: 1.6, color: FROST, intensity: 2.4 });
  d.stage.focus({ shiftX: 0.4, zoom: 0.96, rate: 4 });
  await d.wait(0.36);
  d.sfx('enemyBeam', { pitch: 0.6 });
  d.engine.flash('#d8f8ff', 0.18, 0.4);
  d.engine.shake(0.14, 0.5);
  const to = partyFloor(d, act).setY(1.1);
  d.particles.emit('sh_breath', m, { count: 40, direction: to.clone().sub(m) });
  await playWaves(d, act, {
    spacing: 0.06,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const c = t.point('center');
        d.effects.beam(m, c, { color: FROST, width: 0.9, dur: 0.5, intensity: 2.6 });
        d.effects.sheet('cryo', c, { scale: 1.6 + t.size * 0.3, intensity: 2.4 });
        d.particles.emit('frost', c, { count: 16 });
        await d.wait(0.06);
      }
    },
  });
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function tailSlam(d, act) {
  const a = act.actor;
  const t = targetsOf(d, act)[0];
  a.oneShot('slam');
  d.sfx('rumble', { pitch: 0.7 });
  // the ice bursts where the tail comes up, just ahead of the Maw
  const burst = a.object3d.position.clone().add(new Vector3(3.2, 0.3, 0.6));
  d.particles.emit('sh_shards', burst, { count: 26 });
  d.engine.shake(0.12, 0.3);
  await d.wait(0.36);
  await playWaves(d, act, {
    before: async (w) => {
      d.sfx('enemyMelee', { pitch: 0.55 });
      d.engine.hitStop(110);
      d.engine.shake(0.32, 0.5);
      for (const s of w.strikes) {
        const tt = d.actor(s.hit.targetId) || t;
        if (!tt) continue;
        const c = tt.point('center');
        d.effects.sheet('impact', c, { scale: 2.4, color: '#cfeaff', intensity: 2.6 });
        d.effects.sheet('ring', tt.object3d.position.clone().setY(0.03), { floor: true, scale: 3.4, color: FROST, intensity: 2.2 });
        d.effects.shards(c, { count: 14, scale: 1.2, color: '#e8f8ff' });
        d.particles.emit('sh_shards', tt.object3d.position.clone().setY(0.2), { count: 20 });
      }
    },
  });
  await d.results(act.post, a);
  await d.wait(0.24);
}

async function submerge(d, act) {
  const a = act.actor;
  a.sprite.setGlow(VOID, 1.4);
  if (a.has('special')) a.oneShot('special');
  d.sfx('splash', { pitch: 0.6 });
  const floor = a.object3d.position.clone().setY(0.05);
  d.effects.sheet('ring', floor, { floor: true, scale: 6, color: FROST, intensity: 2.4 });
  d.particles.emit('sh_shards', floor.clone().setY(0.4), { count: 36 });
  d.particles.emit('frost', floor.clone().setY(0.6), { count: 40, spread: 2.4 });
  d.engine.shake(0.2, 0.6);
  await d.wait(0.45);
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.15);
}

async function circle(d, act) {
  const a = act.actor;
  d.sfx('rumble', { pitch: 0.5 });
  const under = partyFloor(d, act);
  // three rings of frost cross the floor toward the squad, the ice trembling
  for (let k = 0; k < 3; k++) {
    const p = a.object3d.position.clone().lerp(under, 0.35 + k * 0.3).setY(0.04);
    d.effects.sheet('ring', p, { floor: true, scale: 3 + k, color: k === 2 ? VOID : FROST, intensity: 2 });
    d.particles.emit('frost', p.clone().setY(0.3), { count: 14, spread: 1.4 });
    d.engine.shake(0.08 + k * 0.05, 0.4);
    await d.wait(0.22);
  }
  d.particles.emit('void', under.clone().setY(0.2), { count: 24, spread: 2.2 });
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function breach(d, act) {
  const a = act.actor;
  d.sfx('rumble', { pitch: 0.8 });
  d.engine.shake(0.2, 0.4);
  await d.wait(0.25);
  await playWaves(d, act, {
    spacing: 0.04,
    before: async (w) => {
      d.sfx('splash', { pitch: 0.5 });
      d.engine.flash('#c8a8ff', 0.2, 0.4);
      d.engine.shake(0.36, 0.6);
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const feet = t.object3d.position.clone().setY(0.05);
        d.effects.sheet('ring', feet, { floor: true, scale: 3, color: VOID, intensity: 2.6 });
        d.effects.sheet('void', t.point('center'), { scale: 2 + t.size * 0.4, intensity: 2.4 });
        d.effects.beam(feet, feet.clone().setY(3.4), { color: VOID, width: 1.1, dur: 0.4, intensity: 2.8 });
        d.particles.emit('sh_shards', feet.clone().setY(0.3), { count: 18 });
        await d.wait(0.05);
      }
    },
  });
  await d.results(act.post, a);
  // it surfaces with a roar (the model has lifted the submerge by now)
  if (a.alive && !a.untargetable) {
    a.oneShot('attack');
    a.sprite.flash(VOID, 0.4);
  }
  await d.wait(0.3);
}

async function defeat(d, act) {
  const a = act.actor;
  const c = a.point('core');
  d.sfx('break', { pitch: 0.6 });
  d.engine.flash('#e8d8ff', 0.25, 0.5);
  if (a.has('hurt')) a.oneShot('hurt');
  for (let i = 0; i < 3; i++) {
    d.particles.emit('void', c.clone().add(new Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.3)), { count: 20 });
    d.effects.sheet('impact', c, { scale: 2 + i * 0.4, color: VOID, intensity: 2.4 });
    d.engine.shake(0.14, 0.3);
    await d.wait(0.22);
  }
  // wounded, not dead: it slides back down into the black ice
  if (a.has('special')) a.oneShot('special');
  d.sfx('submerge', { pitch: 0.6 });
  const floor = a.object3d.position.clone().setY(0.05);
  d.effects.sheet('ring', floor, { floor: true, scale: 7, color: FROST, intensity: 2.4 });
  d.particles.emit('sh_shards', floor.clone().setY(0.4), { count: 40 });
  d.particles.emit('frost', floor.clone().setY(0.6), { count: 50, spread: 3 });
  await d.stage.tween(1.2, (k) => { a.sink = k; a.sprite.setOpacity(1 - k * 0.9); }, ease.inQuad);
  await d.stage.tween(0.3, (k) => a.sprite.setOpacity(0.1 * (1 - k)), ease.linear);
  d.ui.removeFoe(a.id);
}

async function enrage(d, act) {
  const a = act.actor;
  d.sfx('charge', { pitch: 0.5 });
  d.engine.flash('#b07aff', 0.3, 0.5);
  d.engine.shake(0.3, 0.7);
  if (!a) return;
  a.sprite.setGlow(VOID, 2.2);
  if (!a.untargetable) a.oneShot('attack');
  d.particles.emit('void', a.point('core'), { count: 50, spread: 1.8 });
  d.effects.sheet('ring', a.point('core'), { scale: 3, color: VOID, intensity: 2.6 });
  await d.wait(0.6);
  a.sprite.setGlow(VOID, 0.6);
}

export default {
  'maw.ice_breath': iceBreath,
  'maw.tail_slam': tailSlam,
  'maw.submerge': submerge,
  'maw.circle': circle,
  'maw.breach': breach,
  'maw.defeat': defeat,
  'cue.maw_enrage': enrage,
};
