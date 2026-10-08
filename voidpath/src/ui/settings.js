// Settings tab: audio (POC rows), text speed, battle speed, difficulty, encounter rate, skip weak
// encounters, graphics quality (with a note when perf.js lowered it automatically) and Return to
// title (confirmed, then ui.hooks.quitToTitle()). Values persist in 'voidpath.settings.v1' through
// ui.setSetting, which also reports game settings to ui.hooks.settings(patch).

import { el, injectCSS } from '../core/util.js';
import { bindPointer, onTap, loadSettings } from './theme.js';

const QUALITY = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];

export const SETTINGS = [
  { id: 'sound', label: 'Sound', type: 'toggle', desc: 'Turn all game audio on or off. M toggles it anywhere.' },
  { id: 'music', label: 'Music volume', type: 'slider', desc: 'Volume of the score: title, exploration, battle and boss themes.' },
  { id: 'sfx', label: 'Effects volume', type: 'slider', desc: 'Volume of menu ticks, footsteps, hits, shield cracks and Breaks.' },
  { id: 'textSpeed', label: 'Text speed', type: 'choice', group: true, options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']],
    desc: 'How quickly dialogue types out. Confirm always completes a line instantly.' },
  { id: 'battleSpeed', label: 'Battle speed', type: 'choice', options: [[1, '1x'], [1.5, '1.5x'], [2, '2x']],
    desc: 'How fast battle animations play. Turn order and your choices are unchanged.' },
  { id: 'difficulty', label: 'Difficulty', type: 'choice', options: [['story', 'Story'], ['normal', 'Normal']],
    desc: 'Story: foes have less HP and hit softer, for players here for the voyage. Normal: the intended challenge.' },
  { id: 'encounters', label: 'Encounters', type: 'choice', options: [['normal', 'Normal'], ['low', 'Low']],
    desc: 'How often random battles find you. Low: about 40% fewer.' },
  { id: 'skipWeak', label: 'Skip weak encounters', type: 'toggle',
    desc: 'No random battles in zones five or more levels below the party’s average level.' },
  { id: 'quality', label: 'Graphics', type: 'choice', group: true, options: QUALITY,
    desc: 'Render resolution, real-time shadows and post effects. Lower it for smoother play on older devices.' },
  { id: 'quit', label: 'Return to title', type: 'action', group: true, desc: 'Leave this journey for the title screen. Progress since your last save is lost.' },
];

