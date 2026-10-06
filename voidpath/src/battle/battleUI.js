// Battle DOM UI: turn order bar, party status panel, command menu with Boost, targeting cursor,
// per-enemy shield / weakness / HP plates, floating damage numbers, the BREAK callout, banners, the
// boss lock-on reticle and the results panel. It draws from its own view state (updated by the
// director as events play), never from the model's already-resolved numbers.
//
// Everything is in one root inside #ui-root, scaled like the field UI on big screens. World-anchored
// pieces are positioned from engine.projectToScreen every frame (only when they move).

import { Vector3 } from 'three';
import { el, injectCSS, clamp } from '../core/util.js';
import { iconURL } from '../art/icons.js';
import { portraitURL } from '../art/characters.js';
import { buildEnemyIcon } from '../art/enemies.js';
import { DAMAGE_COLORS } from '../art/palette.js';
import { installBaseCSS, glyph, TYPE_LABEL, MEMBER_ACCENT, bindPointer } from '../ui/theme.js';
import { ITEMS } from './data.js';

const CSS = `
.vb-root { position: absolute; inset: 0; z-index: 12; pointer-events: none; font-family: var(--vp-font-ui); color: var(--vp-ink); }
#ui-root > .vb-root { pointer-events: none; }
.vb-root * { box-sizing: border-box; }
.vb-root img { image-rendering: pixelated; image-rendering: crisp-edges; -webkit-user-drag: none; }
.vb-live { pointer-events: auto; }
.vb-world { position: absolute; inset: 0; overflow: hidden; }
.vb-abs { position: absolute; left: 0; top: 0; will-change: transform; }
.vb-root.is-intro .vb-top, .vb-root.is-intro .vb-party, .vb-root.is-intro .vb-foe { opacity: 0; }
.vb-top, .vb-party, .vb-foe { transition: opacity .45s var(--vp-ease-out); }

/* ---------------------------------------------------------------- turn order */
.vb-top { position: absolute; left: calc(14px + var(--vp-safe-left)); right: calc(14px + var(--vp-safe-right)); top: calc(12px + var(--vp-safe-top));
  display: flex; align-items: flex-start; gap: 14px; }
.vb-turns { display: flex; align-items: center; gap: 10px; padding: 6px 12px 6px 8px; flex: none; max-width: 100%; }
.vb-round { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 50px; padding-right: 10px; border-right: 1px solid var(--vp-line-dim); align-self: stretch; }
.vb-round .vp-cap { font-size: 10px; letter-spacing: .3em; padding-left: .3em; color: var(--vp-cyan); }
.vb-round b { font: 700 25px/1 var(--vp-font-display); color: #fff; text-shadow: 0 0 12px rgba(127,227,255,.4); }
.vb-round.is-pop b { animation: vb-pop .5s var(--vp-ease-out); }
.vb-order { display: flex; align-items: center; gap: 5px; }
.vb-slot { --acc: var(--vp-cyan); position: relative; width: 40px; height: 40px; flex: none; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--acc) 55%, transparent);
  background: linear-gradient(160deg, color-mix(in srgb, var(--acc) 26%, #0a1020), #070b16 80%);
  transition: transform .22s var(--vp-ease-out), box-shadow .22s, border-color .22s; animation: vb-slot-in .28s var(--vp-ease-out) both; }
.vb-slot img { position: absolute; }
.vb-slot.party img { width: 80px; height: 80px; left: -22px; top: -10px; }
.vb-slot.enemy { --acc: #ff5a6a; }
.vb-slot.enemy img { width: 48px; height: 48px; left: -4px; top: -4px; }
.vb-slot.is-active { border-color: var(--vp-amber); transform: translateY(2px) scale(1.14); z-index: 1;
  box-shadow: 0 0 0 1px var(--vp-amber), 0 0 14px rgba(255,197,96,.55); }
.vb-slot.is-active::after { content: ''; position: absolute; left: 50%; bottom: 1px; width: 0; height: 0; margin-left: -4px;
  border: 4px solid transparent; border-bottom-color: var(--vp-amber); }
.vb-next { display: flex; align-items: center; gap: 6px; padding-left: 10px; border-left: 1px solid var(--vp-line-dim); align-self: stretch; }
.vb-next .vp-cap { font-size: 10px; letter-spacing: .26em; writing-mode: vertical-rl; transform: rotate(180deg); color: var(--vp-ink-faint); }
.vb-next .vb-order { gap: 4px; }
.vb-next .vb-slot { width: 28px; height: 28px; opacity: .62; }
.vb-next .vb-slot.party img { width: 56px; height: 56px; left: -15px; top: -7px; }
.vb-next .vb-slot.enemy img { width: 34px; height: 34px; left: -3px; top: -3px; }
@keyframes vb-slot-in { from { opacity: 0; transform: translateX(10px); } }
@keyframes vb-pop { 0% { transform: scale(1.6); color: var(--vp-amber); } 100% { transform: none; } }

/* ---------------------------------------------------------------- help line */
.vb-help { margin-left: auto; width: min(540px, 44vw); min-height: 52px; padding: 9px 18px; display: flex; align-items: center; gap: 12px;
  font: 500 15px/1.35 var(--vp-font-ui); color: var(--vp-ink); opacity: 0; transform: translateY(-6px); transition: opacity .16s, transform .2s var(--vp-ease-out); }
.vb-help.is-on { opacity: 1; transform: none; }
.vb-help .vb-help-t { flex: 1; min-width: 0; }
.vb-help .vb-help-t b { font: 700 16px/1.1 var(--vp-font-display); letter-spacing: .12em; color: #fff; display: block; margin-bottom: 3px; text-transform: uppercase; }
.vb-help .vb-help-t b.weak { color: var(--vp-weak); }
.vb-help .vb-help-t small { color: var(--vp-ink-dim); font-size: 14px; }
.vb-help .vb-tag { flex: none; padding: 4px 8px; border: 1px solid rgba(255,224,102,.6); color: var(--vp-weak); font: 700 12px/1 var(--vp-font-display); letter-spacing: .2em; }
.vb-help .vb-plate { flex: none; }

/* ---------------------------------------------------------------- action name */
.vb-act { position: absolute; left: 50%; top: calc(84px + var(--vp-safe-top)); transform: translateX(-50%); display: flex; align-items: center; gap: 10px;
  padding: 9px 46px; white-space: nowrap; font: 700 19px/1 var(--vp-font-display); letter-spacing: .22em; text-transform: uppercase; color: #fff;
  background: linear-gradient(90deg, rgba(8,13,26,0), rgba(8,13,26,.86) 18%, rgba(8,13,26,.86) 82%, rgba(8,13,26,0)); opacity: 0; }
.vb-act::before, .vb-act::after { content: ''; position: absolute; left: 12%; right: 12%; height: 1px; background: linear-gradient(90deg, transparent, var(--c, var(--vp-cyan)), transparent); }
.vb-act::before { top: 0; } .vb-act::after { bottom: 0; }
.vb-act img { width: 16px; height: 16px; }
.vb-act.enemy { --c: #ff5a6a; color: #ffd6da; }
.vb-act.is-on { animation: vb-act 1.5s var(--vp-ease-out) forwards; }
@keyframes vb-act { 0% { opacity: 0; transform: translate(-50%, -6px); letter-spacing: .4em; } 12% { opacity: 1; transform: translate(-50%, 0); letter-spacing: .22em; } 80% { opacity: 1; } 100% { opacity: 0; } }

/* ---------------------------------------------------------------- party panel */
.vb-party { position: absolute; right: calc(14px + var(--vp-safe-right)); bottom: calc(12px + var(--vp-safe-bottom)); width: 430px; padding: 6px 0; }
.vb-row { --acc: var(--vp-cyan); position: relative; display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 10px; align-items: center; padding: 5px 14px 5px 10px;
  transition: transform .2s var(--vp-ease-out), background-color .2s, opacity .3s; }
.vb-row + .vb-row { border-top: 1px solid rgba(140,214,255,.07); }
.vb-row.is-active { transform: translateX(-18px); background: linear-gradient(90deg, rgba(255,197,96,.2), rgba(255,197,96,.05) 70%, rgba(255,197,96,0));
  box-shadow: inset 2px 0 0 var(--vp-amber); }
.vb-row.is-active .vb-name { color: var(--vp-amber); text-shadow: 0 0 10px rgba(255,197,96,.45); }
.vb-row.is-pick { background: rgba(127,227,255,.08); }
.vb-row.is-ko { opacity: .62; }
.vb-row.is-ko .vb-pt img { filter: grayscale(1) brightness(.55); }
.vb-row.is-hurt { animation: vb-row-hurt .3s; }
@keyframes vb-row-hurt { 0%, 100% { transform: none; } 25% { transform: translateX(4px); } 60% { transform: translateX(-3px); } }
.vb-row.is-active.is-hurt { animation: none; }
.vb-pt { position: relative; width: 40px; height: 40px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--acc) 60%, transparent);
  background: linear-gradient(160deg, color-mix(in srgb, var(--acc) 30%, #0a1020), #070b16 75%); }
.vb-pt img { position: absolute; width: 80px; height: 80px; left: -22px; top: -10px; }
.vb-l1 { display: flex; align-items: center; gap: 8px; min-width: 0; margin-bottom: 3px; }
.vb-name { font: 700 15px/1 var(--vp-font-display); letter-spacing: .16em; color: #fff; }
.vb-ko { display: none; padding: 2px 5px; border: 1px solid var(--vp-danger); color: var(--vp-danger); font: 700 10px/1 var(--vp-font-display); letter-spacing: .18em; }
.vb-row.is-ko .vb-ko { display: inline-block; }
.vb-buffs { display: flex; gap: 4px; min-width: 0; overflow: hidden; }
.vb-buff { padding: 1px 4px; font: 700 10px/1.3 var(--vp-font-display); letter-spacing: .08em; border: 1px solid currentColor; }
.vb-buff.up { color: #8affc0; } .vb-buff.down { color: #ff8fa0; } .vb-buff.taunt { color: var(--vp-amber); }
.vb-bp { display: flex; gap: 1px; margin-left: auto; flex: none; }
.vb-bp img { width: 16px; height: 16px; transition: transform .2s; }
.vb-bp img.is-new { animation: vb-pip .45s var(--vp-ease-out); }
.vb-bp img.is-boost { filter: drop-shadow(0 0 4px rgba(255,179,71,.95)); transform: translateY(-2px); }
@keyframes vb-pip { 0% { transform: scale(2); filter: brightness(2.2); } 100% { transform: none; } }
.vb-bars { display: grid; grid-template-columns: 1.25fr 1fr; gap: 14px; }
.vb-st { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 6px; }
.vb-st > span { font: 600 11px/1 var(--vp-font-ui); letter-spacing: .14em; color: var(--vp-ink-faint); }
.vb-st .vp-bar { height: 5px; }
.vb-st b { min-width: 38px; text-align: right; font: 600 17px/1 var(--vp-font-display); font-variant-numeric: tabular-nums; color: #fff; }
.vb-st b.is-low { color: #ffab6b; }
.vb-st.ep b { font-size: 15px; color: #cfe6ff; min-width: 28px; }

/* ---------------------------------------------------------------- command menu */
.vb-menu { --acc: var(--vp-cyan); width: 250px; opacity: 0; visibility: hidden; transition: opacity .12s, visibility 0s linear .12s; }
.vb-menu.is-open { opacity: 1; visibility: visible; transition: opacity .1s; }
.vb-menu.is-open .vb-menu-in { animation: vb-menu-in .2s var(--vp-ease-out); }
@keyframes vb-menu-in { from { transform: translateX(14px); opacity: .2; } }
.vb-menu-hd { display: flex; align-items: center; gap: 8px; padding: 9px 12px 8px 14px; border-bottom: 1px solid var(--vp-line-dim);
  background: linear-gradient(90deg, color-mix(in srgb, var(--acc) 16%, transparent), transparent); }
.vb-menu-who { font: 700 13px/1 var(--vp-font-display); letter-spacing: .2em; color: var(--acc); text-transform: uppercase; }
.vb-menu-sub { font: 600 11px/1 var(--vp-font-ui); letter-spacing: .2em; color: var(--vp-ink-faint); text-transform: uppercase; }
.vb-boost { margin-left: auto; display: flex; align-items: center; gap: 4px; cursor: pointer; }
.vb-boost .vp-cap { font-size: 10px; letter-spacing: .22em; margin-right: 2px; }
.vb-boost .vp-cap.is-on { color: var(--vp-bp); text-shadow: 0 0 8px rgba(255,179,71,.6); }
.vb-pip { width: 9px; height: 9px; transform: rotate(45deg); border: 1px solid rgba(255,179,71,.45); background: rgba(255,179,71,.06); transition: background .12s, box-shadow .12s, border-color .12s; }
.vb-pip.is-avail { border-color: rgba(255,179,71,.85); }
.vb-pip.is-on { background: var(--vp-bp); border-color: #ffe3b0; box-shadow: 0 0 8px rgba(255,179,71,.9), 0 0 2px #fff; }
.vb-pip.is-pop { animation: vb-pip-pop .3s var(--vp-ease-out); }
@keyframes vb-pip-pop { 0% { transform: rotate(45deg) scale(1.9); } 100% { transform: rotate(45deg); } }
.vb-list { padding: 4px 0 5px; max-height: 300px; }
.vb-it { min-height: 38px; gap: 10px; padding-right: 12px; font: 600 15px/1.1 var(--vp-font-ui); letter-spacing: .06em; }
.vb-it img { width: 16px; height: 16px; flex: none; }
.vb-it .r { margin-left: auto; font: 600 14px/1 var(--vp-font-display); color: var(--vp-ink-dim); white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.vb-it .r .ep { color: #9fd0ff; }
.vb-it.is-sel .r .ep { color: #cfe6ff; }
.vb-it .r .wk { color: var(--vp-weak); font: 700 10px/1 var(--vp-font-display); letter-spacing: .14em; }
.vb-it.is-dim .r .ep { color: #6c7f9c; }
.vb-menu-ft { display: flex; gap: 14px; padding: 6px 14px 8px; border-top: 1px solid rgba(140,214,255,.1); }
.vb-menu-ft > span { display: inline-flex; align-items: center; gap: 6px; font: 600 10px/1 var(--vp-font-ui); letter-spacing: .16em; color: var(--vp-ink-faint); text-transform: uppercase; cursor: pointer; }
.vb-menu-ft > span:hover { color: var(--vp-amber); }
.vb-menu-ft .vp-key, .vb-menu-ft .vp-padbtn { transform: scale(.82); }

/* ---------------------------------------------------------------- enemy plates */
.vb-foe { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.vb-plate { display: flex; align-items: center; gap: 4px; padding: 3px 6px 3px 3px; background: rgba(6,10,20,.72); border: 1px solid rgba(140,214,255,.18); }
.vb-foe.is-target .vb-plate { border-color: rgba(255,197,96,.75); box-shadow: 0 0 10px rgba(255,197,96,.3); }
.vb-shield { position: relative; width: 32px; height: 32px; flex: none; }
.vb-shield img { position: absolute; inset: 0; width: 32px; height: 32px; }
.vb-shield b { position: absolute; inset: 0; display: grid; place-items: center; padding-top: 1px; font: 800 15px/1 var(--vp-font-display); color: #fff;
  text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 -1px 0 #000; }
.vb-shield.is-hit { animation: vb-shake .26s; }
.vb-shield.is-hit b { animation: vb-num-hit .3s var(--vp-ease-out); }
.vb-shield.is-broken b { color: #ff8fd0; font-size: 10px; }
.vb-shield.is-restore { animation: vb-restore .5s var(--vp-ease-out); }
@keyframes vb-shake { 0%, 100% { transform: none; } 20% { transform: translate(-2px, 1px); } 50% { transform: translate(2px, -1px); } 75% { transform: translate(-1px, 0); } }
@keyframes vb-num-hit { 0% { transform: scale(1.8); color: #ff8fd0; } 100% { transform: none; } }
@keyframes vb-restore { 0% { transform: scale(1.5); filter: brightness(2.4) drop-shadow(0 0 6px #7fe3ff); } 100% { transform: none; } }
.vb-shard { position: absolute; left: 0; top: 0; width: 32px; height: 32px; background-size: 32px 32px; pointer-events: none; animation: vb-shard .55s cubic-bezier(.2,.7,.3,1) forwards; }
@keyframes vb-shard { to { transform: translate(var(--dx), var(--dy)) rotate(var(--r)); opacity: 0; } }
.vb-weak { display: flex; gap: 2px; }
.vb-wk { position: relative; width: 20px; height: 20px; display: grid; place-items: center; background: rgba(0,0,0,.45); border: 1px solid rgba(140,214,255,.16); }
.vb-wk img { width: 16px; height: 16px; }
.vb-wk.is-known { border-color: color-mix(in srgb, var(--c) 60%, transparent); background: color-mix(in srgb, var(--c) 14%, rgba(0,0,0,.5)); }
.vb-wk.is-flip { animation: vb-flip .5s var(--vp-ease-out); }
.vb-wk.is-match { box-shadow: 0 0 0 1px var(--vp-weak), 0 0 8px rgba(255,224,102,.7); }
@keyframes vb-flip { 0% { transform: rotateY(90deg) scale(1.6); filter: brightness(3); } 60% { transform: rotateY(0) scale(1.25); } 100% { transform: none; } }
.vb-brk { display: none; gap: 3px; padding: 0 2px; }
.vb-foe.is-broken .vb-brk { display: flex; }
.vb-brk i { width: 6px; height: 6px; transform: rotate(45deg); background: var(--vp-break); box-shadow: 0 0 6px var(--vp-break); }
.vb-brk i.is-off { background: transparent; border: 1px solid rgba(255,79,163,.5); box-shadow: none; }
.vb-foe .vb-buffs { gap: 3px; }
.vb-foe .vb-buff { font-size: 9px; background: rgba(6,10,20,.7); }
.vb-foe-hp { width: 86px; height: 4px; background: rgba(4,8,18,.8); box-shadow: inset 0 0 0 1px rgba(140,214,255,.16); position: relative; overflow: hidden; }
.vb-foe-hp i { position: absolute; inset: 1px; transform-origin: 0 50%; background: linear-gradient(90deg, #ff5a6a, #ff9a6a); transition: transform .35s var(--vp-ease-out); }
.vb-foe-name { font: 600 11px/1 var(--vp-font-ui); letter-spacing: .14em; color: var(--vp-ink-dim); text-transform: uppercase; text-shadow: 0 1px 2px #000; white-space: nowrap; opacity: 0; transition: opacity .15s; }
.vb-foe.is-target .vb-foe-name { opacity: 1; color: var(--vp-amber); }
.vb-foe.is-gone { opacity: 0 !important; }

/* ---------------------------------------------------------------- cursor, reticle, hit boxes */
.vb-cursor { width: 32px; height: 32px; margin: -36px 0 0 -16px; display: none; }
.vb-cursor.is-on { display: block; }
.vb-cursor img { width: 32px; height: 32px; transform: rotate(90deg); animation: vb-bob .7s ease-in-out infinite alternate; filter: drop-shadow(0 0 6px rgba(255,197,96,.8)); }
@keyframes vb-bob { from { translate: 0 -5px; } to { translate: 0 3px; } }
.vb-reticle { width: 88px; height: 88px; margin: -44px 0 0 -44px; display: none; }
.vb-reticle.is-on { display: block; }
.vb-reticle::before, .vb-reticle::after { content: ''; position: absolute; background: linear-gradient(var(--d), #ff3b4e 0 22%, transparent 22% 78%, #ff3b4e 78%); filter: drop-shadow(0 0 4px #ff3b4e); }
.vb-reticle::before { --d: 90deg; left: -14px; right: -14px; top: 50%; height: 2px; margin-top: -1px; }
.vb-reticle::after { --d: 180deg; top: -14px; bottom: -14px; left: 50%; width: 2px; margin-left: -1px; }
.vb-reticle i { position: absolute; inset: 0; border-radius: 50%; border: 3px solid rgba(255,59,78,.95); box-shadow: 0 0 14px rgba(255,59,78,.8), inset 0 0 12px rgba(255,59,78,.45);
  animation: vb-ret 1.6s linear infinite; border-top-color: transparent; border-bottom-color: transparent; }
.vb-reticle b { position: absolute; inset: 14px; border-radius: 50%; border: 1px dashed rgba(255,120,130,.85); animation: vb-ret 3s linear infinite reverse; }
.vb-reticle span { position: absolute; left: 50%; top: -26px; transform: translateX(-50%); font: 700 10px/1 var(--vp-font-display); letter-spacing: .3em; color: #ff6b78; text-shadow: 0 0 6px #ff3b4e; white-space: nowrap; animation: vb-blink .5s steps(2) infinite; }
.vb-reticle s { position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px; background: #ff3b4e; box-shadow: 0 0 8px #ff3b4e; }
@keyframes vb-ret { to { transform: rotate(360deg); } }
@keyframes vb-blink { 50% { opacity: .35; } }
.vb-hit { position: absolute; left: 0; top: 0; pointer-events: none; cursor: pointer; }
.vb-root.is-targeting .vb-hit.is-valid { pointer-events: auto; }

/* ---------------------------------------------------------------- numbers, labels, callouts */
.vb-num { pointer-events: none; }
.vb-num > div { transform: translate(-50%, -50%); animation: vb-num 1.2s var(--vp-ease-out) forwards; text-align: center; white-space: nowrap; }
.vb-num span { display: block; font: 800 34px/1 var(--vp-font-display); color: #fff; letter-spacing: .02em;
  text-shadow: 0 2px 0 #0b0e17, 2px 0 0 #0b0e17, -2px 0 0 #0b0e17, 0 -2px 0 #0b0e17, 2px 2px 0 #0b0e17, -2px 2px 0 #0b0e17, 2px -2px 0 #0b0e17, -2px -2px 0 #0b0e17, 0 4px 10px rgba(0,0,0,.6); }
.vb-num em { display: block; font: 700 13px/1 var(--vp-font-display); font-style: normal; letter-spacing: .26em; padding-left: .26em; margin-bottom: 3px;
  text-shadow: 0 1px 0 #0b0e17, 1px 0 0 #0b0e17, -1px 0 0 #0b0e17, 0 -1px 0 #0b0e17, 0 0 8px rgba(0,0,0,.8); }
.vb-num.weak span { color: var(--vp-weak); font-size: 38px; }
.vb-num.weak em { color: var(--vp-weak); }
.vb-num.crit span { color: #ffb347; font-size: 46px; }
.vb-num.crit em { color: #ffb347; }
.vb-num.heal span { color: #7dffb0; }
.vb-num.ep span { color: #8cc8ff; font-size: 28px; }
.vb-num.word span { font-size: 22px; letter-spacing: .14em; }
@keyframes vb-num { 0% { opacity: 0; transform: translate(-50%, -50%) scale(2); } 9% { opacity: 1; transform: translate(-50%, -50%) scale(.9); }
  17% { transform: translate(-50%, -64%) scale(1.06); } 28% { transform: translate(-50%, -58%) scale(1); } 76% { opacity: 1; transform: translate(-50%, -66%); } 100% { opacity: 0; transform: translate(-50%, -96%); } }
.vb-combo { pointer-events: none; }
.vb-combo > div { transform: translate(0, -50%); font: 800 20px/1 var(--vp-font-display); font-style: italic; letter-spacing: .06em; color: #fff; white-space: nowrap;
  text-shadow: 0 2px 0 #0b0e17, 2px 0 0 #0b0e17, -2px 0 0 #0b0e17, 0 -2px 0 #0b0e17, 0 0 12px rgba(255,179,71,.7); }
.vb-combo > div small { font-size: 12px; letter-spacing: .24em; margin-left: 4px; color: var(--vp-bp); }
.vb-combo.is-pop > div { animation: vb-combo .25s var(--vp-ease-out); }
.vb-combo.is-out { animation: vb-fade .35s forwards; }
@keyframes vb-combo { 0% { transform: translate(0, -50%) scale(1.6); } 100% { transform: translate(0, -50%); } }
@keyframes vb-fade { to { opacity: 0; } }
.vb-label > div { transform: translate(-50%, -50%); animation: vb-label 1.3s var(--vp-ease-out) forwards; padding: 3px 9px; white-space: nowrap;
  font: 700 13px/1 var(--vp-font-display); letter-spacing: .2em; color: #fff; background: rgba(6,10,20,.72); border: 1px solid currentColor; }
.vb-label.buff > div { color: #8affc0; } .vb-label.debuff > div { color: #ff8fa0; } .vb-label.info > div { color: var(--vp-cyan); } .vb-label.boost > div { color: var(--vp-bp); }
@keyframes vb-label { 0% { opacity: 0; transform: translate(-50%, -20%); } 14% { opacity: 1; transform: translate(-50%, -50%); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -90%); } }

.vb-break { pointer-events: none; }
.vb-break { margin-top: 26px; }
.vb-break > div { position: relative; transform: translate(-50%, -50%); animation: vb-break 1.35s cubic-bezier(.2,.8,.2,1) forwards; }
.vb-break .bar { position: absolute; left: -40%; right: -40%; top: 50%; height: 34px; margin-top: -17px; transform: skewX(-24deg);
  background: linear-gradient(90deg, rgba(255,79,163,0), rgba(255,79,163,.85) 18%, rgba(255,140,205,.95) 50%, rgba(255,79,163,.85) 82%, rgba(255,79,163,0));
  box-shadow: 0 0 24px rgba(255,79,163,.7); animation: vb-bar 1.35s cubic-bezier(.2,.8,.2,1) forwards; }
.vb-break .bar::after { content: ''; position: absolute; left: 10%; right: 10%; top: 4px; height: 2px; background: rgba(255,255,255,.85); }
.vb-break .word { position: relative; display: block; font: 800 74px/1 var(--vp-font-display); font-style: italic; letter-spacing: .08em; padding: 0 .1em;
  color: #fff; transform: skewX(-8deg);
  text-shadow: 3px 3px 0 #5c1450, -2px -2px 0 #5c1450, 2px -2px 0 #5c1450, -2px 2px 0 #5c1450, 0 0 20px #ff4fa3, 6px 0 0 rgba(127,227,255,.55), -6px 0 0 rgba(255,79,163,.6); }
.vb-break .sub { position: relative; display: block; text-align: center; margin-top: 6px; font: 700 13px/1 var(--vp-font-display); letter-spacing: .5em; padding-left: .5em; color: #ffd2ec; text-shadow: 0 0 8px #ff4fa3, 0 1px 0 #000; }
@keyframes vb-break { 0% { opacity: 0; transform: translate(-50%, -50%) scale(2.6) rotate(-6deg); filter: brightness(3); }
  10% { opacity: 1; transform: translate(-50%, -50%) scale(.94) rotate(0); filter: brightness(1.6); }
  16% { transform: translate(-48%, -52%) scale(1.04); } 22% { transform: translate(-52%, -49%) scale(1); filter: none; }
  28% { transform: translate(-50%, -50%); } 80% { opacity: 1; transform: translate(-50%, -50%); }
  100% { opacity: 0; transform: translate(-30%, -50%) skewX(-20deg); } }
@keyframes vb-bar { 0% { transform: skewX(-24deg) scaleX(0); } 14% { transform: skewX(-24deg) scaleX(1.05); } 80% { opacity: 1; } 100% { opacity: 0; transform: skewX(-24deg) scaleX(1.2); } }

/* ---------------------------------------------------------------- banner, results, defeat */
.vb-banner { position: absolute; left: 0; right: 0; top: 30%; display: flex; justify-content: center; pointer-events: none; }
.vb-banner > div { padding: 12px 60px; font: 600 19px/1.3 var(--vp-font-ui); letter-spacing: .1em; color: #fff; text-align: center; max-width: 92vw;
  background: linear-gradient(90deg, rgba(8,13,26,0), rgba(8,13,26,.9) 15%, rgba(8,13,26,.9) 85%, rgba(8,13,26,0)); animation: vb-banner var(--d, 1.2s) var(--vp-ease-out) forwards; position: relative; }
.vb-banner > div::before, .vb-banner > div::after { content: ''; position: absolute; left: 10%; right: 10%; height: 1px; background: linear-gradient(90deg, transparent, var(--c, rgba(190,236,255,.8)), transparent); }
.vb-banner > div::before { top: 0; } .vb-banner > div::after { bottom: 0; }
.vb-banner .danger { --c: #ff3b4e; color: #ffd6da; text-shadow: 0 0 12px rgba(255,59,78,.7); }
@keyframes vb-banner { 0% { opacity: 0; transform: scaleY(.2); } 10% { opacity: 1; transform: none; } 85% { opacity: 1; } 100% { opacity: 0; } }

.vb-root.is-ending .vb-top, .vb-root.is-ending .vb-party, .vb-root.is-ending .vb-act { opacity: 0; transition: opacity .5s; pointer-events: none; }
.vb-res { position: absolute; left: max(18px, 4vw); top: 50%; width: min(640px, 52vw); max-height: calc(100% - 28px); transform: translateY(-50%);
  display: flex; flex-direction: column; animation: vb-res-in .45s var(--vp-ease-out); }
@keyframes vb-res-in { from { opacity: 0; transform: translate(-24px, -50%); } }
.vb-res-hd { position: relative; padding: 18px 26px 14px; border-bottom: 1px solid var(--vp-line-dim); display: flex; align-items: flex-end; gap: 18px;
  background: linear-gradient(90deg, rgba(255,197,96,.12), rgba(255,197,96,0) 60%); }
.vb-res-hd h2 { margin: 6px 0 0; font: 800 38px/1 var(--vp-font-display); letter-spacing: .3em; color: #fff; text-shadow: 0 0 18px rgba(255,197,96,.55); }
.vb-res-hd .vp-cap { color: var(--vp-amber); }
.vb-gains { margin-left: auto; display: flex; gap: 22px; }
.vb-gain { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.vb-gain b { font: 700 24px/1 var(--vp-font-display); color: #fff; }
.vb-gain b.cr { color: var(--vp-amber); }
.vb-res-items { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 10px 26px; border-bottom: 1px solid rgba(140,214,255,.1); }
.vb-res-items .it { display: inline-flex; align-items: center; gap: 8px; font: 600 15px var(--vp-font-ui); letter-spacing: .06em; }
.vb-res-items img { width: 32px; height: 32px; }
.vb-res-party { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 18px; padding: 12px 22px; overflow-y: auto; }
.vb-rm { --acc: var(--vp-cyan); display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 12px; align-items: center; padding: 8px 6px; }
.vb-rm.is-ko { opacity: .5; }
.vb-rm .vb-l1 { margin: 0 0 6px; }
.vb-rm .lv { margin-left: auto; font: 600 13px/1 var(--vp-font-display); letter-spacing: .1em; color: var(--vp-ink-dim); }
.vb-rm .lv b { font-size: 18px; color: #fff; }
.vb-rm .vp-bar { height: 5px; }
.vb-up { display: none; margin-top: 7px; font: 600 12px/1.4 var(--vp-font-ui); letter-spacing: .08em; color: #9fe8c4; }
.vb-rm.is-up .vb-up { display: block; animation: vb-res-in .4s var(--vp-ease-out) both; }
.vb-lvup { display: none; padding: 2px 6px; font: 700 11px/1 var(--vp-font-display); letter-spacing: .18em; color: #05070d; background: var(--vp-amber); box-shadow: 0 0 10px rgba(255,197,96,.6); }
.vb-rm.is-up .vb-lvup { display: inline-block; animation: vb-lvpop .5s var(--vp-ease-out) both; }
@keyframes vb-lvpop { from { transform: scale(1.8); opacity: 0; filter: brightness(2); } }
.vb-res-ft { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 10px 22px 14px; border-top: 1px solid var(--vp-line-dim);
  font: 600 13px var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; color: var(--vp-ink-dim); cursor: pointer; }
.vb-res-ft.is-ready { color: var(--vp-amber); }

.vb-defeat { position: absolute; inset: 0; display: grid; place-items: center; background: radial-gradient(80% 70% at 50% 50%, rgba(40,4,12,.55), rgba(3,2,6,.92));
  animation: vb-fade-in 1.2s ease-out both; }
.vb-defeat div { text-align: center; }
.vb-defeat h2 { margin: 0; font: 700 clamp(26px, 4.4vw, 46px)/1.1 var(--vp-font-display); letter-spacing: .32em; padding-left: .32em; color: #ffd6da; text-shadow: 0 0 22px rgba(255,59,78,.6);
  animation: vb-fade-in 1.4s .3s ease-out both; }
.vb-defeat p { margin: 16px 0 0; font: 500 15px var(--vp-font-ui); letter-spacing: .3em; color: var(--vp-ink-dim); text-transform: uppercase; animation: vb-fade-in 1.2s .9s ease-out both; }
@keyframes vb-fade-in { from { opacity: 0; } }

.vb-root.is-frozen *, .vb-root.is-frozen *::before, .vb-root.is-frozen *::after { animation-play-state: paused !important; }

/* ---------------------------------------------------------------- compact (portrait phones) */
.vb-root.is-compact .vb-top { flex-direction: column; gap: 8px; left: 8px; right: 8px; top: calc(8px + var(--vp-safe-top)); }
.vb-root.is-compact .vb-turns { gap: 7px; padding: 5px 8px 5px 6px; }
.vb-root.is-compact .vb-round { min-width: 36px; padding-right: 7px; }
.vb-root.is-compact .vb-round b { font-size: 19px; }
.vb-root.is-compact .vb-order { gap: 3px; }
.vb-root.is-compact .vb-turns .vb-slot { width: 32px; height: 32px; }
.vb-root.is-compact .vb-turns .vb-slot.party img { width: 64px; height: 64px; left: -18px; top: -8px; }
.vb-root.is-compact .vb-turns .vb-slot.enemy img { width: 40px; height: 40px; left: -4px; top: -4px; }
.vb-root.is-compact .vb-turns { flex-wrap: wrap; row-gap: 5px; max-width: calc(100% - 52px); }
.vb-root.is-compact .vb-next { padding-left: 6px; gap: 4px; }
.vb-root.is-compact .vb-next .vb-slot { width: 22px; height: 22px; }
.vb-root.is-compact .vb-next .vb-slot.party img { width: 44px; height: 44px; left: -12px; top: -5px; }
.vb-root.is-compact .vb-next .vb-slot.enemy img { width: 26px; height: 26px; left: -2px; top: -2px; }
.vb-root.is-compact .vb-help { width: 100%; min-height: 0; padding: 7px 12px; font-size: 13px; margin: 0; }
.vb-root.is-compact .vb-help .vb-help-t b { font-size: 14px; }
.vb-root.is-compact .vb-help .vb-help-t small { font-size: 12px; }
.vb-root.is-compact .vb-act { top: calc(112px + var(--vp-safe-top)); font-size: 15px; padding: 8px 30px; }
.vb-root.is-compact .vb-party { left: 8px; right: 8px; bottom: calc(8px + var(--vp-safe-bottom)); width: auto; display: grid; grid-template-columns: 1fr 1fr; padding: 4px; gap: 2px; }
.vb-root.is-compact .vb-row { grid-template-columns: 32px minmax(0, 1fr); gap: 7px; padding: 5px 7px; }
.vb-root.is-compact .vb-row + .vb-row { border-top: 0; }
.vb-root.is-compact .vb-row.is-active { transform: translateY(-3px); }
.vb-root.is-compact .vb-pt { width: 32px; height: 32px; }
.vb-root.is-compact .vb-pt img { width: 64px; height: 64px; left: -18px; top: -8px; }
.vb-root.is-compact .vb-name { font-size: 12px; letter-spacing: .1em; }
.vb-root.is-compact .vb-buffs { display: none; }
.vb-root.is-compact .vb-bp img { width: 11px; height: 11px; }
.vb-root.is-compact .vb-bars { grid-template-columns: 1fr; gap: 3px; }
.vb-root.is-compact .vb-st b { font-size: 14px; min-width: 30px; }
.vb-root.is-compact .vb-st.ep b { font-size: 12px; }
.vb-root.is-compact .vb-st > span { font-size: 9px; }
.vb-root.is-compact .vb-menu { width: min(232px, calc(100% - 150px)); }
.vb-root.is-compact .vb-it { min-height: 40px; font-size: 14px; }
.vb-root.is-compact .vb-list { max-height: 210px; }
.vb-root.is-compact .vb-menu-ft { display: none; }
.vb-root.is-compact .vb-break .word { font-size: 50px; }
.vb-root.is-compact .vb-num span { font-size: 26px; }
.vb-root.is-compact .vb-num.crit span { font-size: 34px; }
.vb-root.is-compact .vb-num.weak span { font-size: 30px; }
.vb-root.is-compact .vb-foe-hp { width: 64px; }
.vb-root.is-compact .vb-res { left: 8px; right: 8px; top: auto; bottom: calc(8px + var(--vp-safe-bottom)); width: auto; max-height: calc(100% - 84px - var(--vp-safe-top) - var(--vp-safe-bottom)); transform: none; animation-name: vb-res-up; }
@keyframes vb-res-up { from { opacity: 0; transform: translateY(24px); } }
.vb-root.is-compact .vb-res-party { grid-template-columns: 1fr; padding: 6px 14px; }
.vb-root.is-compact .vb-rm { padding: 4px; }
.vb-root.is-compact .vb-res-hd { padding: 14px 16px 10px; gap: 12px; }
.vb-root.is-compact .vb-res-hd h2 { font-size: 24px; letter-spacing: .24em; }
.vb-root.is-compact .vb-gains { gap: 14px; }
.vb-root.is-compact .vb-gain b { font-size: 18px; }
.vb-root.is-compact .vb-res-items { padding: 8px 16px; }
.vb-root.is-compact .vb-up { margin-top: 4px; }
.vb-root.is-compact .vb-banner > div { padding: 10px 26px; font-size: 15px; }
/* touch buttons sit to the right of the command menu, above the status grid */
@media (max-aspect-ratio: 9/10) {
  .vp-touch[data-ctx="battle"] .vp-tc-a { right: calc(14px + var(--vp-safe-right)); bottom: calc(var(--vb-panel, 150px) + 22px + var(--vp-safe-bottom)); width: 70px; height: 70px; }
  .vp-touch[data-ctx="battle"] .vp-tc-b { right: calc(92px + var(--vp-safe-right)); bottom: calc(var(--vb-panel, 150px) + 12px + var(--vp-safe-bottom)); width: 52px; height: 52px; }
  .vp-touch[data-ctx="battle"] .vp-tc-plus { right: calc(22px + var(--vp-safe-right)); bottom: calc(var(--vb-panel, 150px) + 160px + var(--vp-safe-bottom)); width: 46px; height: 46px; }
  .vp-touch[data-ctx="battle"] .vp-tc-minus { right: calc(22px + var(--vp-safe-right)); bottom: calc(var(--vb-panel, 150px) + 104px + var(--vp-safe-bottom)); width: 46px; height: 46px; }
  /* the results panel covers them (tap the panel to continue) */
  .vb-ended .vp-touch[data-ctx="battle"] .vp-tc-btn:not(.vp-tc-mute) { opacity: 0; pointer-events: none; transition: opacity .3s; }
}

/* short landscape (phones on their side): the status panel becomes one row of four cards */
.vb-root.is-short .vb-party { width: min(620px, 74vw); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 3px; bottom: calc(6px + var(--vp-safe-bottom)); right: calc(6px + var(--vp-safe-right)); }
.vb-root.is-touch:not(.is-compact) .vb-top { right: calc(64px + var(--vp-safe-right)); }
.vb-root.is-touch:not(.is-compact):not(.is-short) .vb-party { right: calc(176px + var(--vp-safe-right)); }
.vb-root.is-short.is-touch .vb-party { left: calc(8px + var(--vp-safe-left)); right: calc(176px + var(--vp-safe-right)); width: auto; }
.vb-root.is-short .vb-row { padding: 4px 6px; grid-template-columns: 28px minmax(0, 1fr); gap: 6px; }
.vb-root.is-short .vb-row + .vb-row { border-top: 0; border-left: 1px solid rgba(140,214,255,.08); }
.vb-root.is-short .vb-row.is-active { transform: translateY(-4px); }
.vb-root.is-short .vb-pt { width: 28px; height: 28px; }
.vb-root.is-short .vb-pt img { width: 56px; height: 56px; left: -16px; top: -7px; }
.vb-root.is-short .vb-name { font-size: 11px; letter-spacing: .08em; }
.vb-root.is-short .vb-buffs { display: none; }
.vb-root.is-short .vb-bp img { width: 10px; height: 10px; }
.vb-root.is-short .vb-bars { grid-template-columns: 1fr; gap: 2px; }
.vb-root.is-short .vb-st b { font-size: 12px; min-width: 26px; }
.vb-root.is-short .vb-st.ep b { font-size: 11px; }
.vb-root.is-short .vb-st > span { font-size: 8px; }
.vb-root.is-short .vb-it { min-height: 32px; font-size: 14px; }
.vb-root.is-short .vb-list { max-height: 170px; }
.vb-root.is-short .vb-menu-ft { display: none; }
.vb-root.is-short .vb-turns .vb-slot { width: 32px; height: 32px; }
.vb-root.is-short .vb-turns .vb-slot.party img { width: 64px; height: 64px; left: -18px; top: -8px; }
.vb-root.is-short .vb-turns .vb-slot.enemy img { width: 40px; height: 40px; left: -4px; top: -4px; }
.vb-root.is-short .vb-help { min-height: 0; padding: 6px 14px; font-size: 13px; }
`;

