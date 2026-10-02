// Title, pause, controls, options, map and ending screens. Keyboard / pad navigable and pointer friendly.
import { el, ICONS } from './hud.js';
import { ROOMS, ROOM_LIST, TOTALS } from '../world/world.js';
import { AREA_NAMES } from '../gfx/themes.js';
import { fmtTime } from '../core/util.js';
import { ABILITY_INFO } from '../game/game.js';

const AREA_COLOR = { jungle: '#4fae3b', temple: '#3fb7a4', cavern: '#8a6aff', quarry: '#ff7a3a', tower: '#ffb13a' };

export class Menus {
  constructor(game) {
    this.game = game;
    this.root = game.hud.root;
    this.screen = null;
    this.items = [];
    this.sel = 0;
    this.kind = null;
    this.touch = false;
  }

  hideAll() {
    if (this.screen) { this.screen.remove(); this.screen = null; }
    this.items = []; this.kind = null; this.mapCanvas = null;
  }

  mount(kind, cls, ...kids) {
    this.hideAll();
    this.kind = kind;
    this.screen = el('div', { class: 'screen ' + cls }, ...kids);
    this.root.append(this.screen);
    return this.screen;
  }

  button(label, onClick, { disabled = false } = {}) {
    const b = el('button', { class: 'btn', type: 'button' }, label);
    if (disabled) b.setAttribute('disabled', '');
    b.addEventListener('click', (e) => { e.stopPropagation(); this.game.audio.unlock(); this.game.audio.sfx('menu'); onClick(); });
    b.addEventListener('pointerenter', () => { const i = this.items.indexOf(b); if (i >= 0) this.setSel(i); });
    return b;
  }

  setItems(buttons) {
    this.items = buttons.filter((b) => !b.hasAttribute('disabled'));
    this.sel = 0;
    this.setSel(0);
  }
  setSel(i) {
    this.sel = (i + this.items.length) % Math.max(1, this.items.length);
    this.items.forEach((b, k) => b.classList.toggle('sel', k === this.sel));
  }

  update(frame) {
    if (!this.screen) return;
    const p = frame.pressed;
    if (this.kind === 'map') { if (p.map || p.pause || p.jump || p.confirm || p.slap) this.game.closeMap(); return; }
    if (this.kind === 'ending') { if (p.confirm || p.jump) this.game.enterTitle(); return; }
    if (!this.items.length) return;
    if (p.down) { this.setSel(this.sel + 1); this.game.audio.sfx('tick'); }
    if (p.up) { this.setSel(this.sel - 1); this.game.audio.sfx('tick'); }
    if (p.confirm || (this.kind !== 'pause' && p.jump)) { this.items[this.sel]?.click(); }
    if (p.pause && (this.kind === 'pause')) this.game.resume();
    else if (p.pause && (this.kind === 'controls' || this.kind === 'options')) this.back();
  }

  back() { if (this.returnTo === 'pause') this.showPause(); else this.showTitle(); }

  // ------------------------------------------------------------------ title
  showTitle() {
    const g = this.game;
    this.returnTo = 'title';
    const logo = el('div', { class: 'logo' },
      el('span', { class: 'l0' }, 'A KONG-STYLE METROIDVANIA'),
      el('span', { class: 'l1' }, 'BANANA'),
      el('span', { class: 'l3' }, 'DEPTHS'));
    const cont = this.button('Continue', () => g.continueGame(), { disabled: !g.hasSave });
    const items = [
      cont,
      this.button('New Game', () => g.newGame()),
      this.button('Controls', () => this.showControls('title')),
      this.button('Options', () => this.showOptions('title')),
    ];
    const menu = el('div', { class: 'menu' }, ...items);
    const foot = el('div', { class: 'foot' }, 'An unofficial fan tribute to the classic Donkey Kong arcade games. Not affiliated with or endorsed by Nintendo. All art, code and sound are original and generated at runtime.');
    this.mount('title', 'title', logo, menu, foot);
    this.setItems(items);
    if (g.hasSave) this.setSel(0); else this.setSel(0);
  }

  // ------------------------------------------------------------------ pause
  showPause() {
    const g = this.game;
    this.returnTo = 'pause';
    const items = [
      this.button('Resume', () => g.resume()),
      this.button('Map', () => { g.menus.hideAll(); g.state = 'map'; g.menus.showMap(); }),
      this.button('Controls', () => this.showControls('pause')),
      this.button('Options', () => this.showOptions('pause')),
      this.button('Save & Quit', () => g.quitToTitle()),
    ];
    this.mount('pause', 'dim', el('div', { class: 'logo' }, el('span', { class: 'l2' }, 'PAUSED')), el('div', { class: 'menu' }, ...items));
    this.setItems(items);
  }

