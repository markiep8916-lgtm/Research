// Offline audio audit: renders every SFX and music track and reports peak/RMS/NaN/DC/tail. node tests/audio_audit.js
const { open } = require('./harness');
(async () => {
  const h = await open('start=1');
  const res = await h.T(async () => {
    const A = window.__CD.audio; const out = [];
    for (const n of A.sfxNames()) out.push(await A.audit('sfx', n, n === 'door' || n === 'roar' || n === 'ability' || n === 'explosion' || n === 'boss' ? 3 : 1.6));
    for (const n of A.trackNames()) out.push(await A.audit('music', n, 24));
    return out;
  });
  const bad = res.filter((r) => !r || r.error || r.bad || r.peak < 0.02 || r.peak > 0.98 || Math.abs(r.dc) > 0.01);
  console.log('SFX/tracks audited:', res.length);
  const table = res.map((r) => r ? (r.kind + ' ' + r.name.padEnd(14) + ' peak ' + String(r.peak).padStart(5) + '  rms ' + String(r.rms).padStart(6) + '  tail ' + r.tail + (r.error ? ' ERROR ' + r.error : '')) : 'null').join('\n');
  console.log(table);
  console.log('FLAGGED:', JSON.stringify(bad));
  await h.browser.close();
})();
