// Field / menu DOM UI. One UI instance owns the dialog box, HUD, pause menu, title overlay and
// full-screen screens, routes input to whichever of them is on top, and keeps the input context
// (and so the touch overlay) in step with what is open.
//
//   const ui = new UI({ root, input, audio, state, engine, onUseItem, items, partyDefs });
//   ui.setPortraitProvider((id) => buildPortrait(id));   // canvas or dataURL
//   ui.setIconProvider((name) => iconURL(name));          // dataURL
//   each frame: input.update(); ui.update(dt); state.update(dt);

import { el } from '../core/util.js';
import { installBaseCSS, FALLBACK_ITEMS, MEMBER_ACCENT, fallbackIconURL, toURL, isURL } from './theme.js';
import { Dialog } from './dialog.js';
import { Hud } from './hud.js';
import { Menu } from './menu.js';
import { Title } from './title.js';
import { Screens } from './screens.js';

const STORE_KEY = 'voidpath.settings.v1';
const QUALITIES = ['low', 'medium', 'high'];

// Inert stand-in so the UI never crashes when constructed without an Input (tests, tools).
const NULL_INPUT = {
  context: 'explore', lastDevice: 'keyboard', touchVisible: false,
  pressed: () => false, repeat: () => false, down: () => false, released: () => false, consume() {}, setContext(c) { this.context = c; },
};

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null') || {}; } catch { return {}; }
}

export class UI {
  constructor({ root, input, audio = null, state = null, engine = null, onUseItem = null, items = null, partyDefs = null,
    autoMenu = true, handleMute = true } = {}) {
    installBaseCSS();
    this.root = root || document.getElementById('ui-root');
    this.input = input || NULL_INPUT;
    this.audio = audio;
    this.state = state;
    this.engine = engine;
    this.onUseItem = onUseItem;       // (itemId, memberId) -> { ok, message }   (core/state.js useItemOutOfBattle)
    this.items = items;               // battle/data.js ITEMS (falls back to a built-in table)
    this.partyDefs = partyDefs;       // battle/data.js PARTY_DEFS (accent colours; optional)
    this.autoMenu = autoMenu;         // open the pause menu on 'menu' in the 'explore' context
    this.menuEnabled = true;          // set false during cutscenes to keep the menu shut
    this.handleMute = handleMute;     // 'mute' (M / touch sound button) toggles audio globally
    this.areaName = '';
    this._portraitFn = null;
    this._iconFn = null;
    this._portraitCache = new Map();
    this._iconCache = new Map();
    this._ctxStack = [];
    this._ctxBase = this.input.context;

    this.settings = this._initSettings();

    this.hud = new Hud(this);
    this.dialog = new Dialog(this);
    this.menu = new Menu(this);
    this.title = new Title(this);
    this.screens = new Screens(this);
  }

  // ------------------------------------------------------------------ frame

  update(dt) {
    const inp = this.input;
    if (this.handleMute && inp.pressed('mute')) {
      inp.consume('mute');
      const on = !this.getSetting('sound');
      this.setSetting('sound', on);
      this.hud.toast(on ? 'Sound *on*' : 'Sound *off*', { duration: 1600 });
    }
    const top = this.screens.isOpen ? this.screens
      : this.dialog._active ? this.dialog
        : this.menu.isOpen ? this.menu
          : this.title.isOpen ? this.title : null;
    this.dialog.update(dt, top === this.dialog);
    this.menu.update(dt, top === this.menu);
    this.title.update(dt, top === this.title);
    this.screens.update(dt, top === this.screens);
    if (!top && this.autoMenu && this.menuEnabled && inp.context === 'explore' && inp.pressed('menu')) {
      inp.consume('menu');
      this.menu.open();
    }
    this.hud.update(dt);
  }

  /** Field movement and interaction must pause while this is true. */
  isBlocking() {
    return this.dialog.isOpen || this.menu.isOpen || this.screens.isOpen || this.title.isOpen;
  }

  // ------------------------------------------------------------------ providers

  /** fn(memberId) -> canvas | dataURL (art/characters buildPortrait). */
  setPortraitProvider(fn) {
    this._portraitFn = fn;
    this._portraitCache.clear();
  }

  /** fn(name) -> dataURL (art/icons iconURL). */
  setIconProvider(fn) {
    this._iconFn = fn;
    this._iconCache.clear();
  }

  portraitURL(id) {
    if (!id) return null;
    if (this._portraitCache.has(id)) return this._portraitCache.get(id);
    let url = null;
    if (this._portraitFn) {
      try { url = toURL(this._portraitFn(id)); } catch { url = null; }
    }
    this._portraitCache.set(id, url);
    return url;
  }

  iconURL(name) {
    if (!name) return null;
    let url = this._iconCache.get(name);
    if (url) return url;
    if (this._iconFn) {
      try { url = toURL(this._iconFn(name)); } catch { url = null; }
    }
    url = url || fallbackIconURL(name);
    this._iconCache.set(name, url);
    return url;
  }

  /** <img> for an icon at a pixel-exact CSS size (16 / 32 / 64 keep the art crisp). */
  iconEl(name, size = 16, cls = '') {
    return el('img', { class: `vp-ico ${cls}`.trim(), src: this.iconURL(name), alt: '', width: size, height: size, draggable: 'false' });
  }

