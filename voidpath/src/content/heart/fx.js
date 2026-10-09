// heart: battle choreography for the Ascent's foes (browser, TECH_PLAN 7.4). Each plays every strike
// with d.strike (through playWaves) and ends with d.results, so the model's status events ride in
// `post`.
//
//   heart.lullaby     a hymn: gold rings roll out from the singer over the whole squad, motes of sleep
//                     settle on them (the seraphs' Lullaby, the golem's Glacial Hymn, the Hymn Pollen)
//   cue.cradle_up     a Choir Guardian throws its cradle rings: gold hoops drop over each ally it shields
//   cue.cradle_down   the rings break: a ringing flash at the guardian

import { Vector3 } from 'three';
import { playWaves } from '../../battle/actionfx.js';

const GOLD = '#ffd27a';

async function lullaby(d, act) {
  const a = act.actor;
  a.sprite.setGlow(GOLD, 1.4);
  a.oneShot(a.has('special') && act.def?.pose === 'special' ? 'special' : 'attack');
  d.sfx('choir', { pitch: 1.1 });
  const from = a.point('center');
  for (let k = 0; k < 3; k++) d.effects.sheet('ring', from, { scale: 1.6 + k * 0.9, color: GOLD, intensity: 2.2 });
  d.particles.emit('hr_hymn', from, { count: 18 });
  await d.wait(0.45);
  await playWaves(d, act, {
    spacing: 0.04,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const c = t.point('center');
        d.effects.sheet('ring', c, { scale: 1.3, color: GOLD, intensity: 2.0 });
        d.particles.emit('hr_motes', c.clone().add(new Vector3(0, 0.6, 0)), { count: 8 });
      }
    },
  });
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.12);
}

async function cradleUp(d, act) {
  const g = act.actor;
  d.sfx('choir', { pitch: 0.8 });
  if (g) {
    if (g.has('special')) g.oneShot('special');
    g.sprite.flash(GOLD, 0.4);
    d.effects.sheet('ring', g.point('top'), { scale: 2.4, color: GOLD, intensity: 2.4 });
  }
  await d.wait(0.3);
  for (const e of d.stage.enemies) {
    if (!e.alive || e === g || !e.untargetable) continue;
    d.effects.sheet('ring', e.point('center'), { scale: 1.8, color: GOLD, intensity: 2.2 });
    d.particles.emit('hr_hymn', e.point('top'), { count: 10 });
  }
  await d.wait(0.35);
}

async function cradleDown(d, act) {
  const g = act.actor;
  d.sfx('shard', { pitch: 0.7 });
  d.engine.flash('#fff0c0', 0.12, 0.35);
  if (g) d.particles.emit('hr_hymn', g.point('center'), { count: 20 });
  await d.wait(0.3);
}

export default {
  'heart.lullaby': lullaby,
  'cue.cradle_up': cradleUp,
  'cue.cradle_down': cradleDown,
};
