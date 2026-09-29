// Items, abilities, perks, stats, pickup collection and icon painters.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
const G = (CD.G = CD.G || {});

// ---------------------------------------------------------------- data
CD.ABILITIES = {
  jetboots: { name: 'JET BOOTS', short: 'Double Jump', desc: 'Vault-Tec maintenance thrusters. Press JUMP again in mid-air.', col: '#ffb040' },
  gecko: { name: 'GECKO GRIPS', short: 'Wall Cling', desc: 'Micro-suction gauntlets. Push into a wall in mid-air to cling; JUMP to leap off, then re-grip the same wall or the opposite one to climb.', col: '#7dff9c' },
  jetrush: { name: 'JET RUSH', short: 'Air Dash', desc: 'Injector rig that floods your system with Jet. Press DASH to burst forward, invulnerable for an instant.', col: '#7ad0ff' },
  powerfist: { name: 'POWER FIST', short: 'Wall Breaker', desc: 'Pneumatic-piston gauntlet. Shatters cracked walls and hits like a truck. Equip it as a melee weapon.', col: '#ff8a50' },
  hazmat: { name: 'HAZMAT SUIT', short: 'Radiation Shield', desc: 'Lead-lined suit. Radiation exposure cut by 90%. Irradiated water is finally survivable.', col: '#e8ff70' },
};
CD.AMMO = {
  '10mm': { name: '10mm', cap: 120, col: '#d6a642', drop: [8, 18] },
  '.308': { name: '.308', cap: 40, col: '#c88a3a', drop: [3, 6] },
  'shell': { name: 'Shotgun Shell', cap: 48, col: '#c8402a', drop: [3, 7] },
  '5.56': { name: '5.56mm', cap: 240, col: '#cfb054', drop: [12, 26] },
  'cell': { name: 'Microfusion Cell', cap: 180, col: '#ff6a4a', drop: [10, 22] },
  'plasma': { name: 'Plasma Cartridge', cap: 90, col: '#5cffb0', drop: [6, 12] },
  '5mm': { name: '5mm', cap: 500, col: '#b8b0a0', drop: [30, 60] },
};
CD.AID = {
  stimpak: { name: 'Stimpak', desc: 'Restores 60 HP.' },
  radaway: { name: 'RadAway', desc: 'Removes 60% radiation.' },
  radx: { name: 'Rad-X', desc: 'Radiation resistance for 90s.' },
  medx: { name: 'Med-X', desc: 'Damage resistance for 60s.' },
  psycho: { name: 'Psycho', desc: '+25% damage for 60s.' },
  jet: { name: 'Jet', desc: 'Rapid AP regeneration for 30s.' },
  nukacola: { name: 'Nuka-Cola', desc: '+20 HP, +8 rad, +30 AP.' },
};
CD.BOBBLES = {
  S: { name: 'Strength', col: '#e0483a' }, P: { name: 'Perception', col: '#e8b83a' }, E: { name: 'Endurance', col: '#4a9be0' }, C: { name: 'Charisma', col: '#d868c8' },
  I: { name: 'Intelligence', col: '#58d0c0' }, A: { name: 'Agility', col: '#8ad84a' }, L: { name: 'Luck', col: '#f0f0f0' },
};
CD.SPECIAL_DESC = {
  S: 'Melee damage', P: 'Critical damage & VATS range', E: 'Max HP & radiation resistance', C: 'Better caps and shop prices', I: 'XP gain', A: 'AP regen & move speed', L: 'Crit chance & loot',
};
CD.PERKS = {
  toughness: { name: 'Toughness', max: 3, lvl: 2, desc: '+5% damage resistance per rank.' },
  lifegiver: { name: 'Lifegiver', max: 3, lvl: 3, desc: '+15 max HP per rank.' },
  gunslinger: { name: 'Gunslinger', max: 3, lvl: 2, desc: '+12% pistol damage per rank.' },
  rifleman: { name: 'Rifleman', max: 3, lvl: 4, desc: '+12% rifle & shotgun damage per rank.' },
  ironfist: { name: 'Iron Fist', max: 3, lvl: 2, desc: '+15% melee damage per rank.' },
  bloodymess: { name: 'Bloody Mess', max: 3, lvl: 5, desc: '+5% damage from everything, per rank.' },
  sniper: { name: 'Sniper', max: 1, lvl: 6, desc: 'Headshot criticals hit 15% harder.' },
  scrounger: { name: 'Scrounger', max: 3, lvl: 3, desc: '+25% ammo from drops per rank.' },
  capcollector: { name: 'Cap Collector', max: 2, lvl: 2, desc: '+25% caps found per rank.' },
  actionboy: { name: 'Action Boy', max: 3, lvl: 4, desc: 'Faster AP regen, cheaper VATS shots.' },
  medic: { name: 'Medic', max: 3, lvl: 3, desc: 'Stimpaks heal +25% per rank.' },
  radres: { name: 'Rad Resistance', max: 3, lvl: 4, desc: '-8% radiation taken per rank.' },
  grim: { name: "Grim Reaper's Sprint", max: 1, lvl: 7, desc: 'Killing an enemy restores AP.' },
  lightstep: { name: 'Light Step', max: 1, lvl: 5, desc: 'Never triggers floor spikes.' },
  quickhands: { name: 'Quick Hands', max: 2, lvl: 3, desc: 'Reload 25% faster per rank.' },
  science: { name: 'Science!', max: 2, lvl: 3, desc: 'Terminal hacking gets easier.' },
};

