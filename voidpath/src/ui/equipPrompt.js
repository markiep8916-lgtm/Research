// "Equip now?": offers a new piece of gear to the party member it suits best. The shop asks it
// after a purchase (inside the shop window); the field asks it after a chest (G2 W-2/U-1) through
// ui.equipPrompt(itemId, members), in its own layer with the same popup, keys and taps.
//
//   ui.equipBox.offer(itemId, { members, popup }) -> Promise<{ member, ok, message } | null>
//     null when nobody gains from the piece (no popup) or the player says "Not now"; else the
//     equip result (ui.hooks.equipNow(memberId, itemId), else rules.equip). `popup` draws the
//     question inside a host window (the shop's); the default is the field layer below.
//   ui.equipPrompt(itemId, members)   the same in the field layer; blocks the field while open
//   bestWearer(ui, itemId, members) -> { member, gain } | null   who gains the most (by stat sum)

import { el, injectCSS } from '../core/util.js';
import { Popup } from './popup.js';

const CSS = `
.vp-eqp { z-index: 43; }
`;

/** The member (of `members`, default the party) that gains the most from wearing `itemId`. */
export function bestWearer(ui, itemId, members) {
  const info = ui.itemInfo(itemId);
  if (!info.equip) return null;
  const slot = info.equip.slot;
  const gain = (m) => {
    const d = ui.rules.equipDelta(m, slot, itemId) || {};
    return (d.atk || 0) + (d.def || 0) + (d.mag || 0) + (d.res || 0) + (d.spd || 0) + (d.maxHp || 0) / 10 + (d.maxEp || 0) / 5;
  };
  const pool = members || (ui.state && ui.state.party) || [];
  const best = pool.filter((m) => m && ui.rules.canEquip(m, itemId) && !(m.equip && m.equip[slot] === itemId))
    .map((m) => ({ member: m, gain: gain(m) })).filter((x) => x.gain > 0).sort((a, b) => b.gain - a.gain)[0];
  return best || null;
}

export class EquipPrompt {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-equip-prompt', CSS);
    this.root = el('div', { class: 'vp-layer vp-eqp', role: 'dialog', 'aria-label': 'Equip now' });
    ui.root.appendChild(this.root);
    this.popup = new Popup(ui, this.root);
    this._field = false;
  }

  /** True while the field-layer question is up (the shop's own popup is the shop's business). */
  get isOpen() { return this._field && this.popup.isOpen; }

  update(dt, focused) {
    if (focused && this.isOpen) this.popup.input(this.ui.input);
  }

  async offer(itemId, { members, popup = null } = {}) {
    const ui = this.ui;
    const best = bestWearer(ui, itemId, members);
    if (!best) return null;
    const m = best.member;
    const info = ui.itemInfo(itemId);
    const field = !popup;
    const pop = popup || this.popup;
    if (field) {
      this._field = true;
      this.root.classList.add('is-live');
      ui._ctxPush('equipPrompt', 'menu');
      ui.sfx('menuOpen');
    }
    let k;
    try {
      k = await pop.open({
        title: 'Equip now?', text: `${info.name} beats what ${m.name} is wearing.`,
        portrait: m.id, options: [`Equip on ${m.name}`, 'Not now'], cancelIndex: 1,
      });
    } finally {
      if (field) {
        this._field = false;
        this.root.classList.remove('is-live');
        ui._ctxPop('equipPrompt');
      }
    }
    if (k !== 0) return null;
    const res = ui.hooks.equipNow ? ui.hook('equipNow', m.id, itemId) : ui.rules.equip(m, info.equip.slot, itemId);
    const ok = !(res && res.ok === false);
    ui.sfx(ok ? 'equip' : 'error');
    if (field && ok) ui.hud.toast(`*${m.name}* equipped ${info.name}`, { icon: ui.itemIcon(itemId) });
    return { member: m.id, ok, message: (res && res.message) || '' };
  }
}
