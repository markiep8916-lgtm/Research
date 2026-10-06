// Dialog box: bottom panel with a speaker name tab, optional pixel portrait, typewriter text
// (confirm completes the line, then advances), blinking next marker, and choice lists.
// Calls are queued, so `show()` while a dialog is open simply plays after it.

import { el, injectCSS } from '../core/util.js';
import { parseEmphasis, bindPointer } from './theme.js';

const CSS = `
.vp-dlg { z-index: 30; }
.vp-dlg-box { position: absolute; left: 50%; bottom: calc(22px + var(--vp-safe-bottom)); width: min(880px, calc(100% - 32px));
  transform: translate(-50%, 22px); opacity: 0; transition: opacity .2s var(--vp-ease-out), transform .3s var(--vp-ease-out); }
.vp-dlg.is-open .vp-dlg-box { opacity: 1; transform: translate(-50%, 0); }
.vp-dlg-panel { display: flex; gap: 22px; align-items: flex-start; min-height: 158px; padding: 24px 34px 24px 22px; box-sizing: border-box; }
.vp-dlg-por { width: 120px; height: 120px; --ps: 120px; display: none; margin-top: 2px; }
.vp-dlg.has-por .vp-dlg-por { display: block; }
.vp-dlg-text { flex: 1; min-width: 0; padding-top: 6px; font: 500 20px/1.62 var(--vp-font-ui); letter-spacing: .012em; color: var(--vp-ink);
  text-shadow: 0 1px 0 rgba(0,0,0,.65); overflow-wrap: anywhere; }
.vp-dlg-text .vp-em { color: var(--vp-amber); }
.vp-dlg.is-narration .vp-dlg-text { color: #cfe0f5; font-style: italic; }
.vp-hid { visibility: hidden; }
.vp-dlg-name { position: absolute; left: 20px; top: 0; transform: translateY(-62%); display: none; align-items: center; gap: 10px;
  padding: 7px 20px 7px 14px; background: linear-gradient(180deg, #121c33, var(--vp-panel-solid)); border: 1px solid rgba(255,197,96,.55);
  font: 700 15px/1 var(--vp-font-display); letter-spacing: .3em; color: var(--vp-amber); text-shadow: 0 0 8px rgba(255,197,96,.45);
  box-shadow: 0 3px 8px rgba(0,0,0,.35); }
.vp-dlg-name::before { content: ''; width: 6px; height: 6px; background: var(--vp-amber); transform: rotate(45deg); box-shadow: 0 0 0 2px rgba(255,197,96,.2); }
.vp-dlg.has-name .vp-dlg-name { display: inline-flex; }
.vp-dlg-name.is-new { animation: vp-dlg-name .32s var(--vp-ease-out); }
@keyframes vp-dlg-name { from { opacity: 0; transform: translate(-10px, -62%); } }
.vp-dlg-next { position: absolute; right: 18px; bottom: 14px; width: 0; height: 0; opacity: 0;
  border-top: 9px solid var(--vp-amber); border-left: 7px solid transparent; border-right: 7px solid transparent; }
.vp-dlg-next.is-end { border: 0; width: 9px; height: 9px; background: var(--vp-amber); transform: rotate(45deg); }
.vp-dlg.is-waiting .vp-dlg-next { opacity: 1; animation: vp-dlg-bob .9s ease-in-out infinite; }
.vp-dlg.is-waiting .vp-dlg-next.is-end { animation: vp-dlg-blink 1.1s ease-in-out infinite; }
@keyframes vp-dlg-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 4px; } }
@keyframes vp-dlg-blink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
.vp-dlg-choices { position: absolute; right: 8px; bottom: calc(100% + 22px); min-width: 250px; max-width: min(420px, 92%); padding: 8px 0;
  box-sizing: border-box; opacity: 0; transform: translateY(10px); pointer-events: none; transition: opacity .18s var(--vp-ease-out), transform .26s var(--vp-ease-out); }
.vp-dlg.has-choices .vp-dlg-choices { opacity: 1; transform: none; pointer-events: auto; }
.vp-dlg-choices .vp-row { font: 600 17px var(--vp-font-ui); letter-spacing: .04em; min-height: 46px; }
@media (max-width: 640px) {
  .vp-dlg-box { width: calc(100% - 16px); bottom: calc(10px + var(--vp-safe-bottom)); }
  .vp-dlg-panel { min-height: 124px; gap: 14px; padding: 22px 26px 22px 14px; }
  .vp-dlg-por { width: 80px; height: 80px; --ps: 80px; }
  .vp-dlg-text { font-size: 16px; line-height: 1.55; padding-top: 2px; }
  .vp-dlg-name { left: 12px; font-size: 13px; padding: 6px 14px 6px 10px; }
  .vp-dlg-choices { right: 0; min-width: 0; width: 78%; }
  .vp-dlg-choices .vp-row { font-size: 16px; }
}
`;

