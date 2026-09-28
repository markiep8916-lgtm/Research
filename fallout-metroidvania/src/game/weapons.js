// Weapon definitions and firing logic.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const G = (CD.G = CD.G || {});

CD.WEAPONS = {
  wrench: { name: 'Vault Wrench', kind: 'melee', cls: 'melee', dmg: 20, rate: 2.4, reach: 46, knock: 240, sprite: 'pipe', desc: 'Standard-issue maintenance wrench. Not standard-issue for combat.', swingKind: 'chop' },
  bat: { name: 'Baseball Bat', kind: 'melee', cls: 'melee', dmg: 30, rate: 2.0, reach: 52, knock: 340, sprite: 'bat', desc: 'Louisville Slugger, minus the Louisville. Great for knocking things back.', swingKind: 'chop' },
  machete: { name: 'Machete', kind: 'melee', cls: 'melee', dmg: 26, rate: 3.1, reach: 54, knock: 200, sprite: 'machete', desc: 'Fast, sharp, and rude.', swingKind: 'chop' },
  sledge: { name: 'Super Sledge', kind: 'melee', cls: 'melee', dmg: 82, rate: 1.0, reach: 64, knock: 620, sprite: 'sledge', heavy: true, desc: 'Rocket-assisted sledgehammer. Slow and devastating.', swingKind: 'chop' },
  ripper: { name: 'Ripper', kind: 'melee', cls: 'melee', dmg: 15, rate: 6.5, reach: 48, knock: 110, sprite: 'ripper', desc: 'Motorised blade. Hits again and again.', swingKind: 'chop', multi: true },
  powerfist: { name: 'Power Fist', kind: 'melee', cls: 'melee', dmg: 64, rate: 1.7, reach: 46, knock: 520, sprite: 'powerfist', heavy: true, breaks: true, punch: true, swingKind: 'punch', desc: 'Pneumatic gauntlet. Shatters cracked walls.' },

  pipepistol: { name: 'Pipe Pistol', kind: 'gun', cls: 'pistol', ammo: '10mm', dmg: 13, rate: 3.4, mag: 6, reload: 1.3, spread: 0.06, speed: 1400, life: 0.7, sprite: 'pipepistol', sfx: 'pipe', kick: 3, desc: 'Improvised from plumbing. Reliable enough.' },
  pistol10: { name: '10mm Pistol', kind: 'gun', cls: 'pistol', ammo: '10mm', dmg: 17, rate: 4.4, mag: 12, reload: 1.05, spread: 0.03, speed: 1600, life: 0.8, sprite: 'pistol10', sfx: 'pistol', kick: 3.5, desc: 'The classic wasteland sidearm.' },
  hunting_rifle: { name: 'Hunting Rifle', kind: 'gun', cls: 'rifle', ammo: '.308', dmg: 58, rate: 1.25, mag: 5, reload: 1.7, spread: 0.008, speed: 2500, life: 1.0, pierce: 1, sprite: 'hunting_rifle', sfx: 'rifle', kick: 6, knock: 180, twoHand: 13, desc: 'Bolt-action. Punches through the first target.' },
  shotgun: { name: 'Combat Shotgun', kind: 'gun', cls: 'shotgun', ammo: 'shell', dmg: 10, pellets: 8, rate: 1.55, mag: 6, reload: 1.8, spread: 0.17, speed: 1300, life: 0.28, sprite: 'shotgun', sfx: 'shotgun', kick: 7, knock: 210, twoHand: 12, desc: 'Devastating up close.' },
  assault_rifle: { name: 'Assault Rifle', kind: 'gun', cls: 'rifle', ammo: '5.56', dmg: 13, rate: 9, mag: 30, reload: 1.7, spread: 0.05, speed: 1700, life: 0.75, auto: true, sprite: 'assault_rifle', sfx: 'assault', kick: 3, twoHand: 12, desc: 'Full-auto. Hold the trigger down.' },
  laser_pistol: { name: 'Laser Pistol', kind: 'gun', cls: 'pistol', ammo: 'cell', dmg: 19, rate: 4.6, mag: 15, reload: 1.1, spread: 0.014, speed: 1900, life: 0.8, pk: 'laser', col: '255,80,60', sprite: 'laser_pistol', sfx: 'laser', kick: 1, desc: 'Pre-war energy sidearm. No recoil.' },
  laser_rifle: { name: 'Laser Rifle', kind: 'gun', cls: 'rifle', ammo: 'cell', dmg: 34, rate: 2.4, mag: 20, reload: 1.5, spread: 0.008, speed: 2100, life: 0.9, pk: 'laser', col: '255,70,50', pierce: 1, sprite: 'laser_rifle', sfx: 'laser', kick: 1.5, twoHand: 12, desc: 'Precise, powerful, pierces one target.' },
  plasma_rifle: { name: 'Plasma Rifle', kind: 'gun', cls: 'rifle', ammo: 'plasma', dmg: 54, rate: 1.7, mag: 12, reload: 1.8, spread: 0.02, speed: 1150, life: 1.1, pk: 'plasma', col: '90,255,170', pierce: 0, blast: 0, sprite: 'plasma_rifle', sfx: 'plasma', kick: 2, knock: 220, twoHand: 12, splash: 50, desc: 'Superheated plasma. Slow bolts, big damage.' },
  minigun: { name: 'Minigun', kind: 'gun', cls: 'rifle', ammo: '5mm', dmg: 8, rate: 20, mag: 150, reload: 3.0, spread: 0.09, speed: 1700, life: 0.7, auto: true, sprite: 'minigun', sfx: 'minigun', kick: 2, twoHand: 14, desc: 'Spin up the fun.' },
};
CD.WEAPON_ORDER = ['wrench', 'pipepistol', 'pistol10', 'bat', 'machete', 'hunting_rifle', 'shotgun', 'assault_rifle', 'laser_pistol', 'laser_rifle', 'plasma_rifle', 'minigun', 'sledge', 'ripper', 'powerfist'];

