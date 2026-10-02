// In-game overlay: hearts, bananas, ability slots, toasts, room banner, sign box, boss bar, item-get card.
import { AREA_NAMES } from '../gfx/themes.js';

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}

const HEART = '<svg class="HC" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2 0 3.5 1 5.4 3 1.9-2 3.4-3 5.4-3 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"/></svg>';
export const BANANA_SVG = '<svg viewBox="0 0 28 28"><path d="M5 4C2.5 12 8 22 21 22c2.4 0 4-1 4.6-2.4C16 19.600 10.800 13.400 9.400 4.600z" fill="#ffd23a" stroke="#4a3010" stroke-width="2" stroke-linejoin="round"/><path d="M5 4l4.400.6" stroke="#4a3010" stroke-width="3" stroke-linecap="round"/></svg>';
const ICONS = {
  roll: '<svg viewBox="0 0 28 28" fill="none" stroke="#ffb13a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="14" r="8"/><path d="M14 2l4 4-4 4" /></svg>',
  pound: '<svg viewBox="0 0 28 28" fill="none" stroke="#ff6a5a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v14M8 11l6 7 6-7M5 24h18"/></svg>',
  grip: '<svg viewBox="0 0 28 28" fill="none" stroke="#5aff9a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 25V13M13 25V9M17 25V10M21 25V14M9 13c0-2 4-2 4 0M9 25h12"/></svg>',
  boom: '<svg viewBox="0 0 28 28" fill="none" stroke="#ffe14a" stroke-width="3.4" stroke-linecap="round"><path d="M5 5c-1 9 5 17 18 17"/></svg>',
};
export { ICONS };

const ABIL_KEYS = { roll: 'C', pound: '↓X', grip: 'wall', boom: 'V' };

