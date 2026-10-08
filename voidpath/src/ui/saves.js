// Save / load picker. Rows: slot name (Autosave, File 1-3), chapter label, location, play time,
// party portraits with levels, the saved time, and a star on cleared saves; empty and damaged
// states. Save mode asks before overwriting and keeps the autosave read-only; load mode only
// accepts filled slots. With storage 'memory' a notice explains that saves last for the session.
//
//   ui.saves.open({ mode: 'save' | 'load', slots /* save.listSlots() */, storage: 'local' | 'memory' })
//     -> Promise<slot | null>
//   slots: [{ slot, empty, damaged, summary: { chapterLabel, location, playTime, party: [{ id, level }],
//            cleared, savedAt } }]   (savedAt may also sit on the slot entry itself)

import { el, injectCSS } from '../core/util.js';
import { bindPointer, onTap, glyph, formatTime } from './theme.js';
import { Popup } from './popup.js';

const NAMES = { auto: 'Autosave', slot1: 'File 1', slot2: 'File 2', slot3: 'File 3' };
const MEMORY_NOTE = 'Saving is unavailable in this view. Progress lasts until the page closes.';

const CSS = `
.vp-saves { z-index: 62; opacity: 0; visibility: hidden; transition: opacity .2s var(--vp-ease-out), visibility 0s linear .2s; }
.vp-saves.is-open { opacity: 1; visibility: visible; transition: opacity .2s var(--vp-ease-out); }
.vp-saves-scrim { position: absolute; inset: 0; background: radial-gradient(120% 90% at 50% 45%, rgba(5,7,13,.6), rgba(5,7,13,.9)); }
.vp-saves-win { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); box-sizing: border-box; width: min(900px, calc(100% - 40px));
  max-height: calc(100% - 40px); display: flex; flex-direction: column; }
.vp-saves-head { display: flex; align-items: center; gap: 16px; padding: 14px 14px 12px 26px; border-bottom: 1px solid var(--vp-line-dim); }
.vp-saves-title { margin-top: 6px; font: 700 26px/1 var(--vp-font-display); letter-spacing: .22em; color: #f4f9ff; }
.vp-saves-head .vp-menu-close { margin-left: auto; }
.vp-saves-note { display: flex; gap: 12px; align-items: center; margin: 12px 18px 0; padding: 10px 14px; border-left: 2px solid var(--vp-amber); background: rgba(255,197,96,.08);
  font: 500 14px/1.45 var(--vp-font-ui); color: #ffd9a0; }
.vp-saves-note .vp-ico { width: 16px; height: 16px; }
.vp-saves-list { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; min-height: 0; }
.vp-slot { display: grid; grid-template-columns: 150px minmax(0, 1fr) auto; align-items: center; gap: 18px; min-height: 72px; padding: 10px 18px 10px 34px; }
.vp-slot-k b { display: flex; align-items: center; gap: 8px; font: 700 15px/1 var(--vp-font-display); letter-spacing: .2em; text-transform: uppercase; }
.vp-slot-k b .vp-ico { width: 16px; height: 16px; }
.vp-slot-k small { display: block; margin-top: 8px; font: 500 13px/1.3 var(--vp-font-ui); letter-spacing: .04em; color: var(--vp-ink-faint); }
.vp-slot-main { min-width: 0; }
.vp-slot-ch { font: 600 18px/1.2 var(--vp-font-display); letter-spacing: .08em; color: var(--vp-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vp-slot-loc { display: flex; gap: 14px; margin-top: 7px; font: 500 14px/1 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-slot-loc .vp-num { color: var(--vp-ink); }
.vp-slot-party { display: flex; gap: 6px; }
.vp-slot-mem { position: relative; }
.vp-slot-mem .vp-portrait { width: 44px; height: 44px; --ps: 44px; }
.vp-slot-mem span { position: absolute; right: -3px; bottom: -4px; padding: 1px 4px; background: #070b16; border: 1px solid var(--vp-line-dim); font: 600 11px/1.2 var(--vp-font-display); color: var(--vp-ink); }
.vp-slot-mem.is-lead .vp-portrait { outline: 1px solid var(--vp-amber); outline-offset: 1px; }
.vp-slot.is-empty .vp-slot-ch, .vp-slot.is-damaged .vp-slot-ch { color: var(--vp-ink-faint); font-weight: 500; }
.vp-slot.is-damaged .vp-slot-ch { color: #ff8a96; }
.vp-slot-ro { display: inline-block; margin-top: 8px; padding: 4px 8px; border: 1px solid var(--vp-line-dim); font: 600 11px/1 var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; color: var(--vp-ink-faint); }
.vp-saves-foot { display: flex; gap: 22px; padding: 8px 22px 12px; border-top: 1px solid var(--vp-line-dim); }
.vp-saves-foot.is-touch { display: none; }
@media (max-width: 760px) {
  .vp-saves-win { width: calc(100% - 16px); max-height: calc(100% - 16px - var(--vp-safe-top) - var(--vp-safe-bottom)); }
  .vp-saves-head { padding: 12px 10px 10px 16px; }
  .vp-saves-title { font-size: 20px; }
  .vp-slot { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "k party" "main main"; gap: 8px 12px; padding: 12px 12px 12px 30px; min-height: 0; }
  .vp-slot-k { grid-area: k; } .vp-slot-main { grid-area: main; } .vp-slot-party { grid-area: party; }
  .vp-slot-mem .vp-portrait { width: 34px; height: 34px; --ps: 34px; }
  .vp-saves-list { padding: 10px 8px; }
}
`;

