// Items tab: consumables (use on one ally, a downed ally, or all allies), key items, and a
// read-only Gear section (equipment counts; equipping happens in the Equip tab). Item icons are
// ITEMS[id].icon || id. Using an item calls ui.onUseItem(itemId, memberId) (core/state.js
// useItemOutOfBattle); 'allies' items are used once with the first member's id.

import { el, injectCSS } from '../core/util.js';
import { bindPointer, onTap } from './theme.js';
import { gearTags } from './equip.js';

const FIELD_TARGETS = ['ally', 'koAlly', 'allies'];
const TARGET_LABEL = { ally: 'Target: one ally', koAlly: 'Target: downed ally', allies: 'Target: all allies' };

const CSS = `
.vp-items { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 340px); gap: 24px; align-items: start; }
.vp-item-list { display: flex; flex-direction: column; gap: 2px; }
.vp-item-sec { margin: 6px 0 6px 14px; color: var(--vp-ink-faint); }
.vp-item-sec:not(:first-child) { margin-top: 18px; }
.vp-item-row { min-height: 52px; font: 600 16px var(--vp-font-ui); letter-spacing: .06em; }
.vp-item-row .vp-ico { width: 32px; height: 32px; }
.vp-item-row .cnt { margin-left: auto; font: 600 17px var(--vp-font-display); color: var(--vp-ink-dim); }
.vp-item-row.is-sel .cnt { color: var(--vp-amber); }
.vp-item-row.is-hl { background: rgba(127,227,255,.06); }
.vp-item-row.is-gear { color: var(--vp-ink-dim); }
.vp-item-row .worn { font: 600 11px/1 var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; color: var(--vp-ink-faint); }
.vp-item-detail { position: sticky; top: 0; padding: 22px 22px 20px; display: flex; flex-direction: column; gap: 12px; }
.vp-item-big { width: 64px; height: 64px; filter: drop-shadow(0 0 10px rgba(127,227,255,.25)); }
.vp-item-name { font: 700 21px/1.1 var(--vp-font-display); letter-spacing: .12em; color: #fff; }
.vp-item-desc { font: 400 15px/1.5 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-item-tags { display: flex; gap: 8px; flex-wrap: wrap; }

/* target picker */
.vp-menu-picker { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(5,7,13,.6); opacity: 0; visibility: hidden; z-index: 2;
  transition: opacity .18s var(--vp-ease-out), visibility 0s linear .18s; }
.vp-menu-picker.is-open { opacity: 1; visibility: visible; transition: opacity .18s var(--vp-ease-out); }
.vp-picker { width: min(580px, calc(100% - 24px)); padding: 18px 0 14px; max-height: calc(100% - 24px); box-sizing: border-box; display: flex; flex-direction: column; transform: translateY(8px); transition: transform .25s var(--vp-ease-out); }
.vp-menu-picker.is-open .vp-picker { transform: none; }
.vp-picker::before { --c: rgba(255,214,140,.95); --g: rgba(255,197,96,.25); }
.vp-picker-hd { display: flex; align-items: center; gap: 12px; padding: 0 22px 14px; border-bottom: 1px solid var(--vp-line-dim); margin-bottom: 8px; }
.vp-picker-hd .vp-ico { width: 32px; height: 32px; }
.vp-picker-hd b { font: 700 18px var(--vp-font-display); letter-spacing: .12em; }
.vp-picker-hd .vp-num { margin-left: auto; color: var(--vp-amber); font-size: 18px; }
.vp-picker-rows { min-height: 0; }
.vp-pick-row { min-height: 66px; gap: 14px; }
.vp-pick-row .vp-portrait { width: 40px; height: 40px; --ps: 40px; }
.vp-pick-name { width: 84px; font: 700 16px var(--vp-font-display); letter-spacing: .14em; }
.vp-pick-bars { flex: 1; display: grid; gap: 7px; min-width: 0; }
.vp-pick-bars .vp-sbar .vp-num { min-width: 78px; font-size: 14px; }
.vp-picker-msg { min-height: 20px; padding: 10px 22px 0; font: 500 15px var(--vp-font-ui); color: var(--vp-hp); }
.vp-picker-msg.is-err { color: #ff9aa6; }
@media (max-width: 760px) {
  .vp-items { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .vp-item-detail { position: static; padding: 16px; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
  .vp-item-big { width: 48px; height: 48px; }
  .vp-item-detail .vp-item-desc, .vp-item-detail .vp-item-tags { flex-basis: 100%; }
  .vp-pick-name { width: 64px; font-size: 14px; letter-spacing: .1em; }
  .vp-pick-row { padding-right: 10px; gap: 10px; }
}
`;