  // ------------------------------------------------------------------ controls
  showControls(from) {
    this.returnTo = from;
    const row = (a, b) => el('tr', {}, el('td', {}, a), el('td', { html: b }));
    const k = (s) => `<kbd>${s}</kbd>`;
    const table = el('table', {},
      row('Move', `${k('←')} ${k('→')} or ${k('A')} ${k('D')}`),
      row('Jump', `${k('Space')} or ${k('Z')} (hold to jump higher)`),
      row('Slap', `${k('X')} or ${k('J')}: smacks foes, reflects fireballs, pings switches`),
      row('Roll', `${k('C')} or ${k('Shift')} (once learned). Jump while rolling for a long leap`),
      row('Ground Pound', `${k('↓')} + ${k('X')} in the air (once learned)`),
      row('Wall Grip', `Hold toward a wall in the air, then ${k('Jump')} (once learned)`),
      row('Boomerang', `${k('V')} or ${k('I')} (once learned)`),
      row('Climb', `${k('↑')} / ${k('↓')} on ladders and vines. ${k('↓')}+${k('Jump')} drops through thin platforms`),
      row('Read sign', `${k('↑')} next to a sign`),
      row('Map / Pause', `${k('M')} or ${k('Tab')}  /  ${k('Esc')} or ${k('P')}`),
      row('Gamepad', 'Stick or D-pad to move. A jump, X slap, B roll, Y boomerang, Start pause, Select map'),
      row('Touch', 'On-screen stick and buttons appear automatically on touch screens'),
    );
    const back = this.button('Back', () => this.back());
    back.classList.add('back');
    this.mount('controls', 'dim' + (from === 'title' ? '' : ''), el('div', { class: 'panel' }, el('h2', {}, 'Controls'), table, back));
    this.setItems([back]);
  }

  // ------------------------------------------------------------------ options
  showOptions(from) {
    const g = this.game;
    this.returnTo = from;
    const vol = el('input', { type: 'range', min: '0', max: '100', value: String(Math.round(g.settings.volume * 100)), 'aria-label': 'Volume' });
    vol.addEventListener('input', () => g.setSettings({ volume: vol.value / 100 }));
    vol.addEventListener('change', () => g.audio.sfx('banana'));
    const toggle = (key, label) => {
      const t = el('div', { class: 'toggle' + (g.settings[key] ? '' : ' off'), role: 'switch', tabindex: '0' }, g.settings[key] ? 'ON' : 'OFF');
      t.addEventListener('click', () => { g.setSettings({ [key]: !g.settings[key] }); t.textContent = g.settings[key] ? 'ON' : 'OFF'; t.classList.toggle('off', !g.settings[key]); g.audio.sfx('menu'); });
      return el('div', { class: 'row' }, el('span', {}, label), t);
    };
    const back = this.button('Back', () => this.back());
    back.classList.add('back');
    this.mount('options', 'dim', el('div', { class: 'panel' }, el('h2', {}, 'Options'),
      el('div', { class: 'row' }, el('span', {}, 'Volume'), vol),
      toggle('music', 'Music'),
      toggle('shake', 'Screen shake'),
      back));
    this.setItems([back]);
  }

  // ------------------------------------------------------------------ map
  showMap() {
    const canvas = el('canvas', { id: 'mapcanvas', width: '920', height: '560' });
    const legend = el('div', { class: 'maplegend' },
      el('span', { html: '<i style="background:#ffe14a"></i>Checkpoint' }),
      el('span', { html: '<i style="background:#ff5a8a"></i>Heart Fruit' }),
      el('span', { html: '<i style="background:#fff"></i>You' }),
      el('span', {}, 'Press M, Esc or Jump to close'));
    this.mount('map', 'dim', el('div', { class: 'logo' }, el('span', { class: 'l2' }, 'MAP')), canvas, legend);
    this.mapCanvas = canvas;
    this.drawMap();
    canvas.addEventListener('click', () => this.game.closeMap());
  }