function savedText(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export class Saves {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-saves', CSS);
    this.isOpen = false;
    this._sel = 0;
    this.title = el('div', { class: 'vp-saves-title' });
    this.note = el('div', { class: 'vp-saves-note' });
    this.list = el('div', { class: 'vp-saves-list vp-scroll', role: 'listbox' });
    this.foot = el('div', { class: 'vp-saves-foot' });
    const close = el('div', { class: 'vp-menu-close', role: 'button', 'aria-label': 'Close' }, [el('i')]);
    onTap(close, () => this._done(null));
    this.win = el('div', { class: 'vp-panel vp-rich vp-solid vp-saves-win' }, [
      el('div', { class: 'vp-saves-head' }, [el('div', {}, [el('div', { class: 'vp-cap vp-menu-kicker', text: 'Journey records' }), this.title]), close]),
      this.note, this.list, this.foot,
    ]);
    this.popup = new Popup(ui, this.win);
    const scrim = el('div', { class: 'vp-saves-scrim' });
    onTap(scrim, () => this._done(null));
    this.root = el('div', { class: 'vp-layer vp-saves', role: 'dialog', 'aria-label': 'Saves' }, [scrim, this.win]);
    ui.root.appendChild(this.root);
  }

  open({ mode = 'load', slots = [], storage = 'local' } = {}) {
    if (this.isOpen) this._done(null);
    this.mode = mode;
    this.slots = slots;
    this.isOpen = true;
    this.title.textContent = mode === 'save' ? 'SAVE JOURNEY' : 'LOAD JOURNEY';
    this.note.style.display = storage === 'memory' ? '' : 'none';
    this.note.replaceChildren(this.ui.iconEl('save', 16), MEMORY_NOTE);
    const usable = slots.findIndex((s) => this._usable(s));
    // load: the newest save; save: the first free file, else the first writable one
    const newest = slots.reduce((b, s, i) => (this._usable(s) && (b < 0 || this._time(s) > this._time(slots[b])) ? i : b), -1);
    const free = slots.findIndex((s) => s.slot !== 'auto' && s.empty);
    this._sel = Math.max(0, mode === 'load' ? newest : free >= 0 ? free : usable);
    this.ui._ctxPush('saves', 'menu');
    this.ui.sfx('menuOpen');
    this._render();
    this._device = null;
    this.root.classList.add('is-open', 'is-live');
    return new Promise((resolve) => { this._resolve = resolve; });
  }

  update(dt, focused) {
    if (!this.isOpen) return;
    const dev = this.ui.input.lastDevice;
    if (dev !== this._device) { this._device = dev; this._hints(); }
    if (!focused) return;
    const inp = this.ui.input;
    if (this.popup.isOpen) { this.popup.input(inp); return; }
    const n = this.slots.length;
    if (n && inp.repeat('up')) { inp.consume('up'); this._select((this._sel + n - 1) % n, true); } else if (n && inp.repeat('down')) { inp.consume('down'); this._select((this._sel + 1) % n, true); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._pick(); } else if (inp.pressed('cancel') || inp.pressed('menu')) { inp.consume('cancel'); inp.consume('menu'); this.ui.sfx('cancel'); this._done(null); }
  }

  _time(s) {
    const t = Date.parse((s.summary && s.summary.savedAt) || s.savedAt || '');
    return Number.isNaN(t) ? 0 : t;
  }

  _usable(s) {
    if (this.mode === 'load') return !s.empty && !s.damaged;
    return s.slot !== 'auto';
  }

  _render() {
    this._rows = this.slots.map((s, i) => {
      const sum = s.summary || {};
      const name = NAMES[s.slot] || s.slot;
      const ro = this.mode === 'save' && s.slot === 'auto';
      const head = el('div', { class: 'vp-slot-k' }, [
        el('b', {}, [name, sum.cleared ? this.ui.iconEl('star', 16) : null]),
        el('small', { text: s.empty || s.damaged ? '' : savedText(sum.savedAt || s.savedAt) }),
        ro ? el('span', { class: 'vp-slot-ro', text: 'Read-only' }) : null,
      ]);
      let main, party = null;
      if (s.damaged) main = el('div', { class: 'vp-slot-main' }, [el('div', { class: 'vp-slot-ch', text: 'Damaged data' }), el('div', { class: 'vp-slot-loc', text: 'This record cannot be read.' })]);
      else if (s.empty) main = el('div', { class: 'vp-slot-main' }, [el('div', { class: 'vp-slot-ch', text: '— Empty —' })]);
      else {
        main = el('div', { class: 'vp-slot-main' }, [
          el('div', { class: 'vp-slot-ch', text: sum.chapterLabel || '' }),
          el('div', { class: 'vp-slot-loc' }, [el('span', { text: sum.location || '' }), el('span', { class: 'vp-num', text: formatTime(sum.playTime || 0) })]),
        ]);
        party = el('div', { class: 'vp-slot-party' }, (sum.party || []).map((m) => el('div', { class: `vp-slot-mem${m.id === sum.leader ? ' is-lead' : ''}` }, [
          this.ui.portraitEl(m.id, { size: 44 }), el('span', { text: String(m.level ?? '') }),
        ])));
      }
      const row = el('div', { class: `vp-row vp-slot${s.empty ? ' is-empty' : ''}${s.damaged ? ' is-damaged' : ''}${this._usable(s) ? '' : ' is-dim'}`, role: 'option' }, [head, main, party]);
      bindPointer(row, {
        onHover: () => this._select(i, true),
        onActivate: () => { this._select(i, false); this._pick(); },
      });
      return row;
    });
    this.list.replaceChildren(...this._rows);
    this._select(this._sel, false);
    this._hints();
  }

  _select(i, sound) {
    if (sound && i !== this._sel) this.ui.sfx('cursor');
    this._sel = i;
    this._rows.forEach((r, k) => r.classList.toggle('is-sel', k === i));
    if (this._rows[i]) this._rows[i].scrollIntoView({ block: 'nearest' });
  }

  _hints() {
    const dev = this.ui.input.lastDevice;
    const add = (a, l) => el('span', { class: 'vp-hint' }, [glyph(a, dev), l]);
    this.foot.classList.toggle('is-touch', dev === 'touch');
    this.foot.replaceChildren(add('move', 'Select'), add('confirm', this.mode === 'save' ? 'Save' : 'Load'), add('cancel', 'Back'));
  }

  async _pick() {
    const s = this.slots[this._sel];
    if (!s || !this._usable(s)) {
      this.ui.sfx('error');
      const r = this._rows[this._sel];
      if (r && r.animate) r.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 220 });
      return;
    }
    if (this.mode === 'save' && !s.empty) {
      const k = await this.popup.open({
        title: `Overwrite ${NAMES[s.slot] || s.slot}?`, text: s.damaged ? 'The damaged record will be replaced.' : `${(s.summary && s.summary.chapterLabel) || 'This journey'} will be replaced.`,
        options: ['Overwrite', 'Cancel'], cancelIndex: 1, initial: 1, tone: 'danger',
      });
      if (k !== 0) return;
    } else this.ui.sfx('confirm');
    this._done(s.slot);
  }

  _done(value) {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.popup.isOpen) this.popup.close(-1);
    this.root.classList.remove('is-open', 'is-live');
    this.ui._ctxPop('saves');
    const r = this._resolve;
    this._resolve = null;
    if (r) r(value);
  }
}
