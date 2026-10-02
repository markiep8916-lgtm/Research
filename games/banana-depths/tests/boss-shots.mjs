import { openGame } from '../tools/harness.mjs';
const which = process.argv[2] || 'golem';
const cfg = { golem: ['t_golem', 5, 3], queen: ['c_queen', 5, 3], overlord: ['g_top', 6, 3] }[which];
const g = await openGame({ w: 1280, h: 720 });
await g.eval(([room, x, y]) => {
  const G = window.__bd.game;
  G.save.abilities = { roll: true, pound: true, grip: true, boom: true };
  G.save.hpMax = 6; G.save.hp = 6;
  G.menus.hideAll(); G.hud.show(true); G.state = 'play';
  G.loadRoom(room, { x, y, face: 1 });
}, cfg);
const frames = which === 'queen' ? [190, 100, 160, 200, 200] : which === 'overlord' ? [180, 90, 160, 200, 200] : [175, 60, 120, 150, 180];
for (let i = 0; i < frames.length; i++) {
  const snap = await g.run([{ n: frames[i], held: i === 0 ? ['right'] : [] }]);
  console.log(i, JSON.stringify({ boss: snap.boss, hp: snap.hp, x: snap.x, y: snap.y, state: snap.state }));
  await g.shot(`boss_${which}_${i}.png`);
}
console.log('errors:', g.errors().filter((e) => !/ERR_CERT|net::/.test(e)).join('\n') || 'none');
await g.close();
