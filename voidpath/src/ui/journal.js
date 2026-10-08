// Journal tab: chapter kicker, title and traveler portrait; the current objective (large) and its
// hint; side objectives (favours); objectives done this chapter; the chapter timeline (done /
// current / locked) and "Story so far" with the recap of every finished chapter.
// Data: ui.hooks.journal() -> story.journal() (TECH_PLAN 4.1):
//   { chapter: { id, kicker, title, traveler }, objective: { id, text, hint } | null, side: [{ id, text }],
//     done: [{ id, text }], recaps: [{ chapter, title, text }], chapters: [{ id, kicker, title, state }] }

import { el, injectCSS } from '../core/util.js';
import { richText } from './theme.js';

const CSS = `
.vp-jr { display: grid; grid-template-columns: minmax(0, 1fr) minmax(250px, 320px); gap: 26px; align-items: start; }
.vp-jr-hd { display: flex; align-items: center; gap: 18px; padding: 4px 4px 16px; border-bottom: 1px solid rgba(140,214,255,.12); }
.vp-jr-hd .vp-portrait { width: 72px; height: 72px; --ps: 72px; }
.vp-jr-kick { color: var(--vp-cyan); letter-spacing: .34em; }
.vp-jr-title { margin-top: 8px; font: 800 34px/1 var(--vp-font-display); letter-spacing: .2em; color: #f4f9ff; text-shadow: 0 0 18px rgba(127,227,255,.3); }
.vp-jr-trav { margin-left: auto; text-align: right; }
.vp-jr-trav b { display: block; font: 700 15px/1 var(--vp-font-display); letter-spacing: .22em; color: var(--acc); }
.vp-jr-trav span { display: block; margin-top: 6px; font: 600 11px/1 var(--vp-font-ui); letter-spacing: .24em; text-transform: uppercase; color: var(--vp-ink-faint); }
.vp-jr-sec { margin: 20px 4px 10px; color: var(--vp-ink-faint); }
.vp-jr-obj { position: relative; padding: 16px 20px 16px 22px; }
.vp-jr-obj::before { content: ''; position: absolute; left: -1px; top: 14px; bottom: 14px; width: 2px; background: var(--vp-amber); box-shadow: 0 0 10px rgba(255,197,96,.6); }
.vp-jr-objt { font: 600 21px/1.4 var(--vp-font-ui); color: #fff; letter-spacing: .01em; }
.vp-jr-hint { display: flex; gap: 10px; align-items: flex-start; margin-top: 10px; font: 400 15px/1.5 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-jr-hint .vp-ico { width: 16px; height: 16px; margin-top: 3px; }
.vp-jr-list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0 4px; list-style: none; }
.vp-jr-list li { display: flex; gap: 12px; align-items: baseline; font: 500 16px/1.45 var(--vp-font-ui); color: var(--vp-ink); }
.vp-jr-list li::before { content: ''; flex: none; width: 6px; height: 6px; margin-top: 2px; transform: rotate(45deg) translateY(-2px); background: var(--vp-cyan); box-shadow: 0 0 6px rgba(127,227,255,.6); }
.vp-jr-list.is-done li { color: var(--vp-ink-faint); }
.vp-jr-list.is-done li::before { width: 9px; height: 5px; background: none; border: solid var(--vp-hp); border-width: 0 0 2px 2px; transform: rotate(-45deg) translateY(-3px); box-shadow: none; }
.vp-jr-none { padding: 0 4px; font: 400 14px var(--vp-font-ui); color: var(--vp-ink-faint); }
.vp-jr-time { padding: 14px 16px 10px; }
.vp-jr-ch { position: relative; display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 10px; padding: 7px 0 11px; }
.vp-jr-ch::before { content: ''; position: absolute; left: 10px; top: 24px; bottom: -4px; width: 1px; background: rgba(140,214,255,.18); }
.vp-jr-ch:last-child::before { display: none; }
.vp-jr-dot { width: 11px; height: 11px; margin: 4px 0 0 5px; border-radius: 50%; border: 1px solid rgba(140,214,255,.5); box-sizing: border-box; }
.vp-jr-ch.is-done .vp-jr-dot { background: rgba(127,227,255,.55); border-color: transparent; }
.vp-jr-ch.is-current .vp-jr-dot { background: var(--vp-amber); border-color: transparent; box-shadow: 0 0 0 3px rgba(255,197,96,.2), 0 0 10px var(--vp-amber); }
.vp-jr-ch .vp-ico { width: 16px; height: 16px; margin: 1px 0 0 3px; opacity: .55; }
.vp-jr-ch small { display: block; font: 600 11px/1 var(--vp-font-ui); letter-spacing: .26em; text-transform: uppercase; color: var(--vp-ink-faint); }
.vp-jr-ch b { display: block; margin-top: 5px; font: 600 15px/1 var(--vp-font-display); letter-spacing: .16em; color: var(--vp-ink-dim); }
.vp-jr-ch.is-current b { color: var(--vp-amber); }
.vp-jr-ch.is-current small { color: var(--vp-ink-dim); }
.vp-jr-ch.is-locked b { color: var(--vp-ink-faint); }
.vp-jr-recap { padding: 14px 16px; display: grid; gap: 14px; }
.vp-jr-recap h4 { margin: 0; font: 600 12px/1 var(--vp-font-ui); letter-spacing: .26em; text-transform: uppercase; color: var(--vp-cyan); }
.vp-jr-recap p { margin: 6px 0 0; font: 400 14px/1.6 var(--vp-font-ui); color: var(--vp-ink-dim); }
@media (max-width: 760px) {
  .vp-jr { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .vp-jr-title { font-size: 26px; letter-spacing: .14em; }
  .vp-jr-hd .vp-portrait { width: 56px; height: 56px; --ps: 56px; margin-left: auto; }
  .vp-jr-trav { display: none; }
  .vp-jr-objt { font-size: 18px; }
}
`;

