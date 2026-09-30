/* Frame composition: background, scene, persistent chrome, captions. window.__draw(t) renders the frame at t seconds. */
'use strict';
const canvas = document.getElementById('c');
const g = canvas.getContext('2d');
setCtx(g);

function sceneAt(t) {
  const S = TL.scenes;
  for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].t0) return S[i];
  return S[0];
}

function drawChrome(S, t) {
  if (S.tag) {
    const fi = ease.out(cl((t - S.t0) / 0.5)) * ease.out(cl((S.t0 + S.dur - t) / 0.5));
    g.save(); g.globalAlpha = fi; text(S.tag.toUpperCase(), M, 78, { size: 22, weight: 600, ls: 2.5, color: C.mut }); g.restore();
  }
  // status tag on every frame
  const label = 'PRELIMINARY  ·  AI-PRODUCED  ·  NOT HUMAN-CHECKED';
  g.save(); g.font = fnt(19, 700, FS); g.letterSpacing = '1.6px';
  const w = g.measureText(label).width + 36, x = W - M - w, y = 54;
  rrectPath(x, y, w, 40, 20); g.fillStyle = 'rgba(58,45,16,0.55)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(232,192,105,0.65)'; g.stroke();
  g.fillStyle = C.amber; g.textBaseline = 'alphabetic'; g.fillText(label, x + 18, y + 27);
  g.restore();
  // progress bar with scene notches
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, H - 6, W, 6);
  g.fillStyle = C.teal; g.fillRect(0, H - 6, W * cl(t / TL.total), 6);
  g.fillStyle = 'rgba(13,22,27,0.9)';
  TL.scenes.slice(1).forEach((s) => g.fillRect(W * s.t0 / TL.total - 1, H - 6, 2, 6));
}

function drawCaptions(S, lt) {
  let cur = null;
  for (const sg of S.seg) for (const ch of sg.chunks) if (lt >= ch.t0 - 0.02 && lt < ch.t1 + 0.55) cur = ch;
  if (!cur) return;
  const a = ease.out(cl((lt - cur.t0) / 0.2)) * (lt > cur.t1 + 0.3 ? 1 - cl((lt - cur.t1 - 0.3) / 0.25) : 1);
  if (a <= 0.01) return;
  let size = 40, lines = wrapBalanced(cur.text, 1560, size, 500);
  if (lines.length > 2) { size = 36; lines = wrapBalanced(cur.text, 1680, size, 500); }
  const lh = Math.round(size * 1.32);
  g.save(); g.globalAlpha = a; g.font = fnt(size, 500, FS);
  const tw = Math.max(...lines.map((l) => g.measureText(l).width));
  const ph = lines.length * lh + 28, pw = tw + 64, px = W / 2 - pw / 2, py = 1012 - ph;
  rrectPath(px, py, pw, ph, 16); g.fillStyle = 'rgba(6,12,16,0.84)'; g.fill();
  g.fillStyle = '#F1F6F8'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  lines.forEach((l, i) => g.fillText(l, W / 2, py + 14 + size * 0.95 + i * lh));
  g.restore();
}

window.__draw = function (t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.drawImage(BG, 0, 0);
  const S = sceneAt(t), lt = t - S.t0;
  setTime(lt, S);
  const last = S === TL.scenes[TL.scenes.length - 1];
  const fo = last ? cl((TL.total - t) / 0.8) : cl((S.dur - lt) / 0.4);
  g.save(); g.globalAlpha = ease.out(cl(lt / 0.45)) * ease.out(fo);
  SCENES[S.id]();
  g.restore();
  drawChrome(S, t);
  drawCaptions(S, lt);
};
window.__png = () => canvas.toDataURL('image/png');
window.__ready = (async () => {
  const specs = [['600 60px "Source Serif 4"', 'Longevity βμ×−–—·†‡ α'], ['400 60px "Source Serif 4"', 'Longevity'], ['400 30px "Source Sans 3"', 'Escape βμ×−–—·†‡ α'],
    ['500 30px "Source Sans 3"', 'Escape'], ['600 30px "Source Sans 3"', 'Escape'], ['700 30px "Source Sans 3"', 'Escape']];
  await Promise.all(specs.map(([f, s]) => document.fonts.load(f, s)));
  await document.fonts.ready;
  makeBackground();
  window.__draw(0);
  return true;
})();
if (new URLSearchParams(location.search).get('play') === '1') {
  window.__ready.then(() => { const t0 = performance.now(); const tick = () => { window.__draw(((performance.now() - t0) / 1000) % TL.total); requestAnimationFrame(tick); }; tick(); });
}