// ---------------------------------------------------------------- stats
G.special = function (l) { const st = G.st; return 5 + ((st && st.bobbles && st.bobbles.indexOf(l) >= 0) ? 1 : 0) + ((st && st.specialBonus && st.specialBonus[l]) || 0); };
G.perk = function (id) { const st = G.st; return (st && st.perks && st.perks[id]) || 0; };
G.hasAbility = function (id) { return !!(G.st && G.st.abilities[id]) || !!(G.cheats && G.cheats.abilities); };
G.buff = function (id) { return G.st && G.st.buffs && G.st.buffs[id] > 0; };
G.maxHP = function () { const st = G.st; return Math.max(10, Math.round((st.maxHp + G.perk('lifegiver') * 15 + (G.special('E') - 5) * 6) * (1 - st.rad / 220))); };
G.maxAP = function () { return 100; };
G.apRegen = function () { return 14 + G.special('A') * 1.2 + G.perk('actionboy') * 5 + (G.buff('jet') ? 40 : 0); };
G.moveSpeedMul = function () { return 1 + (G.special('A') - 5) * 0.012; };
G.damageMul = function (o) {
  o = o || {}; const w = o.weapon ? CD.WEAPONS[o.weapon] : null; let m = 1 + G.perk('bloodymess') * 0.05 + (G.buff('psycho') ? 0.25 : 0) + (G.buff('buffout') ? 0.15 : 0);
  if (o.melee || (w && w.kind === 'melee')) m *= 1 + G.perk('ironfist') * 0.15 + (G.special('S') - 5) * 0.05;
  if (w && w.cls === 'pistol') m *= 1 + G.perk('gunslinger') * 0.12;
  if (w && (w.cls === 'rifle' || w.cls === 'shotgun')) m *= 1 + G.perk('rifleman') * 0.12;
  return m;
};
G.ammoCap = function (t) { return Math.round(CD.AMMO[t].cap * (1 + (G.st.ammoUp || 0) * 0.25)); };
G.ammoAmount = function (t) { const a = CD.AMMO[t].drop; return Math.round((a[0] + Math.random() * (a[1] - a[0])) * (1 + G.perk('scrounger') * 0.25)); };
G.ammoTypeForDrop = function () {
  // prefer ammo for weapons the player owns
  const owned = (G.st.weapons || []).map((w) => CD.WEAPONS[w]).filter((w) => w && w.ammo);
  if (!owned.length) return '10mm';
  const w = owned[Math.floor(Math.random() * owned.length)];
  return w.ammo;
};
G.giveAmmo = function (t, n) { const st = G.st; const cap = G.ammoCap(t); const before = st.ammo[t] || 0; st.ammo[t] = Math.min(cap, before + n); return st.ammo[t] - before; };
G.notify = function (msg, kind) { G.notes = G.notes || []; G.notes.push({ msg, kind: kind || 'info', t: 3.2, max: 3.2 }); if (G.notes.length > 5) G.notes.shift(); };

