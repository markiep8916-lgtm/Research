// Field HUD: Octopath-style area banner, contextual interaction prompt, toast stack and the
// encounter danger gauge. Purely presentational (never takes pointer events).

import { el, injectCSS, clamp } from '../core/util.js';
import { glyph, richText } from './theme.js';

const CSS = `
.vp-hud { z-index: 10; transition: opacity .35s var(--vp-ease-out); }
.vp-hud.is-hidden { opacity: 0; }

/* area banner */
.vp-area { position: absolute; left: 0; right: 0; top: 21%; display: flex; flex-direction: column; align-items: center; opacity: 0; pointer-events: none; }
.vp-area::before { content: ''; position: absolute; left: 50%; top: 50%; width: min(1100px, 120%); height: 220%; transform: translate(-50%, -50%); z-index: -1;
  background: radial-gradient(50% 50% at 50% 50%, rgba(5,7,13,.55), rgba(5,7,13,0)); }
.vp-area.is-on { animation: vp-area 3.4s linear forwards; }
.vp-area-row { display: flex; align-items: center; justify-content: center; width: 100%; gap: 0; }
.vp-area-line { position: relative; flex: 0 1 clamp(36px, 17vw, 300px); height: 1px; transform: scaleX(0); }
.vp-area-line.l { background: linear-gradient(90deg, rgba(140,214,255,0), rgba(190,236,255,.9)); transform-origin: 100% 50%; }
.vp-area-line.r { background: linear-gradient(270deg, rgba(140,214,255,0), rgba(190,236,255,.9)); transform-origin: 0 50%; }
.vp-area-line::after { content: ''; position: absolute; top: -3px; width: 7px; height: 7px; background: var(--vp-amber); transform: rotate(45deg); box-shadow: 0 0 10px var(--vp-amber); }
.vp-area-line.l::after { right: -3px; } .vp-area-line.r::after { left: -3px; }
.vp-area.is-on .vp-area-line { animation: vp-area-line 1s var(--vp-ease-out) .1s forwards; }
.vp-area-name { padding: 0 .7em 0 calc(.7em + .36em); font: 600 clamp(26px, 4.6vw, 52px)/1.1 var(--vp-font-display); letter-spacing: .36em; text-transform: uppercase;
  color: #f4f9ff; white-space: nowrap; text-shadow: 0 0 14px rgba(127,227,255,.5), 0 2px 0 rgba(0,0,0,.55); }
.vp-area.is-on .vp-area-name { animation: vp-area-name .9s var(--vp-ease-out) both; }
.vp-area-sub { margin-top: 14px; padding-left: .42em; font: 600 clamp(12px, 1.25vw, 15px)/1 var(--vp-font-ui); letter-spacing: .42em; text-transform: uppercase; color: var(--vp-ink-dim); opacity: 0; }
.vp-area.is-on .vp-area-sub { animation: vp-area-sub .8s var(--vp-ease-out) .45s forwards; }
@keyframes vp-area { 0% { opacity: 0; } 9% { opacity: 1; } 77% { opacity: 1; } 100% { opacity: 0; } }
@keyframes vp-area-line { to { transform: scaleX(1); } }
@keyframes vp-area-name { from { opacity: 0; transform: translateY(10px) scale(1.03); } }
@keyframes vp-area-sub { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

/* interaction prompt */
.vp-prompt { position: absolute; left: 50%; bottom: calc(30px + var(--vp-safe-bottom)); display: flex; align-items: center; gap: 10px;
  padding: 6px 20px 6px 7px; border-radius: 999px; background: linear-gradient(180deg, rgba(127,227,255,.08), rgba(127,227,255,0) 60%), rgba(8,13,26,.8);
  border: 1px solid var(--vp-line-dim); box-shadow: 0 4px 12px rgba(0,0,0,.35);
  font: 600 15px/1 var(--vp-font-ui); letter-spacing: .16em; text-transform: uppercase; color: var(--vp-ink);
  opacity: 0; transform: translate(-50%, 10px); transition: opacity .18s var(--vp-ease-out), transform .26s var(--vp-ease-out); white-space: nowrap; }
.vp-prompt.is-on { opacity: 1; transform: translate(-50%, 0); }
.vp-prompt .vp-key, .vp-prompt .vp-padbtn, .vp-prompt .vp-tapbtn { height: 26px; min-width: 26px; }
.vp-prompt .vp-padbtn, .vp-prompt .vp-tapbtn { width: 26px; }
.vp-prompt-ico { width: 16px; height: 16px; margin-left: 2px; }
.vp-prompt-t { text-shadow: 0 0 10px rgba(127,227,255,.3); }

/* toasts (own layer so they also show above the pause menu) */
.vp-toasts { z-index: 45; transition: opacity .3s; }
.vp-toast-stack { position: absolute; top: calc(18px + var(--vp-safe-top)); right: calc(18px + var(--vp-safe-right)); display: flex; flex-direction: column; align-items: flex-end; gap: 10px; max-width: calc(100% - 36px); }
.vp-toasts.is-touch .vp-toast-stack { top: calc(72px + var(--vp-safe-top)); }
.vp-toast { display: flex; align-items: center; gap: 12px; padding: 10px 18px 10px 12px; max-width: 360px; font: 500 15px/1.35 var(--vp-font-ui); letter-spacing: .02em;
  animation: vp-toast 3.3s var(--vp-ease-out) forwards; }
.vp-toast .vp-ico { width: 32px; height: 32px; }
.vp-toast.no-ico { padding-left: 18px; }
.vp-toast::after { background: linear-gradient(90deg, transparent, rgba(255,214,140,.9), transparent); }
@keyframes vp-toast { 0% { opacity: 0; transform: translateX(28px); } 9% { opacity: 1; transform: none; } 84% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-8px); } }

/* danger gauge */
.vp-danger { position: absolute; right: calc(22px + var(--vp-safe-right)); bottom: calc(22px + var(--vp-safe-bottom)); width: 38px; height: 38px;
  --dc: #69b9ff; --lv: 0; --dp: 2.4s; opacity: 0; transition: opacity .5s var(--vp-ease-out), bottom .3s var(--vp-ease-out); }
.vp-danger.is-on { opacity: .92; }
.vp-hud.is-touch .vp-danger { bottom: calc(190px + var(--vp-safe-bottom)); right: calc(34px + var(--vp-safe-right)); }
.vp-danger-ring { position: absolute; inset: 0; border-radius: 50%; background: rgba(8,13,26,.6); box-shadow: inset 0 0 0 1px rgba(140,214,255,.22); }
.vp-danger-arc { position: absolute; inset: 0; border-radius: 50%; transition: background .4s;
  background: conic-gradient(var(--dc) calc(var(--lv) * 1turn), rgba(0,0,0,0) 0);
  -webkit-mask: radial-gradient(circle, transparent 13.5px, #000 14.5px, #000 17px, transparent 18px);
  mask: radial-gradient(circle, transparent 13.5px, #000 14.5px, #000 17px, transparent 18px); }
.vp-danger-dot { position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%;
  background: var(--dc); box-shadow: 0 0 10px var(--dc), 0 0 2px #fff; transition: background .4s, box-shadow .4s; }
.vp-danger-pulse { position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%;
  border: 1px solid var(--dc); opacity: 0; }
.vp-danger.is-on .vp-danger-pulse { animation: vp-danger var(--dp) ease-out infinite; will-change: transform, opacity; }
@keyframes vp-danger { from { transform: scale(1); opacity: .9; } to { transform: scale(3.2); opacity: 0; } }

@media (max-width: 640px) {
  .vp-area { top: 27%; }
  .vp-area-name { font-size: clamp(22px, 6.6vw, 30px); letter-spacing: .24em; padding: 0 .45em 0 calc(.45em + .24em); white-space: normal; text-align: center; max-width: 84vw; }
  .vp-area-line { flex-basis: 28px; }
  .vp-area-sub { letter-spacing: .3em; font-size: 12px; }
  .vp-prompt { font-size: 14px; bottom: calc(24px + var(--vp-safe-bottom)); }
  .vp-hud.is-touch .vp-prompt { bottom: calc(196px + var(--vp-safe-bottom)); }
  .vp-toast { font-size: 14px; max-width: 280px; }
}
`;

