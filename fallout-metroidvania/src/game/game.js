// Main game object: state, loop, camera, rooms, rendering pipeline.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;
const G = (CD.G = CD.G || {});

G.state = 'boot'; G.time = 0; G.timeScale = 1; G.hitstop = 0; G.cheats = {}; G.viewW = 1280; G.viewH = 720; G.R = 1; G.zoom = 1; G.notes = [];
G.ents = []; G.projectiles = []; G.hurtables = []; G.props = []; G.platforms = []; G.interactables = []; G.enemies = [];
G.cam = { x: 0, y: 0, w: 1280, h: 720 }; G.mouseWorld = { x: 0, y: 0 }; G.frames = 0; G.fps = 60;
G.hurtVig = 0; G.critCharge = 0; G.zoom = 1.25;

// ---------------------------------------------------------------- state
G.defaultState = function () {
  return {
    v: 1, hp: 100, maxHp: 100, ap: 100, rad: 0, caps: 0, xp: 0, level: 1, perkPoints: 0, perks: {}, bobbles: [], specialBonus: {}, abilities: {}, flags: {}, keys: {},
    aid: { stimpak: 2, radaway: 0, radx: 0, medx: 0, psycho: 0, jet: 0, buffout: 0, mentats: 0, nukacola: 0 }, grenades: 0, weapons: ['wrench'], wi: 0, mag: {}, ammo: {}, ammoUp: 0, stimUp: 0, buffs: {},
    visited: {}, holotapes: {}, bed: null, beds: {}, kills: 0, deaths: 0, time: 0, dr: 0, objective: 0, seenRegions: {}, terminals: {},
  };
};
G.controlsLocked = function () { return G.state !== 'play' || G.vatsActive || G.cutscene || (G.banners && G.banners.length && G.banners[0].lock); };
G.setState = function (s) {
  const old = G.state; G.state = s;
  if (s === 'play') { CD.input.consume(); }
  if (CD.menus && CD.menus.onState) CD.menus.onState(s, old);
};