export class ItemsPage {
  constructor(menu) {
    this.menu = menu;
    this.ui = menu.ui;
    injectCSS('vp-items', CSS);
    this.interactive = true;
    this._sel = 0;
    this._pickSel = 0;
    this._items = [];
    this._rows = [];
    this._picking = false;
    this.picker = el('div', { class: 'vp-menu-picker' });
    onTap(this.picker, () => this._closePicker());
    menu.win.appendChild(this.picker);
  }

  get state() { return this.menu.state; }
  info(id) { return this.ui.itemInfo(id); }

  count() { return this._items.length; }

  render(body) {
    const inv = this.state.inventory || {};
    const ids = Object.keys(inv).filter((id) => inv[id] > 0);
    const kind = (id) => { const i = this.info(id); return i.key ? 'key' : i.equip ? 'gear' : 'use'; };
    const groups = [['Consumables', ids.filter((id) => kind(id) === 'use')], ['Key items', ids.filter((id) => kind(id) === 'key')], ['Gear', ids.filter((id) => kind(id) === 'gear')]];
    this._items = groups.flatMap(([, g]) => g);
    this._sel = Math.min(this._sel, Math.max(0, this._items.length - 1));
    this._rows = [];
    const list = el('div', { class: 'vp-item-list', role: 'listbox' });
    for (const [title, arr] of groups) {
      if (!arr.length) continue;
      list.appendChild(el('div', { class: 'vp-cap vp-item-sec', text: title }));
      for (const id of arr) {
        const info = this.info(id);
        const idx = this._rows.length;
        const row = el('div', { class: `vp-row vp-item-row${info.equip ? ' is-gear' : ''}`, role: 'option' }, [
          this.ui.iconEl(this.ui.itemIcon(id), 32), el('span', { text: info.name }), el('span', { class: 'cnt', text: info.key ? '' : `×${inv[id]}` }),
        ]);
        bindPointer(row, {
          onHover: () => { if (this.menu.focus === 'body' && this._sel !== idx) { this._sel = idx; this.ui.sfx('cursor'); this.paint(); } },
          onActivate: () => { this._sel = idx; this.menu.enterBody(); this._useSelected(); },
        });
        list.appendChild(row);
        this._rows.push(row);
      }
    }
    if (!this._items.length) list.appendChild(el('div', { class: 'vp-empty', text: 'The cargo pouch is empty.' }));
    this._detail = el('div', { class: 'vp-panel vp-item-detail' });
    body.appendChild(el('div', { class: 'vp-items' }, [list, this._detail]));
    this.paint();
  }

