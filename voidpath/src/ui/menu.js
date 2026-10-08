// Pause menu (Tab / C / Start): Party, Equip, Items, Journal, Map, Settings, Controls.
// Focus moves between the tab rail and the page body; Q/E (LB/RB) switch tabs from anywhere.
// Pointer: tap a tab to switch, tap rows to select and act. Each tab is a page module
// (ui/party.js, equip.js, items.js, journal.js, map.js, settings.js) with this interface:
//
//   page.interactive          the body can take focus
//   page.render(body)         build the page into the body (tab switch, open, data change)
//   page.paint()              refresh selection / focus styling
//   page.count()              selectable entries (0 keeps the focus on the tabs)
//   page.input(inp)           input while the body has focus
//   page.back() -> bool       Cancel inside the page (closes a sub-list); false returns to the tabs
//   page.hints(add)           footer hints while the body has focus: add(action, label)
//   page.close()              optional: the menu closed (drop sub-states)
//
// menu.popup is a shared Popup (ui/popup.js) drawn over the window; pages await it for choices.

import { el, injectCSS } from '../core/util.js';
import { glyph, controlsTable, bindPointer, onTap, formatTime, fmtNum, MEMBER_ACCENT } from './theme.js';
import { Popup } from './popup.js';
import { PartyPage } from './party.js';
import { EquipPage } from './equip.js';
import { ItemsPage } from './items.js';
import { JournalPage } from './journal.js';
import { MapPage } from './map.js';
import { SettingsPage } from './settings.js';

class ControlsPage {
  constructor(menu) { this.menu = menu; this.ui = menu.ui; this.interactive = false; }
  render(body) {
    body.append(
      controlsTable(this.ui.input.lastDevice),
      el('p', { class: 'vp-ctl-note', text: 'Touch controls appear as soon as you touch the screen: drag anywhere in the lower-left to move, push the stick fully to run, and tap menu rows directly.' }),
    );
  }
  paint() {}
  count() { return 0; }
  input() {}
  back() { return false; }
  hints() {}
}

export const TABS = [
  { id: 'party', label: 'Party', icon: 'defend', Page: PartyPage },
  { id: 'equip', label: 'Equip', icon: 'weapon', Page: EquipPage },
  { id: 'items', label: 'Items', icon: 'item', Page: ItemsPage },
  { id: 'journal', label: 'Journal', icon: 'journal', Page: JournalPage },
  { id: 'map', label: 'Map', icon: 'map', Page: MapPage },
  { id: 'settings', label: 'Settings', icon: 'gear', Page: SettingsPage },
  { id: 'controls', label: 'Controls', icon: 'cursor', Page: ControlsPage },
];

