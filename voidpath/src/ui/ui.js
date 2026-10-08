// Field / menu DOM UI. One UI instance owns the dialog box, HUD, pause menu, title overlay,
// full-screen screens and story cards, the shop, the Starchart and the save picker; it routes
// input to whichever of them is on top and keeps the input context (and so the touch overlay) in
// step with what is open.
//
//   const ui = new UI({ root, input, audio, state, engine, onUseItem, items, partyDefs });
//   ui.setPortraitProvider((id) => buildPortrait(id));   // 'sera' or 'sera:sad' -> canvas or dataURL
//   ui.setIconProvider((name) => iconURL(name, 2));      // optional: art/icons.js is the default
//   ui.setHooks({ setLeader, moveMember, optimize, equipNow, journal, mapData, settings, quitToTitle });
//   ui.registerSpeaker('WARDEN', { sigil: 'warden_sigil', accent: '#ffd27a', textSpeed: 0.6, sfx: 'choir', mood: 'warden' });
//   each frame: input.update(); ui.update(dt); state.update(dt);
//
// Components: ui.dialog, ui.hud, ui.menu, ui.title, ui.screens, ui.cards, ui.shop, ui.starchart,
// ui.saves (see each module's header). Game rules come from core/progression.js and core/shop.js;
// pass `rules` to override them (previews, tests).
//
// Hooks (TECH_PLAN 8.1; S2a wires them in main.js). Every hook is optional:
//   setLeader(id), moveMember(id, toIndex)   Party tab formation (default: edit ui.state in place)
//   optimize(memberId)                       Equip tab "Optimize" (default: rules.optimize + rules.equip)
//   equipNow(memberId, itemId)               shop "Equip now?" (default: rules.equip)
//   journal() -> story.journal() shape       Journal tab
//   mapData() -> MapData (see ui/map.js)     Map tab
//   settings(patch)                          a game setting changed: { difficulty, encounters, battleSpeed,
//                                            skipWeak, quality }; setHooks also calls it once with every
//                                            game setting so the game can apply the stored values at boot
//   quitToTitle()                            Settings "Return to title" after its confirm

import { el } from '../core/util.js';
import { installBaseCSS, FALLBACK_ITEMS, MEMBER_ACCENT, fallbackIconURL, toURL, isURL, loadSettings, storeSettings } from './theme.js';
import { iconURL as artIconURL } from '../art/icons.js';
import * as progression from '../core/progression.js';
import * as shopRules from '../core/shop.js';
import { Dialog } from './dialog.js';
import { Hud } from './hud.js';
import { Menu } from './menu.js';
import { Title } from './title.js';
import { Screens } from './screens.js';
import { Cards } from './cards.js';
import { Shop } from './shop.js';
import { Starchart } from './starchart.js';
import { Saves } from './saves.js';

const QUALITIES = ['low', 'medium', 'high'];
/** Settings the game applies (difficulty, encounter rate, battle speed, ...); the rest are UI / audio. */
export const GAME_SETTINGS = ['difficulty', 'encounters', 'battleSpeed', 'skipWeak', 'quality'];
const DEFAULTS = { textSpeed: 'normal', difficulty: 'normal', encounters: 'normal', battleSpeed: 1, skipWeak: true };

// Inert stand-in so the UI never crashes when constructed without an Input (tests, tools).
const NULL_INPUT = {
  context: 'explore', lastDevice: 'keyboard', touchVisible: false,
  pressed: () => false, repeat: () => false, down: () => false, released: () => false, consume() {}, setContext(c) { this.context = c; },
};

