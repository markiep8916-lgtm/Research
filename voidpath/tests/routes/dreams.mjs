// Human-pace route of the finale's story beats (tools/human-pace.mjs, G2 T-1), for C8's scenes on
// their own: the Halcyon bridge after the FINAL CHAPTER card, the Starchart to the Heart and the night
// before (all four vignettes), the flight and the arrival, then each dream walked into in turn (the
// way between tiers is heart.mjs's: here the run steps to the edge of each dream's trigger and walks
// in), the crown (WARDEN resolved by the model: the fight is C11's and timed by 19-warden), the
// resolution, the EPILOGUE card; then the epilogue (epilogue.mjs).
// Chain: dream.night -> epilogue.

/** In the page: a walkable point just outside a trigger of the live map and the trigger's centre. */
function aimAt(id) {
  const w = window.__VP.game.states.explore.world;
  const t = w.map.triggers.find((x) => x.id === id);
  const [x0, z0, x1, z1] = t.rect;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const out = [];
  for (const [dx, dz, face] of [[-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down'], [0, 1, 'up']]) {
    for (let d = 0.7; d < 4.5; d += 0.4) {
      const x = dx < 0 ? x0 - d : dx > 0 ? x1 + d : cx, z = dz < 0 ? z0 - d : dz > 0 ? z1 + d : cz;
      let ok = true;
      for (let k = 0; k <= 12; k++) if (!w.walkable(x + (cx - x) * k / 12, z + (cz - z) * k / 12)) { ok = false; break; }
      if (ok) { out.push({ x, z, face, d }); break; }
    }
  }
  const from = out.sort((a, b) => a.d - b.d)[0];
  return { from, to: { x: cx, z: cz } };
}

/** Step to the edge of a trigger and walk in; play the scene out until `flag`. */
async function walkIn(d, trigger, flag, answer) {
  const { from, to } = await d.eval(aimAt, trigger);
  await d.teleport(from.x, from.z, from.face);
  if (answer) d.choose(answer);
  await d.go(to.x, to.z, { until: d.F(flag), run: false, label: trigger });
  await d.pump(d.F(flag), { maxVt: 900 });
}

export default {
  segments: {
    'dream.night': {
      level: 31,
      next: 'epilogue',
      async run(d) {
        await d.eval(() => window.__VP.debug.encounters(false));
        // the bridge: the Starchart, the Heart's warning, "Spend the night aboard first?"
        d.choose('Rest tonight.');
        await d.fly('starchart', 'The Heart');
        await d.pump(d.F('seen:heart:arrival'), { maxVt: 1200 });
        d.milestone('heart arrival');
        await d.eval(() => {
          const w = window.__VP.game.states.explore.world;
          for (const i of w.map.interactables) if (i.kind === 'switch' && i.flag) window.__VP.debug.flags({ [i.flag]: true });
        });
        await walkIn(d, 'dream_kade', 'story:dream_kade', 'Wake up.');
        d.milestone('dream kade');
        await d.shot('c08-after-kade', { hi: true });
        await walkIn(d, 'dream_nyx', 'story:dream_nyx', 'Stay.');
        d.milestone('dream nyx');
        await walkIn(d, 'dream_orion', 'story:dream_orion', 'Wake up.');
        d.milestone('dream orion');
        await walkIn(d, 'dream_sera', 'story:dream_sera', 'Wake up.');
        d.milestone('dream sera');
        // the crown: the approach, WARDEN (resolved by the model), the resolution, the EPILOGUE card
        await d.eval(() => window.__VP.debug.autoResolve('win'));
        await walkIn(d, 'crown', 'story:finale_done');
        await d.eval(() => window.__VP.debug.autoResolve(false));
        await d.pump(`window.__VP.debug.state().chapter === 'epilogue' && window.__VP.debug.state().map === 'halcyon'`, { maxVt: 900 });
        d.milestone('finale done');
      },
    },
  },

  plan: {
    // WRITING 5.7 / 5.10 (heart.mjs carries the same numbers for its full ascent)
    finale: {
      scenes: {
        'dreams.night_before': 90, 'dreams.kade': 60, 'dreams.nyx': 60, 'dreams.orion': 60, 'dreams.sera': 60, 'dreams.crown': 190,
      },
      bosses: {},
    },
  },

  legs: [],
};
