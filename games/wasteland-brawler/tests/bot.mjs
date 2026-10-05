// Autopilot playthrough: a simple bot plays a stage (or the whole game) and reports progress,
// deaths, stuck states and page errors. Screenshots every --every frames.
// node tests/bot.mjs [--stage 0|1|2|all] [--god] [--frames 30000] [--every 1200] [--out dir] [--html path] [--wave N] [--stub keys]
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { openGame, argv, root, stubEnemies } from './lib.mjs';

const o = argv();
const out = resolve(o.out || join(root, 'tests', 'out', 'bot'));
mkdirSync(out, { recursive: true });
const g = await openGame(o.html);
if (o.stub) {
  const keys = String(o.stub).split(',');
  console.log('stubbed:', await stubEnemies(g, keys));
  // if a stage is missing, the test arena gets a few waves of the stub types
  await g.ev(keys => { TEST_ARENA.len = 1600; TEST_ARENA.waves = [0, 400, 800].map((at, i) => ({ at, spawns: keys.concat(keys).map((k, j) => ({ type: k, side: j % 2 ? 'L' : 'R', delay: j * 40 })) })); }, keys);
}
const maxFrames = +(o.frames || 30000), every = +(o.every || 1200);
const stageArg = o.stage == null ? 'all' : String(o.stage);

await g.ev(({ stage, wave }) => {
  const w = window.__wb;
  w.play(stage === 'all' ? 0 : +stage, wave ? +wave : 0);
  w.dmgLog = {};
  const ol = Player.prototype.onLanded;
  Player.prototype.onLanded = function (t, a, dmg, tier) { const k = (t.type || t.kind || t.constructor.name) + (t.state ? ':' + t.state : ''); const e = w.dmgLog[k] || (w.dmgLog[k] = [0, 0]); e[0]++; e[1] += dmg || a.dmg || 0; return ol.call(this, t, a, dmg, tier); };
  // score attribution: group addScore calls by caller
  w.scoreLog = {};
  const add = w.Game.addScore.bind(w.Game);
  w.Game.addScore = n => { const st = (new Error().stack || '').split('\n')[2] || '?'; const k = st.replace(/.*\/wasteland-brawler\.html:/, 'L').replace(/:\d+\)?$/, '').trim(); w.scoreLog[k] = (w.scoreLog[k] || 0) + Math.round(n); return add(n); };
  // The bot lives in the page so it can decide every frame.
  w.bot = {
    t: 0, lastCam: 0, stillFor: 0, log: [], deaths: 0, lastLives: w.Game.lives, stuckReports: 0,
    think() {
      const G = w.Game, I = w.Input, p = G.player;
      I.key = {};
      this.t++;
      if (G.state === 'story' || G.state === 'stageintro' || G.state === 'clear') { if (this.t % 20 === 0) I.key.attack = true; return; }
      if (G.state === 'continue') { if (this.t % 30 === 0) I.key.attack = true; return; }
      if (G.state !== 'play' || !p) return;
      const foes = G.foes().filter(e => !e.dying && e.state !== 'down' && e.x > G.cam.x - 10 && e.x < G.cam.x + W + 10 && !e.ignoreForWave);
      // low HP: go for food
      const food = G.ents.find(e => e.team === 'item' && ITEM_DEFS[e.kind].heal && p.hp < 50 && Math.abs(e.x - p.x) < 200);
      const weapon = !p.weapon && G.ents.find(e => e.team === 'item' && ITEM_DEFS[e.kind].weapon && Math.abs(e.x - p.x) < 80);
      const goal = food || weapon;
      let tx = null, ty = null;
      if (goal && (foes.length === 0 || Math.abs(goal.x - p.x) < 40)) {
        tx = goal.x; ty = goal.y;
        if (Math.abs(goal.x - p.x) < 8 && Math.abs(goal.y - p.y) < 5) { if (this.t % 4 === 0) I.key.attack = true; return; }
      } else if (foes.length) {
        const t = foes.sort((a, b) => (Math.abs(a.x - p.x) + Math.abs(a.y - p.y) * 2) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y) * 2))[0];
        const near = foes.filter(e => Math.abs(e.x - p.x) < 40 && Math.abs(e.y - p.y) < 14).length;
        if (near >= 3 && p.hp > 25 && this.t % 30 === 0) { I.key.special = true; return; }
        if (G.rage >= 100 && near >= 2 && this.t % 2 === 0) { I.key.special = true; return; }   // tap, never hold (a held key never re-presses)
        const side = t.x > p.x ? -1 : 1;
        tx = t.x + side * (18 + (t.w || 8)); ty = t.y;
        const dx = Math.abs(t.x - p.x), dy = Math.abs(t.y - p.y);
        if (dy <= 4 && dx <= 26 + (t.w || 8)) {
          if (Math.sign(t.x - p.x) !== p.facing) I.key[t.x > p.x ? 'right' : 'left'] = true;
          else if (this.t % 6 === 0) I.key.attack = true;
          if (this.t % 90 === 0) { I.key.jump = true; }
          return;
        }
      } else {
        tx = p.x + 60; ty = (G.bounds.yMin + G.bounds.yMax) / 2;
      }
      if (tx != null) {
        // steer around solids and hazards that sit between us and the target: pick the nearest free lane
        const dir = Math.sign(tx - p.x);
        if (dir) {
          const blockers = G.solids.filter(r => !r.off && r.x0 - 14 < p.x + dir * 34 && r.x1 + 14 > p.x + dir * 2 && (dir > 0 ? r.x1 > p.x : r.x0 < p.x)).map(r => [r.y0 - 9, r.y1 + 9])
            .concat(G.ents.filter(e => (e.constructor.name === 'BurningBarrel' || e.toxic) && Math.sign(e.x - p.x) === dir && Math.abs(e.x - p.x) < 40).map(e => [e.y - 12, e.y + 12]));
          const free = y => blockers.every(([a, b]) => y <= a || y >= b);
          if (!free(p.y)) {
            let best = null;
            for (let y = G.bounds.yMin + 2; y <= G.bounds.yMax - 2; y += 2) if (free(y - 3) && free(y + 3) && free(y) && (best == null || Math.abs(y - p.y) < Math.abs(best - p.y))) best = y;
            if (best != null) { ty = best; tx = p.x; }
          }
        }
        if (Math.abs(tx - p.x) > 3) I.key[tx > p.x ? 'right' : 'left'] = true;
        if (Math.abs(ty - p.y) > 1) I.key[ty > p.y ? 'down' : 'up'] = true;
        else if (Math.abs(tx - p.x) <= 3 && foes.length === 0 && !goal) I.key.right = true;
      }
    },
  };
}, { stage: stageArg, wave: o.wave });

