// Shader-program anchor (TECH_PLAN 11.4). three r170 frees a program when the last material that
// used it is disposed, so every battle and every map change used to relink its shaders. World,
// BattleStage and arena teardown call release(material) instead of material.dispose(): the first
// material released for a program becomes that program's anchor and is never disposed (its texture
// slots are nulled so canvases and GPU textures can still be freed); every later one is disposed.
//
// export function setRenderer(renderer)   the Engine installs its renderer (without one, release disposes)
// export function release(material | material[])
// export function anchorCount() -> number  anchored programs
// export function clearAnchors()           disposes every anchor (the Engine calls it on a quality change,
//                                          when the old variants can never be used again)

let renderer = null;
const anchors = new Map(); // program cacheKey -> anchoring material
const anchorMats = new Set();

export function setRenderer(r) {
  renderer = r || null;
}

// Every program a material was linked with (a material can hold several variants).
function programKeys(material) {
  if (!renderer) return [];
  const props = renderer.properties.get(material);
  const keys = props?.programs ? [...props.programs.keys()] : [];
  const cur = props?.currentProgram?.cacheKey;
  if (cur && !keys.includes(cur)) keys.push(cur);
  return keys;
}

// Drop texture references so the anchor keeps only its programs alive.
function strip(material) {
  for (const k of Object.keys(material)) {
    if (material[k]?.isTexture) material[k] = null;
  }
  const u = material.uniforms;
  if (u) for (const name of Object.keys(u)) if (u[name]?.value?.isTexture) u[name].value = null;
}

export function release(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    for (const m of material) release(m);
    return;
  }
  if (anchorMats.has(material)) return;
  const free = programKeys(material).filter((k) => !anchors.has(k));
  if (free.length) {
    for (const k of free) anchors.set(k, material);
    anchorMats.add(material);
    strip(material);
    return;
  }
  material.dispose();
}

export function anchorCount() {
  return anchors.size;
}

export function clearAnchors() {
  for (const m of anchorMats) m.dispose();
  anchors.clear();
  anchorMats.clear();
}