// ---------------------------------------------------------------- boot
CD.boot = function () {
  const canvas = document.getElementById('game'); G.canvas = canvas;
  G.ctx = canvas.getContext('2d', { alpha: false });
  const q = new URLSearchParams(location.search);
  G.debug = q.get('debug') === '1'; if (q.get('god')) G.cheats.god = true; if (q.get('abilities')) G.cheats.abilitiesStr = q.get('abilities');
  CD.input.init(canvas); if (CD.touch) CD.touch.init(canvas);
  G.resize(); window.addEventListener('resize', G.resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') G.setState('pause'); });
  const boot = document.getElementById('boot'), bar = document.getElementById('bootbar'), msg = document.getElementById('bootmsg');
  if (window.CD_EXTRA_ROOMS_FN) CD.ROOMS = CD.ROOMS.concat(window.CD_EXTRA_ROOMS_FN());   // test hook: extra synthetic rooms
  G.world = new CD.World(CD.ROOMS);
  if (G.world.errors.length) console.warn('WORLD ERRORS:\n' + G.world.errors.join('\n'));
  G.textures = ['vault', 'bw_vault', 'concrete', 'soil'];
  const need = new Set(); for (const r of G.world.rooms) { need.add(r.fg); if (r.bg) need.add(r.bg); }
  for (const s of CD.MATS) if (s !== 'none' && world_uses(s)) need.add(s);
  function world_uses(s) { const id = CD.MAT_ID[s]; for (let i = 0; i < G.world.mats.length; i += 7) if (G.world.mats[i] === id && CD.isSolidTile(G.world.tiles[i])) return true; return false; }
  for (const b of CD.BGS) if (b !== 'none') { const id = CD.BG_ID[b]; for (let i = 0; i < G.world.bgs.length; i += 11) if (G.world.bgs[i] === id) { need.add(b); break; } }
  const names = Array.from(need);
  CD.tex.prewarm(names, (k) => { bar.style.width = (45 + k * 45) + '%'; msg.textContent = 'FABRICATING MATERIALS ' + Math.round(k * 100) + '%'; }).then(() => {
    CD.post.init(G.viewW, G.viewH);
    G.fx = new CD.FX(G.world); G.ambient = new CD.Ambient(); G.lighting = new CD.Lighting(G.world);
    G.chunks = new CD.Chunks(G.world, G.R * G.zoom); G.lighting.resize(G.canvas.width, G.canvas.height);
    bar.style.width = '100%'; msg.textContent = 'READY';
    setTimeout(() => { boot.style.display = 'none'; canvas.focus(); }, 250);
    G.setState('title'); if (CD.menus && CD.menus.init) CD.menus.init();
    if (q.get('start') === '1' || q.get('room')) { G.newGame(); if (q.get('room')) G.teleportToRoom(q.get('room')); if (G.cheats.abilitiesStr) G.giveAbilities(G.cheats.abilitiesStr); }
    requestAnimationFrame(frame);
  });
  window.__G = G; window.__CD = CD;
};

G.resize = function () {
  const ww = window.innerWidth, wh = window.innerHeight; const aspect = ww / wh;
  G.viewH = 720; G.viewW = Math.round(U.clamp(720 * aspect, 960, 1700));
  let R = U.clamp(Math.round(Math.min(wh, ww / (G.viewW / 720)) / 720 * 4) / 4, 0.75, 2);
  if (window.devicePixelRatio > 1) R = Math.max(R, Math.min(1.5, Math.round(Math.min(wh * window.devicePixelRatio, 1080) / 720 * 4) / 4));
  // graphics quality caps the internal render scale (auto mode steps down when the frame rate is poor)
  const q = (G.opts && G.opts.quality) || 'auto', cap = q === 'high' ? 1.5 : q === 'medium' ? 1 : q === 'low' ? 0.75 : [1.25, 1, 0.75, 0.5][G.qLevel || 0];
  R = Math.max(0.5, Math.min(R, cap));
  G.R = R;
  const c = G.canvas; c.width = Math.round(G.viewW * R); c.height = Math.round(720 * R);
  // fit the canvas in the window keeping aspect
  const scale = Math.min(ww / c.width, wh / c.height); c.style.width = Math.floor(c.width * scale) + 'px'; c.style.height = Math.floor(c.height * scale) + 'px';
  CD.input.viewW = G.viewW; CD.input.viewH = G.viewH;
  if (G.chunks) G.chunks.setScale(R * G.zoom); if (G.lighting) { G.lighting.scale = R >= 1 ? 0.5 : 0.4; G.lighting.resize(c.width, c.height); }
  G.cam.w = G.viewW; G.cam.h = 720;
  if (CD.touch && CD.touch.layout) CD.touch.layout();
};

// ---------------------------------------------------------------- new game / spawn
G.newGame = function () {
  G.st = G.defaultState(); G.st.time = 0;
  G.cheats.abilities = false;
  G.loadWorld(true);
  const q = new URLSearchParams(location.search);
  if (q.get('kit') === '1') G.giveKit();
  G.setState('play');
};
G.giveKit = function () {
  const st = G.st; for (const id of ['pistol10', 'hunting_rifle', 'shotgun', 'laser_rifle', 'bat']) G.grantWeapon(id, true);
  for (const a in CD.AMMO) st.ammo[a] = 60; st.aid.stimpak = 5; st.grenades = 4; st.caps = 500; st.mag.pistol10 = 12;
};
G.giveAbilities = function (str) { if (str === 'all') for (const a in CD.ABILITIES) G.st.abilities[a] = 1; else for (const a of str.split(',')) if (CD.ABILITIES[a]) G.st.abilities[a] = 1; };
G.loadWorld = function (fresh) {
  const w = G.world;
  // restore world edits
  for (const k in G.st.flags) if (k.indexOf('broke:') === 0) { const [x, y] = k.slice(6).split(',').map(Number); if (w.tile(x, y) === TILE.BREAK) w.tiles[y * w.W + x] = TILE.AIR; }
  G.chunks.invalidateAll();
  G.spawnAll();
  const start = fresh || !G.st.bed ? G.findStart() : G.st.bed;
  G.player = new CD.Player(start.x, start.y);
  G.st.hp = Math.min(G.maxHP(), G.st.hp || G.maxHP()); if (fresh) { G.st.hp = G.maxHP(); }
  G.room = null; G.prevRoom = null; G.roomFade = 0;
  G.snapCamera(); G.updateRooms(true);
  G.fx.p.length = 0; G.projectiles.length = 0;
};
G.findStart = function () {
  const s = G.world.spawns.find((s) => s.t === 'start'); if (s) return { x: (s.tx + 0.5) * T, y: (s.ty + 1) * T };
  const r = G.world.rooms[0]; return { x: (r.x0 + 4) * T, y: (r.y1 - 2) * T };
};
G.teleportToRoom = function (id) {
  const r = G.world.roomById[id]; if (!r) return;
  // find a standable spot: scan from room centre downward
  const cx = Math.floor((r.x0 + r.x1) / 2);
  for (let dx = 0; dx < r.w / 2; dx++) for (const sx of [cx + dx, cx - dx]) for (let ty = r.y0 + 1; ty < r.y1 - 1; ty++) {
    if (!G.world.isSolid(sx, ty) && !G.world.isSolid(sx, ty - 1) && !G.world.isSolid(sx, ty - 2) && G.world.isSolid(sx, ty + 1)) { G.player.x = sx * T + 9; G.player.y = (ty + 1) * T - G.player.h; G.snapCamera(); return; }
  }
};
G.spawnAll = function () {
  G.ents.length = 0; G.projectiles.length = 0; G.platforms.length = 0;
  const st = G.st;
  for (const sp of G.world.spawns) {
    if (sp.t === 'start') continue;
    const e = CD.spawn(sp); if (!e) continue;
    if (Array.isArray(e)) for (const x of e) G.ents.push(x); else G.ents.push(e);
  }
};
G.respawnEnemies = function () {
  // called at rest points: re-create non-persistent enemies; keep everything else
  G.ents = G.ents.filter((e) => !(e.kind === 'enemy') && !(e.kind === 'pickup' && !e.key));
  for (const sp of G.world.spawns) { if (CD.ENEMIES[sp.t]) { const e = CD.spawn(sp); if (e) G.ents.push(e); } }
  G.projectiles.length = 0;
};

// ---------------------------------------------------------------- rooms & camera
G.updateRooms = function (force) {
  const p = G.player, w = G.world; const room = w.roomAt(p.cx, p.cy + 8) || w.roomAt(p.cx, p.cy);
  if (!room) return;
  if (room !== G.room) {
    G.prevRoom = G.room; G.room = room; G.roomFade = G.prevRoom ? 1 : 0;
    G.onEnterRoom(room, force);
  }
  if (G.roomFade > 0) G.roomFade = Math.max(0, G.roomFade - 1 / 60 / 0.6);
};
G.onEnterRoom = function (room, force) {
  const st = G.st, first = !st.visited[room.id];
  st.visited[room.id] = 1;
  st.beds = st.beds || {};
  for (const sp of G.world.spawns) if (sp.t === 'bed' && sp.room === room.idx && !st.beds[sp.key]) st.beds[sp.key] = { x: (sp.tx + 0.5) * T, y: (sp.ty + 1) * T, room: room.id, name: room.name, region: room.region };
  const reg = CD.REGIONS[room.region];
  if (!G.lastRegion || G.lastRegion !== room.region) { if (reg && !st.seenRegions[room.region] && !force) { G.banner({ title: reg.name.toUpperCase(), sub: 'LOCATION DISCOVERED', text: '', col: '#7dffb0', dur: 3.2, small: true }); } st.seenRegions[room.region] = 1; G.lastRegion = room.region; }
  else if (first && room.title && !force) G.toast('DISCOVERED: ' + room.name.toUpperCase());
  if (!G.bossActive) CD.audio.setTrack(room.music);
  if (CD.story && CD.story.onRoom) CD.story.onRoom(room, first);
};
G.roomRect = function (r) { return { x: r.px0, y: r.py0, w: r.px1 - r.px0, h: r.py1 - r.py0 }; };
G.snapCamera = function () { G.updateCamera(1, true); };
G.updateCamera = function (dt, snap) {
  const p = G.player, cam = G.cam, room = G.room || G.world.roomAt(p.cx, p.cy);
  const z = G.zoom; cam.w = G.viewW / z; cam.h = G.viewH / z;
  let tx = p.cx - cam.w / 2 + p.face * 40, ty = p.cy - cam.h * 0.56;
  const m = CD.input.mouse; if (CD.input.aimMode === 'mouse' && G.state === 'play' && !G.vatsActive) { tx += (m.x - G.viewW / 2) * 0.22; ty += (m.y - G.viewH / 2) * 0.16; }
  if (G.camFocus) { tx = G.camFocus.x - cam.w / 2; ty = G.camFocus.y - cam.h / 2; }
  if (room) {
    const rw = room.px1 - room.px0, rh = room.py1 - room.py0;
    tx = rw <= cam.w ? room.px0 + (rw - cam.w) / 2 : U.clamp(tx, room.px0, room.px1 - cam.w);
    ty = rh <= cam.h ? room.py0 + (rh - cam.h) / 2 : U.clamp(ty, room.py0, room.py1 - cam.h);
  }
  if (snap) { cam.x = tx; cam.y = ty; } else { const k = 1 - Math.exp(-(G.roomFade > 0 ? 5 : 7) * dt); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; }
};

// ---------------------------------------------------------------- simulation
const STEP = 1 / 120;
G.step = function (dt) {
  G.time += dt; if (G.st) G.st.time += dt;
  const st = G.st, w = G.world, p = G.player;
  // mouse -> world
  const m = CD.input.mouse; G.mouseWorld.x = G.cam.x + m.x / G.zoom; G.mouseWorld.y = G.cam.y + m.y / G.zoom;
  // buffs
  for (const b in st.buffs) if (st.buffs[b] > 0) st.buffs[b] = Math.max(0, st.buffs[b] - dt);
  if (G.hurtVig > 0) G.hurtVig = Math.max(0, G.hurtVig - dt * 1.4);
  // activation & lists
  const cam = G.cam, ax = cam.x + cam.w / 2, ay = cam.y + cam.h / 2;
  G.hurtables.length = 0; G.props.length = 0; G.interactables.length = 0; G.enemies.length = 0; G.platforms.length = 0;
  for (const e of G.ents) {
    if (e.dead) continue;
    e.awake = e.always || (Math.abs(e.cx - ax) < cam.w * 0.5 + 520 && Math.abs(e.cy - ay) < cam.h * 0.5 + 420);
    if (e.hittable && e.awake) G.hurtables.push(e);
    if (e.onBlast) G.props.push(e);
    if (e.interact) G.interactables.push(e);
    if (e.kind === 'enemy') G.enemies.push(e);
    if (e.kind === 'platform') G.platforms.push(e);
  }
  // platforms first so actors can ride them
  for (const e of G.platforms) if (e.awake) e.update(dt);
  if (p) p.update(dt);
  for (const e of G.ents) { if (e.dead || !e.awake || e.kind === 'platform') continue; e.update(dt); }
  for (const pr of G.projectiles) if (!pr.dead) pr.update(dt);
  // cleanup
  if (G.ents.length) { let j = 0; for (let i = 0; i < G.ents.length; i++) { const e = G.ents[i]; if (!e.dead) G.ents[j++] = e; else if (e.onRemove) e.onRemove(); } G.ents.length = j; }
  if (G.projectiles.length) { let j = 0; for (let i = 0; i < G.projectiles.length; i++) if (!G.projectiles[i].dead) G.projectiles[j++] = G.projectiles[i]; G.projectiles.length = j; }
  G.updateRooms(); G.updateInteract();
  // radiation ambient
  const room = G.room; if (room && p && !p.dead) {
    const reg = CD.REGIONS[room.region]; let rate = (room.rad || 0) * 3; if (rate > 0) G.addRad(rate * dt);
    CD.audio.updateGeiger(dt, ((reg && reg.geiger) || 0) * 4 + st.rad * 0.35 + (room.rad || 0) * 8 + (p.inWater ? 12 : 0));
    if (st.rad > 0 && !p.inWater && (!room.rad)) st.rad = Math.max(0, st.rad - 0.0 * dt);
  }
  // fx
  G.fx.update(dt);
  if (G.vatsActive && CD.vats) CD.vats.update(dt);
  if (CD.story && CD.story.update) CD.story.update(dt);
  G.updateCamera(dt);
};
G.updateInteract = function () {
  const p = G.player; let best = null, bd = 1e9;
  if (!p || p.dead || G.controlsLocked()) { G.target = null; return; }
  for (const e of G.interactables) { if (!e.awake || e.dead || (e.canInteract && !e.canInteract(p))) continue; const dx = e.cx - p.cx, dy = e.cy - p.cy; const r = e.range || 60; if (Math.abs(dx) < r + e.w / 2 && Math.abs(dy) < 80 + e.h / 2) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = e; } } }
  G.target = best;
  if (best && CD.input.pressed('interact')) { best.interact(p); CD.input.consume(); }
};