// ---------------------------------------------------------------- collecting
G.collect = function (pk) {
  const st = G.st, o = pk.o, k = pk.k;
  const note = (m, kind) => G.notify(m, kind);
  let ok = true;
  switch (k) {
    case 'caps': st.caps += pk.n; note('+' + pk.n + ' caps', 'small'); CD.audio.play('caps'); break;
    case 'stimpak': if (st.aid.stimpak >= G.stimCap()) { if (pk.grounded) ok = false; else ok = false; if (!ok) return false; } st.aid.stimpak = Math.min(G.stimCap(), st.aid.stimpak + pk.n); note('Stimpak', 'small'); CD.audio.play('pickup'); break;
    case 'radaway': case 'radx': case 'medx': case 'psycho': case 'jet': case 'buffout': case 'mentats': case 'nukacola':
      st.aid[k] = (st.aid[k] || 0) + pk.n; note((CD.AID[k] ? CD.AID[k].name : k) + ' x' + pk.n, 'small'); CD.audio.play('pickup'); break;
    case 'grenade': st.grenades = Math.min(G.grenadeCap(), st.grenades + pk.n); note('Frag Grenade x' + pk.n, 'small'); CD.audio.play('pickup'); break;
    case 'ammo': { const got = G.giveAmmo(o.type, pk.n); if (got <= 0) return false; note(CD.AMMO[o.type].name + ' x' + got, 'small'); CD.audio.play('pickup'); break; }
    case 'ability': G.grantAbility(o.id); break;
    case 'bobble': G.grantBobble(o.stat); break;
    case 'upgrade': G.grantUpgrade(o.u); break;
    case 'key': st.keys[o.id] = 1; note('KEYCARD: ' + (o.name || o.id).toUpperCase(), 'perk'); CD.audio.play('unlock'); break;
    case 'holotape': G.readHolotape(o.id, true); break;
    case 'weapon': G.grantWeapon(o.id); break;
    case 'perkpoint': st.perkPoints += pk.n; note('+1 PERK POINT', 'perk'); CD.audio.play('levelup'); break;
    default: break;
  }
  if (pk.key) { st.flags['got:' + pk.key] = 1; if (pk.big) G.autosave && G.autosave(); }
  return true;
};
G.stimCap = function () { return 5 + (G.st.stimUp || 0) * 2; };
G.grenadeCap = function () { return 6 + (G.st.stimUp || 0); };
G.grantAbility = function (id) {
  const a = CD.ABILITIES[id]; G.st.abilities[id] = 1;
  G.banner({ title: a.name, sub: a.short.toUpperCase(), text: a.desc, col: a.col, dur: 5.2 }); CD.audio.play('ability');
  G.fx.flash('#bfffe0', 0.4); G.fx.shake(4, 0.4);
  if (id === 'powerfist') G.grantWeapon('powerfist', true);
  G.autosave && G.autosave();
};
G.grantBobble = function (stat) {
  const st = G.st; if (st.bobbles.indexOf(stat) < 0) st.bobbles.push(stat);
  G.banner({ title: CD.BOBBLES[stat].name.toUpperCase() + ' BOBBLEHEAD', sub: 'S.P.E.C.I.A.L. +1', text: CD.SPECIAL_DESC[stat], col: CD.BOBBLES[stat].col, dur: 4 }); CD.audio.play('bobble');
};
G.grantUpgrade = function (u) {
  const st = G.st;
  if (u === 'hp') { st.maxHp += 10; st.hp = G.maxHP(); G.banner({ title: 'VITA-TONIC', sub: 'MAX HP +10', text: 'Pre-war fortified tonic. Tastes like batteries and orange.', col: '#ff7a9a', dur: 3.4 }); }
  else if (u === 'ammo') { st.ammoUp = (st.ammoUp || 0) + 1; G.banner({ title: 'AMMO BANDOLIER', sub: 'AMMO CAPACITY +25%', text: 'More room for the good stuff.', col: '#ffd070', dur: 3.4 }); }
  else if (u === 'stim') { st.stimUp = (st.stimUp || 0) + 1; st.aid.stimpak = Math.min(G.stimCap(), st.aid.stimpak + 2); G.banner({ title: "DOCTOR'S BAG", sub: 'STIMPAK CAPACITY +2', text: 'Pre-war medical satchel with extra padding.', col: '#7dffb0', dur: 3.4 }); }
  CD.audio.play('bobble'); G.autosave && G.autosave();
};
G.grantWeapon = function (id, silent) {
  const st = G.st, w = CD.WEAPONS[id]; if (!w) return;
  if (st.weapons.indexOf(id) >= 0) { if (w.ammo) { G.giveAmmo(w.ammo, w.mag * 2); } return; }
  st.weapons.push(id); st.mag[id] = w.mag || 0;
  if (w.ammo) G.giveAmmo(w.ammo, w.mag);
  if (!silent) G.banner({ title: w.name.toUpperCase(), sub: 'NEW WEAPON', text: w.desc, col: '#ffd070', dur: 3.6 });
  CD.audio.play('pickup');
};

