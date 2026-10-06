// Pause menu (Tab / C / Start): Party, Items, Settings, Controls.
// Focus moves between the tab rail and the page body; Q/E (LB/RB) switch tabs from anywhere.
// Pointer: tap a tab to switch, tap an item to use it, tap setting segments / pips to set them.

import { el, injectCSS } from '../core/util.js';
import { glyph, controlsTable, bindPointer, formatTime, fmtNum, TYPE_LABEL, MEMBER_ACCENT } from './theme.js';

const TABS = [
  { id: 'party', label: 'Party' },
  { id: 'items', label: 'Items', interactive: true },
  { id: 'settings', label: 'Settings', interactive: true },
  { id: 'controls', label: 'Controls' },
];

const SETTINGS = [
  { id: 'sound', label: 'Sound', type: 'toggle', desc: 'Turn all game audio on or off. M toggles it anywhere.' },
  { id: 'music', label: 'Music volume', type: 'slider', desc: 'Volume of the score: title, exploration, battle and boss themes.' },
  { id: 'sfx', label: 'Effects volume', type: 'slider', desc: 'Volume of menu ticks, footsteps, hits, shield cracks and Breaks.' },
  { id: 'quality', label: 'Graphics', type: 'choice', options: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']],
    desc: 'Render resolution, real-time shadows and post effects. Lower it for smoother play on older devices.' },
  { id: 'textSpeed', label: 'Text speed', type: 'choice', options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']],
    desc: 'How quickly dialogue types out. Confirm always completes a line instantly.' },
];

