// vault: battle choreography for ECHO (browser, TECH_PLAN 7.4, 7.9). Each plays every strike with
// d.strike (through playWaves) and ends with d.results, so the model's untargetable, telegraph and
// break events ride in `post`.
//
//   echo.mirror     she raises a pane of glass and sends the squad's own element back at one of them
//   echo.twelve     arms up, the ring of names blazes and twelve thousand of them rain down on everyone
//   echo.phase      Glitch Phase: she tears into scanlines and slips out of step
//   echo.charge     the Severance begins: she splits in two, the Core and the light turn gold
//   echo.severance  the night she split, all at once: a white seam across the squad, then the blast
//   echo.defeat     she stills, the tears stop, and she comes apart into quiet cyan light
//   cue.echo_falter at half health (Orion's line) she falters: a cyan flash, the glitching stutters

import { Vector3 } from 'three';
import { playWaves } from '../../battle/actionfx.js';
import { ease } from '../../core/util.js';

const CYAN = '#7ff4ff';
const MAGENTA = '#ff4fd0';
const GOLD = '#ffc84a';
const TYPE_COLOR = {
  thermal: '#ff8a2a', cryo: '#9ff0ff', volt: '#ffe45a', photon: '#fff0a0', void: '#b98cff',
  blade: '#e8f0ff', gauntlet: '#ffd8b0', lance: '#d0e8ff',
};
const ELEMENTS = new Set(['thermal', 'cryo', 'volt', 'photon', 'void']);

const targetsOf = (d, act) => {
  const ids = new Set();
  for (const w of act.waves) for (const s of w.strikes) ids.add(s.hit.targetId);
  return [...(ids.size ? ids : act.event.targets || [])].map((id) => d.actor(id)).filter(Boolean);
};

async function mirror(d, act) {
  const a = act.actor;
  const type = act.event.damageType;
  const color = TYPE_COLOR[type] || CYAN;
  a.oneShot('attack');
  d.sfx('shard', { pitch: 1.3 });
  const m = a.point('muzzle');
  d.effects.sheet('glint', m, { scale: 2.2, color, intensity: 2.6 });
  await d.wait(0.28);
  d.sfx('enemyShot', { pitch: 1.2 });
  d.particles.emit('va_shards', m, { count: 14 });
  await playWaves(d, act, {
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const c = t.point('center');
        await d.effects.orb(m, c, { color, size: 0.8, dur: 0.22, trail: 'glitch' });
        d.effects.sheet(ELEMENTS.has(type) ? type : 'impact', c, { scale: 1.5, color: ELEMENTS.has(type) ? null : color, intensity: 2.4 });
        if (ELEMENTS.has(type)) d.particles.emit(type, c, { count: 12 });
      }
    },
  });
  await d.results(act.post, a);
  await d.wait(0.18);
}

async function twelve(d, act) {
  const a = act.actor;
  a.sprite.setGlow(CYAN, 1.2);
  if (a.has('cast')) a.oneShot('cast');
  d.sfx('choir', { pitch: 0.8 });
  const top = a.point('top');
  d.particles.emit('va_names', a.point('core'), { count: 40 });
  d.effects.sheet('ring', top, { scale: 2.6, color: CYAN, intensity: 2.4 });
  d.stage.focus({ zoom: 0.94, rate: 3 });
  await d.wait(0.5);
  await playWaves(d, act, {
    spacing: 0.05,
    before: async (w) => {
      d.sfx('glitch', { pitch: 1.4 });
      d.engine.flash('#d8f8ff', 0.12, 0.3);
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const c = t.point('center');
        // a rain of names: short streaks falling on each of them
        for (let k = 0; k < 4; k++) {
          const from = c.clone().add(new Vector3((Math.random() - 0.5) * 1.6, 4 + Math.random() * 2, 0));
          d.effects.streak(from, c.clone().add(new Vector3((Math.random() - 0.5) * 0.6, 0, 0)), { color: k % 2 ? MAGENTA : CYAN, dur: 0.12, length: 1.4, width: 0.18 });
        }
        d.particles.emit('va_names', c, { count: 12 });
        d.effects.sheet('void', c, { scale: 1.2 + t.size * 0.3, intensity: 2.2 });
      }
      await d.wait(0.08);
    },
  });
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.2);
}

async function phase(d, act) {
  const a = act.actor;
  if (a.has('special')) a.oneShot('special');
  d.sfx('glitch', { pitch: 0.7 });
  const c = a.point('core');
  d.particles.emit('glitch', c, { count: 40, spread: 2 });
  d.effects.sheet('ring', a.object3d.position.clone().setY(0.05), { floor: true, scale: 5, color: CYAN, intensity: 2.2 });
  d.engine.shake(0.08, 0.3);
  await d.wait(0.35);
  await d.results(act.post, a);
  await d.wait(0.15);
}

