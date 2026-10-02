// On-screen controls for touch devices: a floating stick plus action buttons. Shown automatically on first touch.
import { el } from './hud.js';

export class Touch {
  constructor(game) {
    this.game = game;
    this.app = document.getElementById('app');
    const input = game.input;
    this.root = el('div', { class: 'touch' });
    this.pad = el('div', { class: 'dpad' }, el('i', { class: 'u' }, '▲'), el('i', { class: 'd' }, '▼'), el('i', { class: 'l' }, '◀'), el('i', { class: 'r' }, '▶'), el('div', { class: 'nub' }));
    this.nub = this.pad.querySelector('.nub');
    this.btns = {};
    const mk = (cls, label, action, sub) => {
      const b = el('div', { class: 'tbtn ' + cls }, label, sub ? el('small', {}, sub) : null);
      const down = (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('down'); input.setVirtual(action, true); game.audio.unlock(); };
      const up = (e) => { e.preventDefault(); b.classList.remove('down'); input.setVirtual(action, false); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      this.btns[action] = b;
      return b;
    };
    this.root.append(this.pad, mk('jump', 'JUMP', 'jump'), mk('slap', 'SLAP', 'slap'), mk('roll', 'ROLL', 'roll'), mk('boom', 'BOOM', 'boom'));
    game.hud.root.append(this.root);

    let active = null;
    const vec = (e) => {
      const r = this.pad.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width / 2;
      return { x: (e.clientX - cx) / rad, y: (e.clientY - cy) / rad };
    };
    const apply = (e) => {
      const v = vec(e);
      const m = Math.hypot(v.x, v.y) || 1, k = Math.min(1, m);
      input.setVirtual('left', v.x < -0.28);
      input.setVirtual('right', v.x > 0.28);
      input.setVirtual('up', v.y < -0.45);
      input.setVirtual('down', v.y > 0.45);
      this.nub.style.transform = `translate(${(v.x / m) * k * 46}px, ${(v.y / m) * k * 46}px)`;
    };
    const release = () => { active = null; for (const a of ['left', 'right', 'up', 'down']) input.setVirtual(a, false); this.nub.style.transform = ''; };
    this.pad.addEventListener('pointerdown', (e) => { e.preventDefault(); active = e.pointerId; this.pad.setPointerCapture(e.pointerId); game.audio.unlock(); apply(e); });
    this.pad.addEventListener('pointermove', (e) => { if (e.pointerId === active) apply(e); });
    this.pad.addEventListener('pointerup', release); this.pad.addEventListener('pointercancel', release); this.pad.addEventListener('lostpointercapture', release);

    this.rotate = el('div', { class: 'rotate' }, 'Rotate your device to landscape to play');
    this.app.append(this.rotate);

    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse) this.enable();
    window.addEventListener('touchstart', () => this.enable(), { once: true, passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  enable() { this.app.classList.add('touch-on'); }

  /** Hide buttons for abilities Kong has not learned yet, and the whole overlay outside of play (menus, map, ending). */
  update() {
    const a = this.game.save.abilities;
    this.btns.roll.style.display = a.roll ? '' : 'none';
    this.btns.boom.style.display = a.boom ? '' : 'none';
    const st = this.game.state;
    const show = st === 'play' || st === 'transition' || st === 'dead' || st === 'itemget' || st === 'endcine';
    if (show !== this.shown) {
      this.shown = show;
      this.root.style.visibility = show ? '' : 'hidden';
      if (!show) {                                   // let go of anything still held when a menu opens
        const input = this.game.input;
        for (const act of ['left', 'right', 'up', 'down', 'jump', 'slap', 'roll', 'boom']) input.setVirtual(act, false);
        for (const b of Object.values(this.btns)) b.classList.remove('down');
        this.nub.style.transform = '';
      }
    }
  }
}