const MAIN = [
  { id: 'attack', label: 'Attack', icon: 'attack', help: 'Strike with a weapon. Each Boost point adds one more hit.' },
  { id: 'skill', label: 'Skills', icon: 'skill', help: 'Techniques powered by EP. Boost raises their potency.' },
  { id: 'item', label: 'Items', icon: 'item', help: 'Use one of the squad\'s supplies. Items ignore Boost.' },
  { id: 'defend', label: 'Defend', icon: 'defend', help: 'Halve damage until your next turn and act first next round.' },
  { id: 'flee', label: 'Flee', icon: 'flee', help: 'Try to break away from the fight (70% chance).' },
];
const SHARD_CLIPS = [
  'polygon(0 0, 55% 0, 45% 50%, 0 60%)', 'polygon(55% 0, 100% 0, 100% 55%, 45% 50%)',
  'polygon(0 60%, 45% 50%, 50% 100%, 0 100%)', 'polygon(45% 50%, 100% 55%, 100% 100%, 50% 100%)',
];
const STAT_SHORT = { atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES', spd: 'SPD', taunt: 'TAUNT' };

const enemyIconCache = new Map();
/** 24x24 enemy turn icon redrawn at 2x as a data URL (cached). */
function enemyIconURL(kind) {
  let u = enemyIconCache.get(kind);
  if (!u) {
    const src = buildEnemyIcon(kind);
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, 48, 48);
    u = c.toDataURL();
    enemyIconCache.set(kind, u);
  }
  return u;
}

