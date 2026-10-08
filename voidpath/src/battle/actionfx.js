// Battle action choreography registry (TECH_PLAN 7.4).
//
//   registerActionFx(id, async (d, act) => { ... })
//
// `id` is an enemy action's or a skill's `fx` field ('maw.ice_breath'), a defeat choreography
// ('<boss>.defeat', looked up by the boss's script id, kind, art or kind prefix) or a cue handler
// ('cue.<name>'). The Director looks the id up and falls back to the POC anim-based choreography when
// nothing is registered.
//
// `d` is the Director: d.stage, d.effects, d.particles, d.ui, d.audio, d.engine, d.sfx(name, opts),
// d.strike(s, a), d.results(post, a), d.wait(sec), d.actor(id), d.pos(id, point).
// `act` is { actor, event, waves, post, def }: the acting BattleActor (the cue's target or null for
// cues), the action (or cue / ko) event, the strike waves ([{ index, strikes: [{ hit, after }] }]), the
// remaining events of the action, and the action / skill definition. A choreography must play every
// strike of every wave with d.strike(s, actor) and finally d.results(post, actor), in that order.
//
// Built in: the four ultimates ('ult.oathblade', 'ult.ringfire_barrage', 'ult.singularity',
// 'ult.lifebloom'); SKILLS name them in their `fx` field.

import { Vector3 } from 'three';
import { ease } from '../core/util.js';
import { hasPreset } from '../core/particles.js';

export const ACTION_FX = {};

export function registerActionFx(id, fn) {
  if (typeof fn !== 'function') {
    console.error(`registerActionFx: "${id}" is not a function`);
    return;
  }
  ACTION_FX[id] = fn;
}

/** The registered choreography for an id, or null. */
export function getActionFx(id) {
  return (id && ACTION_FX[id]) || null;
}

export function actionFxIds() {
  return Object.keys(ACTION_FX);
}

// ------------------------------------------------------------------ helpers for choreographies

const preset = (name, fallback) => (hasPreset(name) ? name : fallback);

/** Centre of the given actors' named points (world). */
export function centroid(actors, point = 'center', out = new Vector3()) {
  out.set(0, 0, 0);
  const list = actors.filter(Boolean);
  for (const a of list) out.add(a.point(point));
  return list.length ? out.multiplyScalar(1 / list.length) : out;
}

/** Plays every strike of every wave (spacing in seconds), calling before(wave, i) first. */
export async function playWaves(d, act, { spacing = 0.12, before = null } = {}) {
  for (let i = 0; i < act.waves.length; i++) {
    const w = act.waves[i];
    if (before) await before(w, i);
    for (const s of w.strikes) await d.strike(s, act.actor);
    if (i < act.waves.length - 1) await d.wait(spacing);
  }
}

const targetsOf = (d, act) => {
  const hit = new Set();
  for (const w of act.waves) for (const s of w.strikes) hit.add(s.hit.targetId);
  const ids = hit.size ? [...hit] : act.event.targets || [];
  return ids.map((id) => d.actor(id)).filter(Boolean);
};

// ------------------------------------------------------------------ ultimates

/** KADE: Oathblade. The lance draws down lightning, a dash, three crossing cuts and a thunder strike. */
registerActionFx('ult.oathblade', async (d, act) => {
  const a = act.actor;
  const t = targetsOf(d, act)[0] || d.stage.enemies.find((x) => x.alive && !x.untargetable);
  a.sprite.setGlow('#ffe94d', 2.4);
  a.sprite.play('cast', { restart: true });
  d.sfx('charge');
  d.particles.emit('volt', a.point('hand'), { count: 26, speed: 1.2 });
  d.effects.sheet('ring', a.point('center'), { scale: 2.2, color: '#ffe94d', intensity: 2.8 });
  d.effects.sheet('volt', a.point('hand'), { scale: 1.8, intensity: 2.4 });
  await d.wait(0.42);
  if (t) {
    const c = t.point('center');
    d.effects.sheet('volt', c, { scale: 2.4 + t.size * 0.6, intensity: 2.8 });
    d.effects.beam(c.clone().setY(c.y + 9), t.point('feet'), { color: '#fff4a0', width: 0.9, dur: 0.4, intensity: 3.2 });
    d.engine.flash('#fff6c0', 0.18, 0.5);
    d.sfx('enemyBeam', { pitch: 1.4 });
    a.sprite.play('ready');
    await d.stage.move(a, d.stage.strikePos(a, t), 0.12, ease.inCubic);
  }
  await playWaves(d, act, {
    spacing: 0.06,
    before: async (w, i) => {
      for (let k = 0; k < 3; k++) {
        a.sprite.play('attack', { restart: true });
        d.sfx('slash', { pitch: 1 + k * 0.12 });
        if (t) {
          d.effects.sheet('slash', t.point('center'), { scale: 1.8 + t.size * 0.4, flip: true, rot: [-0.4, 0.9, 0.2][k], intensity: 2.4, color: '#fff7c8' });
          d.particles.emit('volt', t.point('center'), { count: 12 });
        }
        await d.wait(0.09);
      }
      if (i === act.waves.length - 1 && t) {
        d.engine.hitStop(140);
        d.engine.shake(0.3, 0.5);
        d.effects.sheet('ring', t.object3d.position.clone().setY(0.03), { floor: true, scale: 4 * Math.sqrt(t.size), color: '#ffe94d', intensity: 2.6 });
        d.effects.sheet('impact', t.point('center'), { scale: 2.6, color: '#ffe94d', intensity: 2.6 });
      }
    },
  });
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.2);
});

