// arboretum: battle choreography for THE GARDENER (browser, TECH_PLAN 7.4, 7.9). Each plays every
// strike with playWaves / d.strike and ends with d.results.
//
//   gardener.lash             the thorn whip drawn back over her head, then lashed across one of them
//   gardener.pollen           her blooms burst: a gold cloud drifts down over the squad (sleep)
//   gardener.sow              seeds flung into the beds; the Rootlings climb out where they land
//   gardener.gather           she turns her crown to the dome light: gold pours down, her glow holds
//   gardener.photosynthesis   the light she gathered knits her vines back together
//   gardener.defeat           the vines let go of her and fall away; MOTHER-7 is still there inside
//   cue.domeLight             the dome irises open (value true): light falls on her; or close again
//   cue.domeDim               a Break lands while she holds the light: the gold drains out of her
//   cue.gardener_rage         at half health the crown flares and the whole garden heaves

import { Vector3 } from 'three';
import { playWaves } from '../../battle/actionfx.js';
import { ease } from '../../core/util.js';

const SUN = '#ffd27a';
const SAP = '#9dff7a';
const POLLEN = '#ffe98a';

const targetsOf = (d, act) => {
  const ids = new Set();
  for (const w of act.waves) for (const s of w.strikes) ids.add(s.hit.targetId);
  return [...(ids.size ? ids : act.event.targets || [])].map((id) => d.actor(id)).filter(Boolean);
};

/** A point high above her crown, where the dome light comes from. */
const skyOver = (a) => a.point('core').add(new Vector3(-0.4, 4.5, 0));

/** Her gold glow while she holds the light (the stage keeps a glowColor on). */
function holdLight(a, on) {
  a.glowColor = on ? SUN : null;
  a.sprite.setGlow(on ? SUN : null, on ? 1.4 : 0.7);
}

async function lash(d, act) {
  const a = act.actor;
  const t = targetsOf(d, act)[0];
  a.oneShot('attack');
  d.sfx('charge', { pitch: 1.3 });
  d.particles.emit('arb_vines', a.point('core'), { count: 8 });
  await d.wait(0.3);
  await playWaves(d, act, {
    before: async (w) => {
      d.sfx('slash', { pitch: 0.7 });
      d.engine.hitStop(80);
      d.engine.shake(0.16, 0.3);
      for (const s of w.strikes) {
        const tt = d.actor(s.hit.targetId) || t;
        if (!tt) continue;
        const c = tt.point('center');
        d.effects.streak(a.point('muzzle'), c, { color: SAP, length: 2.6, width: 0.42, dur: 0.12 });
        d.effects.sheet('slash', c, { scale: 2.2, rot: -0.35, color: SAP, intensity: 2.2 });
        d.effects.sheet('slash', c, { scale: 1.8, rot: 0.6, flip: true, intensity: 1.8 });
        d.particles.emit('arb_vines', c, { count: 10 });
      }
    },
  });
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function pollen(d, act) {
  const a = act.actor;
  a.oneShot('pollen');
  d.sfx('debuff', { pitch: 0.8 });
  const core = a.point('core');
  d.particles.emit('arb_pollen', core, { count: 40, spread: 1.4 });
  d.effects.sheet('ring', core, { scale: 2.6, color: POLLEN, intensity: 2.2 });
  await d.wait(0.45);
  // the cloud drifts over the squad and settles
  for (const t of targetsOf(d, act)) {
    d.particles.emit('arb_pollen', t.point('top'), { count: 18, spread: 0.6 });
    d.particles.emit('petal', t.point('top'), { count: 4 });
  }
  d.engine.flash('#fff2b0', 0.12, 0.4);
  await playWaves(d, act, {
    spacing: 0.05,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (t) d.effects.sheet('photon', t.point('center'), { scale: 1.4, intensity: 1.6 });
      }
      await d.wait(0.08);
    },
  });
  await d.results(act.post, a);
  await d.wait(0.25);
}

