// Party tab: the member cards in formation order (1-4) with the field leader marked. Select a card
// for Make Leader (ui.hooks.setLeader) and Move Up / Move Down (ui.hooks.moveMember).

import { el, injectCSS } from '../core/util.js';
import { bindPointer, TYPE_LABEL } from './theme.js';

const STATS = [['atk', 'Atk'], ['def', 'Def'], ['mag', 'Mag'], ['res', 'Res'], ['spd', 'Spd']];

const CSS = `
.vp-party { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 410px), 1fr)); gap: 14px; }
.vp-card { --acc: var(--vp-cyan); padding: 14px 18px 12px; display: grid; gap: 9px; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
.vp-card::after { background: linear-gradient(90deg, transparent, var(--acc), transparent); opacity: .9; }
.vp-card.is-sel { border-color: rgba(255,197,96,.75); box-shadow: inset 0 0 0 1px rgba(255,197,96,.25), 0 0 18px rgba(255,197,96,.16), 0 6px 16px rgba(0,0,0,.34); }
.vp-card.is-sel::before { --c: rgba(255,214,140,.95); --g: rgba(255,197,96,.3); }
.vp-card-top { display: flex; gap: 16px; align-items: stretch; }
.vp-card-top .vp-portrait { width: 80px; height: 80px; --ps: 80px; }
.vp-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; }
.vp-card-hd { display: flex; align-items: baseline; gap: 12px; }
.vp-card-pos { font: 600 12px var(--vp-font-display); color: var(--vp-ink-faint); letter-spacing: .08em; }
.vp-card-name { font: 700 22px/1 var(--vp-font-display); letter-spacing: .18em; color: #fff; text-shadow: 0 0 14px color-mix(in srgb, var(--acc) 45%, transparent); }
.vp-card-cls { color: var(--acc); }
.vp-card-lv { margin-left: auto; display: flex; align-items: baseline; gap: 6px; }
.vp-card-lv .vp-num { font-size: 22px; font-weight: 700; color: #fff; }
.vp-ko { padding: 3px 7px; border: 1px solid var(--vp-danger); color: var(--vp-danger); font: 700 12px/1 var(--vp-font-display); letter-spacing: .2em; }
.vp-lead { display: inline-flex; align-items: center; gap: 5px; align-self: center; padding: 2px 8px 2px 4px; border: 1px solid rgba(255,197,96,.5);
  font: 700 11px/1.4 var(--vp-font-display); letter-spacing: .22em; text-transform: uppercase; color: var(--vp-amber); }
.vp-lead .vp-ico { width: 16px; height: 16px; }
.vp-card-stats { display: grid; grid-template-columns: repeat(5, 1fr); padding: 6px 0; border-top: 1px solid rgba(140,214,255,.12); border-bottom: 1px solid rgba(140,214,255,.12); }
.vp-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.vp-stat + .vp-stat { border-left: 1px solid rgba(140,214,255,.08); }
.vp-stat .vp-cap { letter-spacing: .16em; }
.vp-stat .vp-num { font-size: 18px; font-weight: 600; color: #f4f9ff; }
.vp-card-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.vp-weap { display: inline-flex; align-items: center; gap: 7px; height: 26px; padding: 0 11px 0 5px; border: 1px solid rgba(140,214,255,.18); background: rgba(127,227,255,.04);
  font: 600 13px var(--vp-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-weap .vp-ico { width: 16px; height: 16px; }
.vp-next { margin-left: auto; display: flex; align-items: center; gap: 9px; }
.vp-next .vp-bar { width: 74px; height: 4px; }
.vp-next .vp-num { font-size: 13px; color: var(--vp-ink-dim); }
.vp-card.is-ko { --acc: #ff5a6a; }
.vp-card.is-ko .vp-card-name { color: #9fb2cc; }
@media (max-width: 760px) {
  .vp-card { padding: 14px 14px 12px; }
  .vp-card-top .vp-portrait { width: 64px; height: 64px; --ps: 64px; }
  .vp-card-name { font-size: 19px; letter-spacing: .14em; }
  .vp-card-hd { flex-wrap: wrap; row-gap: 6px; }
}
`;

export class PartyPage {
  constructor(menu) {
    this.menu = menu;
    this.ui = menu.ui;
    injectCSS('vp-party', CSS);
    this.interactive = true;
    this._sel = 0;
    this._cards = [];
  }

  get party() { return this.menu.state.party || []; }
  get leader() { return this.menu.state.leader || (this.party[0] && this.party[0].id); }

  count() { return this.party.length; }