// ---------------------------------------------------------------- toasts / banners
G.toast = function (msg) { G.notify(msg, 'loc'); };
G.banner = function (b) { G.banners = G.banners || []; b.t = 0; b.max = b.dur || 3; G.banners.push(b); if (b.big !== false && !b.small) CD.audio.play('notify'); };

// ---------------------------------------------------------------- frame
let last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.1, (ts - last) / 1000 || 0.016); last = ts; G.frames++;
  G.fps = G.fps * 0.95 + (1 / Math.max(rdt, 0.001)) * 0.05;
  CD.input.poll();
  if (CD.input.pressed('mute')) { CD.audio.setMuted(!CD.audio.muted); G.notify(CD.audio.muted ? 'Sound off' : 'Sound on', 'small'); }
  try {
    G.tick(rdt);
    G.render();
  } catch (e) { console.error(e); G.errors = (G.errors || 0) + 1; if (G.errors > 5 && G.state === 'play') { G.state = 'pause'; } }
}
G.qLevel = 0; G.qTimer = 0; G.qLow = 0;
G.autoQuality = function (rdt) {
  if (((G.opts && G.opts.quality) || 'auto') !== 'auto' || G.state !== 'play') { G.qLow = 0; return; }
  G.qTimer += rdt; if (G.qTimer < 1) return; G.qTimer = 0;
  if (G.fps < 36 && G.frames > 240) G.qLow++; else G.qLow = Math.max(0, G.qLow - 1);
  if (G.qLow >= 4 && G.qLevel < 3) { G.qLevel++; G.qLow = 0; G.resize(); if (G.notify) G.notify('Graphics scaled down for performance (Options > Quality).', 'small'); }
};
G.tick = function (rdt) {
  const st = G.state; G.autoQuality(rdt);
  if (G.notes) for (let i = G.notes.length - 1; i >= 0; i--) { G.notes[i].t -= rdt; if (G.notes[i].t <= 0) G.notes.splice(i, 1); }
  if (G.banners && G.banners.length) { const b = G.banners[0]; b.t += rdt; if (b.t >= b.max) G.banners.shift(); }
  if (st === 'play') {
    const I = CD.input;
    if (I.pressed('pause') && !G.vatsActive) { G.setState('pause'); return; }
    if ((I.pressed('pip') || I.pressed('map')) && !G.controlsLocked()) { if (CD.pipboy) CD.pipboy.open(I.pressed('map') ? 'map' : null); return; }
    if (I.pressed('vats') && CD.vats) CD.vats.toggle();
    // time scaling
    let scale = G.timeScale * (G.vatsActive ? 0.07 : 1);
    if (G.hitstop > 0) { G.hitstop -= rdt; scale *= 0.04; }
    acc += rdt * scale;
    let n = 0;
    while (acc >= STEP && n < 20) { G.step(STEP); acc -= STEP; n++; if (n === 1) CD.input.consume(); }
    if (n >= 20) acc = 0;
    if (G.vatsActive && CD.vats) CD.vats.realUpdate(rdt);
  } else {
    if (CD.menus) CD.menus.update(rdt);
  }
};