export class Hud {
  constructor(game) {
    this.game = game;
    const app = document.getElementById('app');
    this.root = el('div', { id: 'ui' });
    app.appendChild(this.root);

    this.hud = el('div', { class: 'hud', hidden: '' });
    this.hearts = el('div', { class: 'hearts' });
    this.bananas = el('div', { class: 'bananas', html: BANANA_SVG + '<span>0</span>' });
    this.hud.append(el('div', { class: 'hud-tl' }, this.hearts, this.bananas));
    this.abilEls = {};
    const tr = el('div', { class: 'hud-tr' });
    for (const k of ['roll', 'pound', 'grip', 'boom']) {
      const e = el('div', { class: 'abil', html: ICONS[k] + `<span class="key">${ABIL_KEYS[k]}</span>`, title: k });
      this.abilEls[k] = e; tr.append(e);
    }
    this.mapBtn = el('button', { class: 'hud-btn', 'aria-label': 'Map', html: '🗺' });
    this.pauseBtn = el('button', { class: 'hud-btn', 'aria-label': 'Pause', html: '❚❚' });
    tr.append(this.mapBtn, this.pauseBtn);
    this.hud.append(tr);
    this.roomName = el('div', { class: 'roomname' }, el('div', { class: 'area' }), el('div', { class: 'room' }));
    this.toasts = el('div', { class: 'toasts' });
    this.signBox = el('div', { class: 'sign-box', hidden: '' });
    this.bossBar = el('div', { class: 'boss', hidden: '' }, el('div', { class: 'name' }), el('div', { class: 'bar' }, el('div', { class: 'fill' })));
    this.itemEl = el('div', { class: 'itemget', hidden: '' });
    this.deathEl = el('div', { class: 'death', hidden: '' }, el('span', {}, 'KNOCKED OUT!'));
    this.hurtEl = el('div', { class: 'hurt' });
    this.fadeEl = el('div', { class: 'fade' });
    this.hud.append(this.roomName, this.toasts, this.signBox, this.bossBar);
    this.root.append(this.hud, this.itemEl, this.deathEl, this.hurtEl, this.fadeEl);
    this.signOwner = null;
    this.cache = { hp: -1, hpMax: -1, bananas: -1, abil: '' };
    this.roomTimer = 0;
    this.lastArea = null;
    this.lastRoom = null;
    this.bossName = '';
    this.mapBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); game.openMap(); });
    this.pauseBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); game.togglePause(); });
  }

  show(v) { this.hud.hidden = !v; if (!v) { this.hideSign(); this.hideBoss(); } }

  refresh(force = false) {
    const s = this.game.save, c = this.cache;
    if (force || s.hp !== c.hp || s.hpMax !== c.hpMax) {
      c.hp = s.hp; c.hpMax = s.hpMax;
      this.hearts.innerHTML = '';
      for (let i = 0; i < s.hpMax; i++) this.hearts.insertAdjacentHTML('beforeend', HEART.replace('HC', 'heart ' + (i < s.hp ? 'full' : 'empty')));
    }
    if (force || s.bananas !== c.bananas) { c.bananas = s.bananas; this.bananas.lastChild.textContent = s.bananas; }
    const a = Object.entries(s.abilities).map(([k, v]) => k + (v ? 1 : 0)).join();
    if (force || a !== c.abil) {
      for (const [k, v] of Object.entries(s.abilities)) {
        const e = this.abilEls[k];
        const had = e.classList.contains('have');
        e.classList.toggle('have', !!v);
        if (v && !had && !force) { e.classList.add('fresh'); setTimeout(() => e.classList.remove('fresh'), 1500); }
      }
      c.abil = a;
    }
  }

  update(dt) {
    if (this.hud.hidden) return;
    this.refresh();
    if (this.roomTimer > 0) { this.roomTimer -= dt; if (this.roomTimer <= 0) this.roomName.classList.remove('show'); }
    const b = this.game.boss;
    if (b && !b.dead) { if (this.bossBar.hidden) this.showBoss(b.title || 'BOSS'); this.bossBar.querySelector('.fill').style.width = Math.max(0, (b.hp / b.maxHp) * 100) + '%'; }
    else if (!this.bossBar.hidden) this.hideBoss();
  }

  flashHurt() { this.hurtEl.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => this.hurtEl.classList.remove('on'))); }
  bumpBananas() { this.bananas.classList.remove('bump'); void this.bananas.offsetWidth; this.bananas.classList.add('bump'); }
  bumpHearts() { this.refresh(true); this.hearts.querySelectorAll('.heart').forEach((h) => h.classList.add('bump')); }

  toast(text, sec = 2.5) {
    const t = el('div', { class: 'toast' }, text);
    this.toasts.append(t);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), sec * 1000);
    setTimeout(() => t.remove(), sec * 1000 + 450);
  }

  roomEntered(def, title) {
    if (title) { this.roomName.classList.remove('show'); return; }
    const area = AREA_NAMES[def.area];
    const first = !this.seen;
    this.seen = this.seen || new Set();
    const isNew = !this.seen.has(def.id);
    this.seen.add(def.id);
    if (area !== this.lastArea || (isNew && def.props.titleCard)) {
      this.roomName.firstChild.textContent = area;
      this.roomName.lastChild.textContent = def.name;
      this.roomName.classList.add('show');
      this.roomTimer = 3.2;
    }
    this.lastArea = area; this.lastRoom = def.id;
    void first;
  }

  toggleSign(text, owner) { if (this.signOwner === owner) this.hideSign(); else this.showSign(text, owner); }
  showSign(text, owner) { this.signBox.textContent = text; this.signBox.hidden = false; this.signOwner = owner; }
  hideSign() { this.signBox.hidden = true; this.signOwner = null; }

  showBoss(name) { this.bossBar.firstChild.textContent = name; this.bossBar.hidden = false; this.bossBar.querySelector('.fill').style.width = '100%'; }
  hideBoss() { this.bossBar.hidden = true; }

  showItem(ability, info) {
    this.itemEl.innerHTML = '';
    this.itemEl.append(el('div', { class: 'card' },
      el('div', { class: 'got' }, 'NEW ABILITY'),
      el('div', { class: 'title' }, info.name.toUpperCase()),
      el('div', { class: 'desc' }, info.desc),
      el('div', { class: 'how' }, info.key),
      el('div', { class: 'cont' }, 'Press any key to continue')));
    this.itemEl.hidden = false;
    this.refresh(true);
  }
  hideItem() { this.itemEl.hidden = true; }
  showDeath(v) { this.deathEl.hidden = !v; if (!v) this.fade(0); }
  fade(a) { this.fadeEl.style.opacity = String(a); }
}