const SPEED = { slow: 28, normal: 45, fast: 80 };

export class Dialog {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-dialog', CSS);
    this._active = false;
    this._hold = 0;            // keeps isOpen true through the frame a dialog closes in
    this._queue = [];
    this._job = null;
    this._runs = [];           // [{ shown: Text, hidden: Text, t }]
    this._len = 0;
    this._n = 0;
    this._acc = 0;
    this._wait = 0;
    this._ticks = 0;
    this._typing = false;
    this._choiceRows = [];
    this._sel = 0;

    this.namePlate = el('div', { class: 'vp-dlg-name' });
    this.portrait = el('div', { class: 'vp-portrait vp-dlg-por' });
    this.text = el('div', { class: 'vp-dlg-text', 'aria-live': 'polite' });
    this.next = el('div', { class: 'vp-dlg-next' });
    this.choices = el('div', { class: 'vp-panel vp-solid vp-dlg-choices', role: 'listbox' });
    this.panel = el('div', { class: 'vp-panel vp-rich vp-dlg-panel' }, [this.namePlate, this.portrait, this.text, this.next]);
    this.box = el('div', { class: 'vp-dlg-box' }, [this.choices, this.panel]);
    this.root = el('div', { class: 'vp-layer vp-dlg', role: 'dialog' }, [this.box]);
    // tap anywhere advances (choices need an explicit tap on a row)
    this.root.addEventListener('click', () => { if (this._active && !this._choosing) this._confirm(); });
    ui.root.appendChild(this.root);
  }

  get isOpen() { return this._active || this._hold > 0; }

  /** lines: string | Array<string | { speaker, text, portrait }>. Plain strings continue the previous speaker. */
  show(lines, opts = {}) {
    const list = [];
    let speaker = opts.speaker ?? null, portrait = opts.portrait ?? null;
    for (const l of [].concat(lines ?? [])) {
      if (l && typeof l === 'object') {
        if ('speaker' in l) { speaker = l.speaker ?? null; portrait = l.portrait ?? null; }
        if (l.portrait != null) portrait = l.portrait;
        list.push({ speaker, portrait, text: l.text ?? '' });
      } else list.push({ speaker, portrait, text: String(l ?? '') });
    }
    if (!list.length) list.push({ speaker, portrait, text: '' });
    return new Promise((resolve) => this._enqueue({ kind: 'lines', lines: list, opts, resolve }));
  }

  /** Resolves with the chosen index (or cancelIndex when cancel is pressed and cancelIndex is set). */
  choice(prompt, options, opts = {}) {
    if (!options || !options.length) return this.show(prompt ?? '', opts).then(() => -1);
    return new Promise((resolve) => this._enqueue({ kind: 'choice', prompt: prompt ?? '', options: options || [], opts, resolve }));
  }

  /** Close immediately and drop queued dialogs (their promises resolve with undefined / cancelIndex ?? -1). */
  clear() {
    const jobs = this._job ? [this._job, ...this._queue] : this._queue;
    this._queue = [];
    if (this._job) this._end();
    for (const j of jobs) j.resolve(j.kind === 'choice' ? (j.opts.cancelIndex ?? -1) : undefined);
  }

  update(dt, focused) {
    if (this._hold > 0 && !this._active) this._hold--;
    if (!this._active) return;
    if (this._typing) this._type(dt);
    if (!focused) return;
    const inp = this.ui.input;
    if (this._choosing) {
      const n = this._choiceRows.length;
      if (inp.repeat('up')) { inp.consume('up'); this._select((this._sel + n - 1) % n, true); }
      else if (inp.repeat('down')) { inp.consume('down'); this._select((this._sel + 1) % n, true); }
      if (inp.pressed('confirm')) { inp.consume('confirm'); this._pick(this._sel); }
      else if (inp.pressed('cancel')) {
        inp.consume('cancel');
        const ci = this._job.opts.cancelIndex;
        if (ci != null && ci >= 0 && ci < n) { this._select(ci, false); this._pick(ci, true); }
      }
      return;
    }
    if (inp.pressed('confirm') || inp.pressed('cancel')) {
      inp.consume('confirm');
      inp.consume('cancel');
      this._confirm();
    }
  }

  // ------------------------------------------------------------------ flow

  _enqueue(job) {
    if (this._active) this._queue.push(job);
    else this._start(job);
  }

  _start(job) {
    this._active = true;
    this._job = job;
    this._idx = 0;
    this.ui._ctxPush('dialog', 'dialog');
    this.root.classList.add('is-open', 'is-live');
    if (job.kind === 'lines') this._setLine(job.lines[0]);
    else this._setLine({ speaker: job.opts.speaker ?? null, portrait: job.opts.portrait ?? null, text: job.prompt });
  }

  _confirm() {
    if (this._typing) { this._reveal(this._len); return; }
    if (this._job.kind !== 'lines') return;
    this.ui.sfx('cursor', { volume: 0.5 });
    this._idx++;
    if (this._idx < this._job.lines.length) this._setLine(this._job.lines[this._idx]);
    else this._finish(undefined);
  }

  _pick(i, cancelled = false) {
    this.ui.sfx(cancelled ? 'cancel' : 'confirm');
    this._finish(i);
  }

  _finish(value) {
    const job = this._job;
    this._end();
    if (this._queue.length) this._start(this._queue.shift());
    if (job.opts.onClose) job.opts.onClose(value);
    job.resolve(value);
  }

  _end() {
    this._active = false;
    this._job = null;
    this._hold = 1;
    this._typing = false;
    this._setChoices(null);
    this.root.classList.remove('is-open', 'is-live', 'is-waiting');
    this.ui._ctxPop('dialog');
  }

  // ------------------------------------------------------------------ rendering

  _setLine(line) {
    const name = line.speaker ? String(line.speaker) : '';
    const r = this.root;
    if (name !== this._lastName) {
      this.namePlate.textContent = name;
      this.namePlate.classList.remove('is-new');
      void this.namePlate.offsetWidth;            // restart the slide-in when the speaker changes
      this.namePlate.classList.add('is-new');
      this._lastName = name;
    }
    r.classList.toggle('has-name', !!name);
    r.classList.toggle('is-narration', !name);
    const por = this.ui._portraitFor(line.portrait, name);
    r.classList.toggle('has-por', !!por);
    if (por) this.ui._fillPortrait(this.portrait, por);
    r.classList.remove('is-waiting');
    this._setChoices(null);

    // build hidden runs, then reveal character by character (layout never shifts while typing)
    this.text.textContent = '';
    this._runs.length = 0;
    this._len = 0;
    for (const run of parseEmphasis(line.text)) {
      const shown = document.createTextNode('');
      const hidden = document.createTextNode(run.t);
      const hid = el('span', { class: 'vp-hid' }, [hidden]);
      this.text.appendChild(el('span', { class: run.em ? 'vp-em' : null }, [shown, hid]));
      this._runs.push({ shown, hidden, t: run.t, start: this._len });
      this._len += run.t.length;
    }
    this._plain = this._runs.map((x) => x.t).join('');
    this._n = 0;
    this._acc = 0;
    this._wait = 0.06;          // tiny beat before the first character
    this._ticks = 0;
    this._typing = true;
    if (!this._len) this._reveal(0);
  }

  _type(dt) {
    const cps = SPEED[this.ui.settings.textSpeed] || SPEED.normal;
    this._acc += dt;
    let n = this._n, tick = false;
    while (this._acc >= this._wait && n < this._len) {
      this._acc -= this._wait;
      const ch = this._plain[n++];
      this._wait = 1 / cps;
      if (ch === '.' || ch === '!' || ch === '?') this._wait += 0.14;      // breathe at sentence ends
      else if (ch === ',' || ch === ';' || ch === ':' || ch === '—') this._wait += 0.06;
      if (ch !== ' ' && ++this._ticks % 2 === 0) tick = true;
    }
    if (tick) this.ui.sfx('text', { volume: 0.35 });
    if (n !== this._n) this._reveal(n);
  }

  _reveal(n) {
    this._n = n;
    for (const r of this._runs) {
      const k = Math.max(0, Math.min(r.t.length, n - r.start));
      if (r.shown.length !== k) { r.shown.data = r.t.slice(0, k); r.hidden.data = r.t.slice(k); }
    }
    if (n >= this._len) {
      this._typing = false;
      const job = this._job;
      if (job.kind === 'choice') this._setChoices(job.options);
      else {
        this.next.classList.toggle('is-end', this._idx >= job.lines.length - 1);
        this.root.classList.add('is-waiting');
      }
    }
  }

  _setChoices(options) {
    this._choosing = !!options;
    this.root.classList.toggle('has-choices', !!options);
    if (!options) return;
    this.choices.textContent = '';
    this._choiceRows = options.map((label, i) => {
      const row = el('div', { class: 'vp-row', role: 'option', text: String(label) });
      bindPointer(row, {
        onHover: () => this._select(i, true),
        onActivate: () => { if (this._choosing) { this._select(i, false); this._pick(i); } },
      });
      this.choices.appendChild(row);
      return row;
    });
    this._sel = Math.max(0, Math.min(options.length - 1, this._job.opts.initial ?? 0));
    this._select(this._sel, false);
  }

  _select(i, sound) {
    if (sound && i !== this._sel) this.ui.sfx('cursor');
    this._sel = i;
    this._choiceRows.forEach((r, k) => r.classList.toggle('is-sel', k === i));
  }
}
