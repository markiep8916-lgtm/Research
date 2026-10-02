import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 1280, h: 720 });
await g.eval(() => {
  const G = window.__bd.game;
  G.save.abilities = { roll: true, pound: false, grip: false, boom: false }; G.save.hpMax = 6; G.save.hp = 4; G.save.bananas = 37;
  G.save.visited = { j_start: true, j_canopy: true };
  G.newGame();
  G.save.abilities = { roll: true, pound: false, grip: false, boom: false }; G.save.hpMax = 6; G.save.hp = 4; G.save.bananas = 37;
  G.hud.refresh(true);
});
await g.run([{ n: 30, held: [] }]);
await g.eval(() => window.__bd.game.togglePause()); await g.run([{ n: 3, held: [] }]); await g.shot('ui_pause.png');
await g.eval(() => window.__bd.game.menus.showControls('pause')); await g.shot('ui_controls.png');
await g.eval(() => window.__bd.game.menus.showOptions('pause')); await g.shot('ui_options.png');
await g.eval(() => { const G = window.__bd.game; G.menus.hideAll(); G.state = 'map'; G.menus.showMap(); }); await g.run([{ n: 3, held: [] }]); await g.shot('ui_map.png');
await g.eval(() => { const G = window.__bd.game; G.menus.hideAll(); G.state = 'play'; G.hud.showSign('Welcome home, Kong!\nMove with the arrow keys (or A / D).  Jump with Space.'); });
await g.shot('ui_sign.png');
await g.eval(() => { const G = window.__bd.game; G.hud.hideSign(); G.startItemGet({ ability: 'roll', color: 0xffb13a }); G.save.abilities.roll = true; });
await g.run([{ n: 70, held: [] }]); await g.shot('ui_item.png');
await g.eval(() => { const G = window.__bd.game; G.endItemGet(); G.state = 'ending'; G.menus.showEnding(); G.hud.show(false); }); await g.shot('ui_ending.png');
console.log('errors:', g.errors().filter((e) => !/ERR_CERT|net::|\[world\]/.test(e)).join('\n') || 'none');
await g.close();
// phone landscape with touch
const t = await openGame({ w: 844, h: 390, touch: true });
await t.eval(() => { const G = window.__bd.game; G.newGame(); G.save.abilities = { roll: true, pound: false, grip: false, boom: true }; });
await t.run([{ n: 40, held: [] }]); await t.shot('ui_touch.png');
console.log('touch class:', await t.eval(() => document.getElementById('app').className));
console.log('errors:', t.errors().filter((e) => !/ERR_CERT|net::|\[world\]/.test(e)).join('\n') || 'none');
await t.close();