const img = (src, cls) => el('img', { src, alt: '', draggable: 'false', class: cls });

export class BattleUI {
  /**
   * opts: root (#ui-root), engine, input, audio, stage (BattleStage), model (BattleModel),
   * onBoost(actorId, level, prev) for the live boost preview.
   */
  constructor({ root, engine, input, audio, stage, model, onBoost = null }) {
    installBaseCSS();
    injectCSS('vp-battle', CSS);
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.stage = stage;
    this.model = model;
    this.onBoost = onBoost;
    this.zoom = 1;
    this.W = 1;
    this.H = 1;
    this.activeId = null;
    this.cmd = null;
    this.memory = {};
    this.lastTarget = null;
    this.timers = [];
    this._due = [];
    this.driven = [];           // DOM animations played on the UI clock
    this.view = new Map();      // combatant id -> view state
    this.combos = new Map();
    this.reticleId = null;
    this.results = null;
    this.round = 1;
    this.clock = 0;             // UI seconds (real time, capped per frame like the engine's)
    this._pos = { x: 0, y: 0, visible: false };
    this._rect = { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 };
    this._plates = [];

    this.root = el('div', { class: 'vb-root is-intro' });
    this.world = el('div', { class: 'vb-world' });
    this.cursors = [0, 1, 2, 3].map(() => el('div', { class: 'vb-abs vb-cursor' }, img(iconURL('cursor', 2))));
    this.reticle = el('div', { class: 'vb-abs vb-reticle' }, [el('i'), el('b'), el('s'), el('span', { text: 'LOCK-ON' })]);
    this.world.append(...this.cursors, this.reticle);

    this.roundEl = el('b', { text: '1' });
    this.orderEl = el('div', { class: 'vb-order' });
    this.nextEl = el('div', { class: 'vb-order' });
    this.turns = el('div', { class: 'vp-panel vb-turns' }, [
      el('div', { class: 'vb-round' }, [el('span', { class: 'vp-cap', text: 'Round' }), this.roundEl]),
      this.orderEl,
      el('div', { class: 'vb-next' }, [el('span', { class: 'vp-cap', text: 'Next' }), this.nextEl]),
    ]);
    this.helpText = el('div', { class: 'vb-help-t' });
    this.helpSide = el('div', { class: 'vb-help-side' });
    this.help = el('div', { class: 'vp-panel vb-help' }, [this.helpText, this.helpSide]);
    this.top = el('div', { class: 'vb-top' }, [this.turns, this.help]);
    this.act = el('div', { class: 'vb-act' });
    this.party = el('div', { class: 'vp-panel vb-party vb-live' });
    this.menuWho = el('span', { class: 'vb-menu-who' });
    this.menuSub = el('span', { class: 'vb-menu-sub' });
    this.boostCap = el('span', { class: 'vp-cap', text: 'Boost' });
    this.pips = [0, 1, 2].map(() => el('i', { class: 'vb-pip' }));
    this.boostEl = el('div', { class: 'vb-boost', title: 'Boost' }, [this.boostCap, ...this.pips]);
    this.boostEl.addEventListener('click', (e) => { e.stopPropagation(); this._boost(this.cmd && this.cmd.boost >= this.cmd.maxBoost ? -9 : 1); });
    this.list = el('div', { class: 'vb-list vp-scroll' });
    this.menuFoot = el('div', { class: 'vb-menu-ft' });
    this.menu = el('div', { class: 'vb-abs vb-menu vb-live' }, el('div', { class: 'vp-panel vb-menu-in' }, [
      el('div', { class: 'vb-menu-hd' }, [el('div', {}, [this.menuWho, el('br'), this.menuSub]), this.boostEl]), this.list, this.menuFoot,
    ]));
    this.banners = el('div', { class: 'vb-banner' });
    this.overlay = el('div', { class: 'vb-overlay' });
    this.root.append(this.world, this.top, this.act, this.party, this.menu, this.banners, this.overlay);
    root.appendChild(this.root);

    this._build();
    this._resize();
  }

