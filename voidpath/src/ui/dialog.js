// Dialog box: bottom panel with a speaker name tab, optional pixel portrait, typewriter text
// (confirm completes the line, then advances), blinking next marker, and choice lists.
// Calls are queued, so `show()` while a dialog is open simply plays after it.
//
//   ui.dialog.show(lines, { auto, onLine, onClose }) -> Promise
//     lines: string | Array<string | Line>; a plain string continues the previous speaker.
//     Line = { speaker, text, portrait?, expr?, offscreen?, tag? }
//       speaker null = narration (italics); portrait: id ('sera', 'sera:sad'), canvas or URL;
//       expr: expression added to the speaker's portrait id; offscreen: a small voice icon instead
//       of a portrait (radio, a voice in a dream). Registered speakers (ui.registerSpeaker) supply
//       portrait, accent, sigil (gold sigil box instead of a portrait: WARDEN), textSpeed and a
//       per-box sfx.
//     auto: true reveals each box at once and advances after 0.1 s (debug fast mode); a number
//       advances that many seconds after a box is fully shown.
//     onLine(line, index): called as each box starts (the runner applies speaker moods there).
//   ui.dialog.choice(prompt, options, { speaker, portrait, expr, cancelIndex, initial }) -> Promise<index>
//   ui.dialog.clear()   close at once and drop queued dialogs
//
// Boxes hold at most 100 visible characters; long boxes step the font down one size on phones so
// they fit in four lines at 390 px.

import { el, injectCSS } from '../core/util.js';
import { parseEmphasis, bindPointer, onTap, isURL } from './theme.js';

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
  box-shadow: 0 3px 8px rgba(0,0,0,.35); --dacc: var(--vp-amber); }
.vp-dlg-name::before { content: ''; width: 6px; height: 6px; background: var(--dacc); transform: rotate(45deg); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dacc) 22%, transparent); }
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

/* off-screen voice: a small speaker glyph in place of the portrait */
.vp-dlg-por.is-voice { width: 64px; height: 64px; --ps: 64px; margin-top: 8px; display: none; place-items: center; }
.vp-dlg.has-por .vp-dlg-por.is-voice { display: grid; }
.vp-dlg-por.is-voice img { position: static; width: 32px; height: 32px; animation: vp-dlg-voice 1.4s ease-in-out infinite; }
@keyframes vp-dlg-voice { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }

/* sigil speakers (WARDEN): gold iris instead of a portrait, warm gold box, slower and softer */
.vp-dlg.is-sigil .vp-dlg-panel { border-color: color-mix(in srgb, var(--sacc) 50%, transparent);
  background: radial-gradient(60% 150% at 8% 50%, color-mix(in srgb, var(--sacc) 20%, transparent), transparent 70%),
              linear-gradient(180deg, color-mix(in srgb, var(--sacc) 10%, transparent), transparent 40%), rgba(10,10,18,.9);
  box-shadow: inset 0 0 0 1px rgba(5,7,13,.55), 0 0 26px color-mix(in srgb, var(--sacc) 14%, transparent), 0 6px 16px rgba(0,0,0,.34); }
.vp-dlg.is-sigil .vp-dlg-panel::before { --c: color-mix(in srgb, var(--sacc) 90%, white); --g: color-mix(in srgb, var(--sacc) 26%, transparent); }
.vp-dlg.is-sigil .vp-dlg-panel::after { background: linear-gradient(90deg, transparent, var(--sacc), transparent); }
.vp-dlg.is-sigil .vp-dlg-text { color: #fff4dc; letter-spacing: .03em; font-weight: 400; text-shadow: 0 0 12px color-mix(in srgb, var(--sacc) 30%, transparent), 0 1px 0 rgba(0,0,0,.6); }
.vp-dlg.is-sigil .vp-dlg-name { color: #fff0cc; border-color: color-mix(in srgb, var(--sacc) 70%, transparent);
  background: linear-gradient(180deg, #2a2312, #12100a); text-shadow: 0 0 10px color-mix(in srgb, var(--sacc) 60%, transparent); letter-spacing: .42em; }
.vp-dlg.is-sigil .vp-dlg-next { border-top-color: var(--sacc); }
.vp-dlg.is-sigil .vp-dlg-next.is-end { background: var(--sacc); }
.vp-dlg-por.is-sigil { border: 0; box-shadow: none; overflow: visible;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--sacc) 34%, transparent), transparent); }
.vp-dlg-por.is-sigil::after { display: none; }
.vp-dlg-por.is-sigil img { animation: vp-dlg-sigil 6s ease-in-out infinite; }
@keyframes vp-dlg-sigil { 0%, 100% { opacity: .92; transform: scale(1); } 50% { opacity: 1; transform: scale(1.035); } }