// blue -> amber -> red
const DANGER_STOPS = [[105, 185, 255], [255, 197, 96], [255, 90, 106]];

function dangerColor(t) {
  const k = clamp(t, 0, 1) * 2;
  const i = Math.min(1, Math.floor(k));
  const f = k - i;
  const a = DANGER_STOPS[i], b = DANGER_STOPS[i + 1];
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * f)).join(',')})`;
}

export class Hud {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-hud', CSS);
    this.visible = true;
    this._promptText = null;
    this._promptIcon = null;
    this._device = null;
    this._danger = -1;
    this._touch = false;

    this.areaName = el('div', { class: 'vp-area-name' });
    this.areaSub = el('div', { class: 'vp-area-sub' });
    this.area = el('div', { class: 'vp-area' }, [
      el('div', { class: 'vp-area-row' }, [el('i', { class: 'vp-area-line l' }), this.areaName, el('i', { class: 'vp-area-line r' })]),
      this.areaSub,
    ]);
    this.area.addEventListener('animationend', (e) => { if (e.target === this.area) this.area.classList.remove('is-on'); });

    this.promptGlyph = el('span', { class: 'vp-prompt-g' });
    this.promptIcon = el('img', { class: 'vp-ico vp-prompt-ico', alt: '' });
    this.promptLabel = el('span', { class: 'vp-prompt-t' });
    this.prompt = el('div', { class: 'vp-prompt' }, [this.promptGlyph, this.promptIcon, this.promptLabel]);

    this.danger = el('div', { class: 'vp-danger', 'aria-hidden': 'true' }, [
      el('div', { class: 'vp-danger-ring' }), el('div', { class: 'vp-danger-arc' }),
      el('div', { class: 'vp-danger-pulse' }), el('div', { class: 'vp-danger-dot' }),
    ]);

    this.root = el('div', { class: 'vp-layer vp-hud' }, [this.area, this.prompt, this.danger]);
    this.stack = el('div', { class: 'vp-toast-stack', 'aria-live': 'polite' });
    this.toastLayer = el('div', { class: 'vp-layer vp-toasts' }, [this.stack]);
    ui.root.appendChild(this.root);
    ui.root.appendChild(this.toastLayer);
  }

  /** Octopath-style area title: big spaced type between two lines; fades out after ~2.6 s. */
  showArea(name, subtitle = '') {
    this.ui.areaName = name;
    this.areaName.textContent = name || '';
    this.areaSub.textContent = subtitle || '';
    this.areaSub.style.display = subtitle ? '' : 'none';
    this.area.classList.remove('is-on');
    void this.area.offsetWidth;                  // restart the animation
    this.area.classList.add('is-on');
  }

  /** Contextual prompt pill near the bottom centre; null hides it. icon: icon name (e.g. 'talk'). */
  setPrompt(text, icon) {
    text = text || null;
    if (text === this._promptText && icon === this._promptIcon) return;
    this._promptText = text;
    this._promptIcon = icon;
    if (text) {
      this.promptLabel.textContent = text;
      const url = icon ? this.ui.iconURL(icon) : null;
      this.promptIcon.style.display = url ? '' : 'none';
      if (url) this.promptIcon.src = url;
      this._device = null;                        // refresh glyph
    }
    this._applyPrompt();
  }

  toast(text, { icon, duration } = {}) {
    const url = icon ? this.ui.iconURL(icon) : null;
    const t = el('div', { class: `vp-panel vp-toast${url ? '' : ' no-ico'}` });
    if (url) t.appendChild(el('img', { class: 'vp-ico', src: url, alt: '' }));
    t.appendChild(el('span', {}, [richText(text)]));
    if (duration) t.style.animationDuration = `${duration}ms`;
    t.addEventListener('animationend', () => t.remove());
    this.stack.appendChild(t);
    while (this.stack.children.length > 4) this.stack.firstChild.remove();
    return t;
  }

  /** 0..1 encounter danger. 0 hides the gauge (safe areas). */
  setDanger(level) {
    const q = Math.round(clamp(+level || 0, 0, 1) * 20) / 20;   // quantised: no style churn per step
    if (q === this._danger) return;
    const bucketOld = this._dangerBucket;
    this._danger = q;
    const d = this.danger;
    d.classList.toggle('is-on', q > 0);
    d.style.setProperty('--lv', q.toFixed(2));
    d.style.setProperty('--dc', dangerColor(q));
    this._dangerBucket = q < 0.4 ? 0 : q < 0.75 ? 1 : 2;
    if (this._dangerBucket !== bucketOld) d.style.setProperty('--dp', ['2.6s', '1.5s', '.8s'][this._dangerBucket]);
  }

  setVisible(on) {
    this.visible = !!on;
    this.root.classList.toggle('is-hidden', !on);
  }

  update() {
    const ui = this.ui;
    const touch = !!(ui.input && ui.input.touchVisible);
    if (touch !== this._touch) {
      this._touch = touch;
      this.root.classList.toggle('is-touch', touch);
      this.toastLayer.classList.toggle('is-touch', touch);
    }
    const dev = ui.input ? ui.input.lastDevice : 'keyboard';
    if (this._promptText && dev !== this._device) {
      this._device = dev;
      this.promptGlyph.replaceChildren(glyph('confirm', dev));
    }
    this._applyPrompt();
  }

  _applyPrompt() {
    const on = !!this._promptText && this.visible && !this.ui.isBlocking();
    if (on !== this._promptOn) {
      this._promptOn = on;
      this.prompt.classList.toggle('is-on', on);
    }
  }
}
