// Full-screen moments: "Signal lost" game over, "Proof of concept complete" with play stats,
// and a plain fade to black that other states use around scene changes.

import { el, injectCSS, ease } from '../core/util.js';
import { bindPointer, formatTime, fmtNum } from './theme.js';

const CSS = `
.vp-fade { z-index: 55; background: #000; opacity: 0; transition: opacity .5s ease; }
.vp-screens { z-index: 60; }
.vp-scr { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px calc(24px + var(--vp-safe-bottom));
  box-sizing: border-box; text-align: center; opacity: 0; visibility: hidden; transition: opacity .6s var(--vp-ease-out), visibility 0s linear .6s; overflow: hidden; }
.vp-scr.is-on { opacity: 1; visibility: visible; transition: opacity .8s var(--vp-ease-out); }
.vp-scr-btns { display: flex; flex-direction: column; align-items: stretch; gap: 4px; min-width: min(380px, 100%); margin-top: 34px; }
.vp-scr-btns .vp-row { justify-content: center; padding: 0 42px; min-height: 50px; font: 600 15px var(--vp-font-ui); letter-spacing: .26em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-scr-btns .vp-row.is-sel { color: var(--vp-amber); background: linear-gradient(90deg, rgba(255,197,96,0), rgba(255,197,96,.16), rgba(255,197,96,0)); box-shadow: none; }
.vp-scr-btns .vp-row::before { left: 20px; }
.vp-scr.is-on .vp-scr-in { animation: vp-scr-in .9s var(--vp-ease-out) both; }
.vp-scr.is-on .vp-scr-in.d1 { animation-delay: .25s; } .vp-scr.is-on .vp-scr-in.d2 { animation-delay: .5s; } .vp-scr.is-on .vp-scr-in.d3 { animation-delay: .8s; } .vp-scr.is-on .vp-scr-in.d4 { animation-delay: 1.1s; }
@keyframes vp-scr-in { from { opacity: 0; transform: translateY(10px); } }

/* game over */
.vp-over { background: radial-gradient(circle farthest-side at 50% 45%, rgba(70,8,22,.76), rgba(24,4,10,.9) 55%, rgba(8,2,5,.96)); }
.vp-over::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, rgba(0,0,0,0) 1px 3px); }
.vp-over::after { content: ''; position: absolute; left: 0; right: 0; height: 18%; top: -20%; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,90,106,0), rgba(255,90,106,.07), rgba(255,90,106,0)); animation: vp-sweep 4.5s linear infinite; }
@keyframes vp-sweep { to { transform: translateY(700%); } }
.vp-over-kick { color: #ff8a96; letter-spacing: .5em; padding-left: .5em; }
.vp-over-title { position: relative; margin: 18px 0 0; font: 800 clamp(42px, 9.5vw, 120px)/1 var(--vp-font-display); letter-spacing: .18em; padding-left: .18em; white-space: nowrap; }
.vp-over-title span { display: block; }
.vp-over-main { position: relative; color: #ffe3e6; text-shadow: 0 0 30px rgba(255,90,106,.55), 0 0 2px #fff; }
.vp-over-ghost { position: absolute; inset: 0; padding-left: inherit; pointer-events: none; }
.vp-over-ghost.r { color: rgba(255,60,90,.7); animation: vp-og-r 2.6s steps(1) infinite; }
.vp-over-ghost.c { color: rgba(90,230,255,.45); mix-blend-mode: screen; animation: vp-og-c 2.6s steps(1) infinite; }
@keyframes vp-og-r { 0%, 100% { transform: translateX(-4px); clip-path: none; } 30% { transform: translateX(-12px); clip-path: inset(10% 0 62% 0); } 33% { transform: translateX(-4px); clip-path: none; } 71% { transform: translateX(6px); clip-path: inset(55% 0 20% 0); } 74% { transform: translateX(-4px); clip-path: none; } }
@keyframes vp-og-c { 0%, 100% { transform: translateX(4px); clip-path: none; } 30% { transform: translateX(14px); clip-path: inset(40% 0 35% 0); } 34% { transform: translateX(4px); clip-path: none; } 72% { transform: translateX(-8px); clip-path: inset(5% 0 75% 0); } 75% { transform: translateX(4px); clip-path: none; } }
.vp-over-sub { margin-top: 22px; font: 500 clamp(15px, 1.5vw, 18px)/1.5 var(--vp-font-ui); color: #d9b9c0; letter-spacing: .06em; }
.vp-over-flat { width: min(520px, 80vw); height: 1px; margin-top: 26px; background: linear-gradient(90deg, rgba(255,90,106,0), rgba(255,90,106,.8), rgba(255,90,106,0)); box-shadow: 0 0 10px rgba(255,90,106,.6); }
.vp-over .vp-row.is-sel { color: #ffd0a0; }

/* complete */
.vp-done { background: radial-gradient(circle farthest-side at 50% 40%, rgba(16,30,62,.8), rgba(8,12,24,.9) 60%, rgba(5,7,13,.96)); }
.vp-done-kick { color: var(--vp-cyan); letter-spacing: .46em; padding-left: .46em; }
.vp-done-title { margin: 20px 0 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.vp-done-title small { display: flex; align-items: center; gap: 16px; font: 600 clamp(14px, 1.6vw, 18px)/1 var(--vp-font-display); letter-spacing: .5em; padding-left: .5em; text-transform: uppercase; color: var(--vp-amber); text-shadow: 0 0 14px rgba(255,197,96,.5); }
.vp-done-title small::before, .vp-done-title small::after { content: ''; width: clamp(24px, 6vw, 80px); height: 1px; background: linear-gradient(90deg, rgba(255,197,96,0), var(--vp-amber)); }
.vp-done-title small::after { transform: scaleX(-1); }
.vp-done-title b { position: relative; display: block; font: 800 clamp(40px, 8vw, 104px)/1 var(--vp-font-display); letter-spacing: .2em; padding-left: .2em; }
.vp-done-title b span { display: block; }
.vp-done-glow { position: absolute; inset: 0; padding-left: inherit; color: rgba(127,227,255,.28); text-shadow: 0 0 20px rgba(127,227,255,.5); }
.vp-done-main { position: relative; color: transparent; -webkit-background-clip: text; background-clip: text;
  background-image: linear-gradient(180deg, #ffffff 0%, #e8f6ff 42%, #a8dcff 50%, #5684bb 52%, #a8d2f5 72%, #f6fbff 100%); }
.vp-done-msg { margin-top: 18px; max-width: 560px; font: 400 clamp(15px, 1.4vw, 17px)/1.55 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: min(860px, 100%); margin-top: 34px; }
.vp-stat-tile { padding: 18px 12px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.vp-stat-tile .vp-num { font-size: clamp(26px, 3vw, 38px); font-weight: 700; color: #fff; text-shadow: 0 0 16px rgba(127,227,255,.35); }
.vp-stat-tile.hl .vp-num { color: var(--vp-break); text-shadow: 0 0 16px rgba(255,79,163,.45); }
.vp-done .vp-scr-btns { flex-direction: row; justify-content: center; min-width: 0; gap: 10px; }
.vp-done .vp-scr-btns .vp-row { min-width: 250px; }
@media (max-width: 640px) {
  .vp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 26px; }
  .vp-done .vp-scr-btns { flex-direction: column; width: 100%; margin-top: 24px; }
  .vp-done .vp-scr-btns .vp-row { min-width: 0; }
  .vp-done-title b, .vp-over-title { letter-spacing: .12em; padding-left: .12em; }
  .vp-over-kick, .vp-done-kick { letter-spacing: .16em; padding-left: .16em; }
  .vp-stat-tile .vp-cap { letter-spacing: .1em; }
  .vp-done-title small { letter-spacing: .3em; padding-left: .3em; }
  .vp-scr-btns .vp-row { padding: 0 34px; font-size: 14px; letter-spacing: .14em; }
}
`;