  // ------------------------------------------------------------------ build

  _build() {
    const m = this.model;
    for (const c of m.combatants) {
      const v = {
        id: c.id, side: c.side, key: c.key, name: c.name, hp: c.hp, maxHp: c.maxHp, ep: c.ep, maxEp: c.maxEp, bp: c.bp,
        shield: c.shield, maxShield: c.maxShield, broken: false, brokenRounds: 0, revealed: [...c.revealed], weakCount: c.weaknesses.length,
        alive: c.alive, buffs: {}, dispHp: c.hp, dispEp: c.ep, stack: 0, stackT: -1, stackY: 0, stackTag: '',
      };
      this.view.set(c.id, v);
      v.hitbox = el('div', { class: 'vb-abs vb-hit' });
      bindPointer(v.hitbox, { onHover: () => this._hoverTarget(c.id), onActivate: () => this._tapTarget(c.id) });
      this.world.appendChild(v.hitbox);
      if (c.side === 'party') this._buildRow(v);
      else this._buildFoe(v);
    }
  }

  _buildRow(v) {
    const acc = MEMBER_ACCENT[v.key] || '#7fe3ff';
    v.hpNum = el('b', { text: String(v.hp) });
    v.epNum = el('b', { text: String(v.ep) });
    v.hpBar = el('i');
    v.epBar = el('i');
    v.bpEl = el('div', { class: 'vb-bp' });
    v.bpImgs = [0, 1, 2, 3, 4].map(() => img(iconURL('bp_empty', 1)));
    v.bpEl.append(...v.bpImgs);
    v.buffsEl = el('div', { class: 'vb-buffs' });
    v.row = el('div', { class: 'vb-row' }, [
      el('div', { class: 'vb-pt' }, img(portraitURL(v.key, 2))),
      el('div', {}, [
        el('div', { class: 'vb-l1' }, [el('span', { class: 'vb-name', text: v.name }), el('span', { class: 'vb-ko', text: 'KO' }), v.buffsEl, v.bpEl]),
        el('div', { class: 'vb-bars' }, [
          el('div', { class: 'vb-st hp' }, [el('span', { text: 'HP' }), el('div', { class: 'vp-bar hp' }, v.hpBar), v.hpNum]),
          el('div', { class: 'vb-st ep' }, [el('span', { text: 'EP' }), el('div', { class: 'vp-bar ep' }, v.epBar), v.epNum]),
        ]),
      ]),
    ]);
    v.row.style.setProperty('--acc', acc);
    v.row.classList.toggle('is-ko', !v.alive);
    bindPointer(v.row, { onActivate: () => this._tapTarget(v.id) });
    this.party.appendChild(v.row);
    this._paintBars(v);
    this._paintBp(v);
  }