const CSS = `
.vp-menu { z-index: 40; opacity: 0; visibility: hidden; transition: opacity .2s var(--vp-ease-out), visibility 0s linear .2s; }
.vp-menu.is-open { opacity: 1; visibility: visible; transition: opacity .2s var(--vp-ease-out); }
.vp-menu-scrim { position: absolute; inset: 0; background: radial-gradient(120% 90% at 50% 45%, rgba(5,7,13,.5), rgba(5,7,13,.84)); }
.vp-menu-win { position: absolute; left: 50%; top: 50%; box-sizing: border-box;
  width: min(1180px, calc(100% - 64px)); height: min(700px, calc(100% - 56px));
  transform: translate(-50%, -48%) scale(.985); transition: transform .32s var(--vp-ease-out);
  display: grid; grid-template-columns: 220px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: "head head" "tabs body" "foot foot"; }
.vp-menu.is-open .vp-menu-win { transform: translate(-50%, -50%); }

.vp-menu-head { grid-area: head; display: flex; align-items: center; gap: 18px; padding: 14px 14px 12px 28px; border-bottom: 1px solid var(--vp-line-dim);
  background: linear-gradient(90deg, rgba(127,227,255,.06), rgba(127,227,255,0) 60%); }
.vp-menu-title { margin-top: 6px; font: 700 28px/1 var(--vp-font-display); letter-spacing: .22em; text-transform: uppercase; color: #f4f9ff; text-shadow: 0 0 18px rgba(127,227,255,.35); }
.vp-menu-where { margin-left: auto; text-align: right; display: grid; gap: 6px; }
.vp-menu-where b { font: 600 15px/1 var(--vp-font-display); letter-spacing: .26em; text-transform: uppercase; color: var(--vp-ink); font-weight: 600; }

.vp-menu-tabs { grid-area: tabs; display: flex; flex-direction: column; gap: 2px; padding: 14px 0; border-right: 1px solid var(--vp-line-dim);
  background: linear-gradient(180deg, rgba(127,227,255,.035), rgba(127,227,255,0)); min-height: 0; }
.vp-menu-tab { min-height: 46px; font: 600 15px var(--vp-font-ui); letter-spacing: .24em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-menu-tab .vp-ico { display: none; width: 32px; height: 32px; }
.vp-menu-journey { margin-top: auto; padding: 12px 22px 4px 28px; display: grid; gap: 9px; border-top: 1px solid rgba(140,214,255,.1); }
.vp-menu-journey div { display: flex; justify-content: space-between; align-items: baseline; }
.vp-menu-journey .vp-num { font-size: 16px; font-weight: 600; color: var(--vp-ink); }
.vp-menu-tab .n { font: 600 12px var(--vp-font-display); letter-spacing: .08em; color: var(--vp-ink-faint); min-width: 18px; }
.vp-menu-tab.is-cur { color: var(--vp-ink); background: linear-gradient(90deg, rgba(127,227,255,.10), rgba(127,227,255,0)); box-shadow: inset 2px 0 0 var(--vp-cyan); }
.vp-menu-tab.is-sel .n, .vp-menu-tab.is-cur .n { color: inherit; }
.vp-menu-tab.is-sel { color: var(--vp-amber); }

.vp-menu-body { grid-area: body; position: relative; padding: 18px 22px; min-height: 0; }
.vp-menu-body.is-enter > * { animation: vp-page .28s var(--vp-ease-out); }
@keyframes vp-page { from { opacity: 0; transform: translateX(10px); } }

.vp-menu-foot { grid-area: foot; display: flex; align-items: center; gap: 24px; min-height: 44px; padding: 6px 22px; border-top: 1px solid var(--vp-line-dim); }
.vp-hints { display: flex; flex-wrap: wrap; gap: 8px 22px; }
.vp-menu-meta { margin-left: auto; display: flex; gap: 26px; }
.vp-meta { display: flex; align-items: baseline; gap: 10px; white-space: nowrap; }
.vp-meta .vp-num { font-size: 17px; font-weight: 600; color: var(--vp-ink); }
.vp-meta .vp-num.cr { color: var(--vp-amber); }

/* shared page pieces */
.vp-sbar { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
.vp-sbar .vp-cap { letter-spacing: .12em; color: var(--vp-ink-dim); }
.vp-sbar .vp-num { min-width: 88px; text-align: right; font-size: 16px; font-weight: 600; color: var(--vp-ink); }
.vp-sbar .vp-num small { font-size: 13px; color: var(--vp-ink-faint); font-weight: 400; }
.vp-sbar .vp-num.is-low { color: #ffab6b; }
.vp-ctl-note { margin-top: 16px; font: 400 14px/1.5 var(--vp-font-ui); color: var(--vp-ink-faint); }

@media (max-width: 760px) {
  .vp-menu-win { width: calc(100% - 16px); height: calc(100% - 16px - var(--vp-safe-top) - var(--vp-safe-bottom)); margin-top: calc((var(--vp-safe-top) - var(--vp-safe-bottom)) / 2);
    grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto; grid-template-areas: "head" "tabs" "body" "foot"; }
  .vp-menu-head { padding: 12px 10px 10px 16px; }
  .vp-menu-title { font-size: 22px; margin-top: 5px; }
  .vp-menu-where { display: none; }
  .vp-menu-head .vp-menu-close { margin-left: auto; }
  .vp-menu-tabs { flex-direction: row; gap: 0; padding: 0; border-right: 0; border-bottom: 1px solid var(--vp-line-dim); }
  .vp-menu-tab { flex: 1; min-width: 0; justify-content: center; min-height: 48px; padding: 0 2px; }
  .vp-menu-tab::before, .vp-menu-tab .n, .vp-menu-tab .t, .vp-menu-journey { display: none; }
  .vp-menu-tab .vp-ico { display: block; opacity: .55; }
  .vp-menu-tab.is-sel .vp-ico, .vp-menu-tab.is-cur .vp-ico { opacity: 1; }
  .vp-menu-tab.is-cur, .vp-menu-tab.is-sel { box-shadow: inset 0 -2px 0 var(--vp-amber); }
  .vp-menu-tab.is-cur { box-shadow: inset 0 -2px 0 var(--vp-cyan); background: rgba(127,227,255,.07); }
  .vp-menu-body { padding: 14px 12px; }
  .vp-menu-foot { padding: 8px 14px; min-height: 42px; flex-wrap: wrap; row-gap: 6px; }
  .vp-menu-meta { gap: 16px; }
  .vp-menu-foot.is-touch .vp-hints { display: none; }
  .vp-sbar .vp-num { min-width: 76px; font-size: 15px; }
}
@media (max-height: 520px) and (min-width: 761px) {
  .vp-menu-win { height: calc(100% - 20px); width: calc(100% - 40px); }
  .vp-menu-head { padding-top: 10px; padding-bottom: 8px; }
  .vp-menu-title { font-size: 22px; }
  .vp-menu-tab { min-height: 38px; }
  .vp-menu-journey { display: none; }
}
`;

