// REGION: THE CINDER RIDGE METRO (region 'metro', difficulty 1.6). Under the town, x 392..611, y 62..137.
// Levels (floor tops): E0 (entry/clinic/den) y=85 | T (tunnel/hub/hall) y=108 | S (sewer) y=128..134.
(function () {
'use strict';
const CD = window.CD, R = CD.room;

// ------------------------------------------------------------------ 1. RIDGE STREET STATION (concourse)  (440,62) 52x26  floor top y=85
{
  const r = R('m_entry', 'Ridge Street Station', 'metro', 440, 62, 52, 26, { bg: 'bw_tunnel' });
  r.shell(2, 'C').floor(3, 'U');
  r.open('T', 12, 17);                 // stairwell from s_main1 (global 452..457)
  r.ladder(12, 0, 22);                 // climb back out to the street
  r.open('B', 30, 35, 3);              // old stairs down to the tunnel (global 470..475)
  r.ladder(30, 22, 25);
  r.done();
}

// ------------------------------------------------------------------ 2. LINE 7 TUNNEL  (440,88) 52x24  floor top y=108
{
  const r = R('m_tunnel', 'Line 7 Tunnel', 'metro', 440, 88, 52, 24, { bg: 'bw_concrete' });
  r.shell(2, 'C').floor(4, 'C');
  r.solid(2, 2, 49, 9, 'C');           // earth fill above the bore (bore = rows 10..19)
  r.clear(30, 0, 35, 9);               // stairs shaft up to the concourse
  r.ladder(30, 0, 19);
  r.open('R', 17, 19);                 // to the hub (m_lift)
  r.clear(1, 17, 1, 19); r.breakable(0, 17, 0, 19);   // cracked wall -> m_cache
  r.done();
}

// ------------------------------------------------------------------ 3. MAINTENANCE HATCH SHAFT / HUB  (492,62) 24x50  floor top y=108
{
  const r = R('m_lift', 'Maintenance Shaft', 'metro', 492, 62, 24, 50, { bg: 'bw_concrete' });
  r.shell(2, 'C').floor(4, 'C');
  r.open('T', 8, 13);                  // hatch to s_main2 (global 500..505)
  r.ladder(8, 0, 45);                  // ladder col 500 down to the floor
  r.solid(9, 23, 21, 24, 'M');         // catwalk at y=85 (clinic side door + hatch landing)
  r.open('R', 20, 22);                 // to the clinic (door lives in m_clinic)
  r.open('L', 43, 45);                 // to the tunnel
  r.open('B', 15, 18, 4); r.ladder(15, 45, 49);        // manhole down to the sewer
  r.clear(22, 43, 22, 45); r.breakable(23, 43, 23, 45); // cracked wall -> hall (shortcut)
  r.done();
}

// ------------------------------------------------------------------ 4. CLINIC  (516,62) 48x26  floor top y=85
{
  const r = R('m_clinic', 'Vault-Tec Metro Clinic', 'metro', 516, 62, 48, 26, { bg: 'bw_lab' });
  r.shell(2, 'C').floor(3, 'Y');
  r.open('L', 20, 22);                 // to the hatch shaft (door)
  r.open('R', 20, 22);                 // to the den
  r.open('B', 2, 5, 3);                // wall-jump shaft B from the hall
  r.done();
}

// ------------------------------------------------------------------ 5. CHEM DEN (boss arena)  (564,62) 48x26  floor top y=85
{
  const r = R('m_den', "Marrow's Chem Den", 'metro', 564, 62, 48, 26, { bg: 'bw_lab' });
  r.shell(2, 'C').floor(3, 'Y');
  r.open('L', 20, 22);
  r.plat(7, 13, 20); r.plat(34, 40, 20); r.plat(19, 28, 17);
  r.done();
}

// ------------------------------------------------------------------ 6. CENTRAL PLATFORM (the big hall)  (516,88) 96x24  floor top y=108
{
  const r = R('m_platform', 'Central Platform', 'metro', 516, 88, 96, 24, { bg: 'bw_tunnel' });
  r.shell(2, 'C').floor(4, 'C');
  r.open('T', 2, 5);                   // shaft B up to the clinic
  r.solid(6, 2, 7, 5, 'C');            // E wall of shaft B (doorway below at rows 6..8)
  r.solid(2, 9, 26, 10, 'U');          // west platform slab (top y=97)
  r.ladder(27, 9, 19);
  r.plat(28, 55, 9); r.plat(61, 90, 9);        // east catwalk with a 5-wide break
  r.ladder(91, 9, 19);
  r.open('B', 84, 87, 4);              // chimney A arrives here from the sewer
  r.clear(1, 17, 1, 19); r.breakable(0, 17, 0, 19);   // cracked wall <- hub
  r.done();
}

// ------------------------------------------------------------------ 7. SEWER  (492,112) 120x26  deep floor top y=134
{
  const r = R('m_sewer', 'Ridge Street Sewers', 'metro', 492, 112, 120, 26, { bg: 'bw_brick' });
  r.shell(2, 'B').floor(4, 'B');
  r.open('T', 15, 18); r.ladder(15, 0, 7);              // manhole ladder from the hub
  // A. cistern: landing catwalk, flooded basin, shore
  r.solid(10, 8, 22, 8, 'M');
  r.water(2, 13, 38, 21);
  r.ladder(9, 8, 21);
  r.plat(25, 28, 9); r.plat(31, 34, 10);
  r.solid(39, 12, 46, 21, 'B'); r.ladder(38, 12, 21);
  // B. pipe run
  r.solid(47, 18, 80, 21, 'B'); r.solid(47, 2, 80, 9, 'B');
  r.water(47, 17, 80, 17);
  r.plat(48, 53, 15); r.plat(56, 61, 15); r.plat(64, 70, 15); r.plat(73, 79, 15);
  // C. outfall + chimney A
  r.solid(81, 16, 118, 21, 'B'); r.solid(81, 2, 105, 7, 'B');
  r.solid(106, 2, 107, 15, 'B'); r.clear(106, 13, 107, 15);       // W wall of chimney A + doorway
  r.solid(112, 2, 113, 15, 'B'); r.solid(114, 2, 117, 15, 'B'); r.clear(112, 3, 113, 5); r.clear(114, 3, 117, 5);  // E wall + niche
  r.open('T', 108, 111);
  r.plat(108, 109, 6);                                  // rest ledge in chimney A
  r.done();
}

// ------------------------------------------------------------------ 8. SECRET CACHE  (392,92) 48x20  floor top y=108
{
  const r = R('m_cache', 'Metro Security Depot', 'metro', 392, 92, 48, 20, { bg: 'bw_brick', secret: true });
  r.shell(2, 'B').floor(4, 'B');
  r.clear(46, 13, 46, 15); r.breakable(47, 13, 47, 15);
  r.done();
}

})();