  _buildFoe(v) {
    v.shieldImg = img(iconURL('shield', 2));
    v.shieldNum = el('b', { text: String(v.shield) });
    v.shieldEl = el('div', { class: 'vb-shield' }, [v.shieldImg, v.shieldNum]);
    v.weakEl = el('div', { class: 'vb-weak' });
    v.brkEl = el('div', { class: 'vb-brk' }, [el('i'), el('i')]);
    v.hpFill = el('i');
    v.nameEl = el('div', { class: 'vb-foe-name', text: v.name });
    v.buffsEl = el('div', { class: 'vb-buffs' });
    v.foe = el('div', { class: 'vb-abs vb-foe' }, [
      v.nameEl,
      el('div', { class: 'vb-plate' }, [v.shieldEl, v.weakEl, v.brkEl]),
      el('div', { class: 'vb-foe-hp' }, v.hpFill),
      v.buffsEl,
    ]);
    this.world.appendChild(v.foe);
    this._paintWeak(v);
    this._paintBars(v);
  }

  _paintWeak(v, flipIndex = -1, target = v.weakEl) {
    target.textContent = '';
    const match = this.cmd && this.cmd.screen === 'target' ? this.cmd.target.type : null;
    for (let i = 0; i < v.weakCount; i++) {
      const t = v.revealed[i];
      const slot = el('span', { class: `vb-wk${t ? ' is-known' : ''}${i === flipIndex ? ' is-flip' : ''}${t && t === match ? ' is-match' : ''}` },
        img(iconURL(t || 'unknown', 1)));
      if (t) slot.style.setProperty('--c', DAMAGE_COLORS[t] || '#7fe3ff');
      target.appendChild(slot);
    }
  }

  _paintBars(v) {
    if (v.side === 'enemy') {
      v.hpFill.style.transform = `scaleX(${clamp(v.hp / v.maxHp, 0, 1)})`;
      return;
    }
    v.hpBar.style.transform = `scaleX(${clamp(v.hp / v.maxHp, 0, 1)})`;
    v.epBar.style.transform = `scaleX(${clamp(v.ep / Math.max(1, v.maxEp), 0, 1)})`;
    v.hpBar.parentNode.classList.toggle('is-low', v.hp > 0 && v.hp < v.maxHp * 0.25);
  }

  _paintBp(v, fresh = 0) {
    const boost = this.cmd && this.cmd.actorId === v.id ? this.cmd.boost : 0;
    for (let i = 0; i < 5; i++) {
      const im = v.bpImgs[i];
      const on = i < v.bp;
      const spend = on && i >= v.bp - boost;
      const name = spend ? 'bp_boost' : on ? 'bp' : 'bp_empty';
      if (im.dataset.n !== name) { im.src = iconURL(name, 1); im.dataset.n = name; }
      im.classList.toggle('is-boost', spend);
      if (fresh > 0 && on && i >= v.bp - fresh) {
        im.classList.remove('is-new');
        void im.offsetWidth;
        im.classList.add('is-new');
      }
    }
  }

  // ------------------------------------------------------------------ view-state updates (director)

  setRound(round, order, next) {
    this.round = round;
    this.roundEl.textContent = String(round);
    const r = this.roundEl.parentNode;
    r.classList.remove('is-pop');
    void r.offsetWidth;
    r.classList.add('is-pop');
    for (const v of this.view.values()) {
      if (!v.broken) continue;
      v.brokenRounds = Math.max(0, v.brokenRounds - 1);
      this._paintBreakLeft(v);
    }
    this.setOrder(order, next);
  }

  setOrder(order, next) {
    this.order = order;
    this.nextOrder = next;
    this._slots(this.orderEl, order, true);
    this._slots(this.nextEl, next, false);
  }

  _slots(box, ids, current) {
    box.textContent = '';
    ids.forEach((id, i) => {
      const v = this.view.get(id);
      if (!v) return;
      const s = el('div', { class: `vb-slot ${v.side}${current && i === 0 && id === this.activeId ? ' is-active' : ''}` },
        img(v.side === 'party' ? portraitURL(v.key, 2) : enemyIconURL(v.key)));
      if (v.side === 'party') s.style.setProperty('--acc', MEMBER_ACCENT[v.key] || '#7fe3ff');
      s.style.animationDelay = `${i * 0.03}s`;
      s.title = v.name;
      box.appendChild(s);
    });
  }

  setActive(id) {
    this.activeId = id;
    for (const v of this.view.values()) if (v.row) v.row.classList.toggle('is-active', v.id === id);
    const first = this.orderEl.firstElementChild;
    if (first) first.classList.toggle('is-active', !!id && this.order && this.order[0] === id);
  }

  setHp(id, hp) {
    const v = this.view.get(id);
    if (!v) return;
    if (hp < v.hp && v.row) {
      v.row.classList.remove('is-hurt');
      void v.row.offsetWidth;
      v.row.classList.add('is-hurt');
    }
    v.hp = hp;
    this._paintBars(v);
  }

  setEp(id, ep) {
    const v = this.view.get(id);
    if (!v) return;
    v.ep = ep;
    this._paintBars(v);
  }

  setBp(id, bp, delta = 0) {
    const v = this.view.get(id);
    if (!v || !v.row) return;
    v.bp = bp;
    this._paintBp(v, delta > 0 ? delta : 0);
  }

  setShield(id, shield, maxShield, { restore = false } = {}) {
    const v = this.view.get(id);
    if (!v || !v.shieldEl) return;
    const hit = shield < v.shield;
    v.shield = shield;
    if (maxShield != null) v.maxShield = maxShield;
    if (!v.broken) v.shieldNum.textContent = String(shield);
    const cls = restore ? 'is-restore' : hit ? 'is-hit' : null;
    if (cls) {
      v.shieldEl.classList.remove('is-hit', 'is-restore');
      void v.shieldEl.offsetWidth;
      v.shieldEl.classList.add(cls);
    }
  }

  setBroken(id, broken) {
    const v = this.view.get(id);
    if (!v || !v.foe || v.broken === broken) return;
    v.broken = broken;
    v.foe.classList.toggle('is-broken', broken);
    v.shieldEl.classList.toggle('is-broken', broken);
    if (broken) {
      v.brokenRounds = 2;
      this._shatter(v);
      v.shieldImg.src = iconURL('shield_broken', 2);
      v.shieldNum.textContent = '';
      this._paintBreakLeft(v);
    } else {
      v.shieldImg.src = iconURL('shield', 2);
      v.shieldNum.textContent = String(v.shield);
    }
    v.foeW = 0;
  }

  _paintBreakLeft(v) {
    [...v.brkEl.children].forEach((p, i) => p.classList.toggle('is-off', i >= v.brokenRounds));
  }

  /** The shield icon bursts into four shards (DOM), then shows the broken shield. */
  _shatter(v) {
    const url = iconURL('shield', 2);
    SHARD_CLIPS.forEach((clip, i) => {
      const s = el('i', { class: 'vb-shard' });
      s.style.backgroundImage = `url(${url})`;
      s.style.clipPath = clip;
      s.style.setProperty('--dx', `${(i % 2 ? 1 : -1) * (16 + Math.random() * 14)}px`);
      s.style.setProperty('--dy', `${(i < 2 ? -1 : 1) * (12 + Math.random() * 12) + 6}px`);
      s.style.setProperty('--r', `${(Math.random() * 2 - 1) * 90}deg`);
      v.shieldEl.appendChild(s);
      this._drive(s, 0.55);
    });
  }

  reveal(id, type) {
    const v = this.view.get(id);
    if (!v || !v.weakEl || v.revealed.includes(type)) return;
    v.revealed.push(type);
    this._paintWeak(v, v.revealed.length - 1);
    this.audio?.sfx('cursor', { pitch: 1.6 });
  }

  setKO(id, ko) {
    const v = this.view.get(id);
    if (!v) return;
    v.alive = !ko;
    if (v.row) v.row.classList.toggle('is-ko', ko);
    if (ko) {
      v.hp = 0;
      v.bp = 0;
      v.buffs = {};
      this._paintBuffs(v);
      if (v.row) { this._paintBars(v); this._paintBp(v); }
    }
  }

  removeFoe(id) {
    const v = this.view.get(id);
    if (!v || !v.foe) return;
    v.foe.classList.add('is-gone');
    v.gone = true;
  }

  setStatus(id, stat, stage) {
    const v = this.view.get(id);
    if (!v) return;
    if (stage === 0) delete v.buffs[stat];
    else v.buffs[stat] = stage;
    this._paintBuffs(v);
    v.foeW = 0;
  }

  _paintBuffs(v) {
    v.buffsEl.textContent = '';
    for (const [stat, stage] of Object.entries(v.buffs)) {
      const cls = stat === 'taunt' ? 'taunt' : stage > 0 ? 'up' : 'down';
      const arrow = stat === 'taunt' ? '' : (stage > 0 ? '▲' : '▼').repeat(Math.abs(stage));
      v.buffsEl.appendChild(el('span', { class: `vb-buff ${cls}`, text: `${STAT_SHORT[stat] || stat}${arrow}` }));
    }
  }

  setReticle(id) {
    this.reticleId = id;
    this.reticle.classList.toggle('is-on', !!id);
  }

  // ------------------------------------------------------------------ floating text

  /** Positions a world-anchored popup; `margin` keeps its centre that far from the screen edges. */
  _place(node, p, margin = 0) {
    this.engine.projectToScreen(p, this._pos);
    const x = clamp(this._pos.x / this.zoom, margin, this.W - margin);
    node.style.transform = `translate(${x.toFixed(1)}px, ${(this._pos.y / this.zoom).toFixed(1)}px)`;
  }

  _float(node, p, life, margin = 70) {
    this._place(node, p, margin);
    this.world.appendChild(node);
    this._drive(node, life);
  }

  /**
   * Takes over the CSS animations of a freshly added node and plays them on the UI clock (real time,
   * capped per frame like the engine's), so they stay in step with the 3D view even when frames are
   * slow. With remove, the node is dropped when its life is over; onDone runs then.
   */
  _drive(node, life, { remove = true, onDone = null } = {}) {
    this.driven = this.driven.filter((x) => x.node !== node);
    const anims = node.getAnimations ? node.getAnimations({ subtree: true }) : [];
    for (const a of anims) a.pause();
    const d = { node, anims, t: 0, life, remove, onDone };
    this.driven.push(d);
    return d;
  }

