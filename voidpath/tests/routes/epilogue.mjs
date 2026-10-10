// Human-pace route of the epilogue (tools/human-pace.mjs, G2 T-1): the Cryo Deck after the crown,
// epilogue.main's six vignettes read at a human pace (the pods, the halberd, Theo, the Arboretum glass,
// Driftmarket, Window 9, the skiffs, Ione's shore and Kade's last line), the VOIDPATH logo, the credits
// over the shore, THE END, "Journey complete" -> Return to Ione; then the post-game shore: the
// travelers, Theo and BOLT each say their line, and Orion coaxes the berth beacon into the lullaby.
// Chain: (heart.mjs fin.crown) -> epilogue.

/**
 * THE END waits for Confirm and the driver only confirms dialog, battle lines and screens: a page
 * timer presses Enter once the prompt shows (the credits themselves roll at their own pace).
 */
function confirmTheEnd() {
  if (window.__epiEnd) return;
  const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { code: 'Enter', key: 'Enter', bubbles: true }));
  window.__epiEnd = setInterval(() => {
    if (!document.querySelector('.vp-end-p.is-on')) return;
    key('keydown');
    setTimeout(() => key('keyup'), 150);
  }, 900);
}

export default {
  segments: {
    epilogue: {
      level: 32,
      async run(d) {
        await d.eval(confirmTheEnd);
        // epilogue.main runs from the Cryo Deck's flag trigger; it ends on the shore after the credits
        await d.pump(`${d.F('story:game_clear')} && window.__VP.debug.state().map === 'ione'`, { maxVt: 1500 });
        d.milestone('the end');
        await d.shot('c08-shore-postgame', { hi: true });
        await d.journal('journal-epilogue');
        // the shore after the clear: one line each
        for (const id of ['ep_nyx', 'ep_orion', 'ep_sera', 'ep_theo']) await d.use(id, { optional: true });
        await d.use('bolt', { optional: true });
        d.milestone('shore talk');
      },
    },
  },

  plan: {
    // WRITING 5.10: epilogue.main 150 s plus the credits (about 150 s, music only); the scene's clock
    // runs until the script ends on the shore, so the credits, THE END and the stats are inside it
    epilogue: { scenes: { 'epilogue.main': 300 }, bosses: {} },
  },

  legs: [],
};
