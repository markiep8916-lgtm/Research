// Human-pace route of chapter 4 (tools/human-pace.mjs, G2 T-1): the Memory Vault. The Grid and its
// three lessons, the firewall switch, the Stacks, the three crystals (west, north, east: launch,
// lullaby, Severance in pickup order), BOLT's seed, the Corrupted Memory, ECHO, the bridge and Ione.
// Chain: (spire.mjs) -> ch4.vault -> ch4.fields -> ch4.core -> (the finale's route).

export default {
  segments: {
    // the Interface and the Grid: the wraiths, Window 9's rifle, the firewall and its switch, the Stacks
    'ch4.vault': {
      level: 22,
      next: 'ch4.fields',
      async run(d) {
        // chained from the CHAPTER FOUR card (or a jump, which runs no load trigger) the party stands in
        // the Spire's antechamber: it dives through the neural interface as a player does
        if (d.jumped) { await d.eval(() => window.__VP.debug.goto('spire', 'antechamber')); await d.pump(null, { minVt: 1 }); }
        if ((await d.snap()).map === 'spire') {
          await d.shot('c06-antechamber', { hi: true });
          await d.use('interface');
          d.milestone('dive');
        }
        await d.pump(d.F('seen:vault:arrival'), { minVt: 1, maxVt: 900 });
        d.milestone('vault');
        await d.shot('c06-interface', { hi: true });
        await d.use('echo_sato', { optional: true });
        // A lost fight on the Grid ends in Retry, which restores the last checkpoint (the arrival) and
        // undoes the wraiths, the firewall and its switch: each pass replays only what is undone.
        const has = (flag) => d.eval((f) => !!window.__VP.ctx.state.flags[f], flag);
        for (let pass = 0; ; pass++) {
          await d.fightBoss({ at: [25.4, 47.2], script: 'vault.wraiths', done: d.F('vault:wraiths_down') });
          if (pass === 0) await d.use('echo_jun', { optional: true });
          await d.use('rifle', { optional: pass > 0 });
          await d.fightBoss({ at: [37.4, 31.4], script: 'vault.firewall', done: d.F('vault:firewall_down') });
          if (!(await has('sw:vault:fw'))) {
            await d.use('sw_fw');
            await d.pump(d.F('sw:vault:fw'));
          }
          if (pass === 0) {
            d.milestone('firewall');
            await d.use('echo_voss', { optional: true });
            await d.use('stacks', { optional: true });
          }
          try {
            await d.go(19.5, 19.0);
            break;
          } catch (e) {
            if (pass >= 2 || !/no path/.test(e.message) || (await has('sw:vault:fw'))) throw e;
            d.note(`ch4.vault: ${e.message} after a Retry rolled the Grid back; replaying it (pass ${pass + 2})`);
          }
        }
      },
    },
    // the Memory Fields: west (one switch), north (two), the Index, east (the swing), BOLT's seed
    'ch4.fields': {
      level: 24,
      next: 'ch4.core',
      async run(d) {
        await d.pump(null, { minVt: 1 });
        await d.journal('journal-ch4-crystals');
        await d.use('sw_w');
        await d.pump(d.F('sw:vault:w'));
        await d.use('crystal_a');
        await d.pump(d.F('story:memory_launch'));
        d.milestone('memory 1');
        await d.use('echo_pell', { optional: true });
        await d.use('sw_n1');
        await d.journal('journal-ch4-one-relay');
        await d.use('sw_n2');
        await d.pump(`${d.F('sw:vault:n1')} && ${d.F('sw:vault:n2')}`);
        await d.use('crystal_b');
        await d.pump(d.F('story:memory_lullaby'));
        d.milestone('memory 2');
        await d.med('med_hub');
        await d.use('gauntlet');
        await d.fightBoss({ at: [58.4, 19.0], script: 'vault.swarm', done: d.F('vault:swarm_down') });
        await d.use('sw_e');
        await d.pump(d.F('sw:vault:e'));
        await d.use('crystal_c');
        await d.pump(d.F('story:bolt_seed'));
        d.milestone('bolt seed');
        await d.shot('c06-seed', { hi: true });
        await d.go(40.5, 21.0);
      },
    },
    // the Core: a rest at the Index, the Corrupted Memory, the core Med-Station, ECHO (Retry after a loss)
    'ch4.core': {
      level: 27,
      next: 'finale',
      async run(d) {
        await d.med('med_hub');
        await d.fightBoss({ at: [41.0, 7.6], script: 'vault.overwrite', done: d.F('vault:overwrite_down') });
        await d.med('med_core', { talk: false });
        await d.shot('c06-core', { hi: true });
        await d.fightBoss({
          at: [40.5, 4.4], script: 'vault.echo', done: d.F('story:ch4_done'),
          onLoss: async () => { if ((await d.snap()).map === 'vault') await d.med('med_core', { talk: false }); },
        });
        d.milestone('ch4 done');
        // the aftermath ends on the Halcyon bridge with the FINAL CHAPTER card
        await d.pump('window.__VP.ctx.state.story.chapter === "finale"', { maxVt: 900 });
        d.milestone('final card');
        await d.vwait(2);
        await d.shot('c06-final-card', { hi: true });
      },
    },
  },

  plan: {
    ch4: {
      scenes: {
        'vault.arrival': 45, 'vault.memory_launch': 40, 'vault.memory_lullaby': 40, 'vault.memory_severance': 40,
        'vault.bolt_reveal': 70, 'vault.echo': 105,
      },
      bosses: { vault_boss_echo: 27 },
    },
  },

  // a leg ends only where the walked distance really resets: a Med-Station rest (or the boss)
  legs: [
    {
      chapter: 'ch4', label: 'Vault: Interface -> wraiths -> Window 9 -> firewall -> Stacks -> crystals A, B -> the Index rest',
      map: 'vault', flags: ['sw:vault:fw', 'vault:firewall_down', 'sw:vault:w', 'sw:vault:n1', 'sw:vault:n2'],
      points: [[7.5, 48.5], [24.0, 47.5], { fight: 'vault_wraiths' }, [38.5, 45.5], [46.2, 45.2], [40.5, 37.5], [37.6, 33.2],
        { fight: 'vault_firewall' }, [34.2, 30.6], [27.0, 31.5], [17.5, 31.0], [16.5, 25.5], [15.2, 17.0], [10.5, 18.5], [5.0, 16.4],
        [17.5, 13.0], [17.5, 8.0], [14.2, 2.6], [14.2, 7.4], [9.5, 4.5], [4.5, 3.8], [17.5, 6.0], [17.5, 13.0], [26.5, 18.5],
        [34.6, 21.8]],
    },
    {
      chapter: 'ch4', label: 'Vault: the Index -> gauntlet -> swarm -> crystal C -> the core gate rest', map: 'vault',
      flags: ['sw:vault:fw', 'vault:firewall_down', 'sw:vault:w', 'sw:vault:n1', 'sw:vault:n2', 'sw:vault:e', 'story:bolt_seed'],
      points: [[34.6, 21.8], [49.0, 22.2], [53.5, 18.5], [57.0, 19.0], { fight: 'vault_swarm' }, [63.2, 16.0], [60.5, 11.0],
        [60.5, 3.6], [60.5, 12.0], [53.5, 18.5], [40.5, 17.0], [40.5, 9.0], { fight: 'vault_overwrite' }, [33.4, 7.0]],
    },
    {
      chapter: 'ch4', label: 'Vault: the core gate -> ECHO', map: 'vault',
      flags: ['sw:vault:fw', 'vault:firewall_down', 'sw:vault:w', 'sw:vault:n1', 'sw:vault:n2', 'sw:vault:e', 'story:bolt_seed'],
      points: [[33.4, 7.0], [40.5, 4.6], { fight: 'vault_boss_echo' }],
    },
  ],
};