  drawMap() {
    const c = this.mapCanvas, g = this.game;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#0c1a14'; ctx.fillRect(0, 0, c.width, c.height);
    const rooms = ROOM_LIST.filter((r) => r.map);
    if (!rooms.length) return;
    const CELL_W = 26, CELL_H = 15;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const r of rooms) {
      const w = Math.max(1, Math.ceil(r.w / CELL_W)), h = Math.max(1, Math.ceil(r.h / CELL_H));
      x0 = Math.min(x0, r.map.x); y0 = Math.min(y0, r.map.y); x1 = Math.max(x1, r.map.x + w); y1 = Math.max(y1, r.map.y + h);
    }
    const pad = 28, scale = Math.min((c.width - pad * 2) / (x1 - x0), (c.height - pad * 2) / (y1 - y0));
    const ox = (c.width - (x1 - x0) * scale) / 2, oy = (c.height - (y1 - y0) * scale) / 2;
    const vis = g.save.visited;
    const seenNeighbor = new Set();
    for (const r of rooms) if (vis[r.id]) for (const p of Object.values(r.portals)) seenNeighbor.add(p.to);
    const cur = g.room && g.room.def.id;
    for (const r of rooms) {
      const known = vis[r.id], hint = !known && seenNeighbor.has(r.id);
      if (!known && !hint) continue;
      const w = Math.max(1, Math.ceil(r.w / CELL_W)), h = Math.max(1, Math.ceil(r.h / CELL_H));
      const rx = ox + (r.map.x - x0) * scale, ry = oy + (r.map.y - y0) * scale, rw = w * scale, rh = h * scale;
      const col = AREA_COLOR[r.area] || '#888';
      if (known) {
        ctx.fillStyle = col + '88'; ctx.fillRect(rx + 1, ry + 1, rw - 2, rh - 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
        // tiles preview: solid blocks as darker pixels
        const px = (rw - 4) / r.w, py = (rh - 4) / r.h;
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        for (let ty = 0; ty < r.h; ty++) for (let tx = 0; tx < r.w; tx++) {
          const t = r.tiles[ty * r.w + tx];
          if (t === 1 || t === 8 || t === 9) ctx.fillRect(rx + 2 + tx * px, ry + 2 + (r.h - 1 - ty) * py, Math.max(1, px), Math.max(1, py));
        }
        for (const m of r.marks) {
          const mx = rx + 2 + (m.x + 0.5) * px, my = ry + 2 + (r.h - 1 - m.y + 0.5) * py;
          if (m.kind === 'save') { ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(mx, my, 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); }
          if (m.kind === 'heart' && !g.save.collected[`${r.id}:h:${m.x},${m.y}`]) { ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.arc(mx, my, 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); }
          if (m.kind === 'relic' && !g.save.abilities[r.props.relic]) { ctx.fillStyle = '#fff'; ctx.fillRect(mx - 4, my - 4, 8, 8); ctx.strokeStyle = '#000'; ctx.strokeRect(mx - 4, my - 4, 8, 8); }
        }
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 11px sans-serif'; ctx.fillText(r.name, rx + 6, ry + 14);
      } else {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1.5; ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2); ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff66'; ctx.font = '700 16px sans-serif'; ctx.fillText('?', rx + rw / 2 - 4, ry + rh / 2 + 5);
      }
    }
    // player marker
    const r = g.room && g.room.def;
    if (r && r.map) {
      const w = Math.max(1, Math.ceil(r.w / CELL_W)), h = Math.max(1, Math.ceil(r.h / CELL_H));
      const rx = ox + (r.map.x - x0) * scale, ry = oy + (r.map.y - y0) * scale, rw = w * scale, rh = h * scale;
      const px = rx + 2 + (g.player.x / r.w) * (rw - 4), py = ry + 2 + (1 - g.player.y / r.h) * (rh - 4);
      const t = (performance.now() % 900) / 900;
      ctx.strokeStyle = `rgba(255,255,255,${1 - t})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 6 + t * 12, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
      requestAnimationFrame(() => { if (this.kind === 'map' && this.mapCanvas === c) this.drawMap(); });
    }
    void cur;
  }

  // ------------------------------------------------------------------ ending
  showEnding() {
    const g = this.game, s = g.save;
    const pct = Math.min(100, Math.round(((Object.keys(s.collected).length) / Math.max(1, TOTALS.collectibles)) * 100));
    const stats = el('div', { class: 'stats' },
      el('span', {}, 'Time'), el('b', {}, fmtTime(s.playtime)),
      el('span', {}, 'Bananas'), el('b', {}, String(s.bananas)),
      el('span', {}, 'Heart Fruit'), el('b', {}, `${s.hpMax - 3} / ${TOTALS.hearts}`),
      el('span', {}, 'Knock-outs'), el('b', {}, String(s.deaths)),
      el('span', {}, 'Island explored'), el('b', {}, pct + '%'));
    const back = this.button('Back to Title', () => g.enterTitle());
    this.mount('ending', 'dim', el('div', { class: 'ending-title' }, 'THE JUNGLE HEART SHINES AGAIN!'),
      el('div', { class: 'ending-sub' }, 'The Tiki Overlord is toppled and the Golden Banana glows once more. Kong heads home with a very full bunch of bananas.'),
      stats, back);
    this.setItems([back]);
  }
}