// deterministic stepping for tests: G.advance(seconds)
G.advance = function (sec) { const n = Math.round(sec / STEP); for (let i = 0; i < n; i++) { G.step(STEP); } };

// ---------------------------------------------------------------- render
G.render = function () {
  const ctx = G.ctx; if (!ctx) return;
  const R = G.R, vw = G.viewW, vh = G.viewH;
  ctx.setTransform(R, 0, 0, R, 0, 0);
  if (G.state === 'boot' || !G.world || !G.chunks) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, vw, vh); return; }
  if (!G.st || !G.player) { CD.menus && CD.menus.drawTitleBackdrop ? CD.menus.drawTitleBackdrop(ctx) : (ctx.fillStyle = '#000', ctx.fillRect(0, 0, vw, vh)); if (CD.menus) CD.menus.draw(ctx); return; }
  G.drawWorld(ctx);
  if (CD.hud) CD.hud.draw(ctx);
  if (CD.menus) CD.menus.draw(ctx);
};

G.drawWorld = function (ctx) {
  const R = G.R, vw = G.viewW, vh = G.viewH, cam = G.cam, room = G.room, world = G.world;
  const [sx, sy] = G.fx.offset();
  const cx = Math.round((cam.x + sx) * R * G.zoom) / (R * G.zoom), cy = Math.round((cam.y + sy) * R * G.zoom) / (R * G.zoom);
  const view = { x: cx, y: cy, w: cam.w, h: cam.h };
  const reg = room ? CD.REGIONS[room.region] : null;
  ctx.setTransform(R, 0, 0, R, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, vw, vh);
  // 1. backdrop
  const sky = room && room.sky && reg && reg.backdrop;
  if (sky) { CD.Backdrop.get(reg.backdrop).draw(ctx, view, vw, vh, G.time, 56 * T, null); }   // 56 = surface ground line (global tile y)
  // 2. world space
  const zR = R * G.zoom;
  ctx.setTransform(zR, 0, 0, zR, -cx * zR, -cy * zR);
  G.chunks.draw(ctx, cx, cy, cx + cam.w, cy + cam.h);
  G.chunks.warm(cx - 480, cy - 480, cx + cam.w + 480, cy + cam.h + 480);
  // water
  G.drawWater(ctx, view);
  // entities (z sorted)
  const list = []; const x0 = cx - 120, x1 = cx + cam.w + 120, y0 = cy - 120, y1 = cy + cam.h + 120;
  for (const e of G.ents) { if (e.dead || e.x + e.w < x0 || e.x > x1 || e.y + e.h < y0 || e.y > y1) continue; list.push(e); }
  list.push(G.player);
  list.sort((a, b) => a.z - b.z);
  for (const e of list) { ctx.save(); e.draw(ctx); ctx.restore(); }
  for (const pr of G.projectiles) if (!pr.dead) { ctx.save(); pr.draw(ctx); ctx.restore(); }
  G.fx.draw(ctx, view);
  // 3. room mask (hide neighbouring rooms)
  ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(cx - 4, cy - 4, cam.w + 8, cam.h + 8);
  const vis = []; if (room) vis.push(room); if (G.roomFade > 0 && G.prevRoom) vis.push(G.prevRoom);
  for (const r of vis) ctx.rect(r.px0, r.py0, r.px1 - r.px0, r.py1 - r.py0);
  ctx.fill('evenodd'); ctx.restore();
  // 4. lighting
  const L = G.lighting; L.clear();
  for (const e of list) if (e.light) e.light(L);
  for (const pr of G.projectiles) if (!pr.dead && pr.light) pr.light(L);
  G.fx.emitLights(L, view);
  if (G.vatsActive) { /* dim world */ }
  const amb = room ? (room.ambient) : [0.3, 0.3, 0.3];
  L.flash = G.lightning || 0;
  ctx.setTransform(R, 0, 0, R, 0, 0);
  // scale camera to view for light map
  const lc = { x: cx, y: cy, w: cam.w, h: cam.h };
  L.render(ctx, lc, R, amb, { sky: room && room.sky, time: G.time, maxShadow: 8 });
  ctx.setTransform(zR, 0, 0, zR, -cx * zR, -cy * zR);
  L.glow(ctx, lc, G.time);
  // air particles
  const kind = room && room.region === 'surface' || (room && room.region === 'rustyard') ? 'ash' : 'dust';
  G.ambient.update(1 / 60, view, kind, reg ? reg.dust : 0.5, 0.6);
  G.ambient.draw(ctx, kind, kind === 'ash' ? 'rgba(255,200,150,0.6)' : 'rgba(170,220,220,0.5)');
  G.fx.drawText(ctx, view);
  ctx.setTransform(R, 0, 0, R, 0, 0);
  // 5. post
  CD.post.draw(ctx, vw, vh, { grade: reg ? reg.grade : null, hurt: G.hurtVig + (G.st.hp < G.maxHP() * 0.25 ? 0.25 + Math.sin(G.time * 5) * 0.08 : 0), rad: G.st.rad / 100, flashA: G.fx.flashA, flashCol: G.fx.flashCol, grain: 0.07 });
  ctx.setTransform(R, 0, 0, R, 0, 0);
};
G.drawWater = function (ctx, view) {
  const w = G.world, x0 = Math.max(0, Math.floor(view.x / T)), x1 = Math.min(w.W - 1, Math.floor((view.x + view.w) / T)), y0 = Math.max(0, Math.floor(view.y / T)), y1 = Math.min(w.H - 1, Math.floor((view.y + view.h) / T));
  const t = G.time;
  for (let ty = y0; ty <= y1; ty++) {
    let tx = x0;
    while (tx <= x1) {
      if (w.tile(tx, ty) !== TILE.WATER) { tx++; continue; }
      let tx2 = tx; while (tx2 + 1 <= x1 && w.tile(tx2 + 1, ty) === TILE.WATER) tx2++;
      const top = w.tile(tx, ty - 1) !== TILE.WATER, X = tx * T, Y = ty * T, W = (tx2 - tx + 1) * T;
      const gr = ctx.createLinearGradient(0, Y, 0, Y + T); gr.addColorStop(0, 'rgba(40,150,60,' + (top ? 0.62 : 0.55) + ')'); gr.addColorStop(1, 'rgba(14,86,44,0.66)');
      ctx.fillStyle = gr; ctx.fillRect(X, Y + (top ? 6 : 0), W, T - (top ? 6 : 0));
      if (top) {
        ctx.strokeStyle = 'rgba(190,255,170,0.75)'; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let x = 0; x <= W; x += 6) { const yy = Y + 6 + Math.sin((X + x) * 0.05 + t * 2.4) * 1.8 + Math.sin((X + x) * 0.11 - t * 1.7) * 1.2; x ? ctx.lineTo(X + x, yy) : ctx.moveTo(X + x, yy); } ctx.stroke();
        ctx.fillStyle = 'rgba(200,255,180,0.14)'; for (let x = 0; x < W; x += 14) { ctx.fillRect(X + x + Math.sin(t + x) * 3, Y + 12 + Math.sin(t * 1.3 + x) * 2, 7, 1.4); }
      }
      // light caustics + bubbles
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(80,255,120,0.07)'; ctx.fillRect(X, Y, W, T); ctx.globalCompositeOperation = 'source-over';
      tx = tx2 + 1;
    }
  }
};

})();