  _drivenStep(dt) {
    for (let i = 0; i < this.driven.length; i++) {
      const d = this.driven[i];
      d.t += dt;
      const ms = Math.min(d.t, d.life) * 1000;
      for (const a of d.anims) a.currentTime = ms;
      if (d.t < d.life) continue;
      this.driven.splice(i--, 1);
      if (d.remove) d.node.remove();
      d.onDone?.();
    }
  }

  /** Damage / heal / EP number over a combatant; rapid hits on the same target stack upward. */
  number(id, p, value, kind = 'dmg', { weak = false, crit = false, index = 0, count = 1 } = {}) {
    const v = this.view.get(id);
    const now = this.clock;
    // a stack repeats its WEAK / CRITICAL tag only when it changes; a tagged number climbs a bit higher
    const tag = crit ? 'CRITICAL' : weak ? 'WEAK' : '';
    let n = 0, showTag = !!tag, y = 0;
    if (v) {
      n = now - v.stackT < 0.65 ? v.stack + 1 : 0;
      showTag = !!tag && (n === 0 || v.stackTag !== tag);
      v.stackY = n ? v.stackY + 40 + (showTag ? 14 : 0) : 0;
      v.stack = n;
      v.stackT = now;
      v.stackTag = tag;
      y = v.stackY;
    }
    const cls = ['vb-abs', 'vb-num', kind];
    if (weak) cls.push('weak');
    if (crit) cls.push('crit');
    if (typeof value === 'string') cls.push('word');
    const inner = el('div');
    if (showTag) inner.appendChild(el('em', { text: tag }));
    inner.appendChild(el('span', { text: typeof value === 'number' ? String(value) : value }));
    const node = el('div', { class: cls.join(' ') }, inner);
    const q = p.clone();
    q.y += 0.05;
    this._place(node, q, 34);
    const dx = (n % 2 ? 1 : -1) * Math.min(n, 1) * 18;
    node.style.transform += ` translate(${dx}px, ${-y}px)`;
    this.world.appendChild(node);
    this._drive(node, 1.2);
    if (count > 1 && index > 0 && kind === 'dmg') this._combo(id, p, index + 1);
  }

  _combo(id, p, hits) {
    let c = this.combos.get(id);
    if (!c || !c.node.isConnected) {
      const text = el('div');
      c = { node: el('div', { class: 'vb-abs vb-combo' }, text), text, timer: null };
      this.combos.set(id, c);
      this.world.appendChild(c.node);
    }
    c.node.classList.remove('is-out', 'is-pop');
    c.text.innerHTML = `${hits}<small>HITS</small>`;
    void c.node.offsetWidth;
    c.node.classList.add('is-pop');
    const q = p.clone();
    q.x += 0.75;
    this._place(c.node, q);
    this._drive(c.node, 0.25, { remove: false });
    if (c.timer) c.timer.cancelled = true;
    c.timer = this.after(0.9, () => {
      c.node.classList.add('is-out');
      this._drive(c.node, 0.35);
    });
  }

  label(id, p, text, tone = 'info') {
    const node = el('div', { class: `vb-abs vb-label ${tone}` }, el('div', { text }));
    const q = p.clone();
    q.y += 0.45;
    this._float(node, q, 1.35);
  }

  breakCallout(id, p) {
    const node = el('div', { class: 'vb-abs vb-break' }, el('div', {}, [el('i', { class: 'bar' }), el('span', { class: 'word', text: 'BREAK' }), el('span', { class: 'sub', text: 'SHIELD SHATTERED' })]));
    this._float(node, p, 1.4, this.compact ? 120 : 180);
  }

  /** Centred message banner; resolves when it has faded. */
  banner(text, { ms = 1200, tone = '' } = {}) {
    const node = el('div', { class: tone, text });
    node.style.setProperty('--d', `${ms}ms`);
    this.banners.textContent = '';
    this.banners.appendChild(node);
    return new Promise((resolve) => this._drive(node, ms / 1000, { onDone: resolve }));
  }

  /** Name of the move being performed, top centre. */
  actionName(text, side, type) {
    this.act.textContent = '';
    if (type) this.act.appendChild(img(iconURL(type, 1)));
    this.act.appendChild(document.createTextNode(text));
    this.act.className = `vb-act ${side}`;
    void this.act.offsetWidth;
    this.act.classList.add('is-on');
    this._drive(this.act, 1.5, { remove: false });
  }

  /** Runs fn after `sec` seconds of UI time (stops with the battle). Returns a cancellable handle. */
  after(sec, fn) {
    const h = { t: sec, fn, cancelled: false };
    this.timers.push(h);
    return h;
  }

  showIntro(on) {
    this.root.classList.toggle('is-intro', on);
  }

  freeze(on) {
    this.root.classList.toggle('is-frozen', on);
    this.frozen = on;
  }

  // ------------------------------------------------------------------ command menu

  /** Opens the command menu for a party member; resolves with a model action, or null if cancelled from outside. */
  chooseAction(actorId) {
    const m = this.model;
    const v = this.view.get(actorId);
    this.cmd = {
      actorId, v, menu: m.getMenu(actorId), maxBoost: m.maxBoost(actorId), boost: 0,
      screen: 'main', sel: 0, stack: [], rows: [], target: null, resolve: null,
    };
    const mem = this.memory[actorId];
    this.menu.style.setProperty('--acc', MEMBER_ACCENT[v.key] || '#7fe3ff');
    this.menuWho.textContent = v.name;
    this._paintFoot();
    this._open('main', mem ? mem.main : 0);
    this.menu.classList.add('is-open');
    this.audio?.sfx('menuOpen');
    this._paintBoost(false);
    return new Promise((resolve) => { this.cmd.resolve = resolve; });
  }

  /** Closes the menu and resolves the pending choice with null (debug win, battle end). */
  cancelChoice() {
    if (!this.cmd) return;
    const r = this.cmd.resolve;
    this._closeMenu();
    r?.(null);
  }

  _closeMenu() {
    if (this.cmd) this._setBoost(0, true);
    this.cmd = null;
    this.menu.classList.remove('is-open');
    this.root.classList.remove('is-targeting');
    this._setHelp(null);
    for (const c of this.cursors) c.classList.remove('is-on');
    for (const v of this.view.values()) {
      v.foe?.classList.remove('is-target');
      v.row?.classList.remove('is-pick');
    }
  }

  _paintFoot() {
    const dev = this.input?.lastDevice || 'keyboard';
    this.menuFoot.textContent = '';
    const hint = (action, text, fn) => {
      const node = el('span', {}, [glyph(action, dev), document.createTextNode(text)]);
      bindPointer(node, { onActivate: () => { if (this.cmd) fn(); } });
      return node;
    };
    this.menuFoot.append(hint('boostDown', '', () => this._boost(-1)), hint('boostUp', 'Boost', () => this._boost(1)), hint('cancel', 'Back', () => this._back()));
    this._device = dev;
  }

  _open(screen, sel = 0) {
    const c = this.cmd;
    c.screen = screen;
    c.rows = this._rowsFor(screen);
    c.sel = clamp(sel, 0, Math.max(0, c.rows.length - 1));
    this.menuSub.textContent = { main: 'Command', weapons: 'Attack', skills: 'Skills', items: 'Items' }[screen] || '';
    this.list.textContent = '';
    c.rows.forEach((r, i) => {
      const right = el('span', { class: 'r' });
      if (r.right) right.append(...[].concat(r.right));
      const node = el('div', { class: `vp-row vb-it${r.dim ? ' is-dim' : ''}` }, [img(iconURL(r.icon, 1)), el('span', { text: r.label }), right]);
      bindPointer(node, {
        onHover: () => { if (this.cmd && this.cmd.sel !== i) { this.cmd.sel = i; this._paintSel(); this.audio?.sfx('cursor'); } },
        onActivate: () => { if (!this.cmd || this.cmd.screen !== screen) return; this.cmd.sel = i; this._paintSel(); this._activate(); },
      });
      r.node = node;
      this.list.appendChild(node);
    });
    const anim = this.menu.firstElementChild;
    anim.style.animation = 'none';
    void anim.offsetWidth;
    anim.style.animation = '';
    this._menuSize = null;
    this._paintSel();
  }

  _rowsFor(screen) {
    const c = this.cmd;
    const menu = c.menu;
    if (screen === 'main') {
      return MAIN.filter((r) => r.id !== 'flee' || menu.canFlee).map((r) => ({
        ...r, dim: (r.id === 'item' && !menu.items.length) || (r.id === 'skill' && !menu.skills.some((s) => s.usable)),
      }));
    }
    if (screen === 'weapons') {
      return menu.weapons.map((w) => ({
        id: w, label: TYPE_LABEL[w] || w, icon: w, weapon: w,
        right: this._weakHint(w), help: `${TYPE_LABEL[w]} attack. ${this._weakText(w)}`,
      }));
    }
    if (screen === 'skills') {
      return menu.skills.map((s) => ({
        id: s.id, label: s.name, icon: s.type || (s.kind === 'heal' || s.kind === 'revive' ? 'medigel' : 'skill'), skill: s, dim: !s.usable,
        right: [...this._weakHint(s.type), el('span', { class: 'ep', text: `${s.cost} EP` })],
        help: `${s.desc} ${s.boostMode === 'hits' ? 'Boost: +1 hit per BP.' : s.kind === 'attack' || s.kind === 'heal' ? 'Boost: x1.5 / x2 / x2.5.' : 'Boost: lasts longer.'}`,
      }));
    }
    return menu.items.map((it) => ({
      id: it.id, label: it.name, icon: it.id, item: it, dim: !it.usable,
      right: el('span', { text: `x${it.count}` }), help: it.desc,
    }));
  }

  /** "WEAK" marker when a damage type matches a revealed weakness of a living foe. */
  _weakHint(type) {
    if (!type) return [];
    for (const v of this.view.values()) if (v.side === 'enemy' && v.alive && v.revealed.includes(type)) return [el('span', { class: 'wk', text: 'WEAK' })];
    return [];
  }

  _weakText(type) {
    const names = [...this.view.values()].filter((v) => v.side === 'enemy' && v.alive && v.revealed.includes(type)).map((v) => v.name);
    return names.length ? `Hits ${names.join(', ')} where it hurts.` : '';
  }

  _paintSel() {
    const c = this.cmd;
    if (!c) return;
    c.rows.forEach((r, i) => r.node && r.node.classList.toggle('is-sel', i === c.sel));
    const r = c.rows[c.sel];
    if (r && r.node) r.node.scrollIntoView({ block: 'nearest' });
    if (c.screen !== 'target' && r) this._setHelp({ text: r.help });
  }

  _setHelp(h) {
    this.help.classList.toggle('is-on', !!h);
    if (!h) return;
    this.helpText.textContent = '';
    if (h.title) this.helpText.appendChild(el('b', { class: h.weak ? 'weak' : '', text: h.title }));
    if (h.text) this.helpText.appendChild(h.title ? el('small', { text: h.text }) : document.createTextNode(h.text));
    this.helpSide.textContent = '';
    if (h.side) this.helpSide.appendChild(h.side);
  }