const CSS = `
.vp-set-wrap { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 300px); gap: 22px; align-items: start; }
.vp-set-list { display: flex; flex-direction: column; gap: 2px; }
.vp-set { min-height: 46px; justify-content: space-between; font: 600 15px var(--vp-font-ui); letter-spacing: .16em; text-transform: uppercase; }
.vp-set.is-group { margin-top: 8px; box-shadow: 0 -1px 0 rgba(140,214,255,.1); }
.vp-set.is-group.is-sel { box-shadow: inset 2px 0 0 var(--vp-amber), 0 -1px 0 rgba(140,214,255,.1); }
.vp-set-ctl { display: flex; align-items: center; gap: 10px; color: var(--vp-ink); text-shadow: none; letter-spacing: .1em; }
.vp-seg { display: flex; border: 1px solid var(--vp-line-dim); }
.vp-seg > span { min-width: 62px; height: 34px; padding: 0 10px; box-sizing: border-box; display: grid; place-items: center; cursor: pointer;
  font: 600 13px var(--vp-font-ui); letter-spacing: .14em; color: var(--vp-ink-faint); transition: background .12s, color .12s; }
.vp-seg > span + span { border-left: 1px solid var(--vp-line-dim); }
.vp-seg > span.is-on { color: var(--vp-ink); background: rgba(127,227,255,.14); box-shadow: inset 0 -2px 0 var(--vp-cyan); }
.vp-set.is-sel .vp-seg > span.is-on { color: var(--vp-amber); background: rgba(255,197,96,.16); box-shadow: inset 0 -2px 0 var(--vp-amber); }
.vp-pips { display: flex; gap: 4px; height: 34px; align-items: center; cursor: pointer; }
.vp-pips > span { width: 11px; height: 20px; transform: skewX(-14deg); background: rgba(140,214,255,.12); box-shadow: inset 0 0 0 1px rgba(140,214,255,.12); }
.vp-pips > span.is-on { background: linear-gradient(180deg, #c8f3ff, var(--vp-cyan)); box-shadow: 0 0 6px rgba(127,227,255,.4); }
.vp-set.is-sel .vp-pips > span.is-on { background: linear-gradient(180deg, #ffe7b8, var(--vp-amber)); box-shadow: 0 0 6px rgba(255,197,96,.5); }
.vp-set-val { min-width: 40px; text-align: right; font: 600 16px var(--vp-font-display); color: var(--vp-ink); }
.vp-set-auto { padding: 3px 6px; border: 1px solid rgba(255,197,96,.5); font: 700 10px/1 var(--vp-font-ui); letter-spacing: .2em; color: var(--vp-amber); }
.vp-set-go { width: 0; height: 0; border-left: 8px solid var(--vp-ink-dim); border-top: 6px solid transparent; border-bottom: 6px solid transparent; }
.vp-set.is-sel .vp-set-go { border-left-color: var(--vp-amber); }
.vp-set-desc { padding: 16px 18px; display: grid; gap: 10px; font: 400 15px/1.5 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-set-desc b { font: 600 13px/1 var(--vp-font-ui); letter-spacing: .24em; text-transform: uppercase; color: var(--vp-ink); }
.vp-set-note { padding: 8px 10px; border-left: 2px solid var(--vp-amber); background: rgba(255,197,96,.07); color: #ffd9a0; font-size: 14px; }
@media (max-width: 760px) {
  .vp-set-wrap { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .vp-set { flex-wrap: wrap; row-gap: 8px; padding-top: 10px; padding-bottom: 10px; font-size: 14px; }
  .vp-set-ctl { width: 100%; justify-content: flex-end; }
  .vp-set[data-type="action"] .vp-set-ctl { width: auto; }
  .vp-seg > span { height: 40px; min-width: 0; flex: 1; }
  .vp-seg { flex: 1; }
  .vp-step { width: 40px; height: 40px; }
  .vp-pips { flex: 1; justify-content: center; gap: 3px; height: 40px; }
  .vp-pips > span { width: 9px; }
}
`;

export class SettingsPage {
  constructor(menu) {
    this.menu = menu;
    this.ui = menu.ui;
    injectCSS('vp-settings', CSS);
    this.interactive = true;
    this._sel = 0;
    this._rows = null;
  }

  count() { return SETTINGS.length; }

  render(body) {
    const list = el('div', { class: 'vp-set-list', role: 'listbox' });
    this._rows = SETTINGS.map((s, i) => {
      const ctl = el('div', { class: 'vp-set-ctl' });
      const row = el('div', { class: `vp-row vp-set${s.group ? ' is-group' : ''}`, role: 'option', 'data-type': s.type }, [el('span', { text: s.label }), ctl]);
      row._ctl = ctl;
      bindPointer(row, {
        onHover: () => { if (this.menu.focus === 'body' && this._sel !== i) { this._sel = i; this.ui.sfx('cursor'); this.paint(); } },
        onActivate: () => { this._sel = i; this.menu.enterBody(); if (s.type === 'action' || s.type === 'toggle') this._activate(s); else this.paint(); },
      });
      list.appendChild(row);
      return row;
    });
    this._desc = el('div', { class: 'vp-panel vp-set-desc' });
    body.appendChild(el('div', { class: 'vp-set-wrap' }, [list, this._desc]));
    this.paint();
  }

