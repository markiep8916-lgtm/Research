// Title overlay drawn over the live 3D backdrop (transparent middle, soft top/bottom shading):
// chrome VOIDPATH logotype with chromatic ghosts and a sweeping sheen, amber rule, tagline,
// blinking Press Start, then a small menu (Continue / New Journey / Load / Controls / Sound).
//
//   ui.title.show({ onStart, onContinue, onLoad, hasSave })
//     Continue appears (and is preselected) when hasSave; Load is dimmed without a save. onStart and
//     onContinue hide the title unless they return false; onLoad leaves it up under the save
//     picker. Input is ignored while the engine runs a transition (no soft-lock when Confirm is
//     mashed through the fade back to the title), and hiding leaves the input context at 'title'
//     until the next state sets its own (no pause menu or battle buttons during the iris).

import { el, injectCSS } from '../core/util.js';
import { bindPointer, controlsTable, glyph, onTap } from './theme.js';

const CSS = `
.vp-title { z-index: 50; opacity: 0; visibility: hidden; transition: opacity .7s var(--vp-ease-out), visibility 0s linear .7s; overflow: hidden; }
.vp-title.is-open { opacity: 1; visibility: visible; transition: opacity .5s var(--vp-ease-out); }
.vp-title-shade { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(5,7,13,.78) 0%, rgba(5,7,13,.18) 30%, rgba(5,7,13,0) 48%, rgba(5,7,13,.12) 64%, rgba(5,7,13,.72) 100%); }
.vp-title-top { position: absolute; top: calc(26px + var(--vp-safe-top)); left: 0; right: 0; text-align: center; color: var(--vp-ink-faint); letter-spacing: .5em; padding-left: .5em; }
.vp-title-center { position: absolute; left: 0; right: 0; top: 19%; display: flex; flex-direction: column; align-items: center; }
.vp-logo { position: relative; margin: 0; font: 800 clamp(40px, 10.6vw, 136px)/1 var(--vp-font-display); letter-spacing: .3em; padding-left: .3em; white-space: nowrap; }
.vp-logo span { display: block; }
.vp-logo-main { position: relative; color: transparent; -webkit-background-clip: text; background-clip: text;
  background-image:
    repeating-linear-gradient(0deg, rgba(5,7,13,.2) 0 1px, rgba(5,7,13,0) 1px 4px),
    linear-gradient(100deg, rgba(255,255,255,0) 42%, rgba(255,255,255,.95) 50%, rgba(255,255,255,0) 58%),
    linear-gradient(180deg, #ffffff 0%, #e8f6ff 40%, #a8dcff 49%, #4f7fb8 51%, #9fcbf2 70%, #f2faff 100%);
  background-size: 100% 100%, 300% 100%, 100% 100%; background-repeat: no-repeat;
  background-position: 0 0, 150% 0, 0 0; animation: vp-logo-sheen 7s ease-in-out 1.6s infinite; }
.vp-logo-ghost { position: absolute; inset: 0; padding-left: inherit; pointer-events: none; will-change: transform; }
.vp-logo-ghost.c { color: rgba(127,227,255,.5); transform: translateX(-3px); text-shadow: 0 0 26px rgba(127,227,255,.8); animation: vp-glitch-c 5.2s steps(1) infinite; }
.vp-logo-ghost.m { color: rgba(255,79,163,.42); transform: translateX(3px); mix-blend-mode: screen; animation: vp-glitch-m 5.2s steps(1) infinite; }
@keyframes vp-logo-sheen { 0% { background-position: 0 0, 150% 0, 0 0; } 22%, 100% { background-position: 0 0, -50% 0, 0 0; } }
@keyframes vp-glitch-c { 0%, 91%, 100% { transform: translateX(-3px); clip-path: none; } 92% { transform: translateX(-9px); clip-path: inset(18% 0 52% 0); } 94% { transform: translateX(5px); clip-path: inset(60% 0 12% 0); } 96% { transform: translateX(-3px); clip-path: none; } }
@keyframes vp-glitch-m { 0%, 91%, 100% { transform: translateX(3px); clip-path: none; } 92% { transform: translateX(10px); clip-path: inset(40% 0 30% 0); } 95% { transform: translateX(-4px); clip-path: inset(8% 0 70% 0); } 97% { transform: translateX(3px); clip-path: none; } }
.vp-rule { display: flex; align-items: center; gap: 14px; width: min(640px, 82vw); margin-top: clamp(16px, 2.4vw, 28px); }
.vp-rule i { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(255,197,96,0), rgba(255,197,96,.95)); box-shadow: 0 0 8px rgba(255,197,96,.5); }
.vp-rule i:last-child { background: linear-gradient(270deg, rgba(255,197,96,0), rgba(255,197,96,.95)); }
.vp-rule b { width: 9px; height: 9px; transform: rotate(45deg); border: 1.5px solid var(--vp-amber); box-shadow: 0 0 10px rgba(255,197,96,.8); }
.vp-rule b::after { content: ''; display: block; width: 3px; height: 3px; margin: 3px; background: var(--vp-amber); }
.vp-tagline { margin-top: clamp(14px, 2vw, 22px); padding-left: .5em; font: 600 clamp(13px, 1.3vw, 16px)/1 var(--vp-font-ui); letter-spacing: .5em; text-transform: uppercase; color: #c6d6ea; text-shadow: 0 0 12px rgba(127,227,255,.3), 0 1px 0 rgba(0,0,0,.6); }
.vp-title-lower { position: absolute; left: 0; right: 0; bottom: calc(16% + var(--vp-safe-bottom)); display: flex; flex-direction: column; align-items: center; }
.vp-press { display: flex; align-items: center; gap: 18px; cursor: pointer; padding: 12px 20px; font: 600 clamp(14px, 1.3vw, 17px)/1 var(--vp-font-display); letter-spacing: .5em; text-transform: uppercase;
  color: var(--vp-amber); text-shadow: 0 0 14px rgba(255,197,96,.6); animation: vp-blink 1.9s ease-in-out infinite; }
.vp-press::before, .vp-press::after { content: ''; width: 34px; height: 1px; background: linear-gradient(90deg, rgba(255,197,96,0), rgba(255,197,96,.8)); }
.vp-press::after { transform: scaleX(-1); }
.vp-press span { padding-left: .5em; }
@keyframes vp-blink { 0%, 100% { opacity: 1; } 50% { opacity: .28; } }
.vp-title-menu { display: none; min-width: 300px; padding: 10px 0; }
.vp-title-menu .vp-row { justify-content: center; padding: 0 40px; min-height: 42px; font: 600 16px var(--vp-font-ui); letter-spacing: .3em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-title-menu .vp-row.is-sel { color: var(--vp-amber); background: linear-gradient(90deg, rgba(255,197,96,0), rgba(255,197,96,.16), rgba(255,197,96,0)); box-shadow: none; }
.vp-title-menu .vp-row::before { left: 22px; }
.vp-title-menu .vp-row.is-dim { color: var(--vp-ink-faint); }
.vp-title-menu .vp-row.is-dim.is-sel { color: #c99a4f; }
.vp-title.is-menu .vp-press { display: none; }
.vp-title.is-menu .vp-title-lower { bottom: calc(9% + var(--vp-safe-bottom)); }
.vp-title.is-menu .vp-title-menu { display: block; animation: vp-tmenu .35s var(--vp-ease-out); }
@keyframes vp-tmenu { from { opacity: 0; transform: translateY(8px); } }
.vp-title-foot { position: absolute; left: 16px; right: 16px; bottom: calc(18px + var(--vp-safe-bottom)); text-align: center; color: var(--vp-ink-faint); letter-spacing: .3em; }
.vp-title-ctl { position: absolute; left: 50%; top: 50%; width: min(760px, calc(100% - 24px)); max-height: calc(100% - 40px); box-sizing: border-box; padding: 20px 22px 16px;
  transform: translate(-50%, -48%); opacity: 0; visibility: hidden; transition: opacity .2s, transform .28s var(--vp-ease-out), visibility 0s linear .2s; display: flex; flex-direction: column; }
.vp-title.is-ctl .vp-title-ctl { opacity: 1; visibility: visible; transform: translate(-50%, -50%); transition: opacity .2s, transform .28s var(--vp-ease-out); }
.vp-title.is-ctl .vp-title-center, .vp-title.is-ctl .vp-title-lower { opacity: .15; }
.vp-title-center, .vp-title-lower { transition: opacity .25s; }
.vp-title-ctl h2 { margin: 0 0 12px; font: 700 20px var(--vp-font-display); letter-spacing: .3em; text-transform: uppercase; }
.vp-title-ctl .vp-scroll { min-height: 0; }
.vp-title-ctl-foot { display: flex; justify-content: flex-end; gap: 10px; align-items: center; margin-top: 12px; color: var(--vp-ink-dim); font: 600 13px var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; cursor: pointer; }

/* intro: elements arrive in sequence */
.vp-title.is-intro .vp-title-top { animation: vp-tin .9s var(--vp-ease-out) .1s both; }
.vp-title.is-intro .vp-logo { animation: vp-tlogo 1.4s var(--vp-ease-out) .2s both; }
.vp-title.is-intro .vp-rule { animation: vp-trule 1.1s var(--vp-ease-out) .75s both; }
.vp-title.is-intro .vp-tagline { animation: vp-tin .9s var(--vp-ease-out) 1.05s both; }
.vp-title.is-intro .vp-title-lower { animation: vp-tin .8s var(--vp-ease-out) 1.4s both; }
.vp-title.is-intro .vp-title-foot { animation: vp-tin .8s var(--vp-ease-out) 1.6s both; }
@keyframes vp-tin { from { opacity: 0; transform: translateY(8px); } }
@keyframes vp-tlogo { from { opacity: 0; transform: scale(1.06); } }
@keyframes vp-trule { from { opacity: 0; transform: scaleX(.2); } }

@media (max-width: 640px) {
  .vp-title-center { top: 24%; }
  .vp-logo { letter-spacing: .2em; padding-left: .2em; font-size: clamp(34px, 11.8vw, 60px); }
  .vp-title-top-x { display: none; }
  .vp-tagline { letter-spacing: .32em; padding-left: .32em; font-size: 13px; }
  .vp-title-top { letter-spacing: .26em; padding: 0 12px; }
  .vp-title-lower { bottom: calc(14% + var(--vp-safe-bottom)); }
  .vp-title-menu { min-width: 0; width: calc(100% - 48px); }
  .vp-title-foot { letter-spacing: .16em; line-height: 1.7; }
}
`;

