// Equip tab: member strip, the three slots (weapon, armor, accessory) and Optimize; a slot opens
// its candidate list (inventory filtered by rules.canEquip) with comparison arrows from
// rules.equipDelta and the gear's effect tags. Remove is the first entry when the slot is filled.
// Optimize calls ui.hooks.optimize(memberId), else applies rules.optimize itself.
//
// Also exported for the shop and the Items tab: gearTags(ui, info) and STAT_LABEL.

import { el, injectCSS } from '../core/util.js';
import { bindPointer, TYPE_LABEL } from './theme.js';

export const SLOTS = [['weapon', 'Weapon'], ['armor', 'Armor'], ['accessory', 'Accessory']];
export const STAT_LABEL = { maxHp: 'HP', maxEp: 'EP', atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES', spd: 'SPD' };
const STAT_KEYS = Object.keys(STAT_LABEL);
const AILMENT = { sleep: 'Sleep', jam: 'Jam', marked: 'Marked' };

const pct = (v) => `${Math.round(v * 100)}%`;

/** Effect tags of an equipment ItemDef: stats, resist, boost, immune, sleep guard, start BP, encounter rate. */
export function gearTags(ui, info) {
  const eq = info && info.equip;
  if (!eq) return [];
  const tag = (text, icon, cls = '') => el('span', { class: `vp-tag ${cls}`.trim() }, [icon ? ui.iconEl(icon, 16) : null, text]);
  const out = [];
  const slot = SLOTS.find(([id]) => id === eq.slot);
  if (slot) out.push(tag(slot[1], eq.slot));
  const stats = Object.entries(eq.stats || {}).filter(([, v]) => v);
  if (stats.length) out.push(tag(stats.map(([k, v]) => `${STAT_LABEL[k] || k} ${v > 0 ? '+' : ''}${v}`).join('  '), null, 'good'));
  for (const [t, v] of Object.entries(eq.resist || {})) out.push(tag(`${TYPE_LABEL[t] || t} resist ${pct(v)}`, t, 'amber'));
  for (const [t, v] of Object.entries(eq.boost || {})) out.push(tag(`${TYPE_LABEL[t] || t} +${pct(v)}`, t, 'amber'));
  for (const a of eq.immune || []) out.push(tag(`Immune: ${AILMENT[a] || a}`, a, 'amber'));
  for (const [a, v] of Object.entries(eq.ailmentResist || {})) out.push(tag(`${AILMENT[a] || a} guard ${pct(v)}`, a, 'amber'));
  if (eq.startBp) out.push(tag(`Start BP +${eq.startBp}`, 'bp', 'amber'));
  if (eq.encounterRate != null && eq.encounterRate !== 1) out.push(tag(`Encounters ${eq.encounterRate < 1 ? '−' : '+'}${pct(Math.abs(1 - eq.encounterRate))}`, 'travel', 'amber'));
  if (eq.slot === 'weapon' && eq.for && eq.for.length) out.push(tag(`${eq.for.map((id) => ui.memberName(id)).join(' / ')}`, null));
  return out;
}

const CSS = `
.vp-eq { display: grid; grid-template-columns: minmax(300px, 400px) minmax(0, 1fr); gap: 22px; align-items: start; }
.vp-eq-who { display: flex; align-items: center; gap: 14px; padding: 0 4px 12px; border-bottom: 1px solid rgba(140,214,255,.12); }
.vp-eq-who .vp-portrait { width: 64px; height: 64px; --ps: 64px; }
.vp-eq-who b { display: block; font: 700 21px/1 var(--vp-font-display); letter-spacing: .18em; color: #fff; text-shadow: 0 0 12px color-mix(in srgb, var(--acc) 45%, transparent); }
.vp-eq-who small { display: block; margin-top: 7px; color: var(--acc); }
.vp-eq-strip { margin-left: auto; display: flex; gap: 6px; align-items: center; }
.vp-eq-strip .vp-portrait { width: 34px; height: 34px; --ps: 34px; cursor: pointer; opacity: .5; transition: opacity .12s; }
.vp-eq-strip .vp-portrait.is-cur { opacity: 1; outline: 1px solid var(--vp-amber); outline-offset: 2px; }
.vp-eq-arrow { color: var(--vp-ink-faint); font: 600 13px var(--vp-font-display); }
.vp-eq-slots { display: flex; flex-direction: column; gap: 2px; margin-top: 10px; }
.vp-eq-slot { min-height: 54px; gap: 12px; }
.vp-eq-slot .vp-ico { width: 32px; height: 32px; }
.vp-eq-slot .k { width: 124px; flex: none; }
.vp-eq-slot .v { font: 600 16px var(--vp-font-ui); letter-spacing: .04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vp-eq-slot .v.is-empty { color: var(--vp-ink-faint); font-weight: 500; }
.vp-eq-slot.is-cur { background: rgba(127,227,255,.07); box-shadow: inset 2px 0 0 var(--vp-cyan); }
.vp-eq-opt { margin-top: 6px; border-top: 1px solid rgba(140,214,255,.1); font: 600 15px var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; }
.vp-eq-opt .vp-ico { width: 32px; height: 32px; }
.vp-eq-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 18px; margin-top: 14px; padding: 12px 14px; }
.vp-eq-st { display: grid; grid-template-columns: 40px 1fr auto; align-items: baseline; gap: 8px; padding: 3px 0; }
.vp-eq-st .vp-cap { letter-spacing: .14em; }
.vp-eq-st .vp-num { font-size: 17px; font-weight: 600; color: var(--vp-ink); text-align: right; }
.vp-eq-st .d { min-width: 64px; text-align: right; font: 600 15px var(--vp-font-display); color: var(--vp-ink-faint); }
.vp-eq-st .d.up { color: var(--vp-hp); } .vp-eq-st .d.dn { color: #ff8a96; }
.vp-eq-right { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.vp-eq-list { display: flex; flex-direction: column; gap: 2px; }
.vp-eq-cand { min-height: 50px; font: 600 16px var(--vp-font-ui); letter-spacing: .04em; }
.vp-eq-cand .vp-ico { width: 32px; height: 32px; }
.vp-eq-cand .n { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vp-eq-cand .sum { font: 600 14px var(--vp-font-display); letter-spacing: .04em; white-space: nowrap; }
.vp-eq-cand .sum .up { color: var(--vp-hp); } .vp-eq-cand .sum .dn { color: #ff8a96; }
.vp-eq-cand .cnt { min-width: 30px; text-align: right; font: 600 15px var(--vp-font-display); color: var(--vp-ink-dim); }
.vp-eq-cand.is-worn { color: var(--vp-ink-dim); }
.vp-eq-detail { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }
.vp-eq-detail .vp-item-name { font: 700 19px/1.1 var(--vp-font-display); letter-spacing: .1em; color: #fff; }
.vp-eq-detail .vp-item-desc { font: 400 15px/1.5 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-eq-msg { min-height: 20px; font: 500 14px var(--vp-font-ui); color: var(--vp-hp); }
.vp-eq-msg.is-err { color: #ff9aa6; }
@media (max-width: 760px) {
  .vp-eq { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .vp-eq-who .vp-portrait { width: 52px; height: 52px; --ps: 52px; }
  .vp-eq-who b { font-size: 18px; }
  .vp-eq-slot .k { width: 104px; letter-spacing: .14em; }
  .vp-eq-arrow { display: none; }
  .vp-eq-strip { gap: 4px; }
  .vp-eq-strip .vp-portrait { width: 30px; height: 30px; --ps: 30px; }
  .vp-eq-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; padding: 10px 12px; }
  .vp-eq-detail { padding: 14px; }
}
`;

export class EquipPage {
  constructor(menu) {
    this.menu = menu;
    this.ui = menu.ui;
    injectCSS('vp-equip', CSS);
    this.interactive = true;
    this.mode = 'slots';          // 'slots' | 'list'
    this._member = 0;
    this._slot = 0;               // 0-2 slots, 3 = Optimize
    this._cand = 0;
    this._msg = null;
  }

  get party() { return this.menu.state.party || []; }
  get member() { return this.party[Math.min(this._member, this.party.length - 1)]; }
  get rules() { return this.ui.rules; }

  count() { return this.party.length ? 4 : 0; }

  /** Owned gear for the current slot that the member can wear. */
  _candidates() {
    const m = this.member, inv = this.menu.state.inventory || {};
    const slot = SLOTS[this._slot] && SLOTS[this._slot][0];
    if (!m || !slot) return [];
    const ids = Object.keys(inv).filter((id) => inv[id] > 0 && this.ui.itemInfo(id).equip?.slot === slot && this.rules.canEquip(m, id));
    const worn = m.equip && m.equip[slot];
    return [...(worn ? [null] : []), ...ids];       // null = Remove
  }

  render(body) {
    const m = this.member;
    if (!m) { body.appendChild(el('div', { class: 'vp-empty', text: 'No travelers aboard.' })); return; }
    const accent = this.menu.accent(m);
    const strip = el('div', { class: 'vp-eq-strip' }, [
      this.party.length > 1 ? el('span', { class: 'vp-eq-arrow', text: '◀' }) : null,
      ...this.party.map((p, i) => {
        const por = this.ui.portraitEl(p.id, { size: 34, accent: this.menu.accent(p) });
        por.classList.toggle('is-cur', i === this._member);
        bindPointer(por, { onActivate: () => this._setMember(i) });
        return por;
      }),
      this.party.length > 1 ? el('span', { class: 'vp-eq-arrow', text: '▶' }) : null,
    ]);
    const who = el('div', { class: 'vp-eq-who' }, [
      this.ui.portraitEl(m.id, { size: 64, accent }),
      el('div', {}, [el('b', { text: m.name }), el('small', { class: 'vp-cap', text: `Lv ${m.level ?? 1} · ${m.cls || ''}` })]),
      strip,
    ]);
    who.style.setProperty('--acc', accent);

    this._slotRows = SLOTS.map(([slot, label], i) => {
      const id = m.equip && m.equip[slot];
      const info = id ? this.ui.itemInfo(id) : null;
      const row = el('div', { class: 'vp-row vp-eq-slot', role: 'option' }, [
        this.ui.iconEl(info ? this.ui.itemIcon(id) : slot, 32),
        el('span', { class: 'vp-cap k', text: label }),
        el('span', { class: `v${info ? '' : ' is-empty'}`, text: info ? info.name : '— Empty —' }),
      ]);
      bindPointer(row, {
        onHover: () => { if (this.menu.focus === 'body' && this.mode === 'slots' && this._slot !== i) { this._slot = i; this.ui.sfx('cursor'); this._refresh(); } },
        onActivate: () => { this.menu.enterBody(); this._slot = i; this._openList(); },
      });
      return row;
    });
    const opt = el('div', { class: 'vp-row vp-eq-opt', role: 'option' }, [this.ui.iconEl('gear', 32), 'Optimize']);
    bindPointer(opt, {
      onHover: () => { if (this.menu.focus === 'body' && this.mode === 'slots' && this._slot !== 3) { this._slot = 3; this.ui.sfx('cursor'); this._refresh(); } },
      onActivate: () => { this.menu.enterBody(); this._slot = 3; this.mode = 'slots'; this._optimize(); },
    });
    this._slotRows.push(opt);
    this._stats = el('div', { class: 'vp-panel vp-eq-stats' });
    this._right = el('div', { class: 'vp-eq-right' });
    body.appendChild(el('div', { class: 'vp-eq' }, [
      el('div', {}, [who, el('div', { class: 'vp-eq-slots', role: 'listbox' }, this._slotRows), this._stats]),
      this._right,
    ]));
    this._refresh();
  }

  /** Repaint the selection, the stat comparison and the right column. */
  _refresh() {
    const inBody = this.menu.focus === 'body';
    this._slotRows.forEach((r, k) => {
      r.classList.toggle('is-sel', inBody && this.mode === 'slots' && k === this._slot);
      r.classList.toggle('is-cur', this.mode === 'list' && k === this._slot);
    });
    const cands = this.mode === 'list' ? this._candidates() : [];
    const preview = this.mode === 'list' && cands.length ? { id: cands[this._cand] } : null;
    this._paintStats(preview);
    this._paintRight(cands, preview);
  }

  _paintStats(preview) {
    const m = this.member;
    const slot = SLOTS[this._slot] && SLOTS[this._slot][0];
    const d = preview && slot ? this.rules.equipDelta(m, slot, preview.id) : null;
    const cur = { maxHp: m.maxHp, maxEp: m.maxEp, ...(m.stats || {}) };
    this._stats.replaceChildren(...STAT_KEYS.map((k) => {
      const v = d ? d[k] || 0 : 0;
      return el('div', { class: 'vp-eq-st' }, [
        el('span', { class: 'vp-cap', text: STAT_LABEL[k] }),
        el('span', { class: 'vp-num', text: String(cur[k] ?? 0) }),
        el('span', { class: `d${v > 0 ? ' up' : v < 0 ? ' dn' : ''}`, text: d ? (v ? `${v > 0 ? '▲' : '▼'} ${cur[k] + v}` : '–') : '' }),
      ]);
    }));
  }

  _paintRight(cands, preview) {
    const m = this.member;
    const right = this._right;
    right.textContent = '';
    if (this._slot === 3) {
      right.append(el('div', { class: 'vp-panel vp-eq-detail' }, [
        el('div', { class: 'vp-item-name', text: 'Optimize' }),
        el('div', { class: 'vp-item-desc', text: `Fit ${m.name} with the strongest gear the party carries, slot by slot.` }),
        this._msgEl(),
      ]));
      return;
    }
    const [slot, label] = SLOTS[this._slot];
    if (this.mode !== 'list') {
      const id = m.equip && m.equip[slot];
      const info = id ? this.ui.itemInfo(id) : null;
      right.append(el('div', { class: 'vp-panel vp-eq-detail' }, info ? [
        el('div', { class: 'vp-item-name', text: info.name }),
        el('div', { class: 'vp-item-desc', text: info.desc || '' }),
        el('div', { class: 'vp-tags' }, gearTags(this.ui, info)),
        this._msgEl(),
      ] : [
        el('div', { class: 'vp-item-name', text: `${label}: empty` }),
        el('div', { class: 'vp-item-desc', text: `${this._candidates().length} piece${this._candidates().length === 1 ? '' : 's'} in the pack fit this slot.` }),
        this._msgEl(),
      ]));
      return;
    }
    const inv = this.menu.state.inventory || {};
    this._candRows = cands.map((id, i) => {
      const info = id ? this.ui.itemInfo(id) : null;
      const d = this.rules.equipDelta(m, slot, id);
      const sum = el('span', { class: 'sum' }, STAT_KEYS.filter((k) => d[k]).slice(0, 2).map((k) =>
        el('span', { class: d[k] > 0 ? 'up' : 'dn', text: `${d[k] > 0 ? '▲' : '▼'}${STAT_LABEL[k]} ${Math.abs(d[k])} ` })));
      const row = el('div', { class: `vp-row vp-eq-cand${id ? '' : ' is-worn'}`, role: 'option' }, [
        this.ui.iconEl(id ? this.ui.itemIcon(id) : slot, 32),
        el('span', { class: 'n', text: id ? info.name : 'Remove' }),
        sum,
        el('span', { class: 'cnt', text: id ? `×${inv[id]}` : '' }),
      ]);
      bindPointer(row, {
        onHover: () => { if (this._cand !== i) { this._cand = i; this.ui.sfx('cursor'); this._refresh(); } },
        onActivate: () => { this._cand = i; this._equipSelected(); },
      });
      row.classList.toggle('is-sel', i === this._cand);
      return row;
    });
    const list = el('div', { class: 'vp-eq-list', role: 'listbox' }, [
      el('div', { class: 'vp-cap vp-sec', text: `${label} · ${cands.filter(Boolean).length} fit` }),
      ...this._candRows,
      cands.length ? null : el('div', { class: 'vp-empty', text: `Nothing in the pack fits ${m.name}.` }),
    ]);
    const info = preview && preview.id ? this.ui.itemInfo(preview.id) : null;
    right.append(list, el('div', { class: 'vp-panel vp-eq-detail' }, info ? [
      el('div', { class: 'vp-item-name', text: info.name }),
      el('div', { class: 'vp-item-desc', text: info.desc || '' }),
      el('div', { class: 'vp-tags' }, gearTags(this.ui, info)),
    ] : [el('div', { class: 'vp-item-desc', text: preview ? `Take off the ${label.toLowerCase()} and return it to the pack.` : '' })]));
    if (this._candRows[this._cand]) this._candRows[this._cand].scrollIntoView({ block: 'nearest' });
  }

  _msgEl() {
    const m = this._msg;
    return el('div', { class: `vp-eq-msg${m && !m.ok ? ' is-err' : ''}`, text: m ? m.text : '' });
  }

  paint() {
    if (this.menu.focus !== 'body') this.mode = 'slots';
    if (this._slotRows) this._refresh();
  }

  input(inp) {
    if (this.mode === 'list') {
      const n = this._candidates().length;
      if (!n) return;
      if (inp.repeat('up')) { inp.consume('up'); this._cand = (this._cand + n - 1) % n; this.ui.sfx('cursor'); this._refresh(); } else if (inp.repeat('down')) { inp.consume('down'); this._cand = (this._cand + 1) % n; this.ui.sfx('cursor'); this._refresh(); }
      if (inp.pressed('confirm')) { inp.consume('confirm'); this._equipSelected(); }
      return;
    }
    if (inp.repeat('up')) { inp.consume('up'); this._msg = null; this._slot = (this._slot + 3) % 4; this.ui.sfx('cursor'); this._refresh(); } else if (inp.repeat('down')) { inp.consume('down'); this._msg = null; this._slot = (this._slot + 1) % 4; this.ui.sfx('cursor'); this._refresh(); }
    const n = this.party.length;
    if (n > 1 && inp.repeat('left')) { inp.consume('left'); this._setMember((this._member + n - 1) % n); } else if (n > 1 && inp.repeat('right')) { inp.consume('right'); this._setMember((this._member + 1) % n); }
    if (inp.pressed('confirm')) {
      inp.consume('confirm');
      if (this._slot === 3) this._optimize();
      else this._openList();
    }
  }

  back() {
    if (this.mode !== 'list') return false;
    this.mode = 'slots';
    this.ui.sfx('cancel');
    this._refresh();
    this.menu._refreshHints();
    return true;
  }

  hints(add) {
    if (this.mode === 'list') { add('move', 'Select'); add('confirm', 'Equip'); add('cancel', 'Back'); return; }
    add('move', 'Slot');
    if (this.party.length > 1) add('adjust', 'Traveler');
    add('confirm', this._slot === 3 ? 'Optimize' : 'Change');
    add('cancel', 'Back');
  }

  close() {
    this.mode = 'slots';
    this._msg = null;
  }

  // ------------------------------------------------------------------ actions

  _setMember(i) {
    if (i === this._member) return;
    this._member = i;
    this._msg = null;
    this.mode = 'slots';
    this.ui.sfx('cursor');
    this.menu.repaint();
  }

  _openList() {
    if (this._slot === 3) return;
    this._msg = null;
    this.mode = 'list';
    const cands = this._candidates();
    const worn = this.member.equip && this.member.equip[SLOTS[this._slot][0]];
    this._cand = worn && cands.length > 1 ? 1 : 0;
    this.ui.sfx('confirm');
    this._refresh();
    this.menu._refreshHints();
  }

  _equipSelected() {
    const cands = this._candidates();
    if (!cands.length) { this.ui.sfx('error'); return; }
    const id = cands[this._cand] ?? null;
    const slot = SLOTS[this._slot][0];
    const res = this.rules.equip(this.member, slot, id) || { ok: false, message: '' };
    this.ui.sfx(res.ok ? 'equip' : 'error');
    if (res.ok) this.mode = 'slots';
    this._msg = { ok: res.ok, text: res.message || '' };
    this.menu.repaint();
  }

  _optimize() {
    const m = this.member;
    const before = JSON.stringify(m.equip || {});
    if (this.ui.hooks.optimize) this.ui.hook('optimize', m.id);
    else {
      const picks = this.rules.optimize(m, this.menu.state.inventory || {}) || {};
      for (const [slot] of SLOTS) if (picks[slot] !== undefined && picks[slot] !== (m.equip && m.equip[slot])) this.rules.equip(m, slot, picks[slot]);
    }
    const changed = JSON.stringify(m.equip || {}) !== before;
    this.ui.sfx(changed ? 'equip' : 'cursor');
    this._msg = { ok: true, text: changed ? `${m.name} is fitted with the best gear at hand.` : 'Already wearing the best gear at hand.' };
    this.menu.repaint();
  }
}