async function charge(d, act) {
  const a = act.actor;
  if (a.has('charge')) a.oneShot('charge');
  d.stage.react({ type: 'cue', name: 'echo_gold', on: true });
  d.sfx('charge', { pitch: 0.55 });
  a.sprite.setGlow(GOLD, 1.6);
  const c = a.point('core');
  d.particles.emit('mote', c, { count: 30, spread: 1.6 });
  d.effects.sheet('ring', c, { scale: 3, color: GOLD, intensity: 2.6 });
  d.stage.focus({ shiftX: -0.5, zoom: 0.95, rate: 3 });
  await d.wait(0.7);
  await d.results(act.post, a);
  await d.wait(0.15);
}

async function severance(d, act) {
  const a = act.actor;
  if (a.has('charge')) a.oneShot('charge');
  a.sprite.setGlow('#fff4d8', 2.2);
  d.sfx('charge', { pitch: 0.45 });
  const c = a.point('core');
  const ts = targetsOf(d, act);
  // a white seam opens across the squad
  if (ts.length) {
    const left = ts[0].point('center').clone(), right = ts[ts.length - 1].point('center').clone();
    left.x -= 1.5; right.x += 1.5;
    d.effects.beam(left, right, { color: '#fff4d8', width: 0.08, dur: 0.6, intensity: 3 });
  }
  await d.wait(0.6);
  if (a.has('cast')) a.oneShot('cast');
  d.sfx('enemyBeam', { pitch: 0.5 });
  d.engine.flash('#fff0c8', 0.3, 0.5);
  d.engine.shake(0.4, 0.7);
  await playWaves(d, act, {
    spacing: 0.04,
    before: async (w) => {
      for (const s of w.strikes) {
        const t = d.actor(s.hit.targetId);
        if (!t) continue;
        const tc = t.point('center');
        d.effects.beam(c, tc, { color: GOLD, width: 0.7, dur: 0.45, intensity: 2.8 });
        d.effects.sheet('void', tc, { scale: 2 + t.size * 0.4, intensity: 2.6 });
        d.effects.sheet('ring', t.object3d.position.clone().setY(0.04), { floor: true, scale: 3, color: MAGENTA, intensity: 2.4 });
        d.particles.emit('glitch', tc, { count: 18 });
        await d.wait(0.04);
      }
    },
  });
  d.stage.react({ type: 'cue', name: 'echo_gold', on: false });
  a.sprite.setGlow(null);
  await d.results(act.post, a);
  await d.wait(0.25);
}

async function defeat(d, act) {
  const a = act.actor;
  const c = a.point('core');
  d.stage.react({ type: 'cue', name: 'echo_gold', on: false });
  d.sfx('glitch', { pitch: 0.5 });
  if (a.has('hurt')) a.oneShot('hurt');
  for (let i = 0; i < 3; i++) {
    d.particles.emit('glitch', c.clone().add(new Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3, 0.3)), { count: 20 });
    d.engine.shake(0.1, 0.25);
    await d.wait(0.24);
  }
  // the tears stop; she goes still and comes apart into quiet light
  d.sfx('awaken', { pitch: 0.8 });
  d.engine.flash('#d8fbff', 0.22, 0.6);
  a.sprite.setGlow(CYAN, 1.4);
  if (a.has('special')) a.oneShot('special');
  d.particles.emit('holo', c, { count: 60, spread: 2.4 });
  d.particles.emit('va_names', a.object3d.position.clone().setY(0.5), { count: 40 });
  await d.stage.tween(1.4, (k) => a.sprite.setOpacity(1 - k), ease.inQuad);
  d.ui.removeFoe(a.id);
}

async function falter(d, act) {
  const a = act.actor;
  d.sfx('glitch', { pitch: 0.6 });
  d.engine.flash('#c8fbff', 0.28, 0.5);
  d.engine.shake(0.16, 0.4);
  if (!a) return;
  a.sprite.flash(CYAN, 0.5);
  if (!a.untargetable && a.has('hurt')) a.oneShot('hurt');
  d.particles.emit('holo', a.point('core'), { count: 40, spread: 1.6 });
  await d.wait(0.5);
}

export default {
  'echo.mirror': mirror,
  'echo.twelve': twelve,
  'echo.phase': phase,
  'echo.charge': charge,
  'echo.severance': severance,
  'echo.defeat': defeat,
  'cue.echo_falter': falter,
};