  paint() {
    const inBody = this.menu.focus === 'body';
    this._rows.forEach((r, k) => {
      r.classList.toggle('is-sel', inBody && k === this._sel);
      r.classList.toggle('is-hl', !inBody && k === this._sel);
    });
    const id = this._items[this._sel];
    const d = this._detail;
    if (!d) return;
    d.textContent = '';
    if (!id) { d.appendChild(el('div', { class: 'vp-item-desc', text: 'Items you find on the voyage appear here.' })); return; }
    const info = this.info(id);
    const n = (this.state.inventory || {})[id] || 0;
    const fx = info.effect || {};
    const tags = info.equip ? gearTags(this.ui, info) : [
      info.key ? el('span', { class: 'vp-tag amber', text: 'Key item' }) : el('span', { class: 'vp-tag', text: `Held ×${n}` }),
      FIELD_TARGETS.includes(info.target) ? el('span', { class: 'vp-tag', text: TARGET_LABEL[info.target] }) : null,
      !info.key && info.target && !FIELD_TARGETS.includes(info.target) ? el('span', { class: 'vp-tag', text: 'Battle only' }) : null,
      fx.cleanse ? el('span', { class: 'vp-tag good', text: 'Cures ailments' }) : null,
      fx.damage ? el('span', { class: 'vp-tag amber' }, [this.ui.iconEl(fx.damage.type, 16), `${fx.damage.amount} ${fx.damage.type}`]) : null,
    ];
    d.append(...[
      this.ui.iconEl(this.ui.itemIcon(id), 64, 'vp-item-big'),
      el('div', { class: 'vp-item-name', text: info.name }),
      el('div', { class: 'vp-item-desc', text: info.desc || '' }),
      el('div', { class: 'vp-item-tags' }, tags),
      info.equip ? el('div', { class: 'vp-item-desc', text: `Held ×${n}. Equip it from the Equip tab.` }) : null,
    ].filter(Boolean));
    if (inBody && this._rows[this._sel]) this._rows[this._sel].scrollIntoView({ block: 'nearest' });
  }

  input(inp) {
    if (this._picking) { this._pickerInput(inp); return; }
    const n = this._items.length;
    if (!n) return;
    if (inp.repeat('up')) { inp.consume('up'); this._sel = (this._sel + n - 1) % n; this.ui.sfx('cursor'); this.paint(); } else if (inp.repeat('down')) { inp.consume('down'); this._sel = (this._sel + 1) % n; this.ui.sfx('cursor'); this.paint(); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._useSelected(); }
  }

  back() {
    if (!this._picking) return false;
    this._closePicker();
    return true;
  }

  hints(add) {
    add('move', 'Select');
    add('confirm', 'Use');
    add('cancel', 'Back');
  }

  close() {
    this._picking = false;
    this.picker.classList.remove('is-open');
  }

  _useSelected() {
    const id = this._items[this._sel];
    if (!id) return;
    const info = this.info(id);
    if (info.key || info.equip || !FIELD_TARGETS.includes(info.target)) { this.ui.sfx('error'); this.menu.shake(this._detail); return; }
    this._openPicker(id);
  }

  // ------------------------------------------------------------------ target picker

  _openPicker(itemId) {
    this._pickItem = itemId;
    this._picking = true;
    const party = this.state.party || [];
    if (this._pickSel >= party.length) this._pickSel = 0;
    // start on the most sensible target: a downed ally for revives, else the ally missing the most HP (EP for ether)
    const info = this.info(itemId);
    const ko = (m) => m.alive === false || m.hp <= 0;
    let want = -1;
    if (info.target === 'koAlly') want = party.findIndex(ko);
    else {
      const ep = !!(info.effect && info.effect.ep && !info.effect.heal);
      let worst = 2;
      party.forEach((m, i) => {
        const f = ep ? m.ep / (m.maxEp || 1) : m.hp / (m.maxHp || 1);
        if (!ko(m) && f < worst) { worst = f; want = i; }
      });
    }
    if (want >= 0) this._pickSel = want;
    this._renderPicker('');
    this.picker.classList.add('is-open');
    this.ui.sfx('confirm');
  }

  _closePicker() {
    if (!this._picking) return;
    this._picking = false;
    this.picker.classList.remove('is-open');
    this.ui.sfx('cancel');
    this.menu._refreshFocus();
  }