export class UI {
  constructor({ root, input, audio = null, state = null, engine = null, onUseItem = null, items = null, partyDefs = null,
    rules = null, autoMenu = true, handleMute = true } = {}) {
    installBaseCSS();
    this.root = root || document.getElementById('ui-root');
    this.input = input || NULL_INPUT;
    this.audio = audio;
    this.state = state;
    this.engine = engine;
    this.onUseItem = onUseItem;       // (itemId, memberId) -> { ok, message }   (core/state.js useItemOutOfBattle)
    this.items = items;               // battle/data.js ITEMS (falls back to a built-in table)
    this.partyDefs = partyDefs;       // battle/data.js PARTY_DEFS (accent colours; optional)
    this.rules = { ...progression, ...shopRules, ...rules };
    this.autoMenu = autoMenu;         // open the pause menu on 'menu' in the 'explore' context
    this.menuEnabled = true;          // set false during cutscenes to keep the menu shut
    this.handleMute = handleMute;     // 'mute' (M / touch sound button) toggles audio globally
    this.areaName = '';               // area under the leader (menu header)
    this.locationName = '';           // map name from the last location banner (menu header)
    this.hooks = {};
    this.speakers = {};
    this._portraitFn = null;
    this._iconFn = (name) => artIconURL(name, 2);
    this._portraitCache = new Map();
    this._iconCache = new Map();
    this._ctxStack = [];
    this._ctxBase = this.input.context;

    this.settings = this._initSettings();

    this.hud = new Hud(this);
    this.dialog = new Dialog(this);
    this.menu = new Menu(this);
    this.shop = new Shop(this);
    this.starchart = new Starchart(this);
    this.title = new Title(this);
    this.cards = new Cards(this);
    this.screens = new Screens(this);
    this.saves = new Saves(this);
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
    // topmost first: the save picker opens over the title and the game-over screen
    const top = this.saves.isOpen ? this.saves
      : this.cards.isBlocking ? this.cards
        : this.screens.isOpen ? this.screens
          : this.shop.isOpen ? this.shop
            : this.starchart.isOpen ? this.starchart
              : this.dialog._active ? this.dialog
                : this.menu.isOpen ? this.menu
                  : this.title.isOpen ? this.title : null;
    for (const c of [this.dialog, this.menu, this.title, this.screens, this.cards, this.shop, this.starchart, this.saves]) c.update(dt, top === c);
    // never during a transition: a menu opened in the encounter shatter would stay over the battle
    const transitioning = !!(this.engine && this.engine.transitioning);
    if (!top && this.autoMenu && this.menuEnabled && !transitioning && inp.context === 'explore' && inp.pressed('menu')) {
      inp.consume('menu');
      this.menu.open();
    }
    this.hud.update(dt);
  }

  /** Field movement and interaction must pause while this is true. */
  isBlocking() {
    return this.dialog.isOpen || this.menu.isOpen || this.screens.isOpen || this.title.isOpen || this.cards.isBlocking
      || this.shop.isOpen || this.starchart.isOpen || this.saves.isOpen;
  }

  // ------------------------------------------------------------------ hooks and speakers

  /** Merge game hooks (see header). A `settings` hook immediately receives every game setting. */
  setHooks(hooks = {}) {
    Object.assign(this.hooks, hooks);
    if (hooks.settings) this.hook('settings', Object.fromEntries(GAME_SETTINGS.map((k) => [k, this.getSetting(k)])));
  }

  /** Call a hook if wired; errors are reported, never thrown into the UI loop. */
  hook(name, ...args) {
    const fn = this.hooks[name];
    if (!fn) return undefined;
    try { return fn(...args); } catch (e) { console.error(`ui hook ${name} failed:`, e); return undefined; }
  }

  /**
   * Register a dialog speaker by display name (case-insensitive):
   * { portrait, accent, sigil?, textSpeed?, sfx?, mood? }. sigil: icon shown instead of a portrait
   * (with the gold sigil styling of the box); textSpeed: reveal speed multiplier; sfx: sound per box
   * (it replaces the text tick); mood: read by the cutscene runner through ui.speaker(name).mood.
   */
  registerSpeaker(name, def = {}) {
    this.speakers[String(name).toUpperCase()] = { ...def };
  }

  speaker(name) {
    return name ? this.speakers[String(name).toUpperCase()] || null : null;
  }

  /** Display name of a member id for toasts ('sera' -> 'SERA'). */
  memberName(id) {
    return this._member(id)?.name || this.partyDefs?.[id]?.name || String(id || '').toUpperCase();
  }

  /** Class line of a member id ('Medic'), or '' for non-members. */
  memberClass(id) {
    return this._member(id)?.cls || this.partyDefs?.[id]?.cls || '';
  }

  _member(id) {
    return (this.state?.roster && this.state.roster[id]) || (this.state?.party || []).find((p) => p.id === id) || null;
  }

  // ------------------------------------------------------------------ providers

  /** fn(portraitId) -> canvas | dataURL (art/characters buildPortrait; ids may carry ':expr'). */
  setPortraitProvider(fn) {
    this._portraitFn = fn;
    this._portraitCache.clear();
  }