// ---------------------------------------------------------------- consumables
G.useAid = function (id) {
  const st = G.st, p = G.player; if (!p || p.dead) return false;
  if (!st.aid[id] || st.aid[id] <= 0) { if (id === 'stimpak') G.notify('No stimpaks!', 'warn'); return false; }
  switch (id) {
    case 'stimpak': if (st.hp >= G.maxHP() && st.rad <= 0) return false; G.heal(60 * (1 + G.perk('medic') * 0.25)); break;
    case 'radaway': if (st.rad <= 0) return false; st.rad = Math.max(0, st.rad - 60); G.fx.text(p.cx, p.y - 8, 'RAD -60', '#7dffb0', 14); break;
    case 'radx': st.buffs.radx = 90; break;
    case 'medx': st.buffs.medx = 60; break;
    case 'psycho': st.buffs.psycho = 60; break;
    case 'jet': st.buffs.jet = 30; break;
    case 'buffout': st.buffs.buffout = 60; break;
    case 'mentats': st.buffs.mentats = 60; break;
    case 'nukacola': G.heal(20); st.rad = Math.min(100, st.rad + 8); st.ap = Math.min(G.maxAP(), st.ap + 30); break;
    default: return false;
  }
  st.aid[id]--; CD.audio.play(id === 'stimpak' ? 'stimpak' : 'chem'); return true;
};