  render(body) {
    const menu = this.menu;
    const party = this.party;
    this._sel = Math.min(this._sel, Math.max(0, party.length - 1));
    const grid = el('div', { class: 'vp-party', role: 'listbox' });
    this._cards = party.map((m, i) => {
      const ko = m.alive === false || m.hp <= 0;
      const low = !ko && m.hp / m.maxHp < 0.3;
      const accent = menu.accent(m);
      const hd = el('div', { class: 'vp-card-hd' }, [
        el('span', { class: 'vp-card-pos', text: `0${i + 1}` }),
        el('span', { class: 'vp-card-name', text: m.name }),
        m.id === this.leader ? el('span', { class: 'vp-lead' }, [this.ui.iconEl('star', 16), 'Leader']) : null,
        ko ? el('span', { class: 'vp-ko', text: 'KO' }) : null,
        el('span', { class: 'vp-card-lv' }, [el('span', { class: 'vp-cap', text: 'Lv' }), el('span', { class: 'vp-num', text: String(m.level ?? 1) })]),
      ]);
      const main = el('div', { class: 'vp-card-main' }, [
        el('div', {}, [hd, el('div', { class: 'vp-cap vp-card-cls', text: m.cls || '', style: { marginTop: '6px' } })]),
        menu.bar('hp', ko ? 0 : m.hp, m.maxHp, { low }),
        menu.bar('ep', m.ep, m.maxEp),
      ]);
      const stats = el('div', { class: 'vp-card-stats' }, STATS.map(([k, label]) => el('div', { class: 'vp-stat' }, [
        el('span', { class: 'vp-cap', text: label }), el('span', { class: 'vp-num', text: String(m.stats?.[k] ?? 0) }),
      ])));
      const weapons = (m.weapons || []).map((w) => el('span', { class: 'vp-weap', title: TYPE_LABEL[w] || w }, [this.ui.iconEl(w, 16), TYPE_LABEL[w] || w]));
      const xpNext = m.xpNext || 0;
      const next = el('div', { class: 'vp-next' }, [
        el('span', { class: 'vp-cap', text: 'Next' }),
        el('div', { class: 'vp-bar xp' }, [el('i', { style: { transform: `scaleX(${xpNext ? Math.min(1, (m.xp || 0) / xpNext) : 0})` } })]),
        el('span', { class: 'vp-num', text: String(Math.max(0, xpNext - (m.xp || 0))) }),
      ]);
      const card = el('div', { class: `vp-panel vp-card${ko ? ' is-ko' : ''}`, role: 'option' }, [
        el('div', { class: 'vp-card-top' }, [this.ui.portraitEl(m.id, { size: 80, accent, name: m.name, ko }), main]),
        stats,
        el('div', { class: 'vp-card-foot' }, [...weapons, next]),
      ]);
      card.style.setProperty('--acc', accent);
      bindPointer(card, {
        onHover: () => { if (menu.focus === 'body' && this._sel !== i) { this._sel = i; this.ui.sfx('cursor'); this.paint(); } },
        onActivate: () => { this._sel = i; menu.enterBody(); this._actions(); },
      });
      grid.appendChild(card);
      return card;
    });
    if (!party.length) grid.appendChild(el('div', { class: 'vp-empty', text: 'No travelers aboard.' }));
    body.appendChild(grid);
  }

  paint() {
    const on = this.menu.focus === 'body';
    this._cards.forEach((c, k) => c.classList.toggle('is-sel', on && k === this._sel));
    if (on && this._cards[this._sel]) this._cards[this._sel].scrollIntoView({ block: 'nearest' });
  }

  input(inp) {
    const n = this._cards.length;
    if (!n) return;
    const top = this._cards[0].offsetTop;
    const cols = Math.max(1, this._cards.filter((c) => c.offsetTop === top).length);
    let to = this._sel;
    if (inp.repeat('left')) { inp.consume('left'); to--; } else if (inp.repeat('right')) { inp.consume('right'); to++; } else if (inp.repeat('up')) { inp.consume('up'); to -= cols; } else if (inp.repeat('down')) { inp.consume('down'); to += cols; }
    to = (to + n) % n;
    if (to !== this._sel) { this._sel = to; this.ui.sfx('cursor'); this.paint(); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._actions(); }
  }

  back() { return false; }

  hints(add) {
    add('move', 'Select');
    add('confirm', 'Formation');
    add('cancel', 'Back');
  }

  // ------------------------------------------------------------------ formation

  async _actions() {
    const party = this.party;
    const i = this._sel, m = party[i];
    if (!m) return;
    const lead = m.id === this.leader;
    const k = await this.menu.popup.open({
      title: m.name,
      text: `${lead ? 'Leads the party in the field' : `Lv ${m.level ?? 1} ${m.cls || ''}`.trim()}. Position ${i + 1} in the battle line.`,
      portrait: m.id, accent: this.menu.accent(m),
      options: [{ label: lead ? 'Leading' : 'Make leader', disabled: lead }, { label: 'Move up', disabled: i === 0 },
        { label: 'Move down', disabled: i === party.length - 1 }, 'Back'],
      cancelIndex: 3,
    });
    if (k === 0) this._setLeader(m.id);
    else if (k === 1 || k === 2) this._move(m.id, k === 1 ? i - 1 : i + 1);
  }

  _setLeader(id) {
    if (this.ui.hooks.setLeader) this.ui.hook('setLeader', id);
    else this.menu.state.leader = id;
    this.ui.sfx('equip');
    this.menu.repaint();
  }

  _move(id, to) {
    if (this.ui.hooks.moveMember) this.ui.hook('moveMember', id, to);
    else {
      const p = this.party, from = p.findIndex((x) => x.id === id);
      if (from >= 0) p.splice(to, 0, ...p.splice(from, 1));
    }
    this._sel = Math.max(0, this.party.findIndex((x) => x.id === id));
    this.menu.repaint();
  }
}
