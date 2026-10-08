// Travel (TECH_PLAN 4.7) and the map-change sequence of 3.7: the Starchart, the Moth flight and
// every arrival (exits, Starchart travel, New Journey, Continue / Load, Retry, cs.goto).
//
// export const travel = {
//   bind(ctx)                                  extra: main.js hands in ctx (ctx.prewarm: { location, evict })
//   destinations() -> [{ id, name, subtitle, desc, locked, lockedText, warn, current, isNew }]   extra
//   open({ cs } = {}) -> Promise<destId | null>   ui.starchart with REG.destinations; a pick goes through go()
//   go(destId, { cs } = {}) -> Promise<bool>      `before` script (false cancels), flight, arrival, dest:<id>,
//                                                 eviction of finished chapters' art
//   arrive(map, spawn, { transition, scene, kind, duration, caption, wait, onCover }) -> Promise<bool>
// };
//
// arrive() locks the field ('travel'), covers the screen (transition 'fade' | 'iris' | 'shatter' |
// 'none'), prewarms the map's location, loads the map (ExploreState.loadMap, or enters the field from
// the title / a battle), and after the fade-in shows the location banner when the map changed, sets
// visited:<map>, applies the arrival rules by `kind` and announces the arrival through
// story.onChange({ type: 'arrive', map, kind, load, scene }) so ExploreState fires its `load`
// triggers when `load` is true:
//   kind 'exit' | 'travel' | 'newJourney'   load triggers, checkpoint and autosave (queued in a script)
//   kind 'load' | 'respawn'                 load triggers only (the state just came from a save / snapshot)
//   kind 'goto' | 'lift' | 'teleport' | 'transit'   nothing
// Scene and transit maps (and `scene: true`) never fire triggers, save or set the checkpoint.
// Travelling to the current map teleports under the cover without a rebuild.

import { gameState } from '../core/state.js';
import { REG, getMap, locationOfMap } from '../content/registry.js';
import { chapterIndex } from '../content/chapters.js';
import { story } from './story.js';

const PINNED = new Set(['core', 'common', 'prologue']);
const FLIGHT_MIN_MS = 3000;
const FULL_ARRIVALS = ['exit', 'travel', 'newJourney'];

let ctx = null;

function spawnPoint(def, spawn) {
  if (spawn && typeof spawn === 'object') return spawn;
  return def.spawns?.[spawn] || null;
}

