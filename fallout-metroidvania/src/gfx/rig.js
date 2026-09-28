// Skeletal humanoid rig: shaded part sprites (supersampled) + IK posing + procedural weapons.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
const SS = 4;   // part supersampling
const Rig = (CD.Rig = {});

// ------------------------------------------------------------------ vector helpers
function blob(g, pts, closed) {   // smooth closed curve (Catmull-Rom -> bezier)
  const n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed === false ? n - 1 : n); i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed !== false) g.closePath();
}
const rgb = (c, f) => U.rgb(f ? U.shade(c, f) : c);
function part(w, h, ox, oy, fn) {
  const c = U.canvas(Math.ceil(w * SS), Math.ceil(h * SS)), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(ox, oy); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g);
  return { c, w, h, ox, oy };
}
// fill a path with directional shading (dark back edge, bright front edge) + vertical light + outline
function shaded(g, path, base, o) {
  o = o || {};
  const b = o.b || { x0: -6, x1: 6, y0: -10, y1: 10 };
  g.save(); path(g);
  const gr = g.createLinearGradient(b.x0, 0, b.x1, 0);
  gr.addColorStop(0, rgb(base, 0.5)); gr.addColorStop(0.35, rgb(base, o.mid || 1.0)); gr.addColorStop(0.72, rgb(base, o.hi || 1.28)); gr.addColorStop(1, rgb(base, 0.68));
  g.fillStyle = gr; g.fill(); g.clip();
  const vg = g.createLinearGradient(0, b.y0, 0, b.y1); vg.addColorStop(0, 'rgba(255,255,255,0.13)'); vg.addColorStop(0.5, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.20)'); g.fillStyle = vg; g.fillRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4);
  if (o.grain !== false && Rig.grainPattern) { g.globalAlpha = o.grain || 0.16; g.fillStyle = Rig.grainPattern(g); g.fillRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4); g.globalAlpha = 1; }
  if (o.details) o.details(g);
  g.restore();
  g.save(); path(g); g.lineWidth = o.line || 0.55; g.strokeStyle = 'rgba(10,8,6,0.62)'; g.stroke(); g.restore();
}
let _grain = null;
Rig.grainPattern = function (g) {
  if (!_grain) { const c = U.canvas(32, 32), cg = c.getContext('2d'), img = cg.createImageData(32, 32), r = U.RNG(77); for (let i = 0; i < 32 * 32; i++) { const v = 90 + r.next() * 110; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; } cg.putImageData(img, 0, 0); _grain = c; }
  return g.createPattern(_grain, 'repeat');
};
function darkened(p, f) {   // copy of a part, darkened (far-side limbs)
  const c = U.canvas(p.c.width, p.c.height), g = c.getContext('2d'); g.drawImage(p.c, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(8,10,14,' + (1 - f) + ')'; g.fillRect(0, 0, c.width, c.height);
  return { c, w: p.w, h: p.h, ox: p.ox, oy: p.oy };
}
function folds(g, x0, y0, x1, y1, n, a, r) {
  g.strokeStyle = 'rgba(0,0,0,' + (a || 0.22) + ')'; g.lineWidth = 0.5;
  for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n + r.range(-1, 1); g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2 + r.range(-1, 1), y + r.range(-1.5, 1.5), x1, y + r.range(-1, 1)); g.stroke(); }
}
function noise(g, r, x0, y0, x1, y1, n, col) { for (let i = 0; i < n; i++) { g.fillStyle = col || 'rgba(0,0,0,0.18)'; g.fillRect(r.range(x0, x1), r.range(y0, y1), r.range(0.4, 1.4), r.range(0.4, 1.4)); } }

// ------------------------------------------------------------------ outfits
const OUTFITS = {
  vault: { skin: [216, 172, 134], suit: [42, 88, 158], trim: [232, 198, 58], boot: [58, 48, 40], glove: [58, 48, 40], hair: { style: 'short', col: [56, 38, 26] }, belt: [70, 52, 34], style: 'cloth', tag: 'vault' },
  raider: { skin: [190, 146, 112], suit: [82, 72, 58], trim: [120, 40, 30], boot: [38, 32, 28], glove: [40, 30, 24], hair: { style: 'mohawk', col: [160, 30, 24] }, belt: [50, 34, 22], armor: [72, 50, 34], plate: [116, 100, 88], style: 'cloth', tag: 'raider' },
  brute: { skin: [176, 128, 98], suit: [66, 60, 52], trim: [110, 30, 24], boot: [34, 28, 24], glove: [30, 24, 20], hair: { style: 'bald', col: [30, 24, 20] }, belt: [46, 30, 20], armor: [60, 44, 30], plate: [104, 92, 84], style: 'cloth', tag: 'brute', mask: true },
  mutant: { skin: [126, 152, 88], suit: [88, 70, 50], trim: [60, 46, 32], boot: [50, 40, 34], glove: [126, 152, 88], hair: { style: 'bald', col: [40, 34, 24] }, belt: [62, 44, 28], style: 'cloth', tag: 'mutant', bulk: 1.45, scars: true, torsoSkin: true },
  ghoul: { skin: [128, 112, 84], suit: [76, 68, 58], trim: [60, 54, 46], boot: [56, 48, 40], glove: [128, 112, 84], hair: { style: 'bald', col: [50, 40, 30] }, belt: [50, 40, 30], style: 'cloth', tag: 'ghoul', ghoul: true, ragged: true },
  glowing: { skin: [138, 176, 96], suit: [76, 96, 62], trim: [120, 190, 90], boot: [56, 62, 46], glove: [138, 176, 96], hair: { style: 'bald', col: [50, 60, 40] }, belt: [60, 74, 50], style: 'cloth', tag: 'glowing', ghoul: true, ragged: true },
  guard: { skin: [200, 160, 126], suit: [46, 52, 46], trim: [160, 140, 60], boot: [24, 26, 24], glove: [24, 26, 24], hair: { style: 'short', col: [40, 34, 28] }, belt: [30, 32, 28], armor: [58, 64, 56], plate: [100, 108, 100], style: 'cloth', tag: 'guard', helmet: true },
  scientist: { skin: [210, 170, 138], suit: [214, 212, 204], trim: [80, 110, 140], boot: [52, 44, 40], glove: [210, 170, 138], hair: { style: 'short', col: [96, 88, 82] }, belt: [90, 84, 76], style: 'cloth', tag: 'scientist', coat: true },
  trader: { skin: [186, 142, 108], suit: [98, 78, 56], trim: [150, 50, 40], boot: [50, 38, 28], glove: [50, 38, 28], hair: { style: 'hat', col: [60, 44, 30] }, belt: [64, 44, 28], style: 'cloth', tag: 'trader' },
  armor: { skin: [120, 126, 126], suit: [74, 86, 82], trim: [180, 150, 50], boot: [52, 60, 58], glove: [52, 60, 58], hair: { style: 'helm', col: [74, 86, 82] }, belt: [50, 58, 56], plate: [98, 112, 106], style: 'armor', tag: 'armor', bulk: 1.5 },
  robot: { skin: [150, 154, 150], suit: [150, 154, 148], trim: [200, 60, 40], boot: [70, 74, 72], glove: [90, 94, 90], hair: { style: 'robohead', col: [150, 154, 148] }, belt: [80, 84, 82], style: 'robot', tag: 'robot', bulk: 1.15 },
};
Rig.OUTFITS = OUTFITS;