export class Screens {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-screens', CSS);
    this.isOpen = false;
    this.current = null;
    this._sel = 0;
    this._rows = [];
    this._counters = [];
    this.fade = el('div', { class: 'vp-layer vp-fade' });
    this.root = el('div', { class: 'vp-layer vp-screens' });
    ui.root.append(this.fade, this.root);
  }

  /** "Signal lost". opts: { onRetry, onTitle }; Return to title reloads the page when onTitle is absent. */
  gameOver({ onRetry, onTitle } = {}) {
    this._counters = [];
    const ghost = (cls) => el('span', { class: `vp-over-ghost ${cls}`, 'aria-hidden': 'true', text: 'SIGNAL LOST' });
    const view = el('div', { class: 'vp-scr vp-over', role: 'alertdialog', 'aria-label': 'Signal lost' }, [
      el('div', { class: 'vp-cap vp-over-kick vp-scr-in', text: 'Transmission interrupted' }),
      el('h1', { class: 'vp-over-title vp-scr-in d1' }, [ghost('r'), ghost('c'), el('span', { class: 'vp-over-main', text: 'SIGNAL LOST' })]),
      el('div', { class: 'vp-over-flat vp-scr-in d2' }),
      el('div', { class: 'vp-over-sub vp-scr-in d2', text: 'All four travelers are down. The Halcyon drifts on in silence.' }),
      this._buttons([
        { label: 'Retry from last Med-Station', run: onRetry },
        { label: 'Return to title', run: onTitle || (() => location.reload()) },
      ], 'd3'),
    ]);
    this.ui.sfx('gameover');
    this._open(view);
  }

  /** "Proof of concept complete". stats: gameState.stats-like { battles, breaks, maxDamage, playTime }. */
  complete({ stats = {}, onContinue, onTitle } = {}) {
    const tiles = [
      ['Battles', stats.battles, fmtNum],
      ['Breaks', stats.breaks, fmtNum, true],
      ['Highest damage', stats.maxDamage, fmtNum],
      ['Play time', stats.playTime, formatTime],
    ];
    this._counters = [];
    const grid = el('div', { class: 'vp-stats vp-scr-in d3' }, tiles.map(([label, value, fmt, hl]) => {
      const num = el('span', { class: 'vp-num', text: fmt(0) });
      this._counters.push({ node: num, to: Math.max(0, +value || 0), fmt });
      return el('div', { class: `vp-panel vp-stat-tile${hl ? ' hl' : ''}` }, [num, el('span', { class: 'vp-cap', text: label })]);
    }));
    const view = el('div', { class: 'vp-scr vp-done', role: 'dialog', 'aria-label': 'Proof of concept complete' }, [
      el('div', { class: 'vp-cap vp-done-kick vp-scr-in', text: 'Sentinel offline · bridge secured' }),
      el('div', { class: 'vp-done-title vp-scr-in d1' }, [el('small', { text: 'Proof of concept' }), el('b', {}, [
        el('span', { class: 'vp-done-glow', 'aria-hidden': 'true', text: 'COMPLETE' }), el('span', { class: 'vp-done-main', text: 'COMPLETE' }),
      ])]),
      el('div', { class: 'vp-done-msg vp-scr-in d2', text: 'Thank you for walking the Voidpath. This slice shows the look and the battle loop; story and new decks come next.' }),
      grid,
      this._buttons([
        { label: 'Continue exploring', run: onContinue },
        { label: 'Return to title', run: onTitle || (() => location.reload()) },
      ], 'd4'),
    ]);
    this._countStart = performance.now() + 900;   // wall clock: count once the tiles have faded in
    this.ui.sfx('victory');
    this._open(view);
  }

  /** Fade the whole screen to (true) or from (false) black. Resolves when the fade finishes. */
  fadeBlack(on, ms = 500) {
    const f = this.fade;
    f.style.transitionDuration = `${ms}ms`;
    f.style.opacity = on ? '1' : '0';
    f.classList.toggle('is-live', !!on);       // swallow taps while black
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (!this.current) return;
    const view = this.current;
    this.current = null;
    this.isOpen = false;
    view.classList.remove('is-on');
    this.root.classList.remove('is-live');
    setTimeout(() => view.remove(), 700);
    this.ui._ctxPop('screens');
  }

  update(dt, focused) {
    if (!this.current) return;
    if (this._counters.length) {
      const t = (performance.now() - this._countStart) / 1300;
      if (t > 0) {
        const k = ease.outCubic(Math.min(1, t));
        for (const c of this._counters) c.node.textContent = c.fmt(c.to * k);
        if (t >= 1) this._counters = [];
      }
    }
    if (!focused || this._lock > 0) { this._lock -= dt; return; }
    const inp = this.ui.input;
    const n = this._rows.length;
    if (inp.repeat('up') || inp.repeat('left')) { inp.consume('up'); inp.consume('left'); this._select((this._sel + n - 1) % n, true); }
    else if (inp.repeat('down') || inp.repeat('right')) { inp.consume('down'); inp.consume('right'); this._select((this._sel + 1) % n, true); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._activate(this._sel); }
  }

  _open(view) {
    if (this.current) { this.current.remove(); this.ui._ctxPop('screens'); }
    this.current = view;
    this.isOpen = true;
    this._sel = 0;
    this._lock = 0.8;              // ignore mashed buttons from the fight that just ended
    this.root.appendChild(view);
    this.root.classList.add('is-live');
    this.ui._ctxPush('screens', 'menu');
    this._select(0, false);
    void view.offsetWidth;
    view.classList.add('is-on');
  }

  _buttons(list, delay) {
    this._actions = list;
    this._rows = list.map((b, i) => {
      const row = el('div', { class: 'vp-row', role: 'button', text: b.label });
      bindPointer(row, {
        onHover: () => this._select(i, true),
        onActivate: () => { if (this._lock <= 0) { this._select(i, false); this._activate(i); } },
      });
      return row;
    });
    return el('div', { class: `vp-scr-btns vp-scr-in ${delay}` }, this._rows);
  }

  _select(i, sound) {
    if (sound && i !== this._sel) this.ui.sfx('cursor');
    this._sel = i;
    this._rows.forEach((r, k) => r.classList.toggle('is-sel', k === i));
  }

  _activate(i) {
    const a = this._actions[i];
    if (!a) return;
    this.ui.sfx('confirm');
    this.close();
    if (a.run) a.run();
  }
}