/** NYX: Ringfire Barrage. A storm of rounds, then a ring of fire under every foe it struck. */
registerActionFx('ult.ringfire_barrage', async (d, act) => {
  const a = act.actor;
  a.sprite.setGlow('#ff9a3c', 2);
  d.sfx('charge', { pitch: 1.2 });
  d.particles.emit('thermal', a.point('muzzle'), { count: 18, speed: 0.8 });
  await d.wait(0.25);
  await playWaves(d, act, {
    spacing: 0.02,
    before: async (w) => {
      a.sprite.play('shoot', { restart: true });
      d.sfx('shot', { pitch: 0.9 + Math.random() * 0.3 });
      const m = a.point('muzzle');
      d.effects.sheet('muzzle', m, { flip: true, scale: 1.5, anchor: [0.15, 0.5], intensity: 2.6, color: '#ffb35a' });
      await Promise.all(w.strikes.map((s, i) => d.wait(i * 0.03).then(async () => {
        const t = d.actor(s.hit.targetId);
        if (!t) return;
        await d.effects.streak(m, t.point('center'), { color: '#ffb35a', dur: 0.07, length: 1.8, width: 0.4 });
        d.effects.sheet('thermal', t.point('feet').add(new Vector3(0, 0, 0.3)), { scale: 1 + t.size * 0.3, anchor: [0.5, 0.9], intensity: 2 });
      })));
    },
  });
  const hit = targetsOf(d, act);
  d.engine.shake(0.22, 0.45);
  d.engine.flash('#ffb35a', 0.18, 0.4);
  for (const t of hit) {
    d.effects.sheet('ring', t.object3d.position.clone().setY(0.03), { floor: true, scale: 3.2 * Math.sqrt(t.size), color: '#ff7a3a', intensity: 2.6 });
    d.particles.emit('thermal', t.point('center'), { count: 24 });
  }
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.25);
});

/** ORION: Singularity. A collapsing star between the foes pulls everything in, then detonates. */
registerActionFx('ult.singularity', async (d, act) => {
  const a = act.actor;
  const foes = targetsOf(d, act);
  const c = centroid(foes.length ? foes : d.stage.enemies.filter((x) => x.alive));
  c.y += 0.6;
  a.sprite.play('cast', { restart: true });
  a.sprite.setGlow('#b07bff', 2.2);
  d.sfx('cast', { pitch: 0.7 });
  d.effects.sheet('glint', a.point('hand'), { scale: 2, color: '#c38bff', intensity: 2.6 });
  d.stage.focus({ shiftX: -0.5, zoom: 0.94, rate: 4 });
  await d.wait(0.3);
  d.sfx('charge', { pitch: 0.6 });
  for (let k = 0; k < 5; k++) {
    d.effects.sheet('ring', c, { scale: 4.5 - k * 0.8, color: '#9a5cf0', intensity: 2.4 });
    d.effects.sheet('void', c, { scale: 2.4 + k * 0.25, intensity: 2.2 });
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2, r = 3 + Math.random() * 1.5;
      const p = c.clone().add(new Vector3(Math.cos(ang) * r, Math.sin(ang) * r * 0.5, 0));
      d.particles.emit('void', p, { count: 4, direction: [c.x - p.x, c.y - p.y, 0], speed: 2.2 });
    }
    await d.wait(0.12);
  }
  d.engine.hitStop(160);
  d.engine.flash('#d8b8ff', 0.3, 0.7);
  d.engine.shake(0.32, 0.6);
  d.effects.sheet('void', c, { scale: 4.2, intensity: 3 });
  d.effects.shards(c, { count: 18, scale: 1.4, color: '#c9a8ff' });
  await playWaves(d, act, { spacing: 0.16, before: async () => d.particles.emit('void', c, { count: 40, speed: 2 }) });
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  d.stage.focus();
  await d.wait(0.25);
});

/** SERA: Lifebloom. Dawn light opens over the squad: fallen allies rise, wounds close, ailments wash away. */
registerActionFx('ult.lifebloom', async (d, act) => {
  const a = act.actor;
  a.sprite.play('cast', { restart: true });
  a.sprite.setGlow('#9dffcf', 2.2);
  d.sfx('cast', { pitch: 1.2 });
  d.effects.sheet('photon', a.point('feet').add(new Vector3(0, 0, 0.3)), { scale: 2.2, anchor: [0.5, 0.86], intensity: 2.6 });
  await d.wait(0.35);
  d.engine.flash('#eafff2', 0.25, 0.45);
  for (const m of d.stage.party) {
    const feet = m.point('feet').add(new Vector3(0, 0, 0.3));
    d.effects.sheet('heal', feet, { scale: 2.2, anchor: [0.5, 0.88], intensity: 2.4 });
    d.effects.sheet('ring', m.object3d.position.clone().setY(0.03), { floor: true, scale: 2.6, color: '#7dffb0', intensity: 2.4 });
    d.particles.emit(preset('petal', 'heal'), m.point('top'), { count: 18 });
    d.particles.emit('heal', m.object3d.position, { count: 20 });
  }
  await d.wait(0.3);
  await playWaves(d, act);
  await d.results(act.post, a);
  a.sprite.setGlow(null);
  await d.wait(0.3);
});