// ---------------------------------------------------------------- icons
function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
CD.drawItemIcon = function (ctx, k, o, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); t = t || 0;
  const shadow = () => { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 9, 8, 2.4, 0, 0, 7); ctx.fill(); };
  const outline = 'rgba(10,8,6,0.75)';
  switch (k) {
    case 'caps': {
      shadow(); const gr = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8); gr.addColorStop(0, '#f3cf7a'); gr.addColorStop(0.6, '#b98a3c'); gr.addColorStop(1, '#6a4a1c');
      ctx.fillStyle = gr; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? 7 : 8.2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.fillStyle = '#c33a2a'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-2.5, -0.6, 5, 1.2); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-2.4, -3.4, 2, 1, -0.5, 0, 7); ctx.fill(); break;
    }
    case 'stimpak': {
      shadow(); ctx.rotate(-0.7);
      R(ctx, -10, -3, 16, 6, '#c9c6b8'); R(ctx, -10, -3, 16, 1.6, 'rgba(255,255,255,0.7)'); R(ctx, -8, -1.4, 11, 3.4, '#e8a020'); R(ctx, -8, -1.4, 11, 1.2, 'rgba(255,255,255,0.4)');
      R(ctx, -13, -4, 3, 8, '#5a5a56'); R(ctx, 6, -2, 4, 4, '#8a8a84'); R(ctx, 10, -0.5, 8, 1, '#d8dcdf'); ctx.strokeStyle = outline; ctx.lineWidth = 0.6; ctx.strokeRect(-10, -3, 16, 6); break;
    }
    case 'radaway': {
      shadow(); ctx.fillStyle = 'rgba(230,240,235,0.85)'; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(7, 6); ctx.quadraticCurveTo(0, 9, -7, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e07a20'; ctx.beginPath(); ctx.moveTo(-6.4, -1); ctx.lineTo(6.6, -1); ctx.lineTo(7, 6); ctx.quadraticCurveTo(0, 9, -7, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(7, 6); ctx.quadraticCurveTo(0, 9, -7, 6); ctx.closePath(); ctx.stroke(); R(ctx, -2, -11, 4, 3, '#5a5a56'); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-4.6, -6, 1.6, 8); break;
    }
    case 'radx': case 'medx': case 'psycho': case 'jet': case 'buffout': case 'mentats': case 'nukacola': {
      shadow(); const col = { radx: '#e6a020', medx: '#3a78c8', psycho: '#c04040', jet: '#e0d0a0', buffout: '#c46a2a', mentats: '#3ac8c8', nukacola: '#c8281c' }[k];
      R(ctx, -4.6, -6, 9.2, 13, col); R(ctx, -4.6, -6, 9.2, 2, 'rgba(255,255,255,0.35)'); R(ctx, -4, -9, 8, 3.4, '#e8e8e0'); R(ctx, -4.6, -1.4, 9.2, 4.6, 'rgba(255,255,255,0.75)'); ctx.strokeStyle = outline; ctx.lineWidth = 0.6; ctx.strokeRect(-4.6, -6, 9.2, 13); break;
    }
    case 'ammo': {
      shadow(); const a = CD.AMMO[o.type] || CD.AMMO['10mm']; R(ctx, -8, -3, 16, 10, '#5b5a48'); R(ctx, -8, -3, 16, 2, 'rgba(255,255,255,0.22)'); R(ctx, -8, 2, 16, 5, '#464538');
      for (let i = 0; i < 4; i++) { R(ctx, -6.4 + i * 3.8, -8, 2.8, 6, a.col); R(ctx, -6.4 + i * 3.8, -8, 2.8, 1.6, 'rgba(255,255,255,0.55)'); }
      if (o.type === 'cell' || o.type === 'plasma') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = a.col; ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2; ctx.beginPath(); ctx.arc(0, -5, 8, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      ctx.strokeStyle = outline; ctx.lineWidth = 0.6; ctx.strokeRect(-8, -3, 16, 10); break;
    }
    case 'grenade': shadow(); ctx.fillStyle = '#4a5240'; ctx.beginPath(); ctx.ellipse(0, 1, 6, 7, 0, 0, 7); ctx.fill(); R(ctx, -2, -8, 4, 3, '#20241c'); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-4, -3, 2, 5); break;
    case 'ability': {
      ctx.globalCompositeOperation = 'lighter'; const a = CD.ABILITIES[o.id]; const col = (a && a.col) || '#7dffb0';
      const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, 22); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.15; ctx.fillStyle = gr; ctx.fillRect(-22, -22, 44, 44); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over'; ctx.rotate(t * 0.8); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.strokeRect(-8, -8, 16, 16); ctx.rotate(-t * 1.6); ctx.strokeRect(-6, -6, 12, 12); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; break;
    }
    case 'bobble': {
      shadow(); const col = (CD.BOBBLES[o.stat] || {}).col || '#fff';
      R(ctx, -7, 6, 14, 4, '#3a3a3a'); R(ctx, -7, 6, 14, 1, 'rgba(255,255,255,0.3)'); R(ctx, -4, -2, 8, 9, col); ctx.fillStyle = '#f0d8a8'; ctx.beginPath(); ctx.arc(0, -8, 6.6, 0, 7); ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = '#20180e'; ctx.fillRect(-3, -9, 1.6, 2); ctx.fillRect(1.6, -9, 1.6, 2); ctx.strokeStyle = '#7a3a2a'; ctx.beginPath(); ctx.arc(0, -6, 2.4, 0.2, 2.9); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -13, 3.4, Math.PI, 0); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + Math.sin(t * 4) * 0.15; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -3, 14, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break;
    }
    case 'upgrade': {
      shadow(); if (o.u === 'hp') { R(ctx, -4, -6, 8, 13, '#e05a7a'); R(ctx, -4, -6, 8, 3, 'rgba(255,255,255,0.4)'); R(ctx, -3, -9, 6, 3, '#d8d8d0'); R(ctx, -1, -1, 2, 6, 'rgba(255,255,255,0.8)'); R(ctx, -3, 1, 6, 2, 'rgba(255,255,255,0.8)'); }
      else if (o.u === 'ammo') { ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(8, -4); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.fill(); for (let i = 0; i < 4; i++) { R(ctx, -6 + i * 3.4, -8, 2.4, 6, '#d6a642'); } R(ctx, -8, -1, 16, 2, '#3a2e1a'); }
      else { R(ctx, -8, -5, 16, 12, '#e8e8e0'); R(ctx, -6, -8, 12, 3, '#b8b8b0'); R(ctx, -1.4, -3, 2.8, 8, '#d02a2a'); R(ctx, -4, -0.4, 8, 2.8, '#d02a2a'); }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(t * 4) * 0.1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break;
    }
    case 'key': { shadow(); const col = o.col || '#4a86d8'; R(ctx, -9, -6, 18, 12, '#e8e6dc'); R(ctx, -9, -6, 18, 3.4, col); R(ctx, -6, 0, 6, 4.4, '#c8a020'); R(ctx, 2, 1, 5, 3, 'rgba(0,0,0,0.5)'); ctx.strokeStyle = outline; ctx.lineWidth = 0.7; ctx.strokeRect(-9, -6, 18, 12); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + Math.sin(t * 4) * 0.12; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break; }
    case 'holotape': { shadow(); R(ctx, -8, -5, 16, 11, '#2a2d2a'); R(ctx, -6, -3, 12, 6, '#c8c4a8'); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-3, 0, 1.8, 0, 7); ctx.arc(3, 0, 1.8, 0, 7); ctx.fill(); R(ctx, -8, -5, 16, 1.4, 'rgba(255,255,255,0.3)'); ctx.strokeStyle = outline; ctx.lineWidth = 0.6; ctx.strokeRect(-8, -5, 16, 11); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(t * 4) * 0.1; ctx.fillStyle = '#5dff9a'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break; }
    case 'weapon': {
      const sp = CD.Rig.weaponSprite(o.id); shadow();
      if (sp) { const sc = Math.min(1.1, 24 / Math.max(sp.w, 18)); ctx.scale(sc, sc); ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h); }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 + Math.sin(t * 4) * 0.1; ctx.fillStyle = '#ffd070'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break;
    }
    default: R(ctx, -5, -5, 10, 10, '#ccc');
  }
  ctx.restore();
};

})();