@media (max-width: 640px) {
  .vp-dlg-box { width: calc(100% - 16px); bottom: calc(10px + var(--vp-safe-bottom)); }
  .vp-dlg-panel { min-height: 124px; gap: 14px; padding: 22px 22px 20px 14px; }
  .vp-dlg-por { width: 80px; height: 80px; --ps: 80px; }
  .vp-dlg-por.is-voice { width: 44px; height: 44px; --ps: 44px; margin-top: 4px; }
  .vp-dlg-text { font-size: 16px; line-height: 1.55; padding-top: 2px; }
  .vp-dlg.is-long .vp-dlg-text { font-size: 15px; line-height: 1.5; }
  .vp-dlg.is-long .vp-dlg-por:not(.is-voice) { width: 64px; height: 64px; --ps: 64px; }
  .vp-dlg-name { left: 12px; font-size: 13px; padding: 6px 14px 6px 10px; }
  .vp-dlg-choices { right: 0; min-width: 0; width: 78%; }
  .vp-dlg-choices .vp-row { font-size: 16px; }
}
`;

const SPEED = { slow: 28, normal: 45, fast: 80 };
const LONG = 80;               // visible characters from which phones step the font down

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
    this._autoT = -1;          // seconds until an auto-advance (-1 = off)

    this.namePlate = el('div', { class: 'vp-dlg-name' });
    this.portrait = el('div', { class: 'vp-portrait vp-dlg-por' });
    this.text = el('div', { class: 'vp-dlg-text', 'aria-live': 'polite' });
    this.next = el('div', { class: 'vp-dlg-next' });
    this.choices = el('div', { class: 'vp-panel vp-solid vp-dlg-choices', role: 'listbox' });
    this.panel = el('div', { class: 'vp-panel vp-rich vp-dlg-panel' }, [this.namePlate, this.portrait, this.text, this.next]);
    this.box = el('div', { class: 'vp-dlg-box' }, [this.choices, this.panel]);
    this.root = el('div', { class: 'vp-layer vp-dlg', role: 'dialog' }, [this.box]);
    // tap anywhere advances (choices need an explicit tap on a row); pointer-up based, so it works
    // while another finger rests on the screen
    onTap(this.root, () => { if (this._active && !this._choosing) this._confirm(); });
    ui.root.appendChild(this.root);
  }

  get isOpen() { return this._active || this._hold > 0; }

  show(lines, opts = {}) {
    const list = [];
    let cur = { speaker: opts.speaker ?? null, portrait: opts.portrait ?? null, expr: null, offscreen: false };
    for (const l of [].concat(lines ?? [])) {
      if (l && typeof l === 'object') {
        if ('speaker' in l) cur = { speaker: l.speaker ?? null, portrait: null, expr: null, offscreen: false };
        if (l.portrait != null) cur.portrait = l.portrait;
        if (l.expr != null) cur.expr = l.expr;
        if (l.offscreen != null) cur.offscreen = !!l.offscreen;
        list.push({ ...cur, text: l.text ?? '', tag: l.tag ?? null });
      } else list.push({ ...cur, text: String(l ?? '') });
    }
    if (!list.length) list.push({ ...cur, text: '' });
    return new Promise((resolve) => this._enqueue({ kind: 'lines', lines: list, opts, resolve }));
  }

  /** Resolves with the chosen index (or cancelIndex when cancel is pressed and cancelIndex is set). */
  choice(prompt, options, opts = {}) {
    if (!options || !options.length) return this.show(prompt ?? '', opts).then(() => -1);
    return new Promise((resolve) => this._enqueue({ kind: 'choice', prompt: prompt ?? '', options, opts, resolve }));
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
    if (this._autoT >= 0 && !this._typing) {
      this._autoT -= dt;
      if (this._autoT < 0) { this._confirm(); return; }
    }
    if (!focused) return;
    const inp = this.ui.input;
    if (this._choosing) {
      const n = this._choiceRows.length;
      if (inp.repeat('up')) { inp.consume('up'); this._select((this._sel + n - 1) % n, true); } else if (inp.repeat('down')) { inp.consume('down'); this._select((this._sel + 1) % n, true); }
      if (inp.pressed('confirm')) { inp.consume('confirm'); this._pick(this._sel); } else if (inp.pressed('cancel')) {
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
    else {
      const o = job.opts;
      this._setLine({ speaker: o.speaker ?? null, portrait: o.portrait ?? null, expr: o.expr ?? null, offscreen: !!o.offscreen, text: job.prompt });
    }
  }

  _confirm() {
    this._autoT = -1;
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
    this._autoT = -1;
    this._setChoices(null);
    this.root.classList.remove('is-open', 'is-live', 'is-waiting');
    this.ui._ctxPop('dialog');
  }

  // ------------------------------------------------------------------ rendering

  /** Portrait for a line: { kind: 'portrait' | 'sigil' | 'voice', ... } or null. */
  _figure(line, reg) {
    const name = line.speaker ? String(line.speaker) : '';
    const accent = reg && reg.accent;
    if (line.offscreen) return { kind: 'voice', accent };
    if (reg && reg.sigil && !line.portrait) return { kind: 'sigil', url: this.ui.sigilURL(reg.sigil), accent };
    let portrait = line.portrait ?? (reg && reg.portrait) ?? null;
    if (line.expr) {
      const base = typeof portrait === 'string' && !isURL(portrait) ? portrait : !portrait ? this.ui._memberIdByName(name) : null;
      if (base) portrait = `${base.split(':')[0]}:${line.expr}`;
    }
    const spec = this.ui._portraitFor(portrait, name, accent);
    return spec && { kind: 'portrait', ...spec };
  }

  _setLine(line) {
    const name = line.speaker ? String(line.speaker) : '';
    const reg = this.ui.speaker(name);
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
    const fig = this._figure(line, reg);
    r.classList.toggle('has-por', !!fig);
    r.classList.toggle('is-sigil', !!fig && fig.kind === 'sigil');
    r.style.setProperty('--sacc', (fig && fig.kind === 'sigil' && fig.accent) || '#ffc560');
    this.namePlate.style.setProperty('--dacc', (reg && reg.accent) || (fig && fig.accent) || 'var(--vp-amber)');
    const por = this.portrait;
    por.classList.toggle('is-voice', !!fig && fig.kind === 'voice');
    por.classList.toggle('is-sigil', !!fig && fig.kind === 'sigil');
    if (fig && fig.kind === 'voice') {
      por.style.setProperty('--acc', fig.accent || 'var(--vp-cyan)');
      por.replaceChildren(this.ui.iconEl('voice', 32));
    } else if (fig && fig.kind === 'sigil') {
      por.style.removeProperty('--acc');
      por.replaceChildren(el('img', { src: fig.url, alt: '', draggable: 'false' }));
    } else if (fig) this.ui._fillPortrait(por, fig);
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
    r.classList.toggle('is-long', this._len > LONG);
    this._plain = this._runs.map((x) => x.t).join('');
    this._speed = (reg && reg.textSpeed) || 1;
    this._boxSfx = reg && reg.sfx;
    if (this._boxSfx) this.ui.sfx(this._boxSfx);
    this._n = 0;
    this._acc = 0;
    this._wait = 0.06;          // tiny beat before the first character
    this._ticks = 0;
    this._typing = true;
    this._autoT = -1;
    const job = this._job;
    if (job.kind === 'lines' && job.opts.onLine) job.opts.onLine(line, this._idx);
    if (!this._len || (job.kind === 'lines' && job.opts.auto === true)) this._reveal(this._len);
  }

  _type(dt) {
    const cps = (SPEED[this.ui.settings.textSpeed] || SPEED.normal) * this._speed;
    this._acc += dt;
    let n = this._n, tick = false;
    while (this._acc >= this._wait && n < this._len) {
      this._acc -= this._wait;
      const ch = this._plain[n++];
      this._wait = 1 / cps;
      if (ch === '.' || ch === '!' || ch === '?') this._wait += 0.14 / this._speed;      // breathe at sentence ends
      else if (ch === ',' || ch === ';' || ch === ':' || ch === '—') this._wait += 0.06 / this._speed;
      if (ch !== ' ' && ++this._ticks % 2 === 0) tick = true;
    }
    if (tick && !this._boxSfx) this.ui.sfx('text', { volume: 0.35 });
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
        const auto = job.opts.auto;
        if (auto) this._autoT = auto === true ? 0.1 : Math.max(0, +auto);
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