let shot = 0, f = 0;
const startStage = await g.ev(() => window.__wb.Game.stageIndex);
for (; f < maxFrames; f += 60) {
  const s = await g.ev(({ god }) => {
    const w = window.__wb, G = w.Game, b = w.bot;
    for (let i = 0; i < 60; i++) {
      if (god && G.player) { G.player.hp = Math.max(G.player.hp, 80); G.time = 99; }
      b.think();
      w.step(1);
      if (G.lives < b.lastLives) { b.deaths++; }
      b.lastLives = G.lives;
    }
    // stuck detection: in play, no living foes, camera not moving for 20 s
    if (G.state === 'play') {
      if (Math.abs(G.cam.x - b.lastCam) < 1 && G.livingFoes().length === 0) b.stillFor += 60; else b.stillFor = 0;
      b.lastCam = G.cam.x;
    }
    const p = G.player;
    return { state: G.state, stage: G.stageIndex, wave: G.waveIdx, waves: G.stage ? G.stage.waves.length : 0, cam: Math.round(G.cam.x), lock: G.cam.lock,
      hp: p ? Math.round(p.hp) : null, pst: p ? [p.state, p.t, Math.round(p.x), Math.round(p.y), Math.round(p.z), p.sub || '', p.atk ? p.atk.pose : '', !!p.heldBy, !!p.grabbing, G.playerGone].join('/') : null, lives: G.lives, credits: G.credits, score: G.score, foes: G.livingFoes().map(e => e.type + ':' + Math.round(e.hp) + ':' + e.state),
      stuck: b.stillFor, deaths: b.deaths, dbg: [G.hitstop, G.slow, G.slowScale, G.superFreeze, p && p.hs, p && p.deathFx, p && p.inv, G.bossCardInfo ? 1 : 0, G.state].join('/'), ents: G.ents.length, parts: w.FX.parts.length, time: G.time };
  }, { god: !!o.god });
  if (f % every === 0) await g.shot(join(out, `bot-${String(shot++).padStart(3, '0')}.png`));
  if (f % 600 === 0) console.log(`f${f}`, JSON.stringify(s));
  if (s.stuck > 1200) { console.log('STUCK', JSON.stringify(s)); await g.shot(join(out, 'stuck.png')); break; }
  if (stageArg !== 'all' && (s.stage !== startStage || s.state === 'story' || s.state === 'results')) { console.log('STAGE DONE', JSON.stringify(s)); break; }
  if (['results', 'entry', 'gameover', 'title'].includes(s.state)) { console.log('RUN OVER', JSON.stringify(s)); break; }
}
const scores = await g.ev(() => Object.entries(window.__wb.scoreLog).sort((a, b) => b[1] - a[1]).slice(0, 12));
console.log('score sources', JSON.stringify(scores));
console.log('damage by target', JSON.stringify(await g.ev(() => Object.entries(window.__wb.dmgLog).sort((a, b) => b[1][1] - a[1][1]).slice(0, 15))));
const fin = await g.ev(() => window.__wb.snapshot());
console.log('final', JSON.stringify({ state: fin.state, stage: fin.stage, wave: fin.wave, hp: fin.hp, lives: fin.lives, score: fin.score, frames: f }));
console.log(g.errors.length ? 'ERRORS:\n' + g.errors.slice(0, 20).join('\n') : 'no page errors');
await g.close();