export class Menu {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-menu', CSS);
    this.isOpen = false;
    this.tab = 0;
    this.focus = 'tabs';           // 'tabs' | 'body'
    this._metaT = 0;

    this.title = el('div', { class: 'vp-menu-title' });
    this.where = el('b');
    this.whereKick = el('span', { class: 'vp-cap', text: 'ISV Halcyon' });
    const close = el('div', { class: 'vp-menu-close', role: 'button', 'aria-label': 'Close menu' }, [el('i')]);
    onTap(close, () => this.close());
    const head = el('div', { class: 'vp-menu-head' }, [
      el('div', {}, [el('div', { class: 'vp-cap vp-menu-kicker', text: 'Menu' }), this.title]),
      el('div', { class: 'vp-menu-where' }, [this.whereKick, this.where]),
      close,
    ]);
    this.tabRows = TABS.map((t, i) => {
      const row = el('div', { class: 'vp-row vp-menu-tab', role: 'tab', 'aria-label': t.label }, [
        el('span', { class: 'n', text: `0${i + 1}` }), el('span', { class: 't', text: t.label }), ui.iconEl(t.icon, 32),
      ]);
      bindPointer(row, { onActivate: () => { this._setTab(i, true); this.focus = 'tabs'; this._refreshFocus(); } });
      return row;
    });
    this.journey = el('div', { class: 'vp-menu-journey' });
    const tabs = el('div', { class: 'vp-menu-tabs', role: 'tablist' }, [...this.tabRows, this.journey]);
    this.body = el('div', { class: 'vp-menu-body vp-scroll' });
    this.hints = el('div', { class: 'vp-hints' });
    this.credits = el('span', { class: 'vp-num cr' });
    this.time = el('span', { class: 'vp-num' });
    this.foot = el('div', { class: 'vp-menu-foot' }, [
      this.hints,
      el('div', { class: 'vp-menu-meta' }, [
        el('div', { class: 'vp-meta' }, [el('span', { class: 'vp-cap', text: 'Credits' }), this.credits]),
        el('div', { class: 'vp-meta' }, [el('span', { class: 'vp-cap', text: 'Time' }), this.time]),
      ]),
    ]);
    this.win = el('div', { class: 'vp-panel vp-rich vp-menu-win' }, [head, tabs, this.body, this.foot]);
    this.popup = new Popup(ui, this.win);
    this.pages = TABS.map((t) => new t.Page(this));
    const scrim = el('div', { class: 'vp-menu-scrim' });
    onTap(scrim, () => this.close());
    this.root = el('div', { class: 'vp-layer vp-menu', role: 'dialog', 'aria-label': 'Menu' }, [scrim, this.win]);
    ui.root.appendChild(this.root);
  }

  get state() { return this.ui.state || {}; }
  get page() { return this.pages[this.tab]; }

  open(tab) {
    if (typeof tab === 'string') tab = TABS.findIndex((t) => t.id === tab);
    if (typeof tab === 'number' && tab >= 0) this.tab = tab;
    if (this.isOpen) { this._setTab(this.tab, false); return; }
    this.isOpen = true;
    this.focus = 'tabs';
    this.ui._ctxPush('menu', 'menu');
    this.ui.sfx('menuOpen');
    const loc = this.ui.locationName || 'ISV Halcyon';
    this.whereKick.textContent = loc;
    this.where.textContent = this.ui.areaName && this.ui.areaName !== loc ? this.ui.areaName : '';
    this.where.parentNode.style.visibility = this.ui.areaName || this.ui.locationName ? '' : 'hidden';
    this._device = null;
    this._setTab(this.tab, false);
    this._refreshMeta();
    this.root.classList.add('is-open', 'is-live');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.popup.isOpen) this.popup.close(-1);
    for (const p of this.pages) if (p.close) p.close();
    this.root.classList.remove('is-open', 'is-live');
    this.ui.sfx('menuClose');
    this.ui._ctxPop('menu');
  }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  /** Rebuild the current page (data changed under it: a setting, an equip, a new leader). */
  repaint() {
    if (!this.isOpen) return;
    const top = this.body.scrollTop;
    this.body.textContent = '';
    this.page.render(this.body);
    this.body.scrollTop = top;
    this._refreshFocus();
    this._refreshMeta(true);
  }

  update(dt, focused) {
    if (!this.isOpen) return;
    this._metaT -= dt;
    if (this._metaT <= 0) { this._metaT = 0.5; this._refreshMeta(); }
    const dev = this.ui.input.lastDevice;
    if (dev !== this._device) { this._device = dev; this._refreshHints(); this.foot.classList.toggle('is-touch', dev === 'touch'); }
    if (!focused) return;
    const inp = this.ui.input;
    if (this.popup.isOpen) { this.popup.input(inp); return; }
    if (inp.pressed('menu')) { inp.consume('menu'); this.close(); return; }
    if (inp.pressed('boostUp')) { inp.consume('boostUp'); this._switch(1); return; }
    if (inp.pressed('boostDown')) { inp.consume('boostDown'); this._switch(-1); return; }
    if (this.focus === 'tabs') {
      if (inp.repeat('up') || inp.repeat('left')) { inp.consume('up'); inp.consume('left'); this._switch(-1); } else if (inp.repeat('down') || inp.repeat('right')) { inp.consume('down'); inp.consume('right'); this._switch(1); }
      if (inp.pressed('confirm')) {
        inp.consume('confirm');
        if (this.page.interactive && this.page.count() > 0) { this.ui.sfx('confirm'); this.enterBody(); } else this.ui.sfx('cursor', { volume: 0.4 });
      } else if (inp.pressed('cancel')) { inp.consume('cancel'); this.close(); }
      return;
    }
    if (inp.pressed('cancel')) {
      inp.consume('cancel');
      if (!this.page.back()) { this.ui.sfx('cancel'); this.focus = 'tabs'; this._refreshFocus(); }
      return;
    }
    this.page.input(inp);
  }

  /** Give the page body the focus (a tap on a page row does this too). */
  enterBody() {
    if (this.focus === 'body') return;
    this.focus = 'body';
    this._refreshFocus();
  }

  // ------------------------------------------------------------------ tabs + chrome

  _switch(d) {
    this._setTab((this.tab + d + TABS.length) % TABS.length, true);
    this.focus = 'tabs';
    this._refreshFocus();
  }

  _setTab(i, sound) {
    if (sound && i !== this.tab) this.ui.sfx('cursor');
    this.tab = i;
    this.title.textContent = TABS[i].label;
    this.body.textContent = '';
    this.body.scrollTop = 0;
    this.page.render(this.body);
    this.body.classList.remove('is-enter');
    void this.body.offsetWidth;
    this.body.classList.add('is-enter');
    this._refreshFocus();
  }

  _refreshFocus() {
    this.tabRows.forEach((r, k) => {
      r.classList.toggle('is-sel', k === this.tab && this.focus === 'tabs');
      r.classList.toggle('is-cur', k === this.tab && this.focus !== 'tabs');
    });
    this.page.paint();
    this._refreshHints();
  }

  _refreshHints() {
    const dev = this.ui.input.lastDevice;
    const h = this.hints;
    h.textContent = '';
    const add = (action, label) => h.appendChild(el('span', { class: 'vp-hint' }, [glyph(action, dev), label]));
    if (this.focus === 'tabs') {
      add('tabs', 'Switch');
      if (this.page.interactive && this.page.count() > 0) add('confirm', 'Open');
      add('cancel', 'Close');
      return;
    }
    this.page.hints(add);
  }

  _refreshMeta(force = false) {
    const st = this.state;
    const s = st.stats || {};
    const key = `${st.credits}|${Math.floor(s.playTime || 0)}|${s.battles}|${s.breaks}|${s.maxDamage}`;
    if (key === this._metaKey && !force) return;            // only touch the DOM when something changed
    this._metaKey = key;
    this.credits.textContent = fmtNum(st.credits || 0);
    this.time.textContent = formatTime(s.playTime || 0);
    const rows = [['Battles', s.battles], ['Breaks', s.breaks], ['Best hit', s.maxDamage]];
    this.journey.replaceChildren(...rows.map(([k, v]) => el('div', {}, [el('span', { class: 'vp-cap', text: k }), el('span', { class: 'vp-num', text: fmtNum(v || 0) })])));
  }

  // ------------------------------------------------------------------ helpers shared by the pages

  accent(m) {
    return m.accent || this.ui.partyDefs?.[m.id]?.accent || MEMBER_ACCENT[m.id] || '#7fe3ff';
  }

  /** HP / EP bar with "cur / max" readout. */
  bar(kind, cur, max, { low = false } = {}) {
    const f = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
    const bar = el('div', { class: `vp-bar ${kind}${low ? ' is-low' : ''}` }, [el('i', { style: { transform: `scaleX(${f})` } })]);
    const num = el('span', { class: `vp-num${low ? ' is-low' : ''}` }, [String(Math.round(cur)), el('small', { text: ` / ${Math.round(max)}` })]);
    return el('div', { class: 'vp-sbar' }, [el('span', { class: 'vp-cap', text: kind.toUpperCase() }), bar, num]);
  }

  /** Short "nudge" animation on an element (refused action). */
  shake(node) {
    if (!node || !node.animate) return;
    node.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 220 });
  }
}