  _activate() {
    const c = this.cmd;
    const r = c.rows[c.sel];
    if (!r) return;
    const err = () => { this.audio?.sfx('error'); this._shake(r.node); };
    if (c.screen === 'main') {
      if (r.dim) return err();
      this.audio?.sfx('confirm');
      if (r.id === 'attack') {
        if (c.menu.weapons.length > 1) return this._push('weapons', this.memory[c.actorId]?.weapon ?? 0);
        return this._target('enemy', { kind: 'attack', weapon: c.menu.weapons[0] }, c.menu.weapons[0]);
      }
      if (r.id === 'skill') return this._push('skills', this.memory[c.actorId]?.skill ?? 0);
      if (r.id === 'item') return this._push('items', 0);
      if (r.id === 'defend') return this._resolve({ kind: 'defend' });
      if (r.id === 'flee') return this._resolve({ kind: 'flee' });
    } else if (c.screen === 'weapons') {
      this.audio?.sfx('confirm');
      this._mem('weapon', c.sel);
      return this._target('enemy', { kind: 'attack', weapon: r.weapon }, r.weapon);
    } else if (c.screen === 'skills') {
      if (r.dim) return err();
      this.audio?.sfx('confirm');
      this._mem('skill', c.sel);
      return this._target(r.skill.target, { kind: 'skill', skillId: r.skill.id }, r.skill.type, r.skill);
    } else if (c.screen === 'items') {
      if (r.dim) return err();
      this.audio?.sfx('confirm');
      return this._target(r.item.target, { kind: 'item', itemId: r.item.id }, null, r.item);
    }
  }

  _mem(key, val) {
    const m = (this.memory[this.cmd.actorId] ||= {});
    m[key] = val;
  }

