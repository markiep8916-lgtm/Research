// Pip-Boy with real keys: tab switching (Q/E, arrows), using a stimpak from ITEMS, reading a holotape in DATA, perk pick in STAT, map pan/zoom.
const { open } = require('./harness');
(async () => {
  const h = await open('start=1&kit=1&abilities=all&room=v_cryo', { w: 960, h: 540 });
  await h.page.waitForTimeout(1500);
  const key = async (k, ms) => { await h.page.keyboard.press(k); await h.page.waitForTimeout(ms || 350); };
  const ev = (f) => h.T(f); const out = [];
  await ev(() => { const G = window.__G; G.st.hp = 40; G.st.holotapes.tape_s6 = 1; G.st.perkPoints = 1; G.st.aid.stimpak = 3; });
  await key('Tab'); out.push('open:' + await ev(() => window.__G.state + '/' + window.__CD.pipboy.tab));
  await key('KeyE'); out.push('items-tab:' + await ev(() => window.__CD.pipboy.tab));
  const before = await ev(() => ({ hp: window.__G.st.hp, st: window.__G.st.aid.stimpak })); await key('Enter', 500);
  const after = await ev(() => ({ hp: window.__G.st.hp, st: window.__G.st.aid.stimpak, sel: window.__CD.pipboy.sel.join(',') })); out.push('use-stim:' + JSON.stringify(before) + '->' + JSON.stringify(after));
  await key('KeyE'); out.push('data-tab:' + await ev(() => window.__CD.pipboy.tab));
  await key('Enter', 500); out.push('reading:' + await ev(() => !!window.__CD.pipboy.reading)); await key('Escape', 500); out.push('reading-closed-still-open:' + await ev(() => !window.__CD.pipboy.reading && window.__G.state));
  await key('KeyE'); out.push('map-tab:' + await ev(() => window.__CD.pipboy.tab));
  const z0 = await ev(() => window.__CD.pipboy.mapZoom); await key('Equal'); await key('Equal'); out.push('zoom:' + z0 + '->' + await ev(() => window.__CD.pipboy.mapZoom));
  await key('KeyQ'); await key('KeyQ'); await key('KeyQ'); out.push('stat-tab:' + await ev(() => window.__CD.pipboy.tab));
  const pp0 = await ev(() => window.__G.st.perkPoints); await key('Enter', 600); out.push('perk-pick:' + pp0 + '->' + await ev(() => window.__G.st.perkPoints + '/' + JSON.stringify(window.__G.st.perks)));
  await key('Tab'); out.push('closed:' + await ev(() => window.__G.state));
  console.log(out.join('\n'));
  console.log('errors:', h.logs.filter((l) => /error|exception/i.test(l) && !/willReadFrequently|getImageData/.test(l)).slice(0, 4).join(' | ') || 'none');
  await h.browser.close();
})();
