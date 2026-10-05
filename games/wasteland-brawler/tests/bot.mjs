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
      const food = G.ents.find(e => e.team === 'item' && ITEM_DEFS[e.kind].heal && p.hp < 70);
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
        if (G.rage >= 100 && near >= 2) { I.key.special = true; return; }
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
        if (Math.abs(tx - p.x) > 3) I.key[tx > p.x ? 'right' : 'left'] = true;
        if (Math.abs(ty - p.y) > 2) I.key[ty > p.y ? 'down' : 'up'] = true;
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
      if (god && G.player) { G.player.hp = Math.max(G.player.hp, 60); G.time = 99; }
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
      hp: p ? Math.round(p.hp) : null, lives: G.lives, credits: G.credits, score: G.score, foes: G.livingFoes().map(e => e.type + ':' + Math.round(e.hp) + ':' + e.state),
      stuck: b.stillFor, deaths: b.deaths, ents: G.ents.length, parts: w.FX.parts.length, time: G.time };
  }, { god: !!o.god });
  if (f % every === 0) await g.shot(join(out, `bot-${String(shot++).padStart(3, '0')}.png`));
  if (f % 600 === 0) console.log(`f${f}`, JSON.stringify(s));
  if (s.stuck > 1200) { console.log('STUCK', JSON.stringify(s)); await g.shot(join(out, 'stuck.png')); break; }
  if (stageArg !== 'all' && (s.stage !== startStage || s.state === 'story' || s.state === 'results')) { console.log('STAGE DONE', JSON.stringify(s)); break; }
  if (['results', 'entry', 'gameover', 'title'].includes(s.state)) { console.log('RUN OVER', JSON.stringify(s)); break; }
}
const fin = await g.ev(() => window.__wb.snapshot());
console.log('final', JSON.stringify({ state: fin.state, stage: fin.stage, wave: fin.wave, hp: fin.hp, lives: fin.lives, score: fin.score, frames: f }));
console.log(g.errors.length ? 'ERRORS:\n' + g.errors.slice(0, 20).join('\n') : 'no page errors');
await g.close();
