// Shop window: Buy / Sell tabs, credits, owned counts, a quantity stepper for consumables,
// per-member comparison arrows for gear, and the keeper's portrait and lines in a dialog strip.
// After buying gear that someone can wear and that beats their current piece, it asks "Equip now?"
// with that member's portrait (ui.hooks.equipNow, else rules.equip).
//
//   ui.shop.open({ shop /* ShopDef */, stock /* shopStock(): [{ item, price, owned }] */ }) -> Promise
//     resolves when the shop closes. ShopDef = { name, keeper, portrait, greeting, sellRate }.
// Buying and selling go through rules.buy(itemId, n, price) / rules.sell(itemId, n, rate)
// (core/shop.js); sfx 'buy', 'sell', 'error'. Q/E (LB/RB) or a tap switch Buy / Sell.

import { el, injectCSS } from '../core/util.js';
import { bindPointer, onTap, glyph, fmtNum } from './theme.js';
import { Popup } from './popup.js';
import { gearTags, STAT_LABEL } from './equip.js';

const CSS = `
.vp-shop { z-index: 42; opacity: 0; visibility: hidden; transition: opacity .2s var(--vp-ease-out), visibility 0s linear .2s; }
.vp-shop.is-open { opacity: 1; visibility: visible; transition: opacity .2s var(--vp-ease-out); }
.vp-shop-scrim { position: absolute; inset: 0; background: radial-gradient(120% 90% at 50% 45%, rgba(5,7,13,.45), rgba(5,7,13,.82)); }
.vp-shop-win { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); box-sizing: border-box;
  width: min(1080px, calc(100% - 48px)); height: min(680px, calc(100% - 40px));
  display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; }
.vp-shop-head { display: flex; align-items: center; gap: 18px; padding: 14px 18px 12px 26px; border-bottom: 1px solid var(--vp-line-dim);
  background: linear-gradient(90deg, rgba(255,197,96,.07), rgba(255,197,96,0) 60%); }
.vp-shop-head .vp-menu-kicker { color: var(--vp-amber); }
.vp-shop-name { margin-top: 6px; font: 700 26px/1 var(--vp-font-display); letter-spacing: .18em; text-transform: uppercase; color: #f4f9ff; }
.vp-shop-tabs { display: flex; margin-left: 28px; border: 1px solid var(--vp-line-dim); }
.vp-shop-tab { min-width: 96px; height: 38px; display: grid; place-items: center; cursor: pointer; font: 600 14px var(--vp-font-ui); letter-spacing: .24em; text-transform: uppercase; color: var(--vp-ink-faint); }
.vp-shop-tab + .vp-shop-tab { border-left: 1px solid var(--vp-line-dim); }
.vp-shop-tab.is-on { color: var(--vp-amber); background: rgba(255,197,96,.12); box-shadow: inset 0 -2px 0 var(--vp-amber); }
.vp-shop-cr { margin-left: auto; display: flex; align-items: center; gap: 10px; padding: 8px 14px; border: 1px solid rgba(255,197,96,.35); }
.vp-shop-cr .vp-num { font-size: 20px; font-weight: 700; color: var(--vp-amber); }
.vp-shop-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 380px); gap: 22px; padding: 16px 20px; min-height: 0; }
.vp-shop-list { display: flex; flex-direction: column; gap: 2px; min-height: 0; }
.vp-shop-row { min-height: 52px; font: 600 16px var(--vp-font-ui); letter-spacing: .04em; }
.vp-shop-row .vp-ico { width: 32px; height: 32px; }
.vp-shop-row .n { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vp-shop-row .own { min-width: 44px; text-align: right; font: 600 14px var(--vp-font-display); color: var(--vp-ink-faint); }
.vp-shop-row .pr { min-width: 86px; display: flex; justify-content: flex-end; align-items: center; gap: 6px; font: 600 17px var(--vp-font-display); color: var(--vp-amber); }
.vp-shop-row .pr .vp-ico { width: 16px; height: 16px; }
.vp-shop-row.is-poor .pr { color: #a7845a; }
.vp-shop-detail { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: auto; }
.vp-shop-detail .vp-item-name { font: 700 20px/1.1 var(--vp-font-display); letter-spacing: .1em; color: #fff; }
.vp-shop-detail .vp-item-desc { font: 400 15px/1.5 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-shop-big { width: 64px; height: 64px; }
.vp-shop-who { display: grid; gap: 6px; padding-top: 8px; border-top: 1px solid rgba(140,214,255,.12); }
.vp-shop-mem { display: grid; grid-template-columns: 32px 64px minmax(0, 1fr); align-items: center; gap: 10px; min-height: 36px; }
.vp-shop-mem .vp-portrait { width: 32px; height: 32px; --ps: 32px; }
.vp-shop-mem b { font: 700 13px var(--vp-font-display); letter-spacing: .14em; }
.vp-shop-mem span { font: 600 14px var(--vp-font-display); letter-spacing: .04em; color: var(--vp-ink-faint); }
.vp-shop-mem .up { color: var(--vp-hp); } .vp-shop-mem .dn { color: #ff8a96; } .vp-shop-mem .eq { color: var(--vp-ink-dim); }
.vp-shop-mem.is-no { opacity: .45; }
.vp-shop-qty { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; margin-top: auto; padding: 12px 14px; border: 1px solid rgba(255,197,96,.4); background: rgba(255,197,96,.06); }
.vp-shop-qty .vp-num { text-align: center; font-size: 26px; font-weight: 700; color: #fff; }
.vp-shop-qty .tot { grid-column: 1 / -1; display: flex; justify-content: space-between; font: 600 13px var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-shop-qty .tot b { color: var(--vp-amber); font: 700 17px var(--vp-font-display); letter-spacing: .04em; }
.vp-shop-qty .tot b.is-err { color: #ff8a96; }
.vp-shop-keep { position: relative; display: flex; align-items: center; gap: 16px; margin: 0 16px 12px; padding: 12px 18px 12px 12px; }
.vp-shop-keep .vp-portrait { width: 64px; height: 64px; --ps: 64px; }
.vp-shop-keep b { display: block; margin-bottom: 6px; font: 700 13px/1 var(--vp-font-display); letter-spacing: .3em; color: var(--vp-amber); }
.vp-shop-keep span { font: 500 17px/1.45 var(--vp-font-ui); color: var(--vp-ink); }
.vp-shop-keep span.is-err { color: #ffb0b8; }
.vp-shop-foot { display: flex; align-items: center; gap: 22px; min-height: 40px; padding: 4px 22px 8px; border-top: 1px solid var(--vp-line-dim); }
.vp-shop-foot.is-touch { display: none; }
@media (max-width: 760px) {
  .vp-shop-win { width: calc(100% - 16px); height: calc(100% - 16px - var(--vp-safe-top) - var(--vp-safe-bottom)); }
  .vp-shop-head { flex-wrap: wrap; padding: 12px 12px 10px 16px; row-gap: 10px; }
  .vp-shop-name { font-size: 20px; }
  .vp-shop-tabs { order: 3; margin-left: 0; flex: 1; }
  .vp-shop-tab { flex: 1; min-width: 0; height: 40px; }
  .vp-shop-cr { padding: 6px 10px; }
  .vp-shop-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; gap: 10px; padding: 10px 10px; }
  .vp-shop-detail { padding: 12px 14px; gap: 8px; max-height: 40vh; }
  .vp-shop-big { display: none; }
  .vp-shop-detail .vp-item-desc { font-size: 14px; }
  .vp-shop-keep { margin: 0 8px 8px; padding: 8px 12px 8px 8px; gap: 12px; }
  .vp-shop-keep .vp-portrait { width: 48px; height: 48px; --ps: 48px; }
  .vp-shop-keep span { font-size: 15px; }
  .vp-shop-row .own { display: none; }
}
`;