  paint() {
    if (!this._rows) return;
    const inBody = this.menu.focus === 'body';
    const ui = this.ui;
    const auto = !!loadSettings().qualityAuto;
    SETTINGS.forEach((s, i) => {
      const row = this._rows[i];
      row.classList.toggle('is-sel', inBody && i === this._sel);
      row.classList.toggle('is-dim', s.type === 'action' && !this._canQuit());
      const ctl = row._ctl;
      ctl.textContent = '';
      const v = ui.getSetting(s.id);
      const pick = (val) => () => { this._sel = i; this.menu.enterBody(); this._change(s, val); };
      if (s.type === 'toggle' || s.type === 'choice') {
        const opts = s.type === 'toggle' ? [[true, 'On'], [false, 'Off']] : s.options;
        if (s.id === 'quality' && auto) ctl.appendChild(el('span', { class: 'vp-set-auto', text: 'AUTO' }));
        ctl.appendChild(el('div', { class: 'vp-seg' }, opts.map(([val, label]) => onTap(el('span', { class: val === v ? 'is-on' : null, text: label }), pick(val)))));
      } else if (s.type === 'slider') {
        const steps = Math.round(v * 10);
        const minus = onTap(el('div', { class: 'vp-step', text: '−' }), pick(Math.max(0, steps - 1) / 10));
        const plus = onTap(el('div', { class: 'vp-step', text: '+' }), pick(Math.min(10, steps + 1) / 10));
        // tap the last lit pip again to lower by one
        const pips = el('div', { class: 'vp-pips' }, Array.from({ length: 10 }, (_, k) => onTap(el('span', { class: k < steps ? 'is-on' : null }), pick(steps === k + 1 ? k / 10 : (k + 1) / 10))));
        ctl.append(minus, pips, plus, el('span', { class: 'vp-set-val', text: String(steps * 10) }));
      } else ctl.appendChild(el('i', { class: 'vp-set-go' }));
    });
    const s = SETTINGS[this._sel];
    this._desc.replaceChildren(...[
      el('b', { text: s.label }),
      el('div', { text: s.desc }),
      s.id === 'quality' && auto ? el('div', { class: 'vp-set-note', text: 'Lowered automatically for smoother play.' }) : null,
      s.id === 'difficulty' ? el('div', { class: 'vp-set-note', text: 'Battles are balanced for Normal.' }) : null,
    ].filter(Boolean));
    if (inBody) this._rows[this._sel].scrollIntoView({ block: 'nearest' });
  }

  input(inp) {
    const n = SETTINGS.length;
    if (inp.repeat('up')) { inp.consume('up'); this._sel = (this._sel + n - 1) % n; this.ui.sfx('cursor'); this.paint(); return; }
    if (inp.repeat('down')) { inp.consume('down'); this._sel = (this._sel + 1) % n; this.ui.sfx('cursor'); this.paint(); return; }
    const s = SETTINGS[this._sel];
    const left = inp.repeat('left'), right = inp.repeat('right'), ok = inp.pressed('confirm');
    if (!left && !right && !ok) return;
    inp.consume('left'); inp.consume('right'); inp.consume('confirm');
    if (s.type === 'action' || s.type === 'toggle') {
      if (ok || s.type === 'toggle') this._activate(s);
      return;
    }
    const v = this.ui.getSetting(s.id);
    if (s.type === 'slider') {
      if (ok) return;
      this._change(s, Math.max(0, Math.min(10, Math.round(v * 10) + (left ? -1 : 1))) / 10);
    } else {
      const k = s.options.findIndex((o) => o[0] === v);
      const nk = ok ? (k + 1) % s.options.length : Math.max(0, Math.min(s.options.length - 1, k + (left ? -1 : 1)));
      this._change(s, s.options[nk][0]);
    }
  }

  back() { return false; }

  hints(add) {
    add('move', 'Select');
    const t = SETTINGS[this._sel].type;
    if (t === 'action') add('confirm', 'Select');
    else add('adjust', 'Adjust');
    add('cancel', 'Back');
  }

  _canQuit() { return !!this.ui.hooks.quitToTitle; }

  _activate(s) {
    if (s.type === 'toggle') { this._change(s, !this.ui.getSetting(s.id)); return; }
    this._quit();
  }

  async _quit() {
    if (!this._canQuit()) { this.ui.sfx('error'); return; }
    this.ui.sfx('confirm');
    const k = await this.menu.popup.open({
      title: 'Return to title?', text: 'Progress since your last save will be lost.',
      options: ['Return to title', 'Keep playing'], cancelIndex: 1, initial: 1, tone: 'danger',
    });
    if (k !== 0) return;
    this.menu.close();
    this.ui.hook('quitToTitle');
  }

  _change(s, value) {
    if (this.ui.getSetting(s.id) === value) { this.ui.sfx('cursor', { volume: 0.4 }); this.paint(); return; }
    this.ui.setSetting(s.id, value);
    this.ui.sfx(s.type === 'slider' ? 'cursor' : 'confirm');
    this.paint();
  }
}