// segment lengths (unit px at scale 1)
const L = { thigh: 16, shin: 16, ankle: 3, torso: 23, neck: 2, head: 10, uarm: 12.5, farm: 11.5 };
Rig.L = L;
Rig.LEG = L.thigh + L.shin;
Rig.HIP_H = L.thigh + L.shin + L.ankle;   // hip height above ground with straight legs
Rig.HEAD_S = 0.74;

// ------------------------------------------------------------------ part builders
function buildParts(o, seed) {
  const r = U.RNG(seed || 1), bulk = o.bulk || 1, P = {};
  const skin = o.skin, suit = o.suit, robot = o.style === 'robot', armor = o.style === 'armor';
  const wT = 5.2 * bulk, wK = 3.8 * bulk, wA = 2.6 * bulk;
  const suitMat = armor || robot ? o.suit : suit;
  const torsoMat = o.torsoSkin ? skin : suitMat;

  // ---- thigh (origin at hip pivot)
  P.thigh = part(14 * bulk, 21, 7 * bulk, 3, (g) => {
    const path = (g) => blob(g, [[-wT, -1], [wT * 0.9, -1.4], [wK + 0.6, 14.5], [wK, 17], [-wK, 17], [-wT - 0.4, 6.5]]);
    shaded(g, path, suitMat, { b: { x0: -wT, x1: wT, y0: -2, y1: 17 }, details: (g) => {
      if (o.style === 'cloth') { folds(g, -wK, 3, wK, 15, 3, 0.24, r); noise(g, r, -wT, 0, wT, 15, 10); if (o.ragged) { g.fillStyle = 'rgba(' + skin.join(',') + ',0.85)'; g.beginPath(); g.moveTo(-wK, 10); g.lineTo(0, 12 + r.range(0, 2)); g.lineTo(wK, 9); g.lineTo(wK, 16); g.lineTo(-wK, 16); g.fill(); } }
      if (armor) { g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(-wT, 0, wT * 2, 1.4); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-wT, 7, wT * 2, 0.8); }
      if (robot) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-wT, 5, wT * 2, 1); g.fillRect(-wT, 10, wT * 2, 1); }
    } });
    if (o.style === 'cloth' && o.trim && o.tag === 'vault') { g.fillStyle = rgb(o.trim); g.fillRect(wT * 0.3, 0, 0.9, 16); }   // side stripe
  });
  // ---- shin + calf (origin at knee)
  P.shin = part(14 * bulk, 21, 7 * bulk, 2, (g) => {
    const path = (g) => blob(g, [[-wK, -1], [wK * 0.9, -1], [wK * 0.85, 9], [wK * 0.5, 16.6], [-wK * 0.5, 16.6], [-wK - 0.8, 6.5]]);
    const col = o.boot && o.tag !== 'ghoul' ? (o.tag === 'vault' ? suit : suitMat) : suitMat;
    shaded(g, path, col, { b: { x0: -wK, x1: wK, y0: -1, y1: 16.6 }, details: (g) => { if (o.style === 'cloth') folds(g, -wK, 2, wK, 11, 2, 0.2, r); if (armor) { g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(wK * 0.2, 0, 1, 14); } } });
    // boot top
    g.save(); path(g); g.clip(); g.fillStyle = rgb(o.boot); g.fillRect(-wK - 1, 10.5, wK * 2 + 2, 7); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(-wK, 10.5, wK * 2, 0.9); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-wK, 16, wK * 2, 1); g.restore();
  });
  // ---- foot / boot (origin at ankle)
  P.foot = part(16, 10, 5, 3, (g) => {
    const path = (g) => blob(g, [[-3.4, -1.5], [2.6, -1.8], [4.4, 0.6], [8.2, 2.6], [8.4, 4.4], [-3.6, 4.6], [-3.9, 1]]);
    shaded(g, path, o.boot, { b: { x0: -4, x1: 8, y0: -2, y1: 5 }, hi: 1.4 });
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(-3.8, 3.7, 12.2, 1.2); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(-2, 3.1, 8, 0.5);
  });
  // ---- torso (origin at hip; extends up -y to the neck at y=-L.torso)
  const tw = 6.4 * bulk;
  P.torso = part(20 * bulk, 30, 10 * bulk, 25, (g) => {
    const top = -L.torso;
    const path = (g) => blob(g, [[-tw + 0.8, top + 2], [-tw * 0.2, top - 0.6], [tw * 0.7, top + 0.6], [tw + 0.9, top + 6.5], [tw + 0.2, top + 13], [tw * 0.7, -3], [tw * 0.6, 1.8], [-tw * 0.6, 1.8], [-tw, -6], [-tw - 0.6, top + 9]]);
    shaded(g, path, torsoMat, { b: { x0: -tw, x1: tw, y0: top, y1: 2 }, details: (g) => {
      if (o.style === 'cloth') {
        folds(g, -tw, top + 4, tw, -2, 4, 0.2, r);
        if (o.torsoSkin) { g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(tw * 0.2, top + 8); g.quadraticCurveTo(tw * 0.9, top + 12, tw * 0.3, top + 16); g.stroke(); g.beginPath(); g.moveTo(-tw * 0.4, top + 9); g.quadraticCurveTo(-tw * 0.9, top + 13, -tw * 0.3, top + 17); g.stroke(); }
        if (o.tag === 'vault') {   // yellow collar, zipper line and belt
          g.fillStyle = rgb(o.trim); g.fillRect(tw * 0.55, top + 1, 1.1, -top - 1.5);
          g.fillStyle = rgb(o.trim, 0.9); g.beginPath(); g.moveTo(-tw * 0.4, top - 1); g.lineTo(tw * 0.85, top); g.lineTo(tw * 0.85, top + 2.6); g.lineTo(-tw * 0.4, top + 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-tw, top + 5, tw * 2, 0.7);
          g.fillStyle = rgb(o.trim); g.font = 'bold 3.4px sans-serif'; g.fillText('213', -tw * 0.9, top + 9.6);
        }
        if (o.armor) { g.fillStyle = rgb(o.armor); g.fillRect(-tw - 1, top + 4, tw * 2 + 2, 12); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(-tw - 1, top + 4, tw * 2 + 2, 1); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 3; i++) g.fillRect(-tw, top + 7 + i * 3.5, tw * 2, 0.6); }
        if (o.coat) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-tw, top + 1, tw * 2, -top + 2); g.fillStyle = 'rgba(90,110,130,0.5)'; g.fillRect(tw * 0.35, top + 8, 2.4, 2.4); }
        if (o.ragged) { g.fillStyle = 'rgba(' + skin.join(',') + ',0.6)'; g.beginPath(); g.moveTo(-tw, top + 10); g.lineTo(0, top + 12); g.lineTo(tw, top + 9.5); g.lineTo(tw, top + 15); g.lineTo(-tw, top + 14); g.fill(); }
        // belt
        g.fillStyle = rgb(o.belt); g.fillRect(-tw - 1, -3, tw * 2 + 2, 3.3); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(-tw - 1, -3, tw * 2 + 2, 0.6); g.fillStyle = 'rgb(160,140,70)'; g.fillRect(tw * 0.1, -2.8, 2.6, 2.6);
        noise(g, r, -tw, top, tw, 0, 22);
      } else if (armor) {
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-tw, top + 3, tw * 2, 1); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 4; i++) g.fillRect(-tw, top + 6 + i * 3.2, tw * 2, 0.7);
        g.fillStyle = rgb(o.trim); g.fillRect(tw * 0.3, top + 5, 2.2, 2.2);
      } else if (robot) {
        g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 4; i++) g.fillRect(-tw, top + 4 + i * 4.4, tw * 2, 0.9);
        g.fillStyle = rgb(o.trim); g.fillRect(-1.4, top + 6, 2.8, 2.8); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-1.4, top + 6, 2.8, 0.8);
      }
    } });
    if (o.plate && o.style === 'cloth' && o.armor) { // leather chest rig / shoulder plate
      g.fillStyle = rgb(o.plate); g.beginPath(); g.moveTo(-tw - 1, top + 1); g.lineTo(-tw * 0.1, top - 1.5); g.lineTo(tw * 0.5, top + 0.5); g.lineTo(tw * 0.4, top + 5.5); g.lineTo(-tw - 1, top + 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-tw - 1, top + 1, tw * 1.4, 0.8);
    }
  });
  // ---- upper arm (origin at shoulder)
  P.uarm = part(10 * bulk, 18, 5 * bulk, 3, (g) => {
    const path = (g) => blob(g, [[-wA - 0.6, -0.8], [wA + 0.6, -0.8], [wA * 0.8, 12.8], [-wA * 0.8, 12.8]]);
    const sleeve = o.style === 'cloth' && (o.tag === 'raider' || o.tag === 'brute' || o.tag === 'ghoul' || o.tag === 'glowing' || o.tag === 'mutant') ? skin : suitMat;
    shaded(g, path, sleeve, { b: { x0: -wA, x1: wA, y0: 0, y1: 13 }, details: (g) => { if (o.style === 'cloth') { folds(g, -wA, 2, wA, 11, 2, 0.18, r); } if (armor || robot) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-wA, 6, wA * 2, 0.8); } } });
    if (o.tag === 'vault') { g.fillStyle = rgb(o.trim); g.fillRect(-wA - 0.4, 10.4, wA * 2 + 0.8, 1.4); }
    if (o.plate && o.armor) { g.fillStyle = rgb(o.plate); g.beginPath(); g.ellipse(0, 1, wA + 1.6, 3.6, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(-wA - 1, -1.5, wA * 2 + 2, 0.8); if (o.tag === 'raider') { g.fillStyle = 'rgb(170,168,160)'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 2.2 - 1, -1.5); g.lineTo(i * 2.2, -5); g.lineTo(i * 2.2 + 1, -1.5); g.fill(); } } }
    if (armor) { g.fillStyle = rgb(o.plate); g.beginPath(); g.ellipse(0, 0.6, wA + 1.4, 3.8, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-wA - 1, -1.5, wA * 2 + 2, 0.9); }
  });
  // ---- forearm + hand (origin at elbow)
  const forearm = (pip) => part(10 * bulk, 20, 5 * bulk, 3, (g) => {
    const w0 = wA * 0.85, w1 = wA * 0.62;
    const sleeved = o.style === 'cloth' && (o.tag === 'vault' || o.tag === 'guard' || o.tag === 'scientist' || o.tag === 'trader');
    const path = (g) => blob(g, [[-w0, -0.8], [w0, -0.8], [w1 + 0.2, 10.4], [-w1, 10.4]]);
    shaded(g, path, sleeved || armor || robot ? suitMat : skin, { b: { x0: -w0, x1: w0, y0: 0, y1: 11 }, details: (g) => { if (o.style === 'cloth') folds(g, -w0, 2, w0, 9, 2, 0.16, r); } });
    if (o.tag === 'vault') { g.fillStyle = rgb(o.trim); g.fillRect(-w1 - 0.3, 8.6, w1 * 2 + 0.6, 1.4); }
    if (pip) {   // Pip-Boy 3000 strapped to the wrist
      g.fillStyle = '#20241f'; g.fillRect(-w0 - 1.3, 2.4, w0 * 2 + 2.6, 7.6);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-w0 - 1.3, 2.4, w0 * 2 + 2.6, 0.8);
      g.fillStyle = '#0d1a10'; g.fillRect(-w0 - 0.2, 3.4, w0 * 2 + 0.4, 5.2); g.fillStyle = '#28ff86'; g.globalAlpha = 0.85; g.fillRect(-w0 + 0.4, 4, w0 * 2 - 0.8, 1.2); g.fillRect(-w0 + 0.4, 6.2, w0 * 1.3, 0.9); g.globalAlpha = 1;
      g.strokeStyle = '#6d6a55'; g.lineWidth = 0.5; g.strokeRect(-w0 - 1.3, 2.4, w0 * 2 + 2.6, 7.6);
    }
    // hand
    const hc = o.glove && (armor || robot || o.tag === 'vault' || o.tag === 'guard') ? o.glove : skin;
    const hp = (g) => blob(g, [[-w1 - 0.4, 9.6], [w1 + 0.8, 9.6], [w1 + 1.4, 12.6], [w1 + 0.4, 14.2], [-w1, 14], [-w1 - 0.8, 11.6]]);
    shaded(g, hp, hc, { b: { x0: -w1, x1: w1 + 1, y0: 9, y1: 14 }, hi: 1.2 });
  });
  P.farm = forearm(false); P.farmPip = forearm(true);
  // ---- head (origin at neck base; drawn upward)
  P.head = part(26, 30, 13, 22, (g) => {
    const hs = o.tag === 'mutant' ? 1.05 : 1; const base = skin;
    // neck
    shaded(g, (g) => blob(g, [[-2.4, -1], [2.6, -1], [3, -6], [-2.6, -6]]), skin, { b: { x0: -3, x1: 3, y0: -6, y1: 0 } });
    const cx = 1.2, cy = -13.2 * hs;
    const headPath = (g) => blob(g, o.ghoul
      ? [[cx - 6.2, cy - 1], [cx - 4.8, cy - 6.4], [cx + 0.6, cy - 7.6], [cx + 5.2, cy - 5], [cx + 6, cy - 0.5], [cx + 4.8, cy + 3.6], [cx + 2.6, cy + 6.2], [cx - 1.6, cy + 6.4], [cx - 5, cy + 3.4]]
      : [[cx - 6, cy - 0.6], [cx - 5, cy - 6.2], [cx + 0.4, cy - 7.4], [cx + 4.8, cy - 5.2], [cx + 6.2, cy - 0.8], [cx + 7.4, cy + 1.6], [cx + 6, cy + 2.4], [cx + 4.6, cy + 3.6], [cx + 3.2, cy + 6.4], [cx - 0.6, cy + 6.8], [cx - 4.4, cy + 4.4]]);
    if (o.style === 'robot') {
      shaded(g, (g) => { g.beginPath(); g.roundRect ? g.roundRect(cx - 6, cy - 7, 13, 13, 2.4) : g.rect(cx - 6, cy - 7, 13, 13); }, o.suit, { b: { x0: cx - 6, x1: cx + 7, y0: cy - 7, y1: cy + 6 } });
      g.fillStyle = '#0a0c0e'; g.fillRect(cx + 0.4, cy - 3.6, 6, 3.6); g.fillStyle = rgb(o.trim); g.fillRect(cx + 1, cy - 2.8, 5, 1.4); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(cx + 1, cy - 2.8, 5, 0.4);
      g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 3; i++) g.fillRect(cx - 5, cy + 1 + i * 1.6, 5, 0.6);
      return;
    }
    shaded(g, headPath, base, { b: { x0: cx - 6, x1: cx + 7, y0: cy - 7, y1: cy + 7 }, hi: 1.22, details: (g) => {
      // cheek shading + jaw
      const gr = g.createRadialGradient(cx + 1, cy + 1, 1, cx + 1, cy + 1, 8); gr.addColorStop(0, 'rgba(255,190,150,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - 8, cy - 8, 16, 16);
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(cx - 6, cy + 3.5, 12, 3.4);
      if (o.ghoul) { g.fillStyle = 'rgba(40,30,20,0.35)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(cx + r.range(-4, 4), cy + r.range(-5, 5), r.range(0.8, 2), r.range(0.6, 1.4), r.range(0, 3), 0, 7); g.fill(); } g.fillStyle = 'rgba(160,150,110,0.3)'; g.fillRect(cx - 2, cy - 6, 3, 1.6); }
      if (o.scars) { g.strokeStyle = 'rgba(70,30,30,0.7)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(cx - 2, cy - 4); g.lineTo(cx + 2, cy + 2); g.stroke(); }
    } });
    // ear
    g.fillStyle = rgb(skin, 0.86); g.beginPath(); g.ellipse(cx - 1.6, cy + 0.4, 1.3, 2.1, 0.1, 0, 7); g.fill();
    // nose (skipped for ghouls)
    if (!o.ghoul) { shaded(g, (g) => blob(g, [[cx + 5.4, cy - 0.6], [cx + 8.4, cy + 2], [cx + 6.6, cy + 3.2], [cx + 4.6, cy + 2.6]]), skin, { b: { x0: cx + 4, x1: cx + 9, y0: cy - 1, y1: cy + 4 }, hi: 1.3, line: 0.4 }); }
    else { g.fillStyle = 'rgba(20,10,8,0.85)'; g.beginPath(); g.ellipse(cx + 5.2, cy + 2.2, 0.8, 1.1, 0, 0, 7); g.fill(); }
    // eye + brow + mouth
    if (o.tag === 'glowing') { g.fillStyle = '#c8ff80'; g.shadowColor = '#9aff40'; g.shadowBlur = 3; g.beginPath(); g.ellipse(cx + 3.4, cy - 1.2, 1.5, 1.1, 0, 0, 7); g.fill(); g.shadowBlur = 0; }
    else if (o.ghoul) { g.fillStyle = '#0b0906'; g.beginPath(); g.ellipse(cx + 3.4, cy - 1.4, 1.5, 1.7, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(230,220,150,0.7)'; g.fillRect(cx + 3.6, cy - 1.7, 0.7, 0.7); }
    else { g.fillStyle = '#f2ece0'; g.beginPath(); g.ellipse(cx + 3.4, cy - 1.2, 1.5, 0.9, 0, 0, 7); g.fill(); g.fillStyle = o.tag === 'mutant' ? '#2a1a08' : '#2a3a52'; g.beginPath(); g.arc(cx + 3.9, cy - 1.2, 0.85, 0, 7); g.fill(); g.fillStyle = '#05070a'; g.beginPath(); g.arc(cx + 4, cy - 1.2, 0.42, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(cx + 3.7, cy - 1.5, 0.4, 0.4); }
    g.strokeStyle = 'rgba(30,20,12,0.75)'; g.lineWidth = o.tag === 'mutant' || o.tag === 'brute' ? 1.1 : 0.7; g.beginPath(); g.moveTo(cx + 1.6, cy - 2.7 + (o.tag === 'mutant' ? 0.6 : 0)); g.lineTo(cx + 5.4, cy - 2.2 - (o.tag === 'mutant' ? 0.9 : 0)); g.stroke();
    g.strokeStyle = 'rgba(60,20,16,0.7)'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(cx + 3.2, cy + 3.6); g.lineTo(cx + 6.2, cy + 3.5); g.stroke();
    if (o.tag === 'mutant') { g.fillStyle = '#d8cfa8'; g.fillRect(cx + 3.6, cy + 3.2, 0.9, 1.3); g.fillRect(cx + 5, cy + 3.2, 0.9, 1.3); }
    // hair / headgear
    const hr = o.hair;
    if (hr.style === 'short') { g.fillStyle = rgb(hr.col); g.beginPath(); g.moveTo(cx - 6.4, cy + 0.5); g.bezierCurveTo(cx - 7, cy - 8, cx + 2, cy - 9.6, cx + 5.8, cy - 5.2); g.lineTo(cx + 4.2, cy - 3.6); g.bezierCurveTo(cx + 1, cy - 6, cx - 2.6, cy - 5, cx - 3.2, cy + 1); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(cx - 2, cy - 8.2, 5, 0.9); }
    if (hr.style === 'mohawk') { g.fillStyle = rgb(hr.col); g.beginPath(); g.moveTo(cx - 5, cy - 4); g.lineTo(cx - 4.4, cy - 11.5); g.lineTo(cx - 1.8, cy - 9); g.lineTo(cx - 0.6, cy - 12.6); g.lineTo(cx + 1.8, cy - 9); g.lineTo(cx + 3.4, cy - 11); g.lineTo(cx + 3.8, cy - 6.4); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(cx - 4, cy - 10, 6, 0.6); }
    if (hr.style === 'hat') { g.fillStyle = rgb(hr.col); g.fillRect(cx - 8, cy - 4.4, 17, 1.7); g.beginPath(); g.moveTo(cx - 5, cy - 4.4); g.bezierCurveTo(cx - 5, cy - 10.6, cx + 5, cy - 10.6, cx + 5.4, cy - 4.4); g.fill(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx - 5, cy - 6.4, 10.4, 1.2); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(cx - 8, cy - 4.4, 17, 0.6); }
    if (hr.style === 'helm' || o.helmet) { g.fillStyle = rgb(o.style === 'armor' ? o.suit : (o.plate || [90, 96, 90])); g.beginPath(); g.moveTo(cx - 6.6, cy + 1.4); g.bezierCurveTo(cx - 7.6, cy - 9.6, cx + 5.4, cy - 10.6, cx + 6.6, cy - 2.4); g.lineTo(cx + 6.4, cy + 0.4); g.lineTo(cx - 1, cy + 0.4); g.lineTo(cx - 1.6, cy + 3); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(cx - 4, cy - 8.4, 8, 0.9); if (o.style === 'armor') { g.fillStyle = 'rgba(255,190,60,0.9)'; g.fillRect(cx + 1.5, cy - 2.6, 5.2, 1.5); g.shadowColor = '#ffb030'; g.shadowBlur = 3; g.fillRect(cx + 1.5, cy - 2.6, 5.2, 1.5); g.shadowBlur = 0; } else { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx - 6, cy - 0.6, 12, 1); } }
    if (o.mask) { g.fillStyle = '#26221e'; g.fillRect(cx + 0.6, cy + 0.6, 6.4, 4.6); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(cx + 0.6, cy + 0.6, 6.4, 0.7); g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(cx + 5.6, cy + 3, 1.3, 0, 7); g.fill(); g.strokeStyle = '#26221e'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(cx + 0.6, cy + 2); g.lineTo(cx - 6, cy + 1.4); g.stroke(); }
    if (o.tag === 'raider') { g.fillStyle = rgb(o.trim); g.fillRect(cx - 6.2, cy - 5.6, 11.6, 1.8); g.fillRect(cx - 6.8, cy - 5.4, 1.8, 4.4); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 6.2, cy - 3.9, 11.6, 0.5); }   // bandana
  });
  // ---- back hair sprites etc handled in head. Build far-side (darkened) copies
  P.thighF = darkened(P.thigh, 0.66); P.shinF = darkened(P.shin, 0.66); P.footF = darkened(P.foot, 0.66);
  P.uarmF = darkened(P.uarm, 0.66); P.farmF = darkened(P.farm, 0.66); P.farmPipF = darkened(P.farmPip, 0.7);
  return P;
}

// ------------------------------------------------------------------ IK helpers
function ik2(hx, hy, fx, fy, l1, l2, bend) {   // returns knee/elbow point; bend = +1 -> knee toward +x (or +y-ish)
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy); const maxd = l1 + l2 - 0.01;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  if (d < 0.5) d = 0.5;
  const a = Math.acos(U.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), base = Math.atan2(dy, dx);
  const k1 = [hx + Math.cos(base + a) * l1, hy + Math.sin(base + a) * l1], k2 = [hx + Math.cos(base - a) * l1, hy + Math.sin(base - a) * l1];
  let k = bend > 0 ? (k1[0] > k2[0] ? k1 : k2) : bend < 0 ? (k1[0] < k2[0] ? k1 : k2) : (k1[1] > k2[1] ? k1 : k2);
  if (bend === 2) k = k1[1] > k2[1] ? k1 : k2;   // elbow down
  if (bend === -2) k = k1[1] < k2[1] ? k1 : k2;  // elbow up
  return { k, foot: [hx + dx, hy + dy] };
}

// ------------------------------------------------------------------ pose
// s: {mode, phase, t, speed(0..1), vy, aim (local angle, rad), twoHand, swing(0..1), swingKind, crouch(0..1), lean, hurt(0..1), climb, wallSlide}
Rig.pose = function (s) {
  const legLen = Rig.HIP_H, ph = s.phase || 0, t = s.t || 0, mode = s.mode || 'idle';
  const p = { hip: [0, 0], torsoRot: 0, headRot: 0 };
  const sp = U.clamp(s.speed || 0, 0, 1.4);
  let hh = legLen * 0.985 + Math.sin(t * 1.9) * 0.28;
  const crouch = s.crouch || 0;
  hh -= crouch * legLen * 0.36;
  let stride = 0;
  let nearFoot = [3, -L.ankle], farFoot = [-3, -L.ankle];
  let lean = s.lean || 0, bx = 0;
  if (mode === 'run' || (mode === 'idle' && sp > 0.05)) {
    stride = 9 * sp; const lift = 6.2 * sp + 1.5;
    const foot = (a) => { const u = (a % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); if (u < Math.PI * 1.1) { const k = u / (Math.PI * 1.1); return [U.lerp(stride, -stride, k), -L.ankle]; } const k = (u - Math.PI * 1.1) / (Math.PI * 0.9); const e = k * k * (3 - 2 * k); return [U.lerp(-stride, stride, e), -L.ankle - lift * Math.sin(k * Math.PI)]; };
    nearFoot = foot(ph); farFoot = foot(ph + Math.PI);
    hh = legLen * 0.935 + Math.abs(Math.sin(ph)) * 1.5 - crouch * legLen * 0.3; lean += 0.1 * sp; bx = 0.6 * Math.sin(ph * 2);
  } else if (mode === 'jump') {
    const k = U.clamp(-(s.vy || 0) / 800, 0, 1); hh = legLen * 0.78;
    nearFoot = [6 - k * 2, -L.ankle - 13 - k * 3]; farFoot = [-5, -L.ankle - 8]; lean += 0.04;
  } else if (mode === 'fall') {
    hh = legLen * 0.9; nearFoot = [3.5, -L.ankle - 1.5]; farFoot = [-4.5, -L.ankle - 5]; lean -= 0.03;
  } else if (mode === 'doublejump') {
    hh = legLen * 0.72; nearFoot = [7, -L.ankle - 12]; farFoot = [-3, -L.ankle - 14 + Math.sin(t * 30) * 1.4];
  } else if (mode === 'wall') {
    hh = legLen * 0.86; nearFoot = [6, -L.ankle - 5]; farFoot = [5, -L.ankle - 12]; bx = -3; lean = -0.12;
  } else if (mode === 'ladder') {
    const c = s.climb || 0; hh = legLen * 0.84; nearFoot = [3.5, -L.ankle - 3 + Math.sin(c) * 4.5]; farFoot = [-2, -L.ankle - 3 - Math.sin(c) * 4.5]; lean = 0;
  } else if (mode === 'dash') {
    hh = legLen * 0.78; nearFoot = [-12, -L.ankle - 1]; farFoot = [8, -L.ankle - 6]; lean = 0.62;
  } else if (mode === 'crouch') {
    nearFoot = [5, -L.ankle]; farFoot = [-5, -L.ankle]; hh = legLen * 0.66; lean += 0.12;
    if (sp > 0.05) { const f = (a) => [Math.sin(a) * 5, -L.ankle - Math.max(0, Math.cos(a)) * 2]; nearFoot = f(ph); farFoot = f(ph + Math.PI); }
  } else if (mode === 'swim') {
    hh = legLen * 0.8; nearFoot = [-6 + Math.sin(t * 9) * 5, -L.ankle - 6]; farFoot = [-8 - Math.sin(t * 9) * 5, -L.ankle - 3]; lean = 0.25;
  } else if (mode === 'dead') {
    hh = legLen * 0.3; nearFoot = [6, -L.ankle]; farFoot = [-8, -L.ankle];
  }
  if (s.hurt) lean -= 0.26 * s.hurt;
  const hip = [bx, -hh]; p.hip = hip;
  const nearFootF = nearFoot, farFootF = farFoot;
  let a = ik2(hip[0] + 0.6, hip[1], nearFootF[0], nearFootF[1], L.thigh, L.shin, 1); p.kneeN = a.k; p.ankleN = a.foot;
  a = ik2(hip[0] - 0.6, hip[1], farFootF[0], farFootF[1], L.thigh, L.shin, 1); p.kneeF = a.k; p.ankleF = a.foot;
  p.footRotN = mode === 'run' ? -0.2 * Math.max(0, Math.cos(ph)) : (mode === 'jump' ? 0.4 : 0.0); p.footRotF = mode === 'run' ? -0.2 * Math.max(0, Math.cos(ph + Math.PI)) : 0.0;
  // torso
  const tr = lean + (s.aim !== undefined && s.aim !== null ? U.clamp(s.aim, -1, 1) * 0.12 : 0) + (mode === 'run' ? Math.sin(ph * 2) * 0.02 : 0);
  p.torsoRot = tr;
  const sx = hip[0] + Math.sin(tr) * L.torso, sy = hip[1] - Math.cos(tr) * L.torso;   // neck base
  p.neck = [sx, sy];
  const shX = sx - Math.sin(tr) * 2.2 + 0.6, shY = sy + Math.cos(tr) * 2.2;         // shoulder joint (slightly below the neck)
  p.shoulder = [shX, shY];
  p.headRot = -tr * 0.6 + (s.aim ? U.clamp(s.aim, -0.9, 0.9) * 0.3 : 0) - (s.hurt || 0) * 0.3 + (mode === 'dead' ? -0.4 : 0);
  // arms
  const reach = (L.uarm + L.farm) * 0.86;
  const swing = (ph2, amp) => [shX + Math.sin(ph2) * amp * sp + 1.5, shY + L.uarm + L.farm - 3 - Math.abs(Math.cos(ph2)) * 2 * sp];
  let handN, handF, bendN = 2, bendF = 2;
  if (s.aim !== undefined && s.aim !== null && mode !== 'dead') {
    const ax = Math.cos(s.aim), ay = Math.sin(s.aim);
    handN = [shX + ax * reach, shY + ay * reach];
    if (s.twoHand) { const fx = s.twoHand === true ? 9 : s.twoHand; handF = [shX + ax * (reach + fx), shY + ay * (reach + fx)]; }
    else handF = swing(ph + Math.PI, 8);
    if (s.recoil) { handN[0] -= ax * s.recoil; handN[1] -= ay * s.recoil; if (handF && s.twoHand) { handF[0] -= ax * s.recoil; handF[1] -= ay * s.recoil; } }
  } else if (s.swing !== undefined && s.swing !== null && s.swing > 0) {
    const k = s.swing; const kind = s.swingKind || 'chop';
    // wind up (0..0.35) then strike (0.35..0.6) then recover
    let ang;
    if (kind === 'punch') { const e = k < 0.3 ? -k / 0.3 : (k < 0.55 ? -1 + (k - 0.3) / 0.25 * 2.4 : 1.4 - (k - 0.55) / 0.45 * 1.4); handN = [shX + 4 + e * 12, shY + 9 - Math.abs(e) * 1]; }
    else { ang = k < 0.3 ? U.lerp(-2.3, -2.9, k / 0.3) : (k < 0.55 ? U.lerp(-2.9, 0.9, (k - 0.3) / 0.25) : U.lerp(0.9, 0.2, (k - 0.55) / 0.45)); handN = [shX + Math.cos(ang) * reach * 0.8 + 3, shY + Math.sin(ang) * reach * 0.8]; p.swingAng = ang; }
    handF = [shX + 5, shY + 10];
  } else if (mode === 'ladder') {
    const c = s.climb || 0; handN = [shX + 4, shY - 6 + Math.sin(c + 1.6) * 4]; handF = [shX + 3, shY - 10 - Math.sin(c + 1.6) * 4]; bendN = 2; bendF = 2;
  } else if (mode === 'wall') {
    handN = [shX + 3, shY - 9]; handF = [shX + 4, shY - 3];
  } else if (mode === 'jump' || mode === 'doublejump') {
    handN = [shX + 6, shY + 7]; handF = [shX - 5, shY + 8]; if (mode === 'doublejump') { handN = [shX + 8, shY - 4]; handF = [shX - 6, shY - 3]; }
  } else if (mode === 'fall') {
    handN = [shX + 8, shY - 4]; handF = [shX - 6, shY - 1];
  } else if (mode === 'dash') {
    handN = [shX - 9, shY + 6]; handF = [shX - 12, shY + 8];
  } else if (mode === 'dead') {
    handN = [shX + 6, shY + 9]; handF = [shX - 4, shY + 11];
  } else if (mode === 'swim') {
    handN = [shX + 12 * Math.cos(t * 6), shY + 5 + Math.sin(t * 6) * 6]; handF = [shX - 4 + 9 * Math.cos(t * 6 + 3), shY + 5 + Math.sin(t * 6 + 3) * 6];
  } else {
    const c = mode === 'run' ? 1 : 0;
    handN = [shX + 2 + c * Math.sin(ph + Math.PI) * 10 * sp, shY + L.uarm + L.farm - 2.5 - c * Math.abs(Math.cos(ph)) * 3.4 * sp - Math.sin(t * 1.9) * 0.3];
    handF = [shX + 1 + c * Math.sin(ph) * 10 * sp, shY + L.uarm + L.farm - 2.5 - c * Math.abs(Math.cos(ph + Math.PI)) * 3.4 * sp];
    if (mode === 'crouch') { handN = [shX + 5, shY + 11]; handF = [shX + 2, shY + 12]; }
  }
  a = ik2(shX, shY, handN[0], handN[1], L.uarm, L.farm, bendN); p.elbowN = a.k; p.wristN = a.foot;
  a = ik2(shX - 0.4, shY, handF[0], handF[1], L.uarm, L.farm, bendF); p.elbowF = a.k; p.wristF = a.foot;
  p.aim = s.aim; p.mode = mode; p.swing = s.swing;
  return p;
};

// ------------------------------------------------------------------ drawing
function seg(ctx, pt, from, to, flip) {   // draw a part hanging along +y from `from`, rotated to point at `to`
  if (!pt) return;
  const dx = to[0] - from[0], dy = to[1] - from[1];
  ctx.save(); ctx.translate(from[0], from[1]); ctx.rotate(Math.atan2(-dx, dy));
  ctx.drawImage(pt.c, -pt.ox, -pt.oy, pt.w, pt.h);
  ctx.restore();
}
// rigSet: from Rig.build(); pose: from Rig.pose(); o: {face, x, y, scale, alpha, weapon, tint}
Rig.draw = function (ctx, rs, pose, o) {
  const P = rs.parts, sc = (o.scale || 1);
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(sc * (o.face < 0 ? -1 : 1), sc);
  if (o.rot) ctx.rotate(o.rot);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  const hip = pose.hip;
  const pipOn = rs.spec.tag === 'vault';
  const wp = o.weapon;   // {sprite, grip:[x,y], len}
  // far arm (behind) unless two-handed grip
  const twoH = !!(wp && wp.twoHand && pose.aim !== undefined && pose.aim !== null);
  if (!twoH) { seg(ctx, pipOn ? P.uarmF : P.uarmF, pose.shoulder, pose.elbowF); seg(ctx, pipOn ? P.farmPipF : P.farmF, pose.elbowF, pose.wristF); }
  // far leg
  seg(ctx, P.thighF, [hip[0] - 0.6, hip[1]], pose.kneeF); seg(ctx, P.shinF, pose.kneeF, pose.ankleF);
  ctx.save(); ctx.translate(pose.ankleF[0], pose.ankleF[1]); ctx.rotate(pose.footRotF); ctx.drawImage(P.footF.c, -P.footF.ox, -P.footF.oy, P.footF.w, P.footF.h); ctx.restore();
  // torso
  ctx.save(); ctx.translate(hip[0], hip[1]); ctx.rotate(pose.torsoRot); ctx.drawImage(P.torso.c, -P.torso.ox, -P.torso.oy, P.torso.w, P.torso.h); ctx.restore();
  // near leg
  seg(ctx, P.thigh, [hip[0] + 0.6, hip[1]], pose.kneeN); seg(ctx, P.shin, pose.kneeN, pose.ankleN);
  ctx.save(); ctx.translate(pose.ankleN[0], pose.ankleN[1]); ctx.rotate(pose.footRotN); ctx.drawImage(P.foot.c, -P.foot.ox, -P.foot.oy, P.foot.w, P.foot.h); ctx.restore();
  // head
  ctx.save(); ctx.translate(pose.neck[0], pose.neck[1]); ctx.rotate(pose.torsoRot * 0.4 + pose.headRot); const hs = (rs.spec.headScale || Rig.HEAD_S); ctx.scale(hs, hs); ctx.drawImage(P.head.c, -P.head.ox, -P.head.oy, P.head.w, P.head.h); ctx.restore();
  // melee weapon or gun
  const drawWeapon = () => {
    if (!wp || !wp.sprite) return;
    const w = wp.sprite; let ang;
    if (pose.aim !== undefined && pose.aim !== null && !wp.melee) ang = pose.aim;
    else if (wp.melee && pose.swingAng !== undefined) ang = pose.swingAng + (wp.holdAng || 0);
    else ang = wp.melee ? (wp.idleAng !== undefined ? wp.idleAng : 0.9) : 0.6;
    ctx.save(); ctx.translate(pose.wristN[0], pose.wristN[1]); ctx.rotate(ang);
    if (wp.kick) ctx.translate(-wp.kick, 0);
    ctx.drawImage(w.c, -w.gx, -w.gy, w.w, w.h);
    ctx.restore();
  };
  if (twoH) { drawWeapon(); seg(ctx, P.uarmF, pose.shoulder, pose.elbowF); seg(ctx, P.farmF, pose.elbowF, pose.wristF); }
  else drawWeapon();
  // near arm (drawn last so the hand overlaps the weapon)
  seg(ctx, P.uarm, pose.shoulder, pose.elbowN); seg(ctx, P.farm, pose.elbowN, pose.wristN);
  ctx.restore();
};

// weapon anchor helpers: muzzle position in rig-local space (for projectiles/flash)
Rig.muzzle = function (pose, wp, face, scale) {
  if (!pose.wristN) return [0, 0];
  const ang = pose.aim !== undefined && pose.aim !== null ? pose.aim : 0;
  const mx = pose.wristN[0] + Math.cos(ang) * (wp.mx - (wp.kick || 0)) - Math.sin(ang) * (wp.my || 0), my = pose.wristN[1] + Math.sin(ang) * (wp.mx - (wp.kick || 0)) + Math.cos(ang) * (wp.my || 0);
  return [mx * face * scale, my * scale];
};

Rig.build = function (name, seed) {
  const spec = typeof name === 'string' ? OUTFITS[name] : name;
  return { spec, parts: buildParts(spec, seed || U.hashStr(spec.tag || 'x')) };
};
Rig.cache = {};
Rig.get = function (name) { return Rig.cache[name] || (Rig.cache[name] = Rig.build(name)); };

// ------------------------------------------------------------------ weapons (procedural sprites, grip at (gx,gy), barrel points +x)
const WS = (Rig.weapons = {});
function wsprite(w, h, gx, gy, fn) { const p = part(w, h, gx, gy, fn); p.gx = gx; p.gy = gy; return p; }
function metal(g, x, y, w, h, base, hi) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, rgb(base, hi || 1.5)); gr.addColorStop(0.35, rgb(base, 1.0)); gr.addColorStop(1, rgb(base, 0.42)); g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y + h - 0.4, w, 0.4); }
function wood(g, pts, base) { g.save(); blob(g, pts); const gr = g.createLinearGradient(0, pts[0][1] - 4, 0, pts[0][1] + 8); gr.addColorStop(0, rgb(base, 1.3)); gr.addColorStop(1, rgb(base, 0.55)); g.fillStyle = gr; g.fill(); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 0.35; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-10, pts[0][1] - 2 + i * 1.1); g.lineTo(40, pts[0][1] - 1.5 + i * 1.1); g.stroke(); } g.restore(); g.save(); blob(g, pts); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.4; g.stroke(); g.restore(); }
function glow(g, x, y, r, col) { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + col + ',0.95)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }

WS.pistol10 = () => { const s = wsprite(24, 14, 4, 5, (g) => {
  wood(g, [[-3, 0], [1.6, -0.4], [2.4, 6], [-1.6, 8.2], [-3.6, 5]], [96, 60, 34]);
  metal(g, -1, -3.6, 13, 3.8, [70, 74, 80]); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(-1, -3.6, 13, 0.6);
  metal(g, 11.6, -3, 5, 2.4, [40, 42, 46]);   // barrel
  g.fillStyle = '#111'; g.fillRect(16.4, -2.5, 0.6, 1.4);
  g.fillStyle = 'rgba(0,0,0,0.6)'; for (let i = 0; i < 4; i++) g.fillRect(2 + i * 1.3, -3.2, 0.5, 2.8);
  g.strokeStyle = '#2a2c30'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(2, 0.3); g.quadraticCurveTo(4, 3.6, 6.2, 0.3); g.stroke();
  g.fillStyle = '#c0c4c8'; g.fillRect(0.4, -4.1, 0.8, 0.8); g.fillRect(11.4, -4.1, 0.8, 0.8);
}); s.mx = 17; s.twoHand = false; s.len = 17; return s; };
WS.pipepistol = () => { const s = wsprite(24, 14, 4, 5, (g) => {
  wood(g, [[-3, 0], [1.6, -0.4], [2.4, 6], [-1.6, 8.2], [-3.6, 5]], [88, 56, 32]);
  metal(g, -1, -3.4, 15, 2.8, [110, 96, 82], 1.4); g.fillStyle = '#c8c4b8'; g.fillRect(4, -3.4, 2.2, 3); g.fillRect(9, -3.4, 2.2, 3);   // tape wraps
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(14, -3, 1, 2.2); g.fillStyle = '#5a4a2a'; g.fillRect(-1.6, -4.4, 4, 2);
}); s.mx = 16; s.len = 16; return s; };
WS.hunting_rifle = () => { const s = wsprite(46, 14, 6, 5, (g) => {
  wood(g, [[-16, 1], [-6, -0.6], [5, -1.2], [5, 3.4], [-2, 4.4], [-8, 9], [-17, 7]], [110, 70, 40]);
  metal(g, 2, -3, 24, 3, [58, 62, 66]); metal(g, 24, -2.6, 8, 2.2, [40, 42, 46]); wood(g, [[2, 1.4], [20, 1.4], [20, 3.8], [2, 3.8]], [110, 70, 40]);
  metal(g, 5, -6.6, 14, 2.2, [40, 44, 48], 1.7); g.fillStyle = 'rgba(120,170,220,0.55)'; g.fillRect(6, -6.2, 2, 1.4); g.fillRect(17, -6.2, 2, 1.4); g.fillStyle = '#20242a'; g.fillRect(9, -4.6, 1.2, 1.8); g.fillRect(15, -4.6, 1.2, 1.8);
  g.strokeStyle = '#2a2c30'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-1, 2.4); g.quadraticCurveTo(1, 5.4, 3.6, 2.4); g.stroke();
}); s.mx = 32; s.twoHand = 13; s.len = 32; return s; };
WS.shotgun = () => { const s = wsprite(42, 14, 6, 5, (g) => {
  wood(g, [[-14, 1.6], [-5, -0.4], [4, -0.8], [4, 3.6], [-2, 4.6], [-7, 8.4], [-15, 6.6]], [40, 42, 44]);
  metal(g, 2, -3.2, 26, 3.2, [52, 56, 60]); metal(g, 2, 0.4, 26, 2.6, [46, 50, 54]);
  metal(g, 12, 0.8, 8, 3.4, [32, 34, 38], 1.6); g.fillStyle = 'rgba(0,0,0,0.6)'; for (let i = 0; i < 4; i++) g.fillRect(13 + i * 1.8, 1.4, 0.6, 2.2);
  g.fillStyle = '#0a0a0a'; g.fillRect(28, -3, 0.8, 2.6);
}); s.mx = 29; s.twoHand = 12; s.len = 29; return s; };
WS.assault_rifle = () => { const s = wsprite(46, 16, 6, 6, (g) => {
  metal(g, -14, -1, 14, 5, [46, 50, 46], 1.3); metal(g, -2, -3.8, 24, 4.6, [58, 62, 58]); metal(g, 20, -2.8, 12, 2.4, [40, 42, 40]);
  metal(g, 4, 0.4, 4, 8, [46, 50, 46]); metal(g, 8, 0.6, 5, 7, [40, 44, 40], 1.2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(10, 3, 0.8, 4);
  g.fillStyle = '#c0c4c8'; g.fillRect(28, -4.4, 0.8, 1.6); g.fillRect(1, -5, 4, 1.2);
}); s.mx = 33; s.twoHand = 12; s.len = 33; return s; };
WS.laser_pistol = () => { const s = wsprite(24, 14, 4, 5, (g) => {
  wood(g, [[-3, 0], [1.6, -0.4], [2.4, 6], [-1.6, 8.2], [-3.6, 5]], [180, 176, 168]);
  metal(g, -1, -3.8, 14, 4, [200, 198, 192], 1.1); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-1, -3.8, 14, 0.7);
  metal(g, 12, -3, 5, 2.4, [110, 112, 116]); g.fillStyle = '#c33'; g.fillRect(4, -3, 5, 1.2); glow(g, 6.5, -2.4, 3, '255,60,50');
  g.fillStyle = 'rgba(0,0,0,0.4)'; for (let i = 0; i < 3; i++) g.fillRect(1 + i * 1.4, -1.6, 0.6, 1.6);
}); s.mx = 17; s.len = 17; return s; };
WS.laser_rifle = () => { const s = wsprite(46, 16, 6, 6, (g) => {
  wood(g, [[-13, 1.6], [-4, -0.6], [3, -1.2], [3, 4], [-3, 4.6], [-8, 8.4], [-14, 6.6]], [196, 192, 184]);
  metal(g, 0, -4, 26, 4.6, [206, 204, 198], 1.1); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, -4, 26, 0.8);
  metal(g, 24, -3, 10, 2.8, [120, 122, 126]); g.fillStyle = '#d33'; g.fillRect(8, -3.2, 13, 1.6); glow(g, 14, -2.4, 5, '255,70,50');
  g.fillStyle = '#aa2a20'; g.fillRect(32, -2.6, 3, 1.6); glow(g, 34, -1.8, 4, '255,90,70');
  g.strokeStyle = '#2a2c30'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-1, 2.4); g.quadraticCurveTo(1, 5.4, 3.6, 2.4); g.stroke();
}); s.mx = 36; s.twoHand = 12; s.len = 36; return s; };
WS.plasma_rifle = () => { const s = wsprite(48, 18, 6, 6, (g) => {
  metal(g, -14, -1, 15, 5.4, [60, 78, 70], 1.3); metal(g, -1, -4.4, 22, 5.6, [74, 96, 86], 1.2);
  g.fillStyle = '#20302a'; g.fillRect(21, -3.4, 12, 4); g.fillStyle = '#5cffb0'; glow(g, 8, -1.6, 6, '80,255,170'); glow(g, 28, -1.2, 6, '80,255,170'); g.fillStyle = '#b8ffe0'; g.fillRect(4, -2, 8, 1.2); g.fillRect(24, -1.6, 6, 1);
  metal(g, 33, -2.8, 6, 3, [40, 52, 46]); glow(g, 39, -1.4, 4, '120,255,190');
  metal(g, 6, 0.6, 5, 7, [60, 78, 70]);
}); s.mx = 39; s.twoHand = 12; s.len = 39; return s; };
WS.minigun = () => { const s = wsprite(52, 20, 8, 8, (g) => {
  metal(g, -12, -3, 16, 8, [70, 72, 68]); for (let i = 0; i < 6; i++) metal(g, 4, -5 + i * 1.8, 34, 1.5, [88 - i * 6, 90 - i * 6, 90 - i * 6], 1.5);
  metal(g, 38, -6, 3, 12, [50, 52, 50]); metal(g, 12, 4, 10, 6, [56, 58, 54]); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(14, 6, 6, 1);
}); s.mx = 41; s.twoHand = 14; s.len = 41; return s; };
WS.rocket = () => { const s = wsprite(50, 20, 8, 8, (g) => {
  metal(g, -10, -4, 40, 9, [70, 78, 60], 1.3); metal(g, 28, -6, 10, 13, [58, 64, 50]); g.fillStyle = '#0a0a0a'; g.beginPath(); g.ellipse(38, 0.5, 1.4, 5.2, 0, 0, 7); g.fill();
  metal(g, 6, 5, 4, 6, [50, 54, 46]); g.fillStyle = '#c9a030'; g.fillRect(10, -4, 2, 9);
}); s.mx = 38; s.twoHand = 14; s.len = 38; return s; };
// melee
WS.pipe = () => { const s = wsprite(38, 10, 4, 5, (g) => { metal(g, -4, -1.6, 34, 3.4, [120, 116, 108], 1.5); g.fillStyle = '#3a2a1a'; g.fillRect(-4, -1.8, 9, 3.8); g.fillStyle = 'rgba(120,52,20,0.5)'; g.fillRect(12, -1.6, 8, 3.4); }); s.melee = true; s.len = 30; s.holdAng = 0; return s; };
WS.bat = () => { const s = wsprite(40, 12, 4, 6, (g) => { wood(g, [[-4, -1.6], [10, -2], [30, -3.6], [34, -0.2], [30, 3.4], [10, 2], [-4, 1.6]], [150, 118, 74]); g.fillStyle = '#c8c0a4'; g.fillRect(-4, -1.6, 8, 3.2); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-2 + i * 2.6, -1.6); g.lineTo(-2 + i * 2.6, 1.6); g.stroke(); } g.fillStyle = 'rgb(170,168,160)'; for (let i = 0; i < 4; i++) g.fillRect(24 + i * 2.2, -4.4 + (i % 2) * 8.4, 1, 1.6); }); s.melee = true; s.len = 32; return s; };
WS.machete = () => { const s = wsprite(40, 12, 4, 5, (g) => { g.fillStyle = '#2a1e14'; g.fillRect(-4, -1.6, 8, 3.4); const gr = g.createLinearGradient(0, -3, 0, 4); gr.addColorStop(0, '#e8ecf0'); gr.addColorStop(0.5, '#9aa2aa'); gr.addColorStop(1, '#4a4e54'); g.fillStyle = gr; g.beginPath(); g.moveTo(4, -1.6); g.lineTo(28, -3.4); g.quadraticCurveTo(34, -1, 32, 3.4); g.lineTo(4, 1.8); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 0.4; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(6, -1.2, 22, 0.5); g.fillStyle = '#6a5a40'; g.fillRect(3, -2.4, 1.6, 5); }); s.melee = true; s.len = 32; return s; };
WS.sledge = () => { const s = wsprite(50, 20, 4, 10, (g) => { wood(g, [[-4, -1.4], [30, -1.6], [30, 1.6], [-4, 1.4]], [120, 82, 50]); metal(g, 26, -8, 16, 16, [96, 98, 100], 1.5); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(26, -8, 16, 1.4); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(40, -8, 2, 16); g.fillStyle = 'rgba(120,52,20,0.4)'; g.fillRect(28, -4, 9, 8); }); s.melee = true; s.len = 38; s.twoHand = false; return s; };
WS.powerfist = () => { const s = wsprite(28, 22, 6, 11, (g) => { metal(g, -3, -9, 12, 18, [92, 96, 100], 1.4); metal(g, 8, -8, 13, 16, [120, 122, 126], 1.5); g.fillStyle = '#c9a030'; g.fillRect(10, -8, 2, 16); g.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 3; i++) g.fillRect(16 + i * 1.6, -6, 0.6, 12); glow(g, 20, 0, 6, '255,190,90'); }); s.melee = true; s.punch = true; s.len = 22; return s; };
WS.ripper = () => { const s = wsprite(38, 16, 4, 8, (g) => { g.fillStyle = '#2a2a2a'; g.fillRect(-4, -2, 9, 4); metal(g, 5, -4, 18, 8, [80, 84, 88], 1.4); for (let i = 0; i < 9; i++) { g.fillStyle = 'rgb(200,204,208)'; g.beginPath(); g.moveTo(6 + i * 2, -4); g.lineTo(7 + i * 2, -6.4); g.lineTo(8 + i * 2, -4); g.fill(); g.beginPath(); g.moveTo(6 + i * 2, 4); g.lineTo(7 + i * 2, 6.4); g.lineTo(8 + i * 2, 4); g.fill(); } }); s.melee = true; s.len = 26; return s; };
WS.claw = () => null;
Rig.weaponSprite = function (id) { if (!Rig._ws) Rig._ws = {}; if (Rig._ws[id] === undefined) { const f = WS[id]; Rig._ws[id] = f ? f() : null; } return Rig._ws[id]; };

})();