  _renderPicker(message, ok = true) {
    const id = this._pickItem;
    const info = this.info(id);
    const all = info.target === 'allies';
    const n = (this.state.inventory || {})[id] || 0;
    const party = this.state.party || [];
    const rows = party.map((m, i) => {
      const ko = m.alive === false || m.hp <= 0;
      const fits = info.target === 'koAlly' ? ko : !ko;
      const row = el('div', { class: `vp-row vp-pick-row${fits ? '' : ' is-dim'}`, role: 'option' }, [
        this.ui.portraitEl(m.id, { size: 40, accent: this.menu.accent(m), name: m.name, ko }),
        el('span', { class: 'vp-pick-name', text: m.name }),
        el('div', { class: 'vp-pick-bars' }, [this.menu.bar('hp', ko ? 0 : m.hp, m.maxHp, { low: !ko && m.hp / m.maxHp < 0.3 }), this.menu.bar('ep', m.ep, m.maxEp)]),
      ]);
      bindPointer(row, {
        onHover: () => { if (!all && this._pickSel !== i) { this._pickSel = i; this.ui.sfx('cursor'); this._paintPicker(); } },
        onActivate: () => { this._pickSel = i; this._paintPicker(); this._applyItem(); },
      });
      return row;
    });
    this._pickRows = rows;
    const msg = el('div', { class: `vp-picker-msg${ok ? '' : ' is-err'}`, text: message || '' });
    const panel = el('div', { class: 'vp-panel vp-solid vp-rich vp-picker', role: 'listbox' }, [
      el('div', { class: 'vp-picker-hd' }, [this.ui.iconEl(this.ui.itemIcon(id), 32), el('b', { text: `Use ${info.name}${all ? ' on everyone' : ''}` }), el('span', { class: 'vp-num', text: `×${n}` })]),
      el('div', { class: 'vp-picker-rows vp-scroll' }, rows),
      msg,
    ]);
    onTap(panel, () => {});
    this.picker.replaceChildren(panel);
    this._paintPicker();
  }

  _paintPicker() {
    const all = this.info(this._pickItem).target === 'allies';
    this._pickRows.forEach((r, k) => r.classList.toggle('is-sel', all || k === this._pickSel));
  }

  _pickerInput(inp) {
    const n = this._pickRows.length;
    if (inp.repeat('up')) { inp.consume('up'); this._pickSel = (this._pickSel + n - 1) % n; this.ui.sfx('cursor'); this._paintPicker(); } else if (inp.repeat('down')) { inp.consume('down'); this._pickSel = (this._pickSel + 1) % n; this.ui.sfx('cursor'); this._paintPicker(); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._applyItem(); }
  }

  _applyItem() {
    const party = this.state.party || [];
    const all = this.info(this._pickItem).target === 'allies';
    const member = party[all ? 0 : this._pickSel];
    if (!member) return;
    const itemId = this._pickItem;
    const hook = this.ui.onUseItem;
    if (!hook) {
      this.ui.sfx('error');
      this.ui.hud.toast('Items cannot be used right now.');
      this._closePicker();
      return;
    }
    let res;
    try { res = hook(itemId, member.id) || { ok: false, message: '' }; } catch (e) { res = { ok: false, message: String(e.message || e) }; }
    this.ui.sfx(res.ok ? 'heal' : 'error');
    const left = (this.state.inventory || {})[itemId] || 0;
    if (res.ok && left <= 0) {
      // used the last one: back to the list, keep the message visible as a toast
      this.ui.hud.toast(res.message, { icon: this.ui.itemIcon(itemId) });
      this._picking = false;
      this.picker.classList.remove('is-open');
      this.menu.repaint();
      return;
    }
    this._renderPicker(res.message, res.ok);
    if (res.ok) {
      const rows = all ? this._pickRows : [this._pickRows[this._pickSel]];
      for (const row of rows) if (row && row.animate) row.animate([{ background: 'rgba(111,240,166,.25)' }, { background: 'rgba(111,240,166,0)' }], { duration: 600 });
      this.menu.repaint();
    }
  }
}