  /** fn(name) -> dataURL; null switches to the built-in fallback glyphs. Default: art/icons.js. */
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

  /** 120 px sigil image (40 px art at 3x) for sigil speakers. */
  sigilURL(name) {
    return artIconURL(name, 3);
  }

  /** <img> for an icon at a pixel-exact CSS size (16 / 32 / 64 keep the art crisp). */
  iconEl(name, size = 16, cls = '') {
    return el('img', { class: `vp-ico ${cls}`.trim(), src: this.iconURL(name), alt: '', width: size, height: size, draggable: 'false' });
  }

  /** Icon name of an item: ITEMS[id].icon, else the id itself. */
  itemIcon(id) {
    return this.itemInfo(id).icon || id;
  }

  /**
   * Portrait frame for a party member / NPC id ('sera' or 'sera:sad'): provider pixel art, or an
   * initials badge in the member's accent colour when no provider (or no portrait) exists.
   */
  portraitEl(id, { size = 80, accent, name, ko = false, src } = {}) {
    const node = el('div', { class: `vp-portrait${ko ? ' is-ko' : ''}` });
    node.style.width = node.style.height = `${size}px`;
    const base = String(id || '').split(':')[0];
    this._fillPortrait(node, { url: src ? toURL(src) : this.portraitURL(id), accent: accent || this._accentOf(base), name: name || this.memberName(base), size });
    return node;
  }

  // dialog helper: a line's portrait spec ({ url, accent, name }) or null for none
  _portraitFor(portrait, speaker, accent) {
    if (portrait && typeof portrait !== 'string') return { url: toURL(portrait), name: speaker, accent };
    if (portrait && isURL(portrait)) return { url: portrait, name: speaker, accent };
    const id = portrait || this._memberIdByName(speaker);
    if (!id) return null;
    return { url: this.portraitURL(id), accent: accent || this._accentOf(id.split(':')[0]), name: speaker || id };
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
      ...DEFAULTS,
      sound: !(a && a.muted),
      music: vol.music ?? 0.7,
      sfx: vol.sfx ?? 0.8,
      quality: (this.engine && this.engine.quality) ?? 'high',
    };
    for (const k of Object.keys(s)) if (saved[k] != null) s[k] = saved[k];
    // re-apply what the player chose last time (only values they actually saved)
    try {
      if (a) {
        if (saved.music != null || saved.sfx != null) a.setVolume({ music: s.music, sfx: s.sfx });
        if (saved.sound != null && a.setMuted) a.setMuted(!s.sound);
      }
      if (saved.quality && this.engine && this.engine.setQuality && this.engine.quality !== saved.quality) this.engine.setQuality(saved.quality);
    } catch { /* audio / engine not ready: values still show in the menu */ }
    if (this.input.setMutedIndicator) this.input.setMutedIndicator(!s.sound);
    return s;
  }

  getSetting(id) {
    if (id === 'sound' && this.audio && 'muted' in this.audio) return !this.audio.muted;
    if (id === 'quality' && this.engine && this.engine.quality) return this.engine.quality;
    return this.settings[id];
  }

  /** Change a setting: applies audio / quality, stores it, and tells the game through hooks.settings. */
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
      if (this.menu.isOpen) this.menu.repaint();
    }
    // a quality picked here is the player's (perf.js stores its automatic drops as quality + qualityAuto)
    storeSettings(id === 'quality' ? { quality: value, qualityAuto: false } : { [id]: value });
    if (GAME_SETTINGS.includes(id)) this.hook('settings', { [id]: value });
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

  /** Pop `owner`; `base` replaces the context restored when the stack empties (the title leaves 'title'). */
  _ctxPop(owner, base) {
    const before = this._ctxStack.length;
    this._ctxStack = this._ctxStack.filter((e) => e.owner !== owner);
    if (this._ctxStack.length === before) return;
    if (this.input.context !== this._ctxApplied) this._ctxBase = this.input.context;
    if (base) this._ctxBase = base;
    const top = this._ctxStack[this._ctxStack.length - 1];
    this._setCtx(top ? top.ctx : this._ctxBase);
  }

  _setCtx(ctx) {
    this._ctxApplied = ctx;
    this.input.setContext(ctx);
  }
}