const BUY_LINES = ['Pleasure doing business.', 'Spend wisely. Or don’t. Your credits.', 'Good choice. Probably.'];

export class Shop {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-shop', CSS);
    this.isOpen = false;
    this.tab = 'buy';
    this.mode = 'list';           // 'list' | 'qty'
    this._sel = 0;
    this._qty = 1;
    this._buys = 0;

    this.title = el('div', { class: 'vp-shop-name' });
    this.creditsEl = el('span', { class: 'vp-num' });
    this.tabEls = ['buy', 'sell'].map((id) => {
      const t = el('div', { class: 'vp-shop-tab', role: 'tab', text: id === 'buy' ? 'Buy' : 'Sell' });
      onTap(t, () => this._setTab(id, true));
      return t;
    });
    const close = el('div', { class: 'vp-menu-close', role: 'button', 'aria-label': 'Leave shop' }, [el('i')]);
    onTap(close, () => this.close());
    const head = el('div', { class: 'vp-shop-head' }, [
      el('div', {}, [el('div', { class: 'vp-cap vp-menu-kicker', text: 'Shop' }), this.title]),
      el('div', { class: 'vp-shop-tabs', role: 'tablist' }, this.tabEls),
      el('div', { class: 'vp-shop-cr' }, [ui.iconEl('credits', 16), el('span', { class: 'vp-cap', text: 'Credits' }), this.creditsEl]),
      close,
    ]);
    this.list = el('div', { class: 'vp-shop-list vp-scroll', role: 'listbox' });
    this.detail = el('div', { class: 'vp-panel vp-shop-detail' });
    this.keepPor = el('div', { class: 'vp-portrait' });
    this.keepName = el('b');
    this.keepText = el('span');
    this.keep = el('div', { class: 'vp-panel vp-rich vp-shop-keep' }, [this.keepPor, el('div', {}, [this.keepName, this.keepText])]);
    this.foot = el('div', { class: 'vp-shop-foot' });
    this.win = el('div', { class: 'vp-panel vp-rich vp-shop-win' }, [head, el('div', { class: 'vp-shop-body' }, [this.list, this.detail]), this.keep, this.foot]);
    this.popup = new Popup(ui, this.win);
    const scrim = el('div', { class: 'vp-shop-scrim' });
    onTap(scrim, () => this.close());
    this.root = el('div', { class: 'vp-layer vp-shop', role: 'dialog', 'aria-label': 'Shop' }, [scrim, this.win]);
    ui.root.appendChild(this.root);
  }

  get state() { return this.ui.state || {}; }

  open({ shop = {}, stock = [] } = {}) {
    if (this.isOpen) this.close();
    this.shop = shop;
    this.stock = stock;
    this.tab = 'buy';
    this.mode = 'list';
    this._sel = 0;
    this._buys = 0;
    this.isOpen = true;
    this.title.textContent = shop.name || 'Shop';
    this.keepName.textContent = shop.keeper || '';
    this.ui._fillPortrait(this.keepPor, { url: this.ui.portraitURL(shop.portrait), name: shop.keeper, size: 64 });
    this._say(shop.greeting || 'Take a look.');
    this.ui._ctxPush('shop', 'menu');
    this.ui.sfx('menuOpen');
    this._device = null;
    this._render();
    this.root.classList.add('is-open', 'is-live');
    return new Promise((resolve) => { this._resolve = resolve; });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.popup.isOpen) this.popup.close(-1);
    this.root.classList.remove('is-open', 'is-live');
    this.ui.sfx('menuClose');
    this.ui._ctxPop('shop');
    const r = this._resolve;
    this._resolve = null;
    if (r) r();
  }

  update(dt, focused) {
    if (!this.isOpen) return;
    const dev = this.ui.input.lastDevice;
    if (dev !== this._device) { this._device = dev; this._hints(); }
    if (!focused) return;
    const inp = this.ui.input;
    if (this.popup.isOpen) { this.popup.input(inp); return; }
    if (inp.pressed('boostUp') || inp.pressed('boostDown')) {
      inp.consume('boostUp'); inp.consume('boostDown');
      this._setTab(this.tab === 'buy' ? 'sell' : 'buy', true);
      return;
    }
    const rows = this._entries();
    if (this.mode === 'qty') {
      const max = this._maxQty(rows[this._sel]);
      let q = this._qty;
      if (inp.repeat('left')) { inp.consume('left'); q--; } else if (inp.repeat('right')) { inp.consume('right'); q++; } else if (inp.repeat('up')) { inp.consume('up'); q += 10; } else if (inp.repeat('down')) { inp.consume('down'); q -= 10; }
      q = Math.max(1, Math.min(max, q));
      if (q !== this._qty) { this._qty = q; this.ui.sfx('cursor'); this._paintDetail(); }
      if (inp.pressed('confirm')) { inp.consume('confirm'); this._commit(rows[this._sel], this._qty); } else if (inp.pressed('cancel')) { inp.consume('cancel'); this.ui.sfx('cancel'); this.mode = 'list'; this._paintDetail(); this._hints(); }
      return;
    }
    const n = rows.length;
    if (n && inp.repeat('up')) { inp.consume('up'); this._select((this._sel + n - 1) % n); } else if (n && inp.repeat('down')) { inp.consume('down'); this._select((this._sel + 1) % n); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._choose(); } else if (inp.pressed('cancel') || inp.pressed('menu')) { inp.consume('cancel'); inp.consume('menu'); this.close(); }
  }

  // ------------------------------------------------------------------ data

  _owned(id) {
    const worn = (this.state.party || []).filter((m) => m.equip && Object.values(m.equip).includes(id)).length;
    return ((this.state.inventory || {})[id] || 0) + worn;
  }

  _sellPrice(id) {
    return Math.floor((this.ui.itemInfo(id).price || 0) * (this.shop.sellRate ?? 0.5));
  }

  /** Rows of the current tab: [{ id, price, info }]. */
  _entries() {
    if (this.tab === 'buy') return this.stock.map((s) => ({ id: s.item, price: s.price, info: this.ui.itemInfo(s.item) }));
    const inv = this.state.inventory || {};
    return Object.keys(inv).filter((id) => inv[id] > 0 && !this.ui.itemInfo(id).key)
      .map((id) => ({ id, price: this._sellPrice(id), info: this.ui.itemInfo(id) }));
  }

  _maxQty(row) {
    if (!row) return 1;
    if (this.tab === 'sell') return Math.max(1, (this.state.inventory || {})[row.id] || 0);
    return Math.max(1, Math.min(99, Math.floor((this.state.credits || 0) / Math.max(1, row.price))));
  }

  // ------------------------------------------------------------------ rendering

  _setTab(id, sound) {
    if (this.tab === id && this.mode === 'list') return;
    this.tab = id;
    this.mode = 'list';
    this._sel = 0;
    if (sound) this.ui.sfx('cursor');
    this._say(id === 'sell' ? 'Let’s see what you dragged in.' : (this.shop.greeting || 'Take a look.'));
    this._render();
  }

  _render() {
    this.tabEls.forEach((t, i) => t.classList.toggle('is-on', (i === 0) === (this.tab === 'buy')));
    this.creditsEl.textContent = fmtNum(this.state.credits || 0);
    const rows = this._entries();
    this._sel = Math.min(this._sel, Math.max(0, rows.length - 1));
    const credits = this.state.credits || 0;
    this._rows = rows.map((r, i) => {
      const row = el('div', { class: `vp-row vp-shop-row${this.tab === 'buy' && r.price > credits ? ' is-poor' : ''}`, role: 'option' }, [
        this.ui.iconEl(this.ui.itemIcon(r.id), 32),
        el('span', { class: 'n', text: r.info.name }),
        el('span', { class: 'own', text: this.tab === 'buy' ? `×${this._owned(r.id)}` : `×${(this.state.inventory || {})[r.id]}` }),
        el('span', { class: 'pr' }, [this.ui.iconEl('credits', 16), fmtNum(r.price)]),
      ]);
      bindPointer(row, {
        onHover: () => { if (this.mode === 'list' && this._sel !== i) this._select(i); },
        onActivate: () => { if (this.popup.isOpen) return; if (this._sel !== i || this.mode !== 'list') { this.mode = 'list'; this._select(i, false); } this._choose(); },
      });
      return row;
    });
    this.list.replaceChildren(...(rows.length ? this._rows : [el('div', { class: 'vp-empty', text: this.tab === 'buy' ? 'Sold out.' : 'Nothing worth selling.' })]));
    this._select(this._sel, false);
    this._hints();
  }

  _select(i, sound = true) {
    if (sound && i !== this._sel) this.ui.sfx('cursor');
    this._sel = i;
    this._rows.forEach((r, k) => r.classList.toggle('is-sel', k === i));
    if (this._rows[i]) this._rows[i].scrollIntoView({ block: 'nearest' });
    this._paintDetail();
  }

  _paintDetail() {
    const row = this._entries()[this._sel];
    const d = this.detail;
    d.textContent = '';
    if (!row) return;
    const { id, info } = row;
    d.append(
      this.ui.iconEl(this.ui.itemIcon(id), 64, 'vp-shop-big'),
      el('div', { class: 'vp-item-name', text: info.name }),
      el('div', { class: 'vp-item-desc', text: info.desc || '' }),
      el('div', { class: 'vp-tags' }, info.equip ? gearTags(this.ui, info) : [el('span', { class: 'vp-tag', text: `Owned ×${this._owned(id)}` })]),
    );
    if (info.equip) d.appendChild(this._whoCanWear(id, info));
    if (this.mode === 'qty') {
      const total = row.price * this._qty;
      const short = this.tab === 'buy' && total > (this.state.credits || 0);
      const minus = onTap(el('div', { class: 'vp-step', text: '−' }), () => this._step(-1));
      const plus = onTap(el('div', { class: 'vp-step', text: '+' }), () => this._step(1));
      const num = onTap(el('span', { class: 'vp-num', text: String(this._qty) }), () => this._commit(row, this._qty));
      d.appendChild(el('div', { class: 'vp-shop-qty' }, [minus, num, plus,
        el('div', { class: 'tot' }, [this.tab === 'buy' ? 'Total' : 'You get', el('b', { class: short ? 'is-err' : null, text: `${fmtNum(total)} cr` })])]));
    }
  }

  _step(d) {
    const max = this._maxQty(this._entries()[this._sel]);
    const q = Math.max(1, Math.min(max, this._qty + d));
    if (q !== this._qty) { this._qty = q; this.ui.sfx('cursor'); this._paintDetail(); }
  }

  /** Per-member arrows for gear: the stat changes against what each member wears now. */
  _whoCanWear(id, info) {
    const slot = info.equip.slot;
    return el('div', { class: 'vp-shop-who' }, (this.state.party || []).map((m) => {
      const can = this.ui.rules.canEquip(m, id);
      const d = can ? this.ui.rules.equipDelta(m, slot, id) : null;
      const parts = d ? Object.keys(STAT_LABEL).filter((k) => d[k]).map((k) => el('span', { class: d[k] > 0 ? 'up' : 'dn', text: `${d[k] > 0 ? '▲' : '▼'}${STAT_LABEL[k]} ${Math.abs(d[k])}  ` })) : [];
      const worn = m.equip && m.equip[slot] === id;
      return el('div', { class: `vp-shop-mem${can ? '' : ' is-no'}` }, [
        this.ui.portraitEl(m.id, { size: 32 }),
        el('b', { text: m.name }),
        el('span', {}, can ? (worn ? [el('span', { class: 'eq', text: 'Equipped' })] : parts.length ? parts : [el('span', { class: 'eq', text: 'No change' })]) : ['Can’t equip']),
      ]);
    }));
  }

  _say(text, err = false) {
    this.keepText.textContent = text;
    this.keepText.classList.toggle('is-err', err);
  }

  _hints() {
    const dev = this.ui.input.lastDevice;
    const add = (a, l) => el('span', { class: 'vp-hint' }, [glyph(a, dev), l]);
    this.foot.classList.toggle('is-touch', dev === 'touch');
    this.foot.replaceChildren(...(this.mode === 'qty'
      ? [add('adjust', 'Quantity'), add('confirm', this.tab === 'buy' ? 'Buy' : 'Sell'), add('cancel', 'Back')]
      : [add('move', 'Select'), add('confirm', this.tab === 'buy' ? 'Buy' : 'Sell'), add('tabs', this.tab === 'buy' ? 'Sell tab' : 'Buy tab'), add('cancel', 'Leave')]));
  }

  // ------------------------------------------------------------------ actions

  _choose() {
    const row = this._entries()[this._sel];
    if (!row) { this.ui.sfx('error'); return; }
    if (this.tab === 'buy' && row.price > (this.state.credits || 0)) { this.ui.sfx('error'); this._say('Credits first. That’s the rule.', true); return; }
    const many = this.tab === 'buy' ? !row.info.equip && this._maxQty(row) > 1 : ((this.state.inventory || {})[row.id] || 0) > 1;
    if (!many) { this._commit(row, 1); return; }
    this.mode = 'qty';
    this._qty = 1;
    this.ui.sfx('confirm');
    this._paintDetail();
    this._hints();
  }

  _commit(row, n) {
    const r = this.tab === 'buy' ? this.ui.rules.buy(row.id, n, row.price) : this.ui.rules.sell(row.id, n, this.shop.sellRate ?? 0.5);
    const res = r || { ok: false, message: '' };
    this.mode = 'list';
    if (!res.ok) {
      this.ui.sfx('error');
      this._say(res.message || 'No deal.', true);
      this._render();
      return;
    }
    this.ui.sfx(this.tab === 'buy' ? 'buy' : 'sell');
    this._say(res.message || BUY_LINES[this._buys++ % BUY_LINES.length]);
    this._render();
    if (this.tab === 'buy' && row.info.equip) this._offerEquip(row);
  }

  /** "Equip now?" for the member who gains the most from the new piece (if anyone does). */
  async _offerEquip(row) {
    const slot = row.info.equip.slot;
    const gain = (m) => {
      const d = this.ui.rules.equipDelta(m, slot, row.id) || {};
      return (d.atk || 0) + (d.def || 0) + (d.mag || 0) + (d.res || 0) + (d.spd || 0) + (d.maxHp || 0) / 10 + (d.maxEp || 0) / 5;
    };
    const best = (this.state.party || []).filter((m) => this.ui.rules.canEquip(m, row.id) && !(m.equip && m.equip[slot] === row.id))
      .map((m) => ({ m, g: gain(m) })).filter((x) => x.g > 0).sort((a, b) => b.g - a.g)[0];
    if (!best) return;
    const m = best.m;
    const k = await this.popup.open({
      title: 'Equip now?', text: `${row.info.name} beats what ${m.name} is wearing.`,
      portrait: m.id, options: [`Equip on ${m.name}`, 'Not now'], cancelIndex: 1,
    });
    if (k !== 0) return;
    const res = this.ui.hooks.equipNow ? this.ui.hook('equipNow', m.id, row.id) : this.ui.rules.equip(m, slot, row.id);
    this.ui.sfx(res && res.ok === false ? 'error' : 'equip');
    this._say(res && res.ok === false ? (res.message || 'That didn’t fit.') : `${m.name} suits up. Looks good on you.`, !!(res && res.ok === false));
    this._render();
  }
}
