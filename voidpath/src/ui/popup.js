// Small modal choice box drawn inside a host window (pause menu, shop, saves): a title, optional
// body text and portrait, and a vertical list of options. Keyboard, gamepad and taps; the host
// forwards input while it is open.
//
//   const pop = new Popup(ui, hostEl);
//   const i = await pop.open({ title: 'Return to title?', text: '...', options: ['Return', 'Stay'], cancelIndex: 1 });
//   host.update: if (pop.isOpen) { pop.input(inp); return; }

import { el, injectCSS } from '../core/util.js';
import { bindPointer, onTap, navStep, glyph } from './theme.js';

const CSS = `
.vp-pop { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; background: rgba(5,7,13,.62);
  opacity: 0; visibility: hidden; transition: opacity .16s var(--vp-ease-out), visibility 0s linear .16s; }
.vp-pop.is-open { opacity: 1; visibility: visible; transition: opacity .16s var(--vp-ease-out); }
.vp-pop-box { width: min(460px, calc(100% - 24px)); box-sizing: border-box; padding: 18px 0 12px; transform: translateY(8px); transition: transform .24s var(--vp-ease-out); }
.vp-pop.is-open .vp-pop-box { transform: none; }
.vp-pop-box::before { --c: rgba(255,214,140,.95); --g: rgba(255,197,96,.25); }
.vp-pop-box.is-danger::before { --c: rgba(255,150,160,.95); --g: rgba(255,90,106,.25); }
.vp-pop-hd { display: flex; align-items: center; gap: 14px; padding: 0 22px 12px; }
.vp-pop-hd .vp-portrait { width: 56px; height: 56px; --ps: 56px; }
.vp-pop-title { font: 700 18px/1.25 var(--vp-font-display); letter-spacing: .12em; color: #fff; }
.vp-pop-text { margin-top: 6px; font: 400 15px/1.5 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-pop-rows { border-top: 1px solid var(--vp-line-dim); padding-top: 6px; }
.vp-pop-rows .vp-row { min-height: 46px; font: 600 15px var(--vp-font-ui); letter-spacing: .14em; text-transform: uppercase; }
.vp-pop-foot { display: flex; justify-content: flex-end; gap: 16px; padding: 8px 22px 0; }
.vp-pop-foot .vp-hint { font-size: 12px; }
`;

export class Popup {
  constructor(ui, host) {
    this.ui = ui;
    injectCSS('vp-popup', CSS);
    this._job = null;
    this._sel = 0;
    this._rows = [];
    this.box = el('div', { class: 'vp-panel vp-solid vp-rich vp-pop-box', role: 'alertdialog' });
    this.root = el('div', { class: 'vp-pop' }, [this.box]);
    onTap(this.root, () => { if (this._job) this._cancel(); });
    onTap(this.box, () => {});
    host.appendChild(this.root);
  }

  get isOpen() { return !!this._job; }

  /** options: labels or { label, disabled }. Resolves with the picked index, or cancelIndex (-1 when none) on Cancel. */
  open({ title = '', text = '', options = ['OK'], cancelIndex = options.length - 1, initial = 0, portrait = null, accent, tone = 'amber' } = {}) {
    if (this._job) this.close(this._job.cancelIndex);
    const opts = options.map((o) => (typeof o === 'string' ? { label: o } : o));
    return new Promise((resolve) => {
      this._job = { resolve, cancelIndex, opts };
      const hd = el('div', { class: 'vp-pop-hd' }, [
        portrait ? this.ui.portraitEl(portrait, { size: 56, accent }) : null,
        el('div', {}, [el('div', { class: 'vp-pop-title', text: title }), text ? el('div', { class: 'vp-pop-text', text }) : null]),
      ]);
      this._rows = opts.map((o, i) => {
        const row = el('div', { class: `vp-row${o.disabled ? ' is-dim' : ''}`, role: 'button', text: o.label });
        bindPointer(row, { onHover: () => this._select(i, true), onActivate: () => { this._select(i, false); this._pick(i); } });
        return row;
      });
      const dev = this.ui.input.lastDevice;
      const foot = el('div', { class: 'vp-pop-foot' }, [
        el('span', { class: 'vp-hint' }, [glyph('confirm', dev), 'Select']),
        el('span', { class: 'vp-hint' }, [glyph('cancel', dev), 'Back']),
      ]);
      this.box.className = `vp-panel vp-solid vp-rich vp-pop-box${tone === 'danger' ? ' is-danger' : ''}`;
      this.box.replaceChildren(...[hd, el('div', { class: 'vp-pop-rows' }, this._rows), dev === 'touch' ? null : foot].filter(Boolean));
      const first = opts.findIndex((o) => !o.disabled);
      this._select(opts[initial] && !opts[initial].disabled ? initial : Math.max(0, first), false);
      this.root.classList.add('is-open');
    });
  }

  /** Forward the host's input while open. */
  input(inp) {
    if (!this._job) return false;
    const n = this._rows.length;
    const i = navStep(inp, this._sel, n);
    if (i >= 0) this._select(i, true);
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._pick(this._sel); } else if (inp.pressed('cancel')) { inp.consume('cancel'); this._cancel(); }
    return true;
  }

  close(value) {
    const job = this._job;
    if (!job) return;
    this._job = null;
    this.root.classList.remove('is-open');
    job.resolve(value);
  }

  _cancel() {
    this.ui.sfx('cancel');
    this.close(this._job.cancelIndex ?? -1);
  }

  _pick(i) {
    const o = this._job.opts[i];
    if (!o || o.disabled) { this.ui.sfx('error'); return; }
    this.ui.sfx('confirm');
    this.close(i);
  }

  _select(i, sound) {
    if (sound && i !== this._sel) this.ui.sfx('cursor');
    this._sel = i;
    this._rows.forEach((r, k) => r.classList.toggle('is-sel', k === i));
  }
}
