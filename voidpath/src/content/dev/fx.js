// dev battle choreography (S4): test fx for the canned fixtures and the dev encounters.
//   'dev.beam'       enemy action: a charge-up, then a sweeping beam across every target
//   'dev.defeat'     defeat choreography for dev_* bosses: the foe sinks to its knees and burns out
//   'cue.dev_flare'  cue handler: a flare from the arena core (pairs with the dev_lab arena's react)

import { Vector3 } from 'three';
import { playWaves } from '../../battle/actionfx.js';
import { ease } from '../../core/util.js';

async function beam(d, act) {
  const a = act.actor;
  const m = a.point(a.points.core ? 'core' : 'muzzle');
  a.sprite.setGlow('#ff4fc0', 1.8);
  d.sfx('charge');
  d.particles.emit('void', m, { count: 30, spread: 1.2 });
  d.effects.sheet('ring', m, { scale: 1.8, color: '#ff4fc0', intensity: 2.4 });
  await d.wait(0.45);
  a.oneShot('attack');
  d.sfx('enemyBeam', { pitch: 0.8 });
  await playWaves(d, act, {
    spacing: 0.05,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        d.effects.beam(m, t.point('center'), { color: '#ff63e0', width: 0.6, dur: 0.32, intensity: 2.8 });
        d.effects.sheet('impact', t.point('center'), { scale: 1.4, color: '#ff63e0', intensity: 2.2 });
        await d.wait(0.08);
      }
      d.engine.shake(0.14, 0.3);
    },
  });
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function defeat(d, act) {
  const a = act.actor;
  const c = a.point(a.points.core ? 'core' : 'center');
  d.sfx('break');
  d.engine.flash('#ffffff', 0.25, 0.5);
  for (let i = 0; i < 4; i++) {
    const p = c.clone().add(new Vector3((Math.random() - 0.5) * a.halfW * 2, (Math.random() - 0.3) * a.size, 0.2));
    d.particles.emit('spark', p, { count: 14 });
    d.effects.sheet('impact', p, { scale: 1.2, color: '#ffb35a', intensity: 2.2 });
    d.engine.shake(0.1, 0.2);
    await d.wait(0.16);
  }
  if (a.has('break')) a.rest('break');
  await d.stage.tween(0.9, (k) => { a.sink = k * 0.25; a.sprite.setOpacity(1 - k * 0.85); }, ease.inQuad);
  d.particles.emit('smoke', a.object3d.position, { count: 16 });
  await d.stage.tween(0.4, (k) => a.sprite.setOpacity(0.15 * (1 - k)), ease.linear);
  d.ui.removeFoe(a.id);
}

async function flare(d, act) {
  const at = act.actor ? act.actor.point('center') : new Vector3(-4, 2.4, -2);
  d.engine.flash('#ffd27a', 0.2, 0.35);
  d.effects.sheet('photon', at, { scale: 2.4, intensity: 2.4 });
  d.particles.emit('photon', at, { count: 30 });
  await d.wait(0.4);
}

export default { 'dev.beam': beam, 'dev.defeat': defeat, 'cue.dev_flare': flare };