export const travel = {
  bind(c) {
    ctx = c;
    return this;
  },

  destinations() {
    const here = ctx.game.states.explore.mapId;
    return REG.destinations.filter((d) => story.test(d.visible)).map((d) => {
      const open = story.test(d.unlock);
      return {
        id: d.id, name: d.name, subtitle: d.subtitle, desc: d.desc, locked: !open, lockedText: d.lockedText,
        warn: d.warn, current: d.map === here, isNew: open && !story.flag(`dest:${d.id}`),
      };
    });
  },

  async open({ cs } = {}) {
    if (!cs && ctx.cutscenes.active) {
      console.error('travel.open while a script is active: use cs.travel');
      return null;
    }
    const destinations = this.destinations();
    const id = await ctx.ui.starchart.open({ destinations });
    const d = destinations.find((x) => x.id === id);
    if (!d || d.locked || d.current) return null;
    return (await this.go(id, { cs })) ? id : null;
  },

  async go(destId, { cs } = {}) {
    const { cutscenes, game } = ctx;
    if (!cs && cutscenes.active) {
      console.error('travel.go while a script is active: use cs.travel');
      return false;
    }
    const dest = REG.destinations.find((d) => d.id === destId);
    if (!dest) {
      console.error(`travel: unknown destination "${destId}"`);
      return false;
    }
    const run = (id, args) => (cs ? cs.run(id, args) : cutscenes.run(id, args));
    if (dest.before && (await run(dest.before, { dest: destId })) === false) return false;
    const loc = locationOfMap(dest.map);
    let ready = false;
    const prewarm = Promise.resolve(loc && ctx.prewarm ? ctx.prewarm.location(loc) : null).then(() => { ready = true; });
    const quick = cutscenes.fast || cutscenes.instant;
    if (REG.maps.moth && REG.scripts['travel.flight']) {
      const from = game.states.explore.mapId;
      await this.arrive('moth', 'cockpit', { kind: 'transit' });
      const t0 = performance.now();
      await cutscenes.skippable(async (w) => {
        await run('travel.flight', { from, to: destId });
        const rest = (quick ? 300 : FLIGHT_MIN_MS) - (performance.now() - t0);
        if (rest > 0 && !w.skipped) await new Promise((resolve) => { w.wake = resolve; setTimeout(resolve, rest); });
        await prewarm;
      }, () => ready);
      await this.arrive(dest.map, dest.spawn, { kind: 'travel' });
    } else {
      await this.arrive(dest.map, dest.spawn, { kind: 'travel', caption: 'En route', wait: prewarm });
    }
    story.set(`dest:${destId}`);
    this._evict(loc);
    return true;
  },

  async arrive(map, spawn, { transition = 'fade', scene = false, kind = 'exit', duration, caption, wait, onCover } = {}) {
    const { engine, game, ui, cutscenes } = ctx;
    const def = getMap(map);
    const at = def && spawnPoint(def, spawn);
    if (!at) {
      console.error(`travel: ${def ? `map "${map}" has no spawn "${spawn}"` : `unknown map "${map}"`}`);
      return false;
    }
    const ex = game.states.explore;
    const inField = game.name === 'explore' && !!ex.world;
    const same = inField && ex.mapId === map;
    const quick = cutscenes.fast || cutscenes.instant;
    ex.lock('travel');
    try {
      const cover = async () => {
        onCover?.();
        const jobs = [];
        if (caption) jobs.push(ui.cards.caption(caption, { ms: quick ? 300 : 1600 }));
        if (wait) jobs.push(wait);
        const loc = !same && locationOfMap(map);
        if (loc && ctx.prewarm) jobs.push(ctx.prewarm.location(loc));
        await Promise.all(jobs);
        if (same) ex.teleport(at.x, at.z, at.facing);
        else if (inField) await ex.loadMap(map, spawn);
        else await game.change('explore', { map, spawn, respawn: kind === 'respawn' });
        // a load, a jump or a Retry may have changed who leads
        ex.setLeader(gameState.leader);
      };
      if (transition === 'none') await cover();
      else {
        const d = duration ?? (transition === 'iris' ? 1.7 : 0.9);
        await engine.transition(transition, { duration: d, color: '#05070d', onMidpoint: cover });
      }
      this._arrived(def, { kind, scene, changed: !same });
    } finally {
      ex.unlock('travel');
    }
    return true;
  },

  _arrived(def, { kind, scene, changed }) {
    const { ui, game, cutscenes } = ctx;
    const staged = !!(def.scene || def.transit || scene);
    if (changed && !staged) {
      const obj = REG.objectives[gameState.story.objective];
      ui.hud.showLocation(def.name, def.region || '', obj ? obj.text : null);
    }
    story.set(`visited:${def.id}`);
    // the art cache keeps the current location and trims the rest to its budget (11.5)
    ctx.prewarm?.arrived?.(locationOfMap(def.id));
    if (!cutscenes.active) {
      // control returns to the player: the pause menu works again, the field takes input
      ui.menuEnabled = true;
      ctx.input.setContext('explore');
      if (changed) game.states.explore.restoreMusic();
    }
    const full = !staged && FULL_ARRIVALS.includes(kind);
    if (full) {
      game.requestCheckpoint();
      game.requestAutosave();
    }
    story.notify({ type: 'arrive', map: def.id, kind, load: !staged && (full || kind === 'load' || kind === 'respawn'), scene: staged });
  },

  /** Drop the painted art of locations whose chapter is over (11.5); evicted art repaints on demand. */
  _evict(destLoc) {
    if (!ctx.prewarm) return;
    const ci = chapterIndex(gameState.story.chapter);
    for (const [id, loc] of Object.entries(REG.locations)) {
      if (PINNED.has(id) || id === destLoc || chapterIndex(loc.chapter) >= ci) continue;
      ctx.prewarm.evict(id);
    }
  },
};