  _shake(node) {
    if (!node) return;
    node.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 180 });
  }

  _push(screen, sel) {
    const c = this.cmd;
    c.stack.push({ screen: c.screen, sel: c.sel });
    if (c.screen === 'main') this._mem('main', c.sel);
    this._open(screen, sel);
  }

  _back() {
    const c = this.cmd;
    if (c.screen === 'target') {
      this.root.classList.remove('is-targeting');
      for (const cur of this.cursors) cur.classList.remove('is-on');
      for (const v of this.view.values()) { v.foe?.classList.remove('is-target'); v.row?.classList.remove('is-pick'); }
      this.menu.classList.add('is-open');
      this.audio?.sfx('cancel');
      const prev = c.stack.pop();
      this._open(prev.screen, prev.sel);
      for (const v of this.view.values()) if (v.foe) this._paintWeak(v);
      return;
    }
    if (!c.stack.length) return;
    this.audio?.sfx('cancel');
    const prev = c.stack.pop();
    this._open(prev.screen, prev.sel);
  }

  /** Enter target selection for a target kind ('enemy' | 'enemies' | 'ally' | 'allies' | 'self' | 'koAlly'). */
  _target(kind, action, type = null, source = null) {
    const c = this.cmd;
    const ids = this.model.validTargets(c.actorId, kind);
    if (!ids.length) { this.audio?.sfx('error'); return; }
    const sorted = this._sortTargets(ids);
    let index = 0;
    if (kind === 'enemy') {
      const remembered = sorted.indexOf(this.lastTarget);
      if (remembered >= 0) index = remembered;
    } else if (kind === 'ally' && source && (source.kind === 'heal' || ITEMS[source.id]?.effect?.heal)) {
      let worst = 2;
      sorted.forEach((id, i) => { const v = this.view.get(id); const r = v.hp / v.maxHp; if (r < worst) { worst = r; index = i; } });
    } else if (kind === 'ally' || kind === 'self') {
      index = Math.max(0, sorted.indexOf(c.actorId));
    }
    if (c.screen === 'main') this._mem('main', c.sel);
    c.stack.push({ screen: c.screen, sel: c.sel });
    c.screen = 'target';
    c.target = { kind, ids: sorted, index, action, type, all: kind === 'enemies' || kind === 'allies' };
    this.root.classList.add('is-targeting');
    this.menu.classList.remove('is-open');
    for (const v of this.view.values()) if (v.foe) this._paintWeak(v);
    this._paintTarget();
  }

  _sortTargets(ids) {
    const r = this._rect;
    return ids.map((id) => {
      const a = this.stage.actor(id);
      this.stage.screenRect(a, r);
      return { id, y: a.side === 'party' ? this.stage.party.indexOf(a) : r.cy };
    }).sort((a, b) => a.y - b.y).map((x) => x.id);
  }

  _paintTarget() {
    const c = this.cmd;
    const t = c.target;
    const sel = t.all ? t.ids : [t.ids[t.index]];
    for (const v of this.view.values()) {
      const on = sel.includes(v.id);
      v.foe?.classList.toggle('is-target', on);
      v.row?.classList.toggle('is-pick', on);
    }
    this.cursors.forEach((cur, i) => {
      cur.classList.toggle('is-on', i < sel.length);
      cur.dataset.id = sel[i] || '';
    });
    const v = this.view.get(sel[0]);
    if (t.all) {
      this._setHelp({ title: t.kind === 'enemies' ? 'All foes' : 'All allies', text: 'Confirm to target everyone.' });
    } else if (v.side === 'enemy') {
      const weak = t.type && v.revealed.includes(t.type);
      const side = el('div', { class: 'vb-plate' });
      const sh = el('div', { class: `vb-shield${v.broken ? ' is-broken' : ''}` }, [img(iconURL(v.broken ? 'shield_broken' : 'shield', 2)), el('b', { text: v.broken ? '' : String(v.shield) })]);
      const wk = el('div', { class: 'vb-weak' });
      this._paintWeak(v, -1, wk);
      side.append(sh, wk);
      this._setHelp({ title: v.name, weak, text: weak ? 'Weakness! This hit cracks its shield.' : v.broken ? 'Broken: takes double damage.' : 'Unknown weak points are marked ?', side });
    } else {
      this._setHelp({ title: v.name, text: `HP ${v.hp} / ${v.maxHp}   EP ${v.ep} / ${v.maxEp}${v.alive ? '' : '   (down)'}` });
    }
  }

  _cycle(d) {
    const t = this.cmd.target;
    if (t.all || t.ids.length < 2) return;
    t.index = (t.index + d + t.ids.length) % t.ids.length;
    this.audio?.sfx('cursor');
    this._paintTarget();
  }

  _confirmTarget() {
    const c = this.cmd;
    const t = c.target;
    const id = t.ids[t.index];
    if (t.kind === 'enemy') this.lastTarget = id;
    this.audio?.sfx('confirm');
    this._resolve({ ...t.action, targetId: t.all ? undefined : id });
  }

  /** Mouse over a valid target moves the cursor there. */
  _hoverTarget(id) {
    const c = this.cmd;
    if (!c || c.screen !== 'target' || c.target.all) return;
    const i = c.target.ids.indexOf(id);
    if (i < 0 || i === c.target.index) return;
    c.target.index = i;
    this.audio?.sfx('cursor');
    this._paintTarget();
  }

  _tapTarget(id) {
    const c = this.cmd;
    if (!c || c.screen !== 'target') return;
    const t = c.target;
    const i = t.ids.indexOf(id);
    if (i < 0) return;
    if (!t.all) t.index = i;
    this._paintTarget();
    this._confirmTarget();
  }

  _resolve(action) {
    const c = this.cmd;
    const out = { actorId: c.actorId, boost: action.kind === 'attack' || action.kind === 'skill' ? c.boost : 0, ...action };
    if (out.kind === 'item' || out.kind === 'defend' || out.kind === 'flee') this._setBoost(0, true);
    const r = c.resolve;
    if (c.screen !== 'target') this._mem('main', c.sel);
    this.cmd = null;
    this._closeMenuKeepBoost();
    r(out);
  }

  _closeMenuKeepBoost() {
    this.menu.classList.remove('is-open');
    this.root.classList.remove('is-targeting');
    this._setHelp(null);
    for (const cur of this.cursors) cur.classList.remove('is-on');
    for (const v of this.view.values()) {
      v.foe?.classList.remove('is-target');
      v.row?.classList.remove('is-pick');
      if (v.foe) this._paintWeak(v);
    }
  }

  _boost(d) {
    const c = this.cmd;
    if (!c) return;
    const next = clamp(c.boost + d, 0, c.maxBoost);
    if (next === c.boost) {
      if (d > 0) this.audio?.sfx('error');
      return;
    }
    this._setBoost(next);
  }

  _setBoost(level, silent = false) {
    const c = this.cmd;
    if (!c) return;
    const prev = c.boost;
    c.boost = level;
    this._paintBp(c.v);
    this._paintBoost(level > prev);
    if (prev !== level && this.onBoost) this.onBoost(c.actorId, level, silent ? level : prev);
  }

  _paintBoost(pop) {
    const c = this.cmd;
    if (!c) return;
    this.pips.forEach((p, i) => {
      p.classList.toggle('is-avail', i < c.maxBoost);
      p.classList.toggle('is-on', i < c.boost);
      if (pop && i === c.boost - 1) {
        p.classList.remove('is-pop');
        void p.offsetWidth;
        p.classList.add('is-pop');
      }
    });
    this.boostCap.classList.toggle('is-on', c.boost > 0);
  }

  // ------------------------------------------------------------------ results / defeat

  /** Fades the battle HUD away for the ending (results / defeat). */
  ending() {
    this.root.classList.add('is-ending');
    document.documentElement.classList.add('vb-ended');
    this.setReticle(null);
  }

  /**
   * Victory panel. data: { xp, credits, items: [{id, n}], members: [{ id, name, key, level, xp, xpNext,
   * before: { level, xp, xpNext }, alive, gains: [{ level, gains }] }] }. Resolves when dismissed.
   */
  showResults(data) {
    const items = el('div', { class: 'vb-res-items' }, data.items.length
      ? [el('span', { class: 'vp-cap', text: 'Obtained' }), ...data.items.map((it) => el('span', { class: 'it' }, [img(iconURL(it.id, 2)), document.createTextNode(`${ITEMS[it.id]?.name || it.id} x${it.n}`)]))]
      : [el('span', { class: 'vp-cap', text: 'No items recovered' })]);
    const rows = data.members.map((m) => {
      const fill = el('i');
      const up = m.gains.length > 0;
      const g = up ? m.gains.reduce((acc, x) => { for (const [k, val] of Object.entries(x.gains)) acc[k] = (acc[k] || 0) + val; return acc; }, {}) : null;
      const gainText = g ? ['maxHp', 'maxEp', 'atk', 'def', 'mag', 'res', 'spd'].filter((k) => g[k]).map((k) => `${{ maxHp: 'HP', maxEp: 'EP' }[k] || k.toUpperCase()} +${g[k]}`).join('   ') : '';
      const lv = el('span', { class: 'lv' }, [document.createTextNode('LV '), el('b', { text: String(m.before.level) })]);
      const row = el('div', { class: `vb-rm${m.alive ? '' : ' is-ko'}` }, [
        el('div', { class: 'vb-pt' }, img(portraitURL(m.key, 2))),
        el('div', {}, [
          el('div', { class: 'vb-l1' }, [el('span', { class: 'vb-name', text: m.name }), el('span', { class: 'vb-lvup', text: 'Level up' }), lv]),
          el('div', { class: 'vp-bar xp' }, fill),
          el('div', { class: 'vb-up', text: gainText }),
        ]),
      ]);
      row.style.setProperty('--acc', MEMBER_ACCENT[m.key] || '#7fe3ff');
      fill.style.transform = `scaleX(${clamp(m.before.xp / m.before.xpNext, 0, 1)})`;
      return { row, fill, m, lv, up };
    });
    const foot = el('div', { class: 'vb-res-ft' }, [glyph('confirm', this.input?.lastDevice || 'keyboard'), document.createTextNode('Continue')]);
    const panel = el('div', { class: 'vp-panel vp-rich vb-res vb-live' }, [
      el('div', { class: 'vb-res-hd' }, [
        el('div', {}, [el('span', { class: 'vp-cap', text: 'Battle won' }), el('h2', { text: 'VICTORY' })]),
        el('div', { class: 'vb-gains' }, [
          el('div', { class: 'vb-gain' }, [el('span', { class: 'vp-cap', text: 'EXP' }), el('b', { text: `+${data.xp}` })]),
          el('div', { class: 'vb-gain' }, [el('span', { class: 'vp-cap', text: 'Credits' }), el('b', { class: 'cr', text: `+${data.credits}` })]),
        ]),
      ]),
      items,
      el('div', { class: 'vb-res-party' }, rows.map((r) => r.row)),
      foot,
    ]);
    this.overlay.appendChild(panel);
    // EXP bars fill, then level-ups pop
    this.after(0.45, () => {
      for (const r of rows) {
        if (!r.m.alive) continue;
        r.fill.style.transform = `scaleX(${r.up ? 1 : clamp(r.m.xp / r.m.xpNext, 0, 1)})`;
        if (r.up) this.after(0.5, () => {
          r.row.classList.add('is-up');
          this._drive(r.row, 0.5, { remove: false });
          r.lv.lastChild.textContent = String(r.m.level);
          r.fill.style.transition = 'none';
          r.fill.style.transform = `scaleX(${clamp(r.m.xp / r.m.xpNext, 0, 1)})`;
          this.audio?.sfx('levelup');
        });
      }
    });
    return new Promise((resolve) => {
      this.results = { panel, resolve, ready: false, foot };
      this.after(0.9, () => { if (this.results) { this.results.ready = true; foot.classList.add('is-ready'); } });
      panel.addEventListener('click', () => this._dismissResults());
    });
  }

  _dismissResults() {
    const r = this.results;
    if (!r || !r.ready) return;
    this.results = null;
    this.audio?.sfx('confirm');
    r.resolve();
  }

  /** Defeat beat; resolves after it has been shown. */
  showDefeat() {
    this.overlay.appendChild(el('div', { class: 'vb-defeat' }, el('div', {}, [el('h2', { text: 'The squad has fallen' }), el('p', { text: 'Signal lost' })])));
    return new Promise((resolve) => this.after(2.6, resolve));
  }

  // ------------------------------------------------------------------ frame

  _resize() {
    const { width, height } = this.engine.size;
    const z = width >= 2520 && height >= 1420 ? 2 : width >= 1880 && height >= 1060 ? 1.5 : width >= 1560 && height >= 880 ? 1.25 : 1;
    this.zoom = z;
    this.root.style.zoom = z === 1 ? '' : String(z);
    this.W = width / z;
    this.H = height / z;
    this.compact = width / height < 0.9;
    this.root.classList.toggle('is-compact', this.compact);
    this.root.classList.toggle('is-short', !this.compact && height < 520);
    this._sw = width;
    this._sh = height;
    this._panelH = 0;
    this._partyH = 0;
    this._topH = 0;
    this._menuSize = null;
    for (const v of this.view.values()) v.foeW = 0;
  }

  update() {
    const dt = this.engine.realDt;
    if (this.engine.size.width !== this._sw || this.engine.size.height !== this._sh) this._resize();
    const touch = !!this.input?.touchVisible;
    if (touch !== this._touch) {
      this._touch = touch;
      this.root.classList.toggle('is-touch', touch);
      this._partyH = 0;
      this._menuSize = null;
    }
    if (!this.frozen) {
      this.clock += dt;
      this._timers(dt);
      this._drivenStep(dt);
    }
    this._input();
    this._tick(dt);
    this._layoutWorld();
  }

  _timers(dt) {
    if (!this.timers.length) return;
    const due = this._due;
    for (let i = 0; i < this.timers.length; i++) {
      const h = this.timers[i];
      if (h.cancelled) { this.timers.splice(i--, 1); continue; }
      h.t -= dt;
      if (h.t <= 0) { this.timers.splice(i--, 1); due.push(h); }
    }
    for (let i = 0; i < due.length; i++) due[i].fn();
    due.length = 0;
  }

  _input() {
    const inp = this.input;
    if (!inp) return;
    if (this.results) {
      if (inp.pressed('confirm') || inp.pressed('cancel')) {
        inp.consume('confirm');
        inp.consume('cancel');
        this._dismissResults();
      }
      return;
    }
    const c = this.cmd;
    if (!c) return;
    if (inp.lastDevice !== this._device) this._paintFoot();
    if (inp.pressed('boostUp')) { inp.consume('boostUp'); this._boost(1); }
    if (inp.pressed('boostDown')) { inp.consume('boostDown'); this._boost(-1); }
    if (c.screen === 'target') {
      if (inp.repeat('up') || inp.repeat('left')) this._cycle(-1);
      else if (inp.repeat('down') || inp.repeat('right')) this._cycle(1);
      if (inp.pressed('confirm')) { inp.consume('confirm'); this._confirmTarget(); return; }
      if (inp.pressed('cancel')) { inp.consume('cancel'); this._back(); }
      return;
    }
    const n = c.rows.length;
    if (n && inp.repeat('up')) { c.sel = (c.sel - 1 + n) % n; this.audio?.sfx('cursor'); this._paintSel(); }
    if (n && inp.repeat('down')) { c.sel = (c.sel + 1) % n; this.audio?.sfx('cursor'); this._paintSel(); }
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._activate(); return; }
    if (inp.pressed('cancel')) { inp.consume('cancel'); this._back(); }
  }

  /** Smoothly ticking HP / EP numbers on the party panel. */
  _tick(dt) {
    const k = 1 - Math.exp(-12 * dt);
    for (const v of this.view.values()) {
      if (!v.row) continue;
      if (v.dispHp !== v.hp) {
        v.dispHp = Math.abs(v.hp - v.dispHp) < 1 ? v.hp : v.dispHp + (v.hp - v.dispHp) * k;
        const s = String(Math.round(v.dispHp));
        if (v.hpNum.textContent !== s) v.hpNum.textContent = s;
        v.hpNum.classList.toggle('is-low', v.hp > 0 && v.hp < v.maxHp * 0.25);
      }
      if (v.dispEp !== v.ep) {
        v.dispEp = Math.abs(v.ep - v.dispEp) < 1 ? v.ep : v.dispEp + (v.ep - v.dispEp) * k;
        const s = String(Math.round(v.dispEp));
        if (v.epNum.textContent !== s) v.epNum.textContent = s;
      }
    }
  }

  _setPos(node, x, y, last) {
    if (Math.abs(x - last.x) < 0.4 && Math.abs(y - last.y) < 0.4) return;
    last.x = x;
    last.y = y;
    node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  /** Re-anchors plates, cursors, the reticle, hit boxes and the menu to the 3D view. */
  _layoutWorld() {
    const z = this.zoom;
    const stage = this.stage;
    const r = this._rect;
    const plates = this._plates;
    plates.length = 0;
    // phones: a plate that would end up under the open command menu moves beside its foe instead
    const menuTop = this.compact && this.cmd && this.cmd.screen !== 'target' && this._menuSize
      ? this.H - this._partyH - 16 - this._menuSize.h : Infinity;
    for (const v of this.view.values()) {
      const a = stage.actor(v.id);
      if (!a) continue;
      stage.screenRect(a, r);
      if (v.foe && !v.gone) {
        if (!v.foeW) {
          v.foeW = v.foe.offsetWidth || 120;
          v.foeH = v.foe.offsetHeight || 40;
        }
        const pl = v.plate ||= { v, x: 0, y: 0 };
        pl.x = clamp(r.cx / z - v.foeW / 2, 4, this.W - v.foeW - 4);
        pl.y = (r.y + r.h) / z + 6;
        plates.push(pl);
      }
      v.hitLast ||= { x: -1e4, y: -1e4, w: 0, h: 0 };
      this._setPos(v.hitbox, r.x / z, r.y / z, v.hitLast);
      const w = Math.round(r.w / z), h = Math.round(r.h / z);
      if (w !== v.hitLast.w || h !== v.hitLast.h) {
        v.hitLast.w = w;
        v.hitLast.h = h;
        v.hitbox.style.width = `${w}px`;
        v.hitbox.style.height = `${h}px`;
      }
      v.hitbox.classList.toggle('is-valid', !!(this.cmd && this.cmd.screen === 'target' && this.cmd.target.ids.includes(v.id)));
      v.rectY = r.y;
      v.rectCx = r.cx;
      v.rectX = r.x;
      v.rectW = r.w;
      v.rectH = r.h;
    }
    // a plate that would cover another foe (a back-row foe's plate over a front-row sprite) slides to
    // its left when there is room (never right, toward the party)
    for (const p of plates) {
      const w = p.v.foeW;
      for (const o of plates) {
        if (o === p) continue;
        const ox = o.v.rectX / z + 6, ow = o.v.rectW / z - 12, oy = o.v.rectY / z + 6, oh = o.v.rectH / z - 12;
        if (p.x >= ox + ow || p.x + w <= ox || p.y >= oy + oh || p.y + p.v.foeH <= oy) continue;
        if (ox - w - 2 >= 4) p.x = ox - w - 2;
      }
    }
    // plates that would overlap (crowded phone formations) are pushed down below the one above
    plates.sort((p, q) => p.y - q.y);
    for (let i = 0; i < plates.length; i++) {
      const p = plates[i];
      for (let j = 0; j < i; j++) {
        const q = plates[j];
        if (p.x < q.x + q.v.foeW && q.x < p.x + p.v.foeW && p.y < q.y + q.v.foeH + 2) p.y = q.y + q.v.foeH + 2;
      }
      if (p.y + p.v.foeH > menuTop) {
        const v = p.v;
        p.x = Math.min((v.rectX + v.rectW) / z + 4, this.W - v.foeW - 4);
        p.y = (v.rectY + v.rectH / 2) / z - v.foeH / 2;
      }
      p.v.foeLast ||= { x: -1e4, y: -1e4 };
      this._setPos(p.v.foe, p.x, p.y, p.v.foeLast);
    }
    let curMin = -1e4;
    for (const cur of this.cursors) {
      if (!cur.classList.contains('is-on')) continue;
      const v = this.view.get(cur.dataset.id);
      if (!v) continue;
      // on phones the top bar + help plate can cover a back-row foe's head: keep the arrow below them
      if (this.compact && curMin < -1e3) curMin = this.top.offsetTop + this.top.offsetHeight + 40;
      cur._last ||= { x: -1e4, y: -1e4 };
      this._setPos(cur, v.rectCx / z, Math.max(v.rectY / z, curMin), cur._last);
    }
    if (this.reticleId) {
      const a = stage.actor(this.reticleId);
      if (a) {
        a.point('center', RET_P);
        this.engine.projectToScreen(RET_P, this._pos);
        this.reticle._last ||= { x: -1e4, y: -1e4 };
        this._setPos(this.reticle, this._pos.x / z, this._pos.y / z, this.reticle._last);
      }
    }
    if (this.cmd) this._placeMenu();
    if (this.compact) {
      if (!this._partyH) this._partyH = this.party.offsetHeight;
      if (this._partyH !== this._panelH) {
        this._panelH = this._partyH;
        document.documentElement.style.setProperty('--vb-panel', `${Math.round(this._partyH * z)}px`);
      }
    }
  }

  _placeMenu() {
    const z = this.zoom;
    if (!this._menuSize) this._menuSize = { w: this.menu.offsetWidth || 250, h: this.menu.offsetHeight || 260 };
    if (!this._partyH) this._partyH = this.party.offsetHeight || 200;
    const { w: mw, h: mh } = this._menuSize;
    this.menu._last ||= { x: -1e4, y: -1e4 };
    if (this.compact) {
      const y = this.H - this._partyH - 16 - mh;
      this._setPos(this.menu, 8, Math.max(8, y), this.menu._last);
      return;
    }
    // left of the whole formation (so no traveler is hidden), level with the active one
    const v = this.view.get(this.cmd.actorId);
    let left = v.rectX;
    for (const o of this.view.values()) if (o.side === 'party' && o.rectX < left) left = o.rectX;
    if (!this._topH) this._topH = this.turns.offsetHeight || 54;
    const topLimit = this._topH + 30;
    const bottomLimit = this.H - this._partyH - 24;
    const x = clamp(left / z - mw - 14, 10, this.W - mw - 10);
    const y = clamp((v.rectY + v.rectH * 0.45) / z - mh * 0.5, topLimit, Math.max(topLimit, bottomLimit - mh));
    this._setPos(this.menu, x, y, this.menu._last);
  }

  dispose() {
    this.cmd = null;
    this.results = null;
    this.timers.length = 0;
    this.driven.length = 0;
    this.root.remove();
    document.documentElement.style.removeProperty('--vb-panel');
    document.documentElement.classList.remove('vb-ended');
  }
}

const RET_P = new Vector3();
