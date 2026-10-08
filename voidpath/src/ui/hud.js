// Field HUD: Octopath-style location / area banner, contextual interaction prompt, toast stack,
// encounter danger gauge, cinematic letterbox and the "Hold to skip" hint. Purely presentational
// (never takes pointer events).
//
//   hud.showLocation(name, subtitle, objective?)   big banner; objective line under the subtitle
//   hud.showArea(name, subtitle)                   area banner (POC); also sets ui.areaName
//   hud.setArea(name)                              ui.areaName without a banner (suppressed banners)
//   hud.setPrompt(label, { icon, badge } | icon)   prompt pill; badge '!' marks an available Party Talk
//   hud.toast(text, { icon, duration, kicker, portrait, accent, cls }) -> element
//   hud.objectiveToast(text)  hud.partyToast(memberId, 'join' | 'leave')  hud.autosaved()
//   hud.setDanger(0..1)  hud.setVisible(on)  hud.skipHint(on)  hud.letterbox(on, ms = 500) -> Promise
//
// Banners and toasts are removed by timers, not animationend, so they stay readable with
// prefers-reduced-motion (their motion-free variants keep the same duration).

import { el, injectCSS, clamp } from '../core/util.js';
import { glyph, richText } from './theme.js';

const CSS = `
.vp-hud { z-index: 10; transition: opacity .35s var(--vp-ease-out); }
.vp-hud.is-hidden { opacity: 0; }

/* area / location banner */
.vp-area { position: absolute; left: 0; right: 0; top: 21%; display: flex; flex-direction: column; align-items: center; opacity: 0; pointer-events: none; }
.vp-area::before { content: ''; position: absolute; left: 50%; top: 50%; width: min(1100px, 120%); height: 220%; transform: translate(-50%, -50%); z-index: -1;
  background: radial-gradient(50% 50% at 50% 50%, rgba(5,7,13,.55), rgba(5,7,13,0)); }
.vp-area.is-on { animation: vp-area var(--ad, 3.4s) linear forwards; }
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
.vp-area-obj { display: none; align-items: center; gap: 12px; margin-top: 20px; padding: 7px 18px 7px 14px; max-width: min(640px, 86vw);
  font: 500 clamp(14px, 1.3vw, 16px)/1.35 var(--vp-font-ui); letter-spacing: .04em; color: var(--vp-ink); opacity: 0;
  background: linear-gradient(90deg, rgba(5,7,13,0), rgba(5,7,13,.6) 12%, rgba(5,7,13,.6) 88%, rgba(5,7,13,0)); }
.vp-area-obj b { font: 600 12px/1 var(--vp-font-ui); letter-spacing: .3em; text-transform: uppercase; color: var(--vp-amber); white-space: nowrap; }
.vp-area-obj b::before { content: ''; display: inline-block; width: 6px; height: 6px; margin: 0 10px 2px 0; background: var(--vp-amber); transform: rotate(45deg); box-shadow: 0 0 8px var(--vp-amber); }
.vp-area.has-obj .vp-area-obj { display: flex; }
.vp-area.is-on .vp-area-obj { animation: vp-area-sub .8s var(--vp-ease-out) .9s forwards; }
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
.vp-prompt-badge { display: none; place-items: center; width: 20px; height: 20px; margin-left: -2px; border-radius: 50%;
  background: var(--vp-amber); color: #1a1206; font: 800 13px/1 var(--vp-font-display); letter-spacing: 0;
  box-shadow: 0 0 10px rgba(255,197,96,.7); animation: vp-badge 1.6s ease-in-out infinite; }
.vp-prompt.has-badge .vp-prompt-badge { display: grid; }
.vp-prompt.has-badge { border-color: rgba(255,197,96,.5); }
@keyframes vp-badge { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }

/* toasts (own layer so they also show above the pause menu) */
.vp-toasts { z-index: 45; transition: opacity .3s; }
.vp-toast-stack { position: absolute; top: calc(18px + var(--vp-safe-top)); right: calc(18px + var(--vp-safe-right)); display: flex; flex-direction: column; align-items: flex-end; gap: 10px; max-width: calc(100% - 36px); }
.vp-toasts.is-touch .vp-toast-stack { top: calc(72px + var(--vp-safe-top)); }
.vp-toast { display: flex; align-items: center; gap: 12px; padding: 10px 18px 10px 12px; max-width: 360px; font: 500 15px/1.35 var(--vp-font-ui); letter-spacing: .02em;
  animation: vp-toast var(--td, 3.3s) var(--vp-ease-out) forwards; }
.vp-toast .vp-ico { width: 32px; height: 32px; }
.vp-toast.no-ico { padding-left: 18px; }
.vp-toast::after { background: linear-gradient(90deg, transparent, rgba(255,214,140,.9), transparent); }
.vp-toast-k { display: block; margin-bottom: 4px; font: 600 11px/1 var(--vp-font-ui); letter-spacing: .3em; text-transform: uppercase; color: var(--vp-amber); }
.vp-toast .vp-portrait { width: 48px; height: 48px; --ps: 48px; }
.vp-toast.is-party { padding: 8px 20px 8px 8px; }
.vp-toast.is-party b { color: var(--acc, var(--vp-amber)); font-family: var(--vp-font-display); letter-spacing: .14em; }
.vp-toast.is-party::after { background: linear-gradient(90deg, transparent, var(--acc, var(--vp-amber)), transparent); }
.vp-toast.is-obj { border-color: rgba(255,197,96,.4); }
.vp-toast.is-small { padding: 6px 14px 6px 8px; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-toast.is-small .vp-ico { width: 16px; height: 16px; }
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

/* letterbox: cinematic bars for cutscenes (below the dialog box) */
.vp-lbox { z-index: 20; }
.vp-lbox i { position: absolute; left: 0; right: 0; height: clamp(36px, 10.5vh, 96px); background: #020306; transition: transform var(--lb, .5s) var(--vp-ease-out); }
.vp-lbox i:first-child { top: 0; transform: translateY(-101%); box-shadow: 0 1px 0 rgba(140,214,255,.08); }
.vp-lbox i:last-child { bottom: 0; transform: translateY(101%); box-shadow: 0 -1px 0 rgba(140,214,255,.08); }
.vp-lbox.is-on i { transform: none; }

/* hold to skip */
.vp-skip { position: absolute; left: calc(22px + var(--vp-safe-left)); top: calc(20px + var(--vp-safe-top)); display: flex; align-items: center; gap: 10px;
  padding: 7px 14px 7px 8px; border-radius: 999px; background: rgba(8,13,26,.78); border: 1px solid var(--vp-line-dim);
  font: 600 13px/1 var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; color: var(--vp-ink-dim); opacity: 0; transition: opacity .15s; z-index: 1; }
.vp-skip.is-on { opacity: 1; }
.vp-skip-bar { position: relative; width: 54px; height: 3px; background: rgba(140,214,255,.18); overflow: hidden; }
.vp-skip-bar i { position: absolute; inset: 0; background: var(--vp-amber); transform-origin: 0 50%; transform: scaleX(0); }
.vp-skip.is-on .vp-skip-bar i { animation: vp-skip-fill .6s linear forwards; }
@keyframes vp-skip-fill { to { transform: scaleX(1); } }

@media (max-width: 640px) {
  .vp-area { top: 27%; }
  .vp-area-name { font-size: clamp(22px, 6.6vw, 30px); letter-spacing: .24em; padding: 0 .45em 0 calc(.45em + .24em); white-space: normal; text-align: center; max-width: 84vw; }
  .vp-area-line { flex-basis: 28px; }
  .vp-area-sub { letter-spacing: .3em; font-size: 12px; }
  .vp-area-obj { flex-direction: column; gap: 6px; text-align: center; font-size: 14px; }
  .vp-prompt { font-size: 14px; bottom: calc(24px + var(--vp-safe-bottom)); }
  .vp-hud.is-touch .vp-prompt { bottom: calc(196px + var(--vp-safe-bottom)); }
  .vp-toast { font-size: 14px; max-width: 280px; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes vp-toast { 0% { opacity: 0; } 9%, 84% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes vp-area-name { from { opacity: 0; } }
  @keyframes vp-area-sub { from { opacity: 0; } to { opacity: 1; } }
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

const TOAST_MS = 3300;

export class Hud {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-hud', CSS);
    this.visible = true;
    this._promptText = null;
    this._promptIcon = null;
    this._promptBadge = null;
    this._device = null;
    this._danger = -1;
    this._touch = false;
    this._areaTimer = 0;

    this.areaName = el('div', { class: 'vp-area-name' });
    this.areaSub = el('div', { class: 'vp-area-sub' });
    this.areaObj = el('div', { class: 'vp-area-obj' });
    this.area = el('div', { class: 'vp-area' }, [
      el('div', { class: 'vp-area-row' }, [el('i', { class: 'vp-area-line l' }), this.areaName, el('i', { class: 'vp-area-line r' })]),
      this.areaSub, this.areaObj,
    ]);

    this.promptGlyph = el('span', { class: 'vp-prompt-g' });
    this.promptIcon = el('img', { class: 'vp-ico vp-prompt-ico', alt: '' });
    this.promptLabel = el('span', { class: 'vp-prompt-t' });
    this.promptBadge = el('span', { class: 'vp-prompt-badge', text: '!' });
    this.prompt = el('div', { class: 'vp-prompt' }, [this.promptGlyph, this.promptIcon, this.promptLabel, this.promptBadge]);

    this.danger = el('div', { class: 'vp-danger', 'aria-hidden': 'true' }, [
      el('div', { class: 'vp-danger-ring' }), el('div', { class: 'vp-danger-arc' }),
      el('div', { class: 'vp-danger-pulse' }), el('div', { class: 'vp-danger-dot' }),
    ]);

    this.skip = el('div', { class: 'vp-skip', 'aria-hidden': 'true' }, [el('span', { class: 'vp-skip-g' }), 'Hold to skip', el('span', { class: 'vp-skip-bar' }, [el('i')])]);
    this.lbox = el('div', { class: 'vp-layer vp-lbox', 'aria-hidden': 'true' }, [el('i'), el('i')]);

    this.root = el('div', { class: 'vp-layer vp-hud' }, [this.area, this.prompt, this.danger]);
    this.stack = el('div', { class: 'vp-toast-stack', 'aria-live': 'polite' });
    this.toastLayer = el('div', { class: 'vp-layer vp-toasts' }, [this.stack, this.skip]);
    ui.root.append(this.root, this.lbox, this.toastLayer);
  }

  // ------------------------------------------------------------------ banners

  /** Octopath-style area title: big spaced type between two lines; fades out after ~2.6 s. */
  showArea(name, subtitle = '') {
    this._banner(name, subtitle, null);
  }

  /** Location banner (map changes): name, subtitle and the current objective under them. */
  showLocation(name, subtitle = '', objective = null) {
    this.ui.locationName = name || '';
    this._banner(name, subtitle, objective);
  }

  /** Keep the menu's area label current when a banner is suppressed. */
  setArea(name) {
    this.ui.areaName = name || '';
  }

  _banner(name, subtitle, objective) {
    this.ui.areaName = name || '';
    this.areaName.textContent = name || '';
    this.areaSub.textContent = subtitle || '';
    this.areaSub.style.display = subtitle ? '' : 'none';
    this.area.classList.toggle('has-obj', !!objective);
    this.areaObj.replaceChildren(...(objective ? [el('b', { text: 'Objective' }), el('span', {}, [richText(objective)])] : []));
    const ms = objective ? 4600 : 3400;
    this.area.style.setProperty('--ad', `${ms}ms`);
    this.area.classList.remove('is-on');
    void this.area.offsetWidth;                  // restart the animation
    this.area.classList.add('is-on');
    clearTimeout(this._areaTimer);
    this._areaTimer = setTimeout(() => this.area.classList.remove('is-on'), ms + 50);
  }

  // ------------------------------------------------------------------ prompt

  /** Contextual prompt pill near the bottom centre; null hides it. opts: icon name or { icon, badge }. */
  setPrompt(text, opts) {
    const { icon = null, badge = null } = typeof opts === 'string' ? { icon: opts } : (opts || {});
    text = text || null;
    if (text === this._promptText && icon === this._promptIcon && badge === this._promptBadge) return;
    this._promptText = text;
    this._promptIcon = icon;
    this._promptBadge = badge;
    if (text) {
      this.promptLabel.textContent = text;
      const url = icon ? this.ui.iconURL(icon) : null;
      this.promptIcon.style.display = url ? '' : 'none';
      if (url) this.promptIcon.src = url;
      this.promptBadge.textContent = badge || '';
      this.prompt.classList.toggle('has-badge', !!badge);
      this._device = null;                        // refresh glyph
    }
    this._applyPrompt();
  }

  // ------------------------------------------------------------------ toasts

  /**
   * Toast in the top-right stack. opts: icon (icon name), duration (ms), kicker (small amber
   * line above), portrait (member / portrait id), accent, cls (extra class).
   */
  toast(text, { icon, duration = TOAST_MS, kicker, portrait, accent, cls = '' } = {}) {
    const url = icon ? this.ui.iconURL(icon) : null;
    const t = el('div', { class: `vp-panel vp-toast${url || portrait ? '' : ' no-ico'} ${cls}`.trim() });
    if (portrait) t.appendChild(this.ui.portraitEl(portrait, { size: 48, accent }));
    else if (url) t.appendChild(el('img', { class: 'vp-ico', src: url, alt: '' }));
    t.appendChild(el('span', {}, [kicker ? el('span', { class: 'vp-toast-k', text: kicker }) : null, richText(text)]));
    if (accent) t.style.setProperty('--acc', accent);
    t.style.setProperty('--td', `${duration}ms`);
    setTimeout(() => t.remove(), duration + 50);
    this.stack.appendChild(t);
    while (this.stack.children.length > 4) this.stack.firstChild.remove();
    return t;
  }

  /** "New objective" toast. */
  objectiveToast(text) {
    return this.toast(text, { icon: 'journal', kicker: 'New objective', duration: 4200, cls: 'is-obj' });
  }

  /** Portrait toast "SERA joined the party" / "NYX left the party". */
  partyToast(memberId, kind = 'join') {
    const name = this.ui.memberName(memberId);
    const accent = this.ui._accentOf(memberId);
    const t = this.toast('', { portrait: memberId, accent, duration: 3800, cls: 'is-party' });
    t.lastChild.replaceChildren(el('b', { text: name }), ` ${kind === 'leave' ? 'left' : 'joined'} the party`);
    return t;
  }

  /** Small "Autosaved" confirmation. */
  autosaved() {
    return this.toast('Autosaved', { icon: 'save', duration: 2000, cls: 'is-small' });
  }

  // ------------------------------------------------------------------ cutscene chrome

  /** Cinematic bars; resolves when they finish moving. */
  letterbox(on, ms = 500) {
    this.lbox.style.setProperty('--lb', `${ms}ms`);
    this.lbox.classList.toggle('is-on', !!on);
    return new Promise((r) => setTimeout(r, ms));
  }

  /** "Hold to skip" while Cancel is held during a replayed scene (the bar fills in 0.6 s). */
  skipHint(on) {
    if (!!on === this.skip.classList.contains('is-on')) return;
    if (on) this.skip.firstChild.replaceChildren(glyph('cancel', this.ui.input.lastDevice));
    this.skip.classList.toggle('is-on', !!on);
  }

  // ------------------------------------------------------------------ gauge, visibility

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
