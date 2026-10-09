// prologue: battle action choreography (browser, TECH_PLAN 2.5 and 7.4).
//   'pro_sentinel.defeat'   the SENTINEL's end: blowouts along the chassis, its core flares and
//                           gutters, and it drops to its knees, a dim wreck (the field keeps it so)
//   'cue.sentinel_alarm'    its 50% beat (G2 C1-4): the alarm, a red strobe, sparks off the chassis;
//                           the pro_bridge arena keeps its lamps strobing for the rest of the fight
// Keyed by the enemy kind, not the art: 'sentinel.defeat' would also catch the Mk-I patrols and
// every dev boss drawn with the Sentinel art.

import { Vector3 } from 'three';
import { ease } from '../../core/util.js';

const RED = '#ff3b4e';

async function sentinelDefeat(d, act) {
  const a = act.actor;
  const core = a.point('core');
  d.sfx('break', { pitch: 0.7 });
  if (a.has('hurt')) a.oneShot('hurt');
  // three blowouts along the chassis, the last one at the core
  for (let i = 0; i < 3; i++) {
    const p = i < 2
      ? core.clone().add(new Vector3((i ? 0.6 : -0.7) * a.halfW, (Math.random() - 0.2) * a.size * 0.4, 0.25))
      : core.clone().add(new Vector3(0, 0, 0.3));
    d.particles.emit('spark', p, { count: 18 });
    d.effects.sheet('impact', p, { scale: 1.3 + i * 0.4, color: i < 2 ? '#ffb35a' : RED, intensity: 2.4 });
    d.sfx('impact', { pitch: 0.8 - i * 0.1 });
    d.engine.shake(0.1 + i * 0.05, 0.25);
    await d.wait(0.22);
  }
  // the core flares red one last time and gutters out
  d.sfx('glitch');
  a.sprite.setGlow(RED, 2.6);
  d.effects.sheet('ring', core, { scale: 2.8, color: RED, intensity: 2.6 });
  d.particles.emit('smoke', core, { count: 18, spread: 1.2 });
  await d.wait(0.35);
  // down on one knee: the dust of the impact, then the dark
  if (a.has('break')) a.rest('break');
  d.sfx('rumble', { pitch: 0.8 });
  d.engine.shake(0.24, 0.5);
  const floor = a.object3d.position.clone().setY(0.1);
  d.effects.sheet('ring', floor, { floor: true, scale: 5, color: '#ffb35a', intensity: 1.6 });
  d.particles.emit('smoke', floor.clone().setY(0.4), { count: 26, spread: 2.4 });
  await d.stage.tween(0.9, (k) => a.sprite.setGlow(RED, 2.6 * (1 - k)), ease.outQuad);
  a.sprite.setGlow(null);
  d.sfx('laser_off', { pitch: 0.6 });
  await d.stage.tween(0.6, (k) => a.sprite.setOpacity(1 - 0.4 * k), ease.linear);
  d.ui.removeFoe(a.id);
}

async function sentinelAlarm(d, act) {
  const a = act.actor;
  d.sfx('alarm');
  for (let i = 0; i < 3; i++) {
    d.engine.flash(RED, 0.12, 0.35);
    if (a) {
      const p = a.point('core').clone().add(new Vector3((Math.random() - 0.5) * a.halfW * 1.6, (Math.random() - 0.3) * a.size * 0.5, 0.3));
      d.particles.emit('spark', p, { count: 16 });
      a.sprite.setGlow(RED, 2.2);
    }
    d.engine.shake(0.08, 0.15);
    await d.wait(0.16);
    if (a) a.sprite.setGlow(RED, 0.6);
    await d.wait(0.1);
  }
  if (a) a.sprite.setGlow(null);
}

export default { 'pro_sentinel.defeat': sentinelDefeat, 'cue.sentinel_alarm': sentinelAlarm };
