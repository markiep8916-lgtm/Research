import * as THREE from 'three';
import { Gfx } from '../gfx/gfx.js';
import { Particles } from '../gfx/particles.js';
import { createKong } from '../gfx/models/kong.js';
import { RoomBuilder } from '../world/builder.js';
import { Grid } from '../sim/grid.js';
import { RoomView } from '../gfx/roomView.js';

const q = new URLSearchParams(location.search);
const theme = q.get('theme') || 'jungle';
const gfx = new Gfx(document.getElementById('stage'), { shadowSize: 2048 });
gfx.applyTheme(theme);
gfx.fx = new Particles(gfx.scene);

const W = 64, H = 28;
const b = new RoomBuilder('sample_' + theme, W, H, { area: theme });
b.border('#');
b.ground(0, W - 1, 3);
b.plat(8, 7, 5); b.plat(15, 9, 4); b.plat(21, 11, 5);
b.ladder(28, 4, 12); b.plat(27, 12, 3);
b.block(34, 8, 4, 2);
b.set(31, 4, '^'); b.set(32, 4, '^'); b.set(33, 4, '^');
b.rect(40, 4, 1, 3, 'R'); b.rect(44, 3, 3, 1, 'G'); b.set(50, 4, 'Y'); b.set(52, 4, 'F'); b.set(53, 4, 'F');
b.vine(58, 6, 14); b.set(56, 14, 'v'); b.rect(55, 4, 3, 1, 'D'); b.rect(60, 4, 1, 3, 'E');
b.rect(10, 1, 4, 3, 'L'); b.rect(18, 1, 4, 3, 'W');
b.set(5, 4, '@');
const def = b.build();
def.props.waterfall = theme === 'jungle' ? { x: 36, y: 4, w: 3, h: 22 } : undefined;
const grid = new Grid(def.w, def.h, def.tiles.slice(), def.open);
const view = new RoomView(gfx, def, grid, theme);
gfx.scene.add(view.group);

const kong = createKong();
kong.root.position.set(+(q.get('kx') || 6), 4, 0);
gfx.scene.add(kong.root);
const cx = +(q.get('cx') || 14), cy = +(q.get('cy') || 9);
const dist = +(q.get('dist') || 18.5);
gfx.camera.position.set(cx, cy + 1.4, dist);
gfx.camera.lookAt(cx, cy - 0.6, 0);
gfx.followShadow(cx, cy);
gfx.setPointLights(view.pointLights, cx, cy, 0);
for (let i = 0; i < 120; i++) { view.update(1 / 60, gfx.fx, cx, cy); gfx.fx.update(1 / 60); kong.update({ face: 1, vx: 0, vy: 0, ground: true, mode: 'move', attack: -1, throwing: -1, hurt: 0 }, 1 / 60, i / 60); }
gfx.fx.setScale(gfx.h / (2 * Math.tan(19 * Math.PI / 180)));
gfx.setPointLights(view.pointLights, cx, cy, 2);
gfx.render();
window.__ready = true;