async function sow(d, act) {
  const a = act.actor;
  a.oneShot('sow');
  d.sfx('summon', { pitch: 0.8 });
  const hand = a.point('muzzle');
  d.particles.emit('arb_seeds', hand, { count: 24 });
  d.engine.shake(0.1, 0.5);
  await d.wait(0.3);
  d.sfx('rumble', { pitch: 1.2 });
  // the beds heave where the seeds land, ahead of her
  for (const off of [[2.4, -2.0], [2.6, 2.2]]) {
    const p = a.object3d.position.clone().add(new Vector3(off[0], 0.05, off[1]));
    d.effects.sheet('ring', p, { floor: true, scale: 2.4, color: SAP, intensity: 2 });
    d.particles.emit('arb_seeds', p.clone().setY(0.2), { count: 10 });
  }
  await d.wait(0.25);
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function gather(d, act) {
  const a = act.actor;
  a.oneShot('special');
  d.sfx('choir', { pitch: 1.2 });
  const core = a.point('core');
  d.particles.emit('arb_sun', skyOver(a), { count: 40, spread: 1.2 });
  d.effects.beam(skyOver(a), core, { color: SUN, width: 1.1, dur: 0.7, intensity: 2.4 });
  d.effects.sheet('ring', core, { scale: 2.8, color: SUN, intensity: 2.4 });
  holdLight(a, true);
  await d.wait(0.55);
  await d.results(act.post, a);
  await d.wait(0.15);
}

async function photosynthesis(d, act) {
  const a = act.actor;
  a.oneShot('special');
  d.sfx('heal', { pitch: 0.8 });
  const core = a.point('core');
  d.effects.beam(skyOver(a), core, { color: SUN, width: 1.6, dur: 0.8, intensity: 2.8 });
  d.particles.emit('arb_sun', skyOver(a), { count: 50, spread: 1.4 });
  d.engine.flash('#ffe9a8', 0.2, 0.5);
  await d.wait(0.35);
  d.effects.sheet('heal', a.object3d.position.clone().setY(0.1), { scale: 3, anchor: [0.5, 0.88], intensity: 1.8 });
  d.particles.emit('heal', a.point('center'), { count: 30, spread: 1.6 });
  d.particles.emit('arb_vines', a.point('center'), { count: 6 });
  holdLight(a, false);
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function defeat(d, act) {
  const a = act.actor;
  holdLight(a, false);
  d.sfx('break', { pitch: 0.7 });
  d.engine.flash('#e8ffd8', 0.25, 0.5);
  if (a.has('hurt')) a.oneShot('hurt');
  const c = a.point('core');
  for (let i = 0; i < 3; i++) {
    d.particles.emit('arb_vines', c.clone().add(new Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.3) * 2, 0.3)), { count: 22 });
    d.particles.emit('petal', c, { count: 8 });
    d.engine.shake(0.1, 0.3);
    await d.wait(0.22);
  }
  // the vines let go: she slumps, the green drains out, and she is gone into the light
  if (a.has('break')) a.sprite.play('break');
  d.sfx('transform', { pitch: 0.6 });
  d.effects.sheet('ring', a.object3d.position.clone().setY(0.05), { floor: true, scale: 6, color: SAP, intensity: 2 });
  d.particles.emit('arb_vines', a.point('center'), { count: 40, spread: 2.2 });
  await d.stage.tween(1.2, (k) => a.sprite.setOpacity(1 - k * 0.85), ease.inQuad);
  await d.stage.tween(0.3, (k) => a.sprite.setOpacity(0.15 * (1 - k)), ease.linear);
  d.ui.removeFoe(a.id);
}

async function domeLight(d, act) {
  const a = act.actor;
  if (!a || !a.alive || !act.event.value) return;
  d.sfx('choir', { pitch: 0.9 });
  d.particles.emit('arb_sun', skyOver(a), { count: 30, spread: 1.6 });
  d.engine.flash('#fff0c0', 0.12, 0.5);
  await d.wait(0.4);
}

async function domeDim(d, act) {
  const a = act.actor;
  if (!a) return;
  holdLight(a, false);
  d.sfx('debuff', { pitch: 0.7 });
  if (a.alive) a.oneShot('hurt');
  d.particles.emit('arb_vines', a.point('core'), { count: 12 });
  d.effects.sheet('debuff', a.point('center'), { scale: 2.4, intensity: 1.8 });
  await d.wait(0.4);
}

async function rage(d, act) {
  const a = act.actor;
  d.sfx('rumble', { pitch: 0.7 });
  d.engine.flash('#ff9ccb', 0.25, 0.5);
  d.engine.shake(0.3, 0.7);
  if (!a) return;
  a.oneShot('attack');
  a.sprite.flash('#ff4fa0', 0.5);
  d.particles.emit('petal', a.point('core'), { count: 30 });
  d.particles.emit('arb_vines', a.point('core'), { count: 30, spread: 1.6 });
  d.effects.sheet('ring', a.point('core'), { scale: 3.2, color: '#ff4fa0', intensity: 2.4 });
  await d.wait(0.6);
}

export default {
  'gardener.lash': lash,
  'gardener.pollen': pollen,
  'gardener.sow': sow,
  'gardener.gather': gather,
  'gardener.photosynthesis': photosynthesis,
  'gardener.defeat': defeat,
  'cue.domeLight': domeLight,
  'cue.domeDim': domeDim,
  'cue.gardener_rage': rage,
};