export class JournalPage {
  constructor(menu) {
    this.menu = menu;
    this.ui = menu.ui;
    injectCSS('vp-journal', CSS);
    this.interactive = true;      // the body scrolls with up / down
  }

  count() { return 1; }

  render(body) {
    const j = this.ui.hook('journal');
    if (!j || !j.chapter) { body.appendChild(el('div', { class: 'vp-empty', text: 'The journal is empty.' })); return; }
    const ch = j.chapter;
    const trav = ch.traveler;
    const accent = trav ? this.ui._accentOf(trav) : null;
    const hd = el('div', { class: 'vp-jr-hd' }, [
      el('div', {}, [el('div', { class: 'vp-cap vp-jr-kick', text: ch.kicker || '' }), el('div', { class: 'vp-jr-title', text: ch.title || '' })]),
      trav ? el('div', { class: 'vp-jr-trav' }, [el('b', { text: this.ui.memberName(trav) }), el('span', { text: 'Traveler' })]) : null,
      trav ? this.ui.portraitEl(trav, { size: 72, accent }) : null,
    ]);
    if (accent) hd.style.setProperty('--acc', accent);
    const o = j.objective;
    const main = el('div', {}, [
      hd,
      el('div', { class: 'vp-cap vp-jr-sec', text: 'Current objective' }),
      el('div', { class: 'vp-panel vp-jr-obj' }, o ? [
        el('div', { class: 'vp-jr-objt' }, [richText(o.text || '')]),
        o.hint ? el('div', { class: 'vp-jr-hint' }, [this.ui.iconEl('inspect', 16), el('span', {}, [richText(o.hint)])]) : null,
      ] : [el('div', { class: 'vp-jr-hint', text: 'Nothing pressing. Explore, or rest a while.' })]),
      ...this._list('Favours', j.side, 'No favours asked yet.'),
      ...this._list('Done this chapter', j.done, null, true),
    ]);
    const aside = el('div', {}, [
      el('div', { class: 'vp-cap vp-jr-sec', text: 'Chapters' }),
      el('div', { class: 'vp-panel vp-jr-time' }, (j.chapters || []).map((c) => el('div', { class: `vp-jr-ch is-${c.state}` }, [
        c.state === 'locked' ? this.ui.iconEl('lock', 16) : el('i', { class: 'vp-jr-dot' }),
        el('div', {}, [el('small', { text: c.kicker }), el('b', { text: c.state === 'locked' ? '? ? ?' : c.title })]),
      ]))),
      el('div', { class: 'vp-cap vp-jr-sec', text: 'Story so far' }),
      (j.recaps || []).length
        ? el('div', { class: 'vp-panel vp-jr-recap' }, j.recaps.map((r) => el('div', {}, [el('h4', { text: r.title }), el('p', {}, [richText(r.text)])])))
        : el('div', { class: 'vp-jr-none', text: 'The voyage has only begun.' }),
    ]);
    body.appendChild(el('div', { class: 'vp-jr' }, [main, aside]));
  }

  _list(title, items, empty, done = false) {
    if (!(items || []).length) return empty ? [el('div', { class: 'vp-cap vp-jr-sec', text: title }), el('div', { class: 'vp-jr-none', text: empty })] : [];
    return [
      el('div', { class: 'vp-cap vp-jr-sec', text: title }),
      el('ul', { class: `vp-jr-list${done ? ' is-done' : ''}` }, items.map((x) => el('li', {}, [richText(x.text)]))),
    ];
  }

  paint() {}

  input(inp) {
    const b = this.menu.body;
    if (inp.repeat('up')) { inp.consume('up'); b.scrollTop -= 80; } else if (inp.repeat('down')) { inp.consume('down'); b.scrollTop += 80; }
  }

  back() { return false; }

  hints(add) {
    add('move', 'Scroll');
    add('cancel', 'Back');
  }
}