export class Title {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-title', CSS);
    this.isOpen = false;
    this.phase = 'press';          // 'press' | 'menu' | 'controls'
    this._sel = 0;

    this.press = el('div', { class: 'vp-press' }, [el('span', { text: 'Press Start' })]);
    this.items = [];
    this.rows = [];
    this.menuBox = el('div', { class: 'vp-title-menu', role: 'menu' });
    this.ctlBody = el('div', { class: 'vp-scroll' });
    this.ctlFoot = el('div', { class: 'vp-title-ctl-foot' });
    onTap(this.ctlFoot, () => this._closeControls());
    this.ctl = el('div', { class: 'vp-panel vp-title-ctl' }, [el('h2', { text: 'Controls' }), this.ctlBody, this.ctlFoot]);
    onTap(this.ctl, () => {});

    this.root = el('div', { class: 'vp-layer vp-title' }, [
      el('div', { class: 'vp-title-shade' }),
      el('div', { class: 'vp-cap vp-title-top' }, ['ISV Halcyon · emergency power', el('span', { class: 'vp-title-top-x', text: ' · high orbit' })]),
      el('div', { class: 'vp-title-center' }, [
        el('h1', { class: 'vp-logo', 'aria-label': 'Voidpath' }, [
          el('span', { class: 'vp-logo-ghost c', 'aria-hidden': 'true', text: 'VOIDPATH' }),
          el('span', { class: 'vp-logo-ghost m', 'aria-hidden': 'true', text: 'VOIDPATH' }),
          el('span', { class: 'vp-logo-main', text: 'VOIDPATH' }),
        ]),
        el('div', { class: 'vp-rule' }, [el('i'), el('b'), el('i')]),
        el('div', { class: 'vp-tagline', text: 'A 2D-HD RPG' }),
      ]),
      el('div', { class: 'vp-title-lower' }, [this.press, this.menuBox]),
      el('div', { class: 'vp-cap vp-title-foot', text: 'Procedural pixel art · WebGL diorama · WebAudio score' }),
      this.ctl,
    ]);
    // tap anywhere on "Press Start" advances to the menu
    onTap(this.root, () => {
      if (!this.isOpen || this._busy()) return;
      if (this.phase === 'press') this._toMenu();
      else if (this.phase === 'controls') this._closeControls();
    });
    ui.root.appendChild(this.root);
  }

  show({ onStart, onContinue, onLoad, hasSave = false } = {}) {
    this.cb = { start: onStart, continue: onContinue, load: onLoad };
    this.hasSave = !!hasSave;
    this.items = [
      hasSave ? { id: 'continue', label: 'Continue' } : null,
      { id: 'start', label: 'New Journey' },
      { id: 'load', label: 'Load', dim: !hasSave },
      { id: 'controls', label: 'Controls' },
      { id: 'sound', label: 'Sound: On' },
    ].filter(Boolean);
    this.rows = this.items.map((it, i) => {
      const row = el('div', { class: `vp-row${it.dim ? ' is-dim' : ''}`, role: 'menuitem', text: it.label });
      bindPointer(row, {
        onHover: () => this._select(i, true),
        onActivate: () => { if (this._busy()) return; this._select(i, false); this._activate(); },
      });
      return row;
    });
    this.menuBox.replaceChildren(...this.rows);
    this.phase = 'press';
    this._sel = 0;
    this._syncSound();
    this.root.classList.remove('is-menu', 'is-ctl');
    if (!this.isOpen) {
      this.isOpen = true;
      this.ui._ctxPush('title', 'title');
      this.root.classList.remove('is-intro');
      void this.root.offsetWidth;
      this.root.classList.add('is-open', 'is-live', 'is-intro');
    }
  }

  hide() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove('is-open', 'is-live');
    this.ui._ctxPop('title', 'title');
  }

  /** A transition (the fade back to the title, the New Journey iris) is running: ignore input. */
  _busy() {
    return !!(this.ui.engine && this.ui.engine.transitioning);
  }

  update(dt, focused) {
    if (!this.isOpen || !focused) return;
    const inp = this.ui.input;
    if (this._busy()) { for (const a of ['confirm', 'cancel', 'menu']) inp.consume(a); return; }
    if (this.phase === 'press') {
      if (inp.pressed('confirm') || inp.pressed('menu')) { inp.consume('confirm'); inp.consume('menu'); this._toMenu(); }
      return;
    }
    if (this.phase === 'controls') {
      if (inp.pressed('cancel') || inp.pressed('confirm')) { inp.consume('cancel'); inp.consume('confirm'); this._closeControls(); }
      return;
    }
    const n = this.rows.length;
    if (inp.repeat('up')) { inp.consume('up'); this._select((this._sel + n - 1) % n, true); }
    else if (inp.repeat('down')) { inp.consume('down'); this._select((this._sel + 1) % n, true); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._activate(); }
    else if (inp.pressed('cancel')) { inp.consume('cancel'); this.ui.sfx('cancel'); this.phase = 'press'; this.root.classList.remove('is-menu'); }
  }

  _toMenu() {
    this.ui.sfx('confirm');
    this.phase = 'menu';
    this._select(this._sel, false);
    this.root.classList.add('is-menu');
  }

  _select(i, sound) {
    if (sound && i !== this._sel) this.ui.sfx('cursor');
    this._sel = i;
    this.rows.forEach((r, k) => r.classList.toggle('is-sel', k === i));
  }

  _activate() {
    const it = this.items[this._sel];
    const id = it.id;
    if (id === 'start' || id === 'continue') {
      this.ui.sfx('confirm');
      const cb = this.cb[id];
      if (!cb || cb() !== false) this.hide();
    } else if (id === 'load') {
      if (it.dim) { this.ui.sfx('error'); return; }
      this.ui.sfx('confirm');
      if (this.cb.load) this.cb.load();
    } else if (id === 'controls') {
      this.ui.sfx('confirm');
      this.phase = 'controls';
      this.ctlBody.replaceChildren(controlsTable(this.ui.input.lastDevice));
      this.ctlFoot.replaceChildren(glyph('cancel', this.ui.input.lastDevice), document.createTextNode('Back'));
      this.root.classList.add('is-ctl');
    } else if (id === 'sound') {
      this.ui.setSetting('sound', !this.ui.getSetting('sound'));
      this._syncSound();
      this.ui.sfx('confirm');
    }
  }

  _closeControls() {
    this.ui.sfx('cancel');
    this.phase = 'menu';
    this.root.classList.remove('is-ctl');
  }

  _syncSound() {
    const i = this.items.findIndex((it) => it.id === 'sound');
    if (i >= 0) this.rows[i].textContent = `Sound: ${this.ui.getSetting('sound') ? 'On' : 'Off'}`;
  }
}
