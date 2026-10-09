// spire: battle choreography for COMMANDER VOSS (browser, TECH_PLAN 7.4, 7.9). Each plays every strike
// with playWaves and ends with d.results (the model's statuses and breaks ride in `post`).
//
//   voss.sweep          the halberd comes round in one wide arc of cyan light across the whole squad
//   voss.execution      she marks the line with her free hand, then a falling arc of light finds the
//                       marked traveler
//   voss.defeat         she goes down on one knee; the upload light starts rising off her (she stays on
//                       stage: the field scene finishes it)
//   cue.voss_overclock  at half health the other half of her goes up the line: a cyan surge, data
//                       pouring off her, the deck shudders

import { Vector3 } from 'three';
import { playWaves } from '../../battle/actionfx.js';

const BLADE = '#7ff4ff';
const HOT = '#e8fdff';
const MARK = '#ff3b4e';

const targetsOf = (d, act) => {
  const ids = new Set();
  for (const w of act.waves) for (const s of w.strikes) ids.add(s.hit.targetId);
  return [...(ids.size ? ids : act.event.targets || [])].map((id) => d.actor(id)).filter(Boolean);
};

async function sweep(d, act) {
  const a = act.actor;
  a.sprite.setGlow(BLADE, 1.4);
  a.oneShot('attack');
  d.sfx('charge', { pitch: 1.3, volume: 0.6 });
  const m = a.point('muzzle');
  d.particles.emit('spark', m, { count: 12 });
  d.stage.focus({ shiftX: 0.3, zoom: 0.97, rate: 4 });
  await d.wait(0.24);
  d.sfx('slash', { pitch: 0.7 });
  d.engine.shake(0.16, 0.4);
  await playWaves(d, act, {
    spacing: 0.05,
    before: async (w) => {
      const ts = w.strikes.map((s) => d.actor(s.hit.targetId)).filter(Boolean);
      // one long arc of light: the slash sheet stretched across each of them in turn
      for (const t of ts) {
        const c = t.point('center');
        d.effects.sheet('slash', c, { scale: 2.6 + t.size * 0.4, color: BLADE, intensity: 2.6, rot: -0.35 });
        d.effects.streak(m, c, { color: HOT, length: 2.4, width: 0.4 });
        d.particles.emit('spark', c, { count: 8 });
        await d.wait(0.04);
      }
      d.engine.hitStop(70);
    },
  });
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.18);
}

async function execution(d, act) {
  const a = act.actor;
  const t = targetsOf(d, act)[0];
  if (a.has('special')) a.oneShot('special');
  d.sfx('laser', { pitch: 0.8 });
  if (t) {
    // the mark: a red ring under the traveler, a line of light from her hand
    const feet = t.object3d.position.clone().setY(0.04);
    d.effects.sheet('ring', feet, { floor: true, scale: 2.4, color: MARK, intensity: 2.4 });
    d.effects.beam(a.point('muzzle'), t.point('center'), { color: MARK, width: 0.12, dur: 0.5, intensity: 2.2 });
  }
  await d.wait(0.42);
  a.oneShot('attack');
  d.sfx('charge', { pitch: 1.6 });
  await d.wait(0.18);
  await playWaves(d, act, {
    before: async (w) => {
      d.sfx('impact', { pitch: 0.6 });
      d.engine.flash('#dff8ff', 0.2, 0.35);
      d.engine.hitStop(120);
      d.engine.shake(0.3, 0.5);
      for (const s of w.strikes) {
        const tt = d.actor(s.hit.targetId) || t;
        if (!tt) continue;
        const c = tt.point('center');
        const top = c.clone().add(new Vector3(-0.8, 3.6, 0));
        d.effects.beam(top, c, { color: BLADE, width: 0.7, dur: 0.35, intensity: 3 });
        d.effects.sheet('volt', c, { scale: 2 + tt.size * 0.3, intensity: 2.6 });
        d.effects.sheet('slash', c, { scale: 3, color: HOT, intensity: 2.8, rot: 1.2 });
        d.particles.emit('spark', c, { count: 18 });
      }
    },
  });
  await d.results(act.post, a);
  await d.wait(0.24);
}

async function defeat(d, act) {
  const a = act.actor;
  const c = a.point('core');
  d.sfx('break', { pitch: 0.7 });
  d.engine.flash('#e8fbff', 0.25, 0.5);
  if (a.has('hurt')) a.oneShot('hurt');
  for (let i = 0; i < 2; i++) {
    d.particles.emit('spark', c.clone().add(new Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.6, 0.3)), { count: 14 });
    d.effects.sheet('impact', c, { scale: 1.8 + i * 0.4, color: BLADE, intensity: 2.2 });
    d.engine.shake(0.12, 0.3);
    await d.wait(0.24);
  }
  // down on one knee, the halberd planted; the light of the upload starts rising off her
  a.rest(a.has('break') ? 'break' : 'idle');
  a.sprite.setGlow(BLADE, 0.8);
  d.sfx('choir', { volume: 0.5 });
  d.particles.emit('sp_motes', c.clone().setY(c.y + 0.4), { count: 30, spread: 1.0 });
  d.particles.emit('data', c, { count: 30, spread: 0.8 });
  await d.wait(1.1);
}

async function overclock(d, act) {
  const a = act.actor;
  d.sfx('glitch', { pitch: 0.8 });
  d.engine.flash('#9ff0ff', 0.3, 0.5);
  d.engine.shake(0.26, 0.6);
  if (!a) return;
  a.sprite.setGlow(BLADE, 2.2);
  const c = a.point('core');
  d.particles.emit('data', c, { count: 60, spread: 1.4 });
  d.effects.sheet('ring', c, { scale: 3.2, color: BLADE, intensity: 2.6 });
  await d.wait(0.6);
  a.sprite.setGlow(BLADE, 0.5);
}

export default {
  'voss.sweep': sweep,
  'voss.execution': execution,
  'voss.defeat': defeat,
  'cue.voss_overclock': overclock,
};