const STATS = [['atk', 'Atk'], ['def', 'Def'], ['mag', 'Mag'], ['res', 'Res'], ['spd', 'Spd']];

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
.vp-menu-kicker { display: flex; align-items: center; gap: 10px; color: var(--vp-cyan); }
.vp-menu-kicker::before { content: ''; width: 6px; height: 6px; background: var(--vp-amber); transform: rotate(45deg); box-shadow: 0 0 8px var(--vp-amber); }
.vp-menu-title { margin-top: 6px; font: 700 28px/1 var(--vp-font-display); letter-spacing: .22em; text-transform: uppercase; color: #f4f9ff; text-shadow: 0 0 18px rgba(127,227,255,.35); }
.vp-menu-where { margin-left: auto; text-align: right; display: grid; gap: 6px; }
.vp-menu-where b { font: 600 15px/1 var(--vp-font-display); letter-spacing: .26em; text-transform: uppercase; color: var(--vp-ink); font-weight: 600; }
.vp-menu-close { flex: none; width: 44px; height: 44px; display: grid; place-items: center; cursor: pointer; color: var(--vp-ink-dim);
  border: 1px solid var(--vp-line-dim); background: rgba(127,227,255,.04); transition: color .15s, border-color .15s; }
.vp-menu-close:hover { color: var(--vp-amber); border-color: rgba(255,197,96,.6); }
.vp-menu-close i { position: relative; width: 18px; height: 18px; }
.vp-menu-close i::before, .vp-menu-close i::after { content: ''; position: absolute; left: 0; top: 8px; width: 18px; height: 1.5px; background: currentColor; transform: rotate(45deg); }
.vp-menu-close i::after { transform: rotate(-45deg); }

.vp-menu-tabs { grid-area: tabs; display: flex; flex-direction: column; gap: 4px; padding: 18px 0; border-right: 1px solid var(--vp-line-dim);
  background: linear-gradient(180deg, rgba(127,227,255,.035), rgba(127,227,255,0)); }
.vp-menu-tab { min-height: 50px; font: 600 15px var(--vp-font-ui); letter-spacing: .24em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-menu-journey { margin-top: auto; padding: 14px 22px 4px 28px; display: grid; gap: 10px; border-top: 1px solid rgba(140,214,255,.1); }
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
.vp-hint { display: inline-flex; align-items: center; gap: 9px; font: 600 13px var(--vp-font-ui); letter-spacing: .18em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-menu-meta { margin-left: auto; display: flex; gap: 26px; }
.vp-meta { display: flex; align-items: baseline; gap: 10px; white-space: nowrap; }
.vp-meta .vp-num { font-size: 17px; font-weight: 600; color: var(--vp-ink); }
.vp-meta .vp-num.cr { color: var(--vp-amber); }

/* party */
.vp-party { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 410px), 1fr)); gap: 14px; }
.vp-card { --acc: var(--vp-cyan); padding: 14px 18px 12px; display: grid; gap: 9px; }
.vp-card::after { background: linear-gradient(90deg, transparent, var(--acc), transparent); opacity: .9; }
.vp-card-top { display: flex; gap: 16px; align-items: stretch; }
.vp-card-top .vp-portrait { width: 80px; height: 80px; --ps: 80px; }
.vp-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; }
.vp-card-hd { display: flex; align-items: baseline; gap: 12px; }
.vp-card-name { font: 700 22px/1 var(--vp-font-display); letter-spacing: .18em; color: #fff; text-shadow: 0 0 14px color-mix(in srgb, var(--acc) 45%, transparent); }
.vp-card-cls { color: var(--acc); }
.vp-card-lv { margin-left: auto; display: flex; align-items: baseline; gap: 6px; }
.vp-card-lv .vp-num { font-size: 22px; font-weight: 700; color: #fff; }
.vp-ko { padding: 3px 7px; border: 1px solid var(--vp-danger); color: var(--vp-danger); font: 700 12px/1 var(--vp-font-display); letter-spacing: .2em; }
.vp-sbar { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
.vp-sbar .vp-cap { letter-spacing: .12em; color: var(--vp-ink-dim); }
.vp-sbar .vp-num { min-width: 88px; text-align: right; font-size: 16px; font-weight: 600; color: var(--vp-ink); }
.vp-sbar .vp-num small { font-size: 13px; color: var(--vp-ink-faint); font-weight: 400; }
.vp-sbar .vp-num.is-low { color: #ffab6b; }
.vp-card-stats { display: grid; grid-template-columns: repeat(5, 1fr); padding: 6px 0; border-top: 1px solid rgba(140,214,255,.12); border-bottom: 1px solid rgba(140,214,255,.12); }
.vp-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.vp-stat + .vp-stat { border-left: 1px solid rgba(140,214,255,.08); }
.vp-stat .vp-cap { letter-spacing: .16em; }
.vp-stat .vp-num { font-size: 18px; font-weight: 600; color: #f4f9ff; }
.vp-card-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.vp-weap { display: inline-flex; align-items: center; gap: 7px; height: 26px; padding: 0 11px 0 5px; border: 1px solid rgba(140,214,255,.18); background: rgba(127,227,255,.04);
  font: 600 13px var(--vp-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-weap .vp-ico { width: 16px; height: 16px; }
.vp-next { margin-left: auto; display: flex; align-items: center; gap: 9px; }
.vp-next .vp-bar { width: 74px; height: 4px; }
.vp-next .vp-num { font-size: 13px; color: var(--vp-ink-dim); }
.vp-card.is-ko { --acc: #ff5a6a; }
.vp-card.is-ko .vp-card-name { color: #9fb2cc; }

/* items */
.vp-items { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 340px); gap: 24px; align-items: start; }
.vp-item-list { display: flex; flex-direction: column; gap: 2px; }
.vp-item-sec { margin: 6px 0 6px 14px; color: var(--vp-ink-faint); }
.vp-item-sec:not(:first-child) { margin-top: 18px; }
.vp-item-row { min-height: 52px; font: 600 16px var(--vp-font-ui); letter-spacing: .06em; }
.vp-item-row .vp-ico { width: 32px; height: 32px; }
.vp-item-row .cnt { margin-left: auto; font: 600 17px var(--vp-font-display); color: var(--vp-ink-dim); }
.vp-item-row.is-sel .cnt { color: var(--vp-amber); }
.vp-item-row.is-hl { background: rgba(127,227,255,.06); }
.vp-item-detail { padding: 22px 22px 20px; display: flex; flex-direction: column; gap: 12px; }
.vp-item-big { width: 64px; height: 64px; filter: drop-shadow(0 0 10px rgba(127,227,255,.25)); }
.vp-item-name { font: 700 21px/1.1 var(--vp-font-display); letter-spacing: .12em; color: #fff; }
.vp-item-desc { font: 400 15px/1.55 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-item-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.vp-tag { padding: 5px 9px; border: 1px solid var(--vp-line-dim); font: 600 13px/1 var(--vp-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-tag.amber { color: var(--vp-amber); border-color: rgba(255,197,96,.45); }
.vp-empty { padding: 30px 14px; color: var(--vp-ink-faint); font-size: 15px; letter-spacing: .1em; }

/* target picker */
.vp-menu-picker { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(5,7,13,.6); opacity: 0; visibility: hidden; z-index: 2;
  transition: opacity .18s var(--vp-ease-out), visibility 0s linear .18s; }
.vp-menu.is-picking .vp-menu-picker { opacity: 1; visibility: visible; transition: opacity .18s var(--vp-ease-out); }
.vp-picker { width: min(580px, calc(100% - 24px)); padding: 18px 0 14px; max-height: calc(100% - 24px); box-sizing: border-box; display: flex; flex-direction: column; transform: translateY(8px); transition: transform .25s var(--vp-ease-out); }
.vp-menu.is-picking .vp-picker { transform: none; }
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

/* settings */
.vp-set-list { display: flex; flex-direction: column; gap: 4px; max-width: 800px; }
.vp-set { min-height: 58px; justify-content: space-between; font: 600 15px var(--vp-font-ui); letter-spacing: .16em; text-transform: uppercase; }
.vp-set-ctl { display: flex; align-items: center; gap: 10px; color: var(--vp-ink); text-shadow: none; letter-spacing: .1em; }
.vp-seg { display: flex; border: 1px solid var(--vp-line-dim); }
.vp-seg > span { min-width: 66px; height: 36px; padding: 0 12px; box-sizing: border-box; display: grid; place-items: center; cursor: pointer;
  font: 600 13px var(--vp-font-ui); letter-spacing: .14em; color: var(--vp-ink-faint); transition: background .12s, color .12s; }
.vp-seg > span + span { border-left: 1px solid var(--vp-line-dim); }
.vp-seg > span.is-on { color: var(--vp-ink); background: rgba(127,227,255,.14); box-shadow: inset 0 -2px 0 var(--vp-cyan); }
.vp-set.is-sel .vp-seg > span.is-on { color: var(--vp-amber); background: rgba(255,197,96,.16); box-shadow: inset 0 -2px 0 var(--vp-amber); }
.vp-step { width: 36px; height: 36px; display: grid; place-items: center; cursor: pointer; border: 1px solid var(--vp-line-dim); color: var(--vp-ink-dim); font: 600 18px/1 var(--vp-font-display); }
.vp-step:hover { color: var(--vp-amber); }
.vp-pips { display: flex; gap: 4px; height: 36px; align-items: center; cursor: pointer; }
.vp-pips > span { width: 11px; height: 20px; transform: skewX(-14deg); background: rgba(140,214,255,.12); box-shadow: inset 0 0 0 1px rgba(140,214,255,.12); }
.vp-pips > span.is-on { background: linear-gradient(180deg, #c8f3ff, var(--vp-cyan)); box-shadow: 0 0 6px rgba(127,227,255,.4); }
.vp-set.is-sel .vp-pips > span.is-on { background: linear-gradient(180deg, #ffe7b8, var(--vp-amber)); box-shadow: 0 0 6px rgba(255,197,96,.5); }
.vp-set-val { min-width: 40px; text-align: right; font: 600 16px var(--vp-font-display); color: var(--vp-ink); }
.vp-set-desc { margin-top: 20px; max-width: 760px; padding: 12px 16px; border-left: 2px solid rgba(255,197,96,.6); background: rgba(127,227,255,.04);
  font: 400 15px/1.5 var(--vp-font-ui); color: var(--vp-ink-dim); }

/* controls */
.vp-ctl-note { margin-top: 16px; font: 400 14px/1.5 var(--vp-font-ui); color: var(--vp-ink-faint); }

@media (max-width: 760px) {
  .vp-menu-win { width: calc(100% - 16px); height: calc(100% - 16px - var(--vp-safe-top) - var(--vp-safe-bottom)); margin-top: calc((var(--vp-safe-top) - var(--vp-safe-bottom)) / 2);
    grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto; grid-template-areas: "head" "tabs" "body" "foot"; }
  .vp-menu-head { padding: 12px 10px 10px 16px; }
  .vp-menu-title { font-size: 22px; margin-top: 5px; }
  .vp-menu-where { display: none; }
  .vp-menu-head .vp-menu-close { margin-left: auto; }
  .vp-menu-tabs { flex-direction: row; gap: 0; padding: 0; border-right: 0; border-bottom: 1px solid var(--vp-line-dim); }
  .vp-menu-tab { flex: 1; min-width: 0; justify-content: center; min-height: 46px; padding: 0 2px; font-size: 13px; letter-spacing: .08em; }
  .vp-menu-tab::before, .vp-menu-tab .n, .vp-menu-journey { display: none; }
  .vp-menu-tab.is-cur, .vp-menu-tab.is-sel { box-shadow: inset 0 -2px 0 var(--vp-amber); }
  .vp-menu-tab.is-cur { box-shadow: inset 0 -2px 0 var(--vp-cyan); background: rgba(127,227,255,.07); }
  .vp-menu-body { padding: 14px 12px; }
  .vp-menu-foot { padding: 8px 14px; min-height: 42px; }
  .vp-menu-foot.is-touch .vp-hints { display: none; }
  .vp-card { padding: 14px 14px 12px; }
  .vp-card-top .vp-portrait { width: 64px; height: 64px; --ps: 64px; }
  .vp-card-name { font-size: 19px; letter-spacing: .14em; }
  .vp-sbar .vp-num { min-width: 76px; font-size: 15px; }
  .vp-items { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .vp-item-detail { padding: 16px; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
  .vp-item-big { width: 48px; height: 48px; }
  .vp-item-detail .vp-item-desc, .vp-item-detail .vp-item-tags { flex-basis: 100%; }
  .vp-set { flex-wrap: wrap; row-gap: 8px; padding-top: 10px; padding-bottom: 10px; font-size: 14px; }
  .vp-set-ctl { width: 100%; justify-content: flex-end; }
  .vp-seg > span { height: 40px; min-width: 0; flex: 1; }
  .vp-seg { flex: 1; }
  .vp-step { width: 40px; height: 40px; }
  .vp-pips { flex: 1; justify-content: center; gap: 3px; height: 40px; }
  .vp-pips > span { width: 9px; }
  .vp-pick-name { width: 64px; font-size: 14px; letter-spacing: .1em; }
  .vp-pick-row { padding-right: 10px; gap: 10px; }
}
@media (max-height: 520px) and (min-width: 761px) {
  .vp-menu-win { height: calc(100% - 20px); width: calc(100% - 40px); }
  .vp-menu-head { padding-top: 10px; padding-bottom: 8px; }
  .vp-menu-title { font-size: 22px; }
}
`;

export class Menu {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-menu', CSS);
    this.isOpen = false;
    this.tab = 0;
    this.focus = 'tabs';           // 'tabs' | 'body' | 'picker'
    this._itemSel = 0;
    this._setSel = 0;
    this._pickSel = 0;
    this._metaT = 0;

    this.title = el('div', { class: 'vp-menu-title' });
    this.where = el('b');
    const close = el('div', { class: 'vp-menu-close', role: 'button', 'aria-label': 'Close menu' }, [el('i')]);
    close.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    const head = el('div', { class: 'vp-menu-head' }, [
      el('div', {}, [el('div', { class: 'vp-cap vp-menu-kicker', text: 'Menu' }), this.title]),
      el('div', { class: 'vp-menu-where' }, [el('span', { class: 'vp-cap', text: 'ISV Halcyon' }), this.where]),
      close,
    ]);
    this.tabRows = TABS.map((t, i) => {
      const row = el('div', { class: 'vp-row vp-menu-tab', role: 'tab' }, [el('span', { class: 'n', text: `0${i + 1}` }), el('span', { text: t.label })]);
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
    this.picker = el('div', { class: 'vp-menu-picker' });
    this.picker.addEventListener('click', (e) => { if (e.target === this.picker) this._closePicker(); });
    this.win = el('div', { class: 'vp-panel vp-rich vp-menu-win' }, [head, tabs, this.body, this.foot, this.picker]);
    const scrim = el('div', { class: 'vp-menu-scrim' });
    scrim.addEventListener('click', () => this.close());
    this.root = el('div', { class: 'vp-layer vp-menu', role: 'dialog', 'aria-label': 'Menu' }, [scrim, this.win]);
    ui.root.appendChild(this.root);
  }

  get state() { return this.ui.state || {}; }

  open(tab) {
    if (typeof tab === 'string') tab = TABS.findIndex((t) => t.id === tab);
    if (typeof tab === 'number' && tab >= 0) this.tab = tab;
    if (this.isOpen) { this._setTab(this.tab, false); return; }
    this.isOpen = true;
    this.focus = 'tabs';
    this.ui._ctxPush('menu', 'menu');
    this.ui.sfx('menuOpen');
    this.where.textContent = this.ui.areaName || '';
    this.where.parentNode.style.visibility = this.ui.areaName ? '' : 'hidden';
    this._device = null;
    this._setTab(this.tab, false);
    this._refreshMeta();
    this.root.classList.add('is-open', 'is-live');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove('is-open', 'is-live', 'is-picking');
    this.ui.sfx('menuClose');
    this.ui._ctxPop('menu');
  }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  update(dt, focused) {
    if (!this.isOpen) return;
    this._metaT -= dt;
    if (this._metaT <= 0) { this._metaT = 0.5; this._refreshMeta(); }
    const dev = this.ui.input.lastDevice;
    if (dev !== this._device) { this._device = dev; this._refreshHints(); this.foot.classList.toggle('is-touch', dev === 'touch'); }
    if (!focused) return;
    const inp = this.ui.input;
    if (this.focus === 'picker') { this._pickerInput(inp); return; }
    if (inp.pressed('menu')) { inp.consume('menu'); this.close(); return; }
    if (inp.pressed('boostUp')) { inp.consume('boostUp'); this._switch(1); return; }
    if (inp.pressed('boostDown')) { inp.consume('boostDown'); this._switch(-1); return; }
    if (this.focus === 'tabs') {
      if (inp.repeat('up') || inp.repeat('left')) { inp.consume('up'); inp.consume('left'); this._switch(-1); }
      else if (inp.repeat('down') || inp.repeat('right')) { inp.consume('down'); inp.consume('right'); this._switch(1); }
      if (inp.pressed('confirm')) {
        inp.consume('confirm');
        if (TABS[this.tab].interactive && this._bodyCount() > 0) { this.ui.sfx('confirm'); this.focus = 'body'; this._refreshFocus(); }
        else this.ui.sfx('cursor', { volume: 0.4 });
      } else if (inp.pressed('cancel')) { inp.consume('cancel'); this.close(); }
      return;
    }
    // page body
    if (inp.pressed('cancel')) { inp.consume('cancel'); this.ui.sfx('cancel'); this.focus = 'tabs'; this._refreshFocus(); return; }
    const id = TABS[this.tab].id;
    if (id === 'items') this._itemsInput(inp);
    else if (id === 'settings') this._settingsInput(inp);
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
    const id = TABS[i].id;
    if (id === 'party') this._renderParty();
    else if (id === 'items') this._renderItems();
    else if (id === 'settings') this._renderSettings();
    else this._renderControls();
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
    const id = TABS[this.tab].id;
    if (id === 'items') this._paintItems();
    if (id === 'settings') this._paintSettings();
    this._refreshHints();
  }

  _refreshHints() {
    const dev = this.ui.input.lastDevice;
    const h = this.hints;
    h.textContent = '';
    const add = (action, label) => h.appendChild(el('span', { class: 'vp-hint' }, [glyph(action, dev), label]));
    const id = TABS[this.tab].id;
    if (this.focus === 'picker') { add('move', 'Select'); add('confirm', 'Use'); add('cancel', 'Back'); return; }
    if (this.focus === 'tabs') {
      add('tabs', 'Switch');
      if (TABS[this.tab].interactive) add('confirm', 'Open');
      add('cancel', 'Close');
      return;
    }
    add('move', 'Select');
    if (id === 'settings') add('adjust', 'Adjust');
    else add('confirm', 'Use');
    add('cancel', 'Back');
  }

  _refreshMeta() {
    const st = this.state;
    const s = st.stats || {};
    const key = `${st.credits}|${Math.floor(s.playTime || 0)}|${s.battles}|${s.breaks}|${s.maxDamage}`;
    if (key === this._metaKey) return;            // only touch the DOM when something changed
    this._metaKey = key;
    this.credits.textContent = fmtNum(st.credits || 0);
    this.time.textContent = formatTime(s.playTime || 0);
    const rows = [['Battles', s.battles], ['Breaks', s.breaks], ['Best hit', s.maxDamage]];
    this.journey.replaceChildren(...rows.map(([k, v]) => el('div', {}, [el('span', { class: 'vp-cap', text: k }), el('span', { class: 'vp-num', text: fmtNum(v || 0) })])));
  }

  _bodyCount() {
    const id = TABS[this.tab].id;
    if (id === 'items') return this._items ? this._items.length : 0;
    if (id === 'settings') return SETTINGS.length;
    return 0;
  }

  // ------------------------------------------------------------------ party

  _accent(m) {
    return m.accent || this.ui.partyDefs?.[m.id]?.accent || MEMBER_ACCENT[m.id] || '#7fe3ff';
  }

  _bar(kind, cur, max, { low = false } = {}) {
    const f = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
    const bar = el('div', { class: `vp-bar ${kind}${low ? ' is-low' : ''}` }, [el('i', { style: { transform: `scaleX(${f})` } })]);
    const num = el('span', { class: `vp-num${low ? ' is-low' : ''}` }, [String(Math.round(cur)), el('small', { text: ` / ${Math.round(max)}` })]);
    return el('div', { class: 'vp-sbar' }, [el('span', { class: 'vp-cap', text: kind.toUpperCase() }), bar, num]);
  }

  _renderParty() {
    const party = this.state.party || [];
    const grid = el('div', { class: 'vp-party' });
    for (const m of party) {
      const ko = m.alive === false || m.hp <= 0;
      const low = !ko && m.hp / m.maxHp < 0.3;
      const accent = this._accent(m);
      const hd = el('div', { class: 'vp-card-hd' }, [
        el('span', { class: 'vp-card-name', text: m.name }),
        ko ? el('span', { class: 'vp-ko', text: 'KO' }) : null,
        el('span', { class: 'vp-card-lv' }, [el('span', { class: 'vp-cap', text: 'Lv' }), el('span', { class: 'vp-num', text: String(m.level ?? 1) })]),
      ]);
      const main = el('div', { class: 'vp-card-main' }, [
        el('div', {}, [hd, el('div', { class: 'vp-cap vp-card-cls', text: m.cls || '', style: { marginTop: '6px' } })]),
        this._bar('hp', ko ? 0 : m.hp, m.maxHp, { low }),
        this._bar('ep', m.ep, m.maxEp),
      ]);
      const stats = el('div', { class: 'vp-card-stats' }, STATS.map(([k, label]) => el('div', { class: 'vp-stat' }, [
        el('span', { class: 'vp-cap', text: label }), el('span', { class: 'vp-num', text: String(m.stats?.[k] ?? 0) }),
      ])));
      const weapons = (m.weapons || []).map((w) => el('span', { class: 'vp-weap', title: TYPE_LABEL[w] || w }, [this.ui.iconEl(w, 16), TYPE_LABEL[w] || w]));
      const xpNext = m.xpNext || 0;
      const next = el('div', { class: 'vp-next' }, [
        el('span', { class: 'vp-cap', text: 'Next' }),
        el('div', { class: 'vp-bar xp' }, [el('i', { style: { transform: `scaleX(${xpNext ? Math.min(1, (m.xp || 0) / xpNext) : 0})` } })]),
        el('span', { class: 'vp-num', text: String(Math.max(0, xpNext - (m.xp || 0))) }),
      ]);
      const card = el('div', { class: `vp-panel vp-card${ko ? ' is-ko' : ''}` }, [
        el('div', { class: 'vp-card-top' }, [this.ui.portraitEl(m.id, { size: 80, accent, name: m.name, ko }), main]),
        stats,
        el('div', { class: 'vp-card-foot' }, [...weapons, next]),
      ]);
      card.style.setProperty('--acc', accent);
      grid.appendChild(card);
    }
    if (!party.length) grid.appendChild(el('div', { class: 'vp-empty', text: 'No travelers aboard.' }));
    this.body.appendChild(grid);
  }

  // ------------------------------------------------------------------ items

  _itemInfo(id) {
    return this.ui.itemInfo(id);
  }

  _renderItems() {
    const inv = this.state.inventory || {};
    const ids = Object.keys(inv).filter((id) => inv[id] > 0);
    const cons = ids.filter((id) => !this._itemInfo(id).key);
    const keys = ids.filter((id) => this._itemInfo(id).key);
    this._items = [...cons, ...keys];
    this._itemSel = Math.min(this._itemSel, Math.max(0, this._items.length - 1));
    this._itemRows = [];
    const scroll = this.body.scrollTop;
    this.body.textContent = '';
    const list = el('div', { class: 'vp-item-list', role: 'listbox' });
    const addRows = (title, arr) => {
      if (!arr.length) return;
      list.appendChild(el('div', { class: 'vp-cap vp-item-sec', text: title }));
      for (const id of arr) {
        const info = this._itemInfo(id);
        const idx = this._itemRows.length;
        const row = el('div', { class: 'vp-row vp-item-row', role: 'option' }, [
          this.ui.iconEl(id, 32), el('span', { text: info.name }), el('span', { class: 'cnt', text: info.key ? '' : `×${inv[id]}` }),
        ]);
        bindPointer(row, {
          onHover: () => { if (this.focus === 'body' && this._itemSel !== idx) { this._itemSel = idx; this.ui.sfx('cursor'); this._paintItems(); } },
          onActivate: () => { this._itemSel = idx; this.focus = 'body'; this._refreshFocus(); this._useSelected(); },
        });
        list.appendChild(row);
        this._itemRows.push(row);
      }
    };
    addRows('Consumables', cons);
    addRows('Key items', keys);
    if (!this._items.length) list.appendChild(el('div', { class: 'vp-empty', text: 'The cargo pouch is empty.' }));
    this._detail = el('div', { class: 'vp-panel vp-item-detail' });
    this.body.appendChild(el('div', { class: 'vp-items' }, [list, this._detail]));
    this.body.scrollTop = scroll;
    this._paintItems();
  }

  _paintItems() {
    if (!this._itemRows) return;
    const inBody = this.focus !== 'tabs';
    this._itemRows.forEach((r, k) => {
      r.classList.toggle('is-sel', inBody && k === this._itemSel);
      r.classList.toggle('is-hl', !inBody && k === this._itemSel);
    });
    const id = this._items[this._itemSel];
    const d = this._detail;
    if (!d) return;
    d.textContent = '';
    if (!id) { d.appendChild(el('div', { class: 'vp-item-desc', text: 'Items you pick up aboard the Halcyon appear here.' })); return; }
    const info = this._itemInfo(id);
    const n = (this.state.inventory || {})[id] || 0;
    const usable = !info.key && !!info.target;
    d.append(
      this.ui.iconEl(id, 64, 'vp-item-big'),
      el('div', { class: 'vp-item-name', text: info.name }),
      el('div', { class: 'vp-item-desc', text: info.desc || '' }),
      el('div', { class: 'vp-item-tags' }, [
        info.key ? el('span', { class: 'vp-tag amber', text: 'Key item' }) : el('span', { class: 'vp-tag', text: `Held ×${n}` }),
        usable ? el('span', { class: 'vp-tag', text: info.target === 'koAlly' ? 'Target: downed ally' : 'Target: one ally' }) : null,
      ]),
    );
    if (inBody && this._itemRows[this._itemSel]) this._itemRows[this._itemSel].scrollIntoView({ block: 'nearest' });
  }

  _itemsInput(inp) {
    const n = this._items.length;
    if (!n) return;
    if (inp.repeat('up')) { inp.consume('up'); this._itemSel = (this._itemSel + n - 1) % n; this.ui.sfx('cursor'); this._paintItems(); }
    else if (inp.repeat('down')) { inp.consume('down'); this._itemSel = (this._itemSel + 1) % n; this.ui.sfx('cursor'); this._paintItems(); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._useSelected(); }
  }

  _useSelected() {
    const id = this._items[this._itemSel];
    if (!id) return;
    const info = this._itemInfo(id);
    if (info.key || !info.target) { this.ui.sfx('error'); this._flashDetail(); return; }
    this._openPicker(id);
  }

  _flashDetail() {
    const d = this._detail;
    if (!d || !d.animate) return;
    d.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 220 });
  }

  // ------------------------------------------------------------------ target picker

  _openPicker(itemId) {
    this._pickItem = itemId;
    this.focus = 'picker';
    const party = this.state.party || [];
    if (this._pickSel >= party.length) this._pickSel = 0;
    // start on the most sensible target: a downed ally for revives, else the ally missing the most HP (EP for ether)
    const info = this._itemInfo(itemId);
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
    this.root.classList.add('is-picking');
    this.ui.sfx('confirm');
    this._refreshHints();
  }

  _closePicker() {
    if (this.focus !== 'picker') return;
    this.focus = 'body';
    this.root.classList.remove('is-picking');
    this.ui.sfx('cancel');
    this._refreshFocus();
  }

  _renderPicker(message, ok = true) {
    const id = this._pickItem;
    const info = this._itemInfo(id);
    const n = (this.state.inventory || {})[id] || 0;
    const party = this.state.party || [];
    const rows = party.map((m, i) => {
      const ko = m.alive === false || m.hp <= 0;
      const fits = info.target === 'koAlly' ? ko : !ko;
      const row = el('div', { class: `vp-row vp-pick-row${fits ? '' : ' is-dim'}`, role: 'option' }, [
        this.ui.portraitEl(m.id, { size: 40, accent: this._accent(m), name: m.name, ko }),
        el('span', { class: 'vp-pick-name', text: m.name }),
        el('div', { class: 'vp-pick-bars' }, [this._bar('hp', ko ? 0 : m.hp, m.maxHp, { low: !ko && m.hp / m.maxHp < 0.3 }), this._bar('ep', m.ep, m.maxEp)]),
      ]);
      bindPointer(row, {
        onHover: () => { if (this._pickSel !== i) { this._pickSel = i; this.ui.sfx('cursor'); this._paintPicker(); } },
        onActivate: () => { this._pickSel = i; this._paintPicker(); this._applyItem(); },
      });
      return row;
    });
    this._pickRows = rows;
    const msg = el('div', { class: `vp-picker-msg${ok ? '' : ' is-err'}`, text: message || '' });
    const panel = el('div', { class: 'vp-panel vp-solid vp-rich vp-picker', role: 'listbox' }, [
      el('div', { class: 'vp-picker-hd' }, [this.ui.iconEl(id, 32), el('b', { text: `Use ${info.name}` }), el('span', { class: 'vp-num', text: `×${n}` })]),
      el('div', { class: 'vp-picker-rows vp-scroll' }, rows),
      msg,
    ]);
    this.picker.replaceChildren(panel);
    this._paintPicker();
  }

  _paintPicker() {
    this._pickRows.forEach((r, k) => r.classList.toggle('is-sel', k === this._pickSel));
  }

  _pickerInput(inp) {
    const n = this._pickRows.length;
    if (inp.pressed('menu')) { inp.consume('menu'); this.close(); return; }
    if (inp.repeat('up')) { inp.consume('up'); this._pickSel = (this._pickSel + n - 1) % n; this.ui.sfx('cursor'); this._paintPicker(); }
    else if (inp.repeat('down')) { inp.consume('down'); this._pickSel = (this._pickSel + 1) % n; this.ui.sfx('cursor'); this._paintPicker(); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._applyItem(); }
    else if (inp.pressed('cancel')) { inp.consume('cancel'); this._closePicker(); }
  }

  _applyItem() {
    const member = (this.state.party || [])[this._pickSel];
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
      this.ui.hud.toast(res.message, { icon: itemId });
      this.focus = 'body';
      this.root.classList.remove('is-picking');
      this._renderItems();
      this._refreshFocus();
      return;
    }
    this._renderPicker(res.message, res.ok);
    if (res.ok) {
      const row = this._pickRows[this._pickSel];
      if (row && row.animate) row.animate([{ background: 'rgba(111,240,166,.25)' }, { background: 'rgba(111,240,166,0)' }], { duration: 600 });
      this._renderItems();
      this._paintItems();
    }
  }

  // ------------------------------------------------------------------ settings

  _renderSettings() {
    const list = el('div', { class: 'vp-set-list', role: 'listbox' });
    this._setRows = SETTINGS.map((s, i) => {
      const ctl = el('div', { class: 'vp-set-ctl' });
      const row = el('div', { class: 'vp-row vp-set', role: 'option' }, [el('span', { text: s.label }), ctl]);
      row._ctl = ctl;
      bindPointer(row, {
        onHover: () => { if (this.focus === 'body' && this._setSel !== i) { this._setSel = i; this.ui.sfx('cursor'); this._paintSettings(); } },
        onActivate: () => { this._setSel = i; this.focus = 'body'; this._refreshFocus(); },
      });
      list.appendChild(row);
      return row;
    });
    this._setDesc = el('div', { class: 'vp-set-desc' });
    this.body.append(list, this._setDesc);
    this._paintSettings();
  }

  _paintSettings() {
    if (!this._setRows) return;
    const inBody = this.focus !== 'tabs';
    const ui = this.ui;
    SETTINGS.forEach((s, i) => {
      const row = this._setRows[i];
      row.classList.toggle('is-sel', inBody && i === this._setSel);
      const ctl = row._ctl;
      ctl.textContent = '';
      const v = ui.getSetting(s.id);
      const pick = (val) => (e) => { e.stopPropagation(); this._setSel = i; this.focus = 'body'; this._change(s, val); this._refreshFocus(); };
      if (s.type === 'toggle' || s.type === 'choice') {
        const opts = s.type === 'toggle' ? [[true, 'On'], [false, 'Off']] : s.options;
        ctl.appendChild(el('div', { class: 'vp-seg' }, opts.map(([val, label]) => el('span', { class: val === v ? 'is-on' : null, text: label, onclick: pick(val) }))));
      } else {
        const steps = Math.round(v * 10);
        const minus = el('div', { class: 'vp-step', text: '−', onclick: pick(Math.max(0, steps - 1) / 10) });
        const plus = el('div', { class: 'vp-step', text: '+', onclick: pick(Math.min(10, steps + 1) / 10) });
        const pips = el('div', { class: 'vp-pips' }, Array.from({ length: 10 }, (_, k) => el('span', {
          class: k < steps ? 'is-on' : null,
          onclick: pick(steps === k + 1 ? k / 10 : (k + 1) / 10),        // tap the last lit pip again to lower by one
        })));
        ctl.append(minus, pips, plus, el('span', { class: 'vp-set-val', text: String(steps * 10) }));
      }
    });
    this._setDesc.textContent = SETTINGS[this._setSel].desc;
  }

  _settingsInput(inp) {
    const n = SETTINGS.length;
    if (inp.repeat('up')) { inp.consume('up'); this._setSel = (this._setSel + n - 1) % n; this.ui.sfx('cursor'); this._paintSettings(); return; }
    if (inp.repeat('down')) { inp.consume('down'); this._setSel = (this._setSel + 1) % n; this.ui.sfx('cursor'); this._paintSettings(); return; }
    const s = SETTINGS[this._setSel];
    const left = inp.repeat('left'), right = inp.repeat('right'), ok = inp.pressed('confirm');
    if (!left && !right && !ok) return;
    inp.consume('left'); inp.consume('right'); inp.consume('confirm');
    const v = this.ui.getSetting(s.id);
    if (s.type === 'toggle') this._change(s, !v);
    else if (s.type === 'slider') {
      const steps = Math.round(v * 10) + (left ? -1 : right ? 1 : 0);
      if (ok) return;
      this._change(s, Math.max(0, Math.min(10, steps)) / 10);
    } else {
      const k = s.options.findIndex((o) => o[0] === v);
      const d = left ? -1 : 1;
      const nk = ok ? (k + 1) % s.options.length : Math.max(0, Math.min(s.options.length - 1, k + d));
      this._change(s, s.options[nk][0]);
    }
  }

  _change(s, value) {
    if (this.ui.getSetting(s.id) === value) { this.ui.sfx('cursor', { volume: 0.4 }); return; }
    this.ui.setSetting(s.id, value);
    this.ui.sfx(s.type === 'slider' ? 'cursor' : 'confirm');
    this._paintSettings();
  }

  // ------------------------------------------------------------------ controls

  _renderControls() {
    this.body.append(
      controlsTable(this.ui.input.lastDevice),
      el('p', { class: 'vp-ctl-note', text: 'Touch controls appear as soon as you touch the screen: drag anywhere in the lower-left to move, push the stick fully to run, and tap menu rows directly.' }),
    );
  }
}