  /**
   * Portrait frame for a party member / NPC id: provider pixel art, or an initials badge in the
   * member's accent colour when no provider (or no portrait for that id) exists.
   */
  portraitEl(id, { size = 80, accent, name, ko = false, src } = {}) {
    const node = el('div', { class: `vp-portrait${ko ? ' is-ko' : ''}` });
    node.style.width = node.style.height = `${size}px`;
    this._fillPortrait(node, { url: src ? toURL(src) : this.portraitURL(id), accent: accent || MEMBER_ACCENT[id], name: name || id, size });
    return node;
  }

  // dialog helpers: resolve a line's portrait spec ({ url, accent, name }) or null for none
  _portraitFor(portrait, speaker) {
    if (portrait && typeof portrait !== 'string') return { url: toURL(portrait), name: speaker };
    if (portrait && isURL(portrait)) return { url: portrait, name: speaker };
    const id = portrait || this._memberIdByName(speaker);
    if (!id) return null;
    return { url: this.portraitURL(id), accent: this._accentOf(id), name: speaker || id };
  }

  _fillPortrait(node, { url, accent, name, size }) {
    node.style.setProperty('--acc', accent || 'var(--vp-cyan)');
    if (size) node.style.setProperty('--ps', `${size}px`);
    node.textContent = '';
    if (url) node.appendChild(el('img', { src: url, alt: '', draggable: 'false' }));
    else node.appendChild(el('span', { class: 'vp-initial', text: String(name || '?').trim().charAt(0).toUpperCase() }));
  }

  _memberIdByName(name) {
    if (!name) return null;
    const n = String(name).toLowerCase();
    const m = (this.state && this.state.party || []).find((p) => p.id === n || String(p.name).toLowerCase() === n);
    if (m) return m.id;
    return MEMBER_ACCENT[n] ? n : null;
  }

  _accentOf(id) {
    const m = (this.state && this.state.party || []).find((p) => p.id === id);
    return (m && m.accent) || this.partyDefs?.[id]?.accent || MEMBER_ACCENT[id];
  }

  itemInfo(id) {
    const src = (this.items && this.items[id]) || FALLBACK_ITEMS[id];
    if (src) return src;
    const name = String(id).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return { id, name, desc: '', target: null, key: false };
  }

  // ------------------------------------------------------------------ settings

  _initSettings() {
    const saved = loadSettings();
    const a = this.audio;
    const vol = (a && (a.volume || (a.getVolume && a.getVolume()))) || {};
    const s = {
      sound: saved.sound ?? !(a && a.muted),
      music: saved.music ?? vol.music ?? 0.7,
      sfx: saved.sfx ?? vol.sfx ?? 0.8,
      quality: saved.quality ?? (this.engine && this.engine.quality) ?? 'high',
      textSpeed: saved.textSpeed ?? 'normal',
    };
    // re-apply what the player chose last time (only values they actually saved)
    try {
      if (a) {
        if (saved.music != null || saved.sfx != null) a.setVolume({ music: s.music, sfx: s.sfx });
        if (saved.sound != null && a.setMuted) a.setMuted(!s.sound);
      }
      if (saved.quality && this.engine && this.engine.setQuality && this.engine.quality !== saved.quality) this.engine.setQuality(saved.quality);
    } catch { /* audio / engine not ready: values still show in the menu */ }
    if (this.input.setMutedIndicator) this.input.setMutedIndicator(!s.sound);
    this._saved = saved;
    return s;
  }

  getSetting(id) {
    if (id === 'sound' && this.audio && 'muted' in this.audio) return !this.audio.muted;
    if (id === 'quality' && this.engine && this.engine.quality) return this.engine.quality;
    return this.settings[id];
  }

  setSetting(id, value) {
    const a = this.audio;
    this.settings[id] = value;
    try {
      if (id === 'sound' && a) a.setMuted(!value);
      else if ((id === 'music' || id === 'sfx') && a) a.setVolume({ [id]: value });
      else if (id === 'quality' && this.engine && QUALITIES.includes(value)) this.engine.setQuality(value);
    } catch { /* keep the UI responsive even if a subsystem throws */ }
    if (id === 'sound') {
      if (this.input.setMutedIndicator) this.input.setMutedIndicator(!value);
      this.title._syncSound();
      if (this.menu.isOpen) this.menu._paintSettings();
    }
    this._saved[id] = value;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this._saved)); } catch { /* storage blocked */ }
  }

  // ------------------------------------------------------------------ shared plumbing

  /** Play a UI sound if audio is wired (unknown names are ignored by audio.js). */
  sfx(name, opts) {
    const a = this.audio;
    if (!a || !a.sfx) return;
    try { a.sfx(name, opts); } catch { /* audio is optional for the UI */ }
  }

  // Input context stack: components push while open and pop when they close; the context in
  // force before the first push (e.g. 'explore' or 'battle') comes back when the stack empties.
  // If a state changed the context meanwhile (input.setContext from outside), that one wins.
  _ctxPush(owner, ctx) {
    if (!this._ctxStack.length || this.input.context !== this._ctxApplied) this._ctxBase = this.input.context;
    this._ctxStack = this._ctxStack.filter((e) => e.owner !== owner);
    this._ctxStack.push({ owner, ctx });
    this._setCtx(ctx);
  }

  _ctxPop(owner) {
    const before = this._ctxStack.length;
    this._ctxStack = this._ctxStack.filter((e) => e.owner !== owner);
    if (this._ctxStack.length === before) return;
    if (this.input.context !== this._ctxApplied) this._ctxBase = this.input.context;
    const top = this._ctxStack[this._ctxStack.length - 1];
    this._setCtx(top ? top.ctx : this._ctxBase);
  }

  _setCtx(ctx) {
    this._ctxApplied = ctx;
    this.input.setContext(ctx);
  }
}
