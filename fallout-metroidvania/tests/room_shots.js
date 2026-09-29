// Screenshot every room (or a chosen list) for visual QA.
// usage: node tests/room_shots.js <outdir> [--rooms a,b] [--zoom 0.5] [--region plant] [--w 1600] [--h 900]
//        [--at lx,ly[;lx,ly...]]  natural-view shots: the player stands at the nearest floor to each ROOM-LOCAL tile (use with --rooms one room, --zoom 1.25)
const { open } = require('./harness');
const fs = require('fs');
const argv = process.argv.slice(2);
const out = argv[0] || '/tmp/rooms';
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
fs.mkdirSync(out, { recursive: true });
(async () => {
  const W = +opt('w', 1600), Hh = +opt('h', 900), Z = +opt('zoom', 0.5);
  const h = await open('start=1&kit=1&abilities=all&god=1', { w: W, h: Hh });
  const rooms = await h.T(() => window.__G.world.rooms.map((r) => ({ id: r.id, name: r.name, region: r.region, x0: r.x0, y0: r.y0, w: r.w, h: r.h })));
  let list = rooms;
  if (opt('rooms')) { const ids = opt('rooms').split(','); list = rooms.filter((r) => ids.includes(r.id)); }
  if (opt('region')) { const rg = opt('region').split(','); list = list.filter((r) => rg.includes(r.region)); }
  // the whole game runs its own loop; freeze enemy AI noise by putting the player in god mode (already) and letting the frame settle
  await h.T((z) => { const G = window.__G; G.zoom = z; G.chunks.setScale(G.R * z); G.lighting.resize(G.canvas.width, G.canvas.height); }, Z);
  const files = [];
  if (opt('at')) {
    const pts = opt('at').split(';').map((s) => s.split(',').map(Number));
    for (const r of list) for (const [i, pt] of pts.entries()) {
      await h.T((a) => {
        const G = window.__G, w = G.world; G.camFocus = null;
        const gx = a.x0 + a.lx, gy = a.y0 + a.ly; let best = null, bd = 1e9;
        for (let dy = -12; dy <= 12; dy++) for (let dx = -14; dx <= 14; dx++) { const x = gx + dx, y = gy + dy; if (!w.isSolid(x, y) && !w.isSolid(x, y - 1) && !w.isSolid(x, y - 2) && (w.isSolid(x, y + 1) || w.tile(x, y + 1) === 2) && w.roomIdx[y * w.W + x] === w.roomById[a.id].idx) { const d = dx * dx + dy * dy * 1.5; if (d < bd) { bd = d; best = [x, y]; } } }
        if (best) { G.player.x = best[0] * 40 + 9; G.player.y = (best[1] + 1) * 40 - G.player.h; G.player.vx = G.player.vy = 0; }
        G.updateRooms(true); G.snapCamera(); window.T.frame([], 20); G.snapCamera(); G.roomFade = 0;
      }, { id: r.id, x0: r.x0, y0: r.y0, lx: pt[0], ly: pt[1] });
      await h.page.waitForTimeout(+opt('wait', 1400));
      const name = r.id + '_at' + i + '.png'; await h.page.screenshot({ path: out + '/' + name }); files.push(name);
    }
    fs.writeFileSync(out + '/_files.json', JSON.stringify(files)); console.log(files.length + ' shots ->', out); console.log(h.logs.filter((l) => !/warning|leads nowhere|meets solid|WORLD/.test(l)).slice(0, 30).join('\n')); await h.browser.close(); return;
  }
  for (const r of list) {
    const vwT = Math.floor(W / Z / 40 * 1) , vhT = Math.floor(Hh / Z / 40 * 1);
    const nx = Math.max(1, Math.ceil(r.w / (vwT * 0.92))), ny = Math.max(1, Math.ceil(r.h / (vhT * 0.92)));
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const cx = nx === 1 ? r.x0 + r.w / 2 : r.x0 + vwT / 2 + (r.w - vwT) * (ix / (nx - 1));
      const cy = ny === 1 ? r.y0 + r.h / 2 : r.y0 + vhT / 2 + (r.h - vhT) * (iy / (ny - 1));
      await h.T((a) => {
        const G = window.__G; G.teleportToRoom(a.id); G.camFocus = { x: a.cx * 40, y: a.cy * 40 }; G.chunks.setScale(G.R * G.zoom);
        window.T.frame([], 10); G.snapCamera();
      }, { id: r.id, cx, cy });
      await h.page.waitForTimeout(+opt('wait', 900));
      const name = r.id + (nx * ny > 1 ? '_' + ix + iy : '') + '.png';
      await h.page.screenshot({ path: out + '/' + name }); files.push(name);
    }
  }
  fs.writeFileSync(out + '/_files.json', JSON.stringify(files));
  console.log(files.length + ' shots ->', out);
  console.log(h.logs.filter((l) => !/warning|leads nowhere|meets solid|WORLD/.test(l)).slice(0, 30).join('\n'));
  await h.browser.close();
})();