G.curWeapon = function () { const st = G.st; return CD.WEAPONS[st.weapons[st.wi]] || CD.WEAPONS.wrench; };
G.curWeaponId = function () { const st = G.st; return st.weapons[st.wi] || 'wrench'; };
G.weaponSprite = function (id) { const w = CD.WEAPONS[id]; return w ? CD.Rig.weaponSprite(w.sprite) : null; };

// ---- gun fire; returns true if a shot was fired
G.fireGun = function (p, aim, o) {
  o = o || {};
  const st = G.st, id = G.curWeaponId(), w = CD.WEAPONS[id];
  if (!w || w.kind !== 'gun') return false;
  const ammoLeft = st.mag[id];
  if (ammoLeft <= 0) { G.startReload(p); return false; }
  st.mag[id]--;
  const sp = CD.Rig.weaponSprite(w.sprite);
  // muzzle position
  const ax = Math.cos(aim), ay = Math.sin(aim);
  const mx = p.muzzleX !== undefined ? p.muzzleX : p.cx + ax * 28, my = p.muzzleY !== undefined ? p.muzzleY : p.cy - 8 + ay * 28;
  const pel = w.pellets || 1, pk = w.pk || 'bullet';
  const mul = G.damageMul({ weapon: id });
  const crit = o.crit ? true : (Math.random() < 0.03 + G.special('L') * 0.008 + (G.special('P') - 5) * 0.004 ? true : undefined);
  const spreadMul = (o.accurate ? 0.15 : 1) * (p.crouching ? 0.75 : 1) * (p.onGround ? 1 : 1.3);
  for (let i = 0; i < pel; i++) {
    const a = aim + (Math.random() - 0.5) * 2 * w.spread * spreadMul;
    const sp2 = w.speed * (1 + (pel > 1 ? (Math.random() - 0.5) * 0.25 : 0));
    G.shoot({ x: mx, y: my, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2, dmg: w.dmg * mul, owner: 'player', pk, life: w.life * (pel > 1 ? 0.8 + Math.random() * 0.4 : 1), pierce: w.pierce || 0, knock: w.knock || 0, col: w.col, weapon: id, crit: pel > 1 ? undefined : crit, critMul: o.critMul, blast: w.blast || 0, heavy: pel > 1 && false, len: pk === 'bullet' ? 18 : 14 });
  }
  // fx
  G.fx.glowFlash(mx, my, 70, pk === 'laser' ? '255,90,70' : (pk === 'plasma' ? '120,255,190' : '255,210,140'), 0.07);
  if (pk === 'bullet') { G.fx.spark(mx, my, 3, ax, ay, 0.7, 320); if (w.cls !== 'shotgun' || true) G.fx.add({ t: 'smoke', x: mx, y: my, vx: ax * 40, vy: -10, life: 0.4, max: 0.4, col: '120,116,108', size: 3, grow: 12, a: 0.3 }); G.fx.casing(p.cx - p.face * 4, p.cy - 8, p.face); }
  p.muzzleFlash = 0.06; p.flashDir = aim; p.recoil = w.kick || 2;
  G.fx.shake(pel > 1 ? 4 : (w.dmg > 40 ? 3 : 1.4), 0.1);
  if (w.knock && !p.onGround === false) { /* recoil pushback */ p.vx -= ax * (w.knock * 0.35) * (pel > 1 ? 1 : 0.5); }
  CD.audio.play(w.sfx || 'pistol');
  G.lastShotT = G.time;
  if (st.mag[id] <= 0) G.startReload(p);
  return true;
};
G.startReload = function (p) {
  const st = G.st, id = G.curWeaponId(), w = CD.WEAPONS[id];
  if (!w || w.kind !== 'gun' || p.reloading > 0) return;
  if (st.mag[id] >= w.mag) return;
  if ((st.ammo[w.ammo] || 0) <= 0) { if (st.mag[id] <= 0) G.notify('Out of ' + CD.AMMO[w.ammo].name + '!', 'warn'); CD.audio.play('empty'); return; }
  p.reloading = w.reload * (1 - G.perk('quickhands') * 0.25); p.reloadMax = p.reloading; p.reloadId = id; CD.audio.play('reload');
};
G.finishReload = function (p) {
  const st = G.st, id = p.reloadId, w = CD.WEAPONS[id]; if (!w) return;
  const need = w.mag - st.mag[id], take = Math.min(need, st.ammo[w.ammo] || 0);
  st.mag[id] += take; st.ammo[w.ammo] -= take;
};
G.throwGrenade = function (p, aim) {
  const st = G.st; if (st.grenades <= 0) { G.notify('No grenades', 'warn'); return false; }
  st.grenades--; const sp = 620;
  const a = Math.min(aim, aim); const ax = Math.cos(a), ay = Math.sin(a) - 0.25;
  G.shoot({ x: p.cx + p.face * 10, y: p.cy - 14, vx: ax * sp + p.vx * 0.3, vy: ay * sp - 140, dmg: 90, owner: 'player', pk: 'grenade', g: 1500, life: 3, fuse: 1.6, blast: 96, bounce: 0.45, knock: 520, spin: 12, r: 5 });
  CD.audio.play('throw'); return true;
};

})();
