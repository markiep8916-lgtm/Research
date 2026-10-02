import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 640, h: 360 });
const r = await g.eval(async () => {
  const G = window.__bd.game, A = G.audio;
  A.unlock();
  await new Promise((res) => setTimeout(res, 300));
  const out = { state: A.ctx && A.ctx.state, names: [] };
  // fire every sfx the code references
  const names = ['jump','rolljump','land','step','roll','spring','poundWind','poundFall','pound','drop','grab','hurt','lava','splash','respawn','slap','boomerang','throw','catch','banana','heart','item','save','switch','door','crate','slab','clang','hit','pop','stomp','snap','bat','fire','fizz','reflect','blob','rock','cannon','menu','tick','die','roar','bossHit','bossDie','warn','shockwave','web','bogus_name'];
  for (const n of names) { try { A.sfx(n); out.names.push(n); } catch (e) { out.err = n + ': ' + e.message; break; } }
  for (const t of ['title','jungle','temple','cavern','quarry','tower','boss','victory']) {
    try { A.music(t); await new Promise((res) => setTimeout(res, 120)); } catch (e) { out.err = 'music ' + t + ': ' + e.message; break; }
  }
  out.track = A.track; out.seqStep = A.seq && A.seq.step;
  A.duck(true); A.duck(false); A.configure({ volume: 0.5, music: false });
  return out;
});
console.log(JSON.stringify({ state: r.state, played: r.names.length, err: r.err, track: r.track, seqStep: r.seqStep }));
console.log('page errors:', g.errors().filter((e) => !/ERR_CERT|net::|\[world\]/.test(e)).join('\n') || 'none');
await g.close();
