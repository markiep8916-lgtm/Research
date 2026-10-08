// PURE condition mini-language for maps, talk specs, triggers, zones and shops (TECH_PLAN 3.11).
// Imports nothing: content/chapters.js hands the chapter order in through setChapterOrder().
//
//   cond  := or            or := and ('|' and)*        and := unary ('&' unary)*
//   unary := '!' unary | '(' or ')' | term
//   term  := FLAG                      gameState.flags[FLAG] is truthy; FLAG = [A-Za-z0-9_:.-]+
//          | 'item:' ID                inventory count > 0, or equipped by any roster member
//          | 'party:' MEMBER           member in the active party
//          | 'leader:' MEMBER          member is the field leader
//          | 'chapter>=' ID | 'chapter<' ID     by the order given to setChapterOrder
//
// export function compileCond(src) -> (state) => bool   cached by string; throws Error('cond: ...')
// export function testCond(src, state = gameState) -> bool   undefined / '' -> true
// export function setChapterOrder(ids)
// export function condFlags(src) -> string[]          flags a condition reads (soft-lock lint)
// export function setDefaultState(state)               the state testCond reads when none is passed

let chapterOrder = [];
let defaultState = null;
const cache = new Map();

/** content/chapters.js calls this once with the chapter ids in play order. */
export function setChapterOrder(ids) {
  chapterOrder = [...ids];
}

/** The state testCond(src) reads when called without one (main.js / ExploreState pass gameState). */
export function setDefaultState(state) {
  defaultState = state;
}

const FLAG_RE = /[A-Za-z0-9_:.-]/;

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === '!' || ch === '&' || ch === '|' || ch === '(' || ch === ')') { out.push({ t: ch, at: i }); i++; continue; }
    if (src.startsWith('chapter>=', i) || src.startsWith('chapter<', i)) {
      const op = src.startsWith('chapter>=', i) ? '>=' : '<';
      i += op === '>=' ? 9 : 8;
      const s = i;
      while (i < src.length && FLAG_RE.test(src[i])) i++;
      if (i === s) throw new Error(`cond: missing chapter id after "chapter${op}" in "${src}"`);
      out.push({ t: 'chapter', op, id: src.slice(s, i), at: s });
      continue;
    }
    if (FLAG_RE.test(ch)) {
      const s = i;
      while (i < src.length && FLAG_RE.test(src[i])) i++;
      out.push({ t: 'word', v: src.slice(s, i), at: s });
      continue;
    }
    throw new Error(`cond: unexpected "${ch}" at ${i} in "${src}"`);
  }
  return out;
}

function inventoryHas(state, id) {
  if ((state.inventory?.[id] || 0) > 0) return true;
  const members = state.roster ? Object.values(state.roster) : state.party || [];
  for (const m of members) {
    const e = m && m.equip;
    if (e && (e.weapon === id || e.armor === id || e.accessory === id)) return true;
  }
  return false;
}

function chapterIndex(id, src) {
  const i = chapterOrder.indexOf(id);
  if (chapterOrder.length && i < 0) throw new Error(`cond: unknown chapter "${id}" in "${src}"`);
  return i;
}

function termFn(word, src, flags) {
  const colon = word.indexOf(':');
  const prefix = colon > 0 ? word.slice(0, colon) : '';
  const rest = colon > 0 ? word.slice(colon + 1) : '';
  if (prefix === 'item' || prefix === 'party' || prefix === 'leader') {
    if (!rest) throw new Error(`cond: empty id after "${prefix}:" in "${src}"`);
    if (prefix === 'item') return (s) => inventoryHas(s, rest);
    if (prefix === 'party') return (s) => !!(s.party || []).some((m) => m && (m.id === rest || m === rest));
    return (s) => (s.leader ?? s.party?.[0]?.id) === rest;
  }
  if (word === 'chapter') throw new Error(`cond: "chapter" needs ">=" or "<" in "${src}"`);
  flags.push(word);
  return (s) => !!(s.flags && s.flags[word]);
}

function parse(src) {
  const toks = tokenize(src);
  const flags = [];
  let p = 0;
  const peek = () => toks[p];
  const fail = (msg) => { throw new Error(`cond: ${msg} in "${src}"`); };

  function parseOr() {
    let left = parseAnd();
    while (peek() && peek().t === '|') {
      p++;
      const a = left, b = parseAnd();
      left = (s) => a(s) || b(s);
    }
    return left;
  }
  function parseAnd() {
    let left = parseUnary();
    while (peek() && peek().t === '&') {
      p++;
      const a = left, b = parseUnary();
      left = (s) => a(s) && b(s);
    }
    return left;
  }
  function parseUnary() {
    const tk = peek();
    if (!tk) fail('unexpected end');
    if (tk.t === '!') {
      p++;
      const inner = parseUnary();
      return (s) => !inner(s);
    }
    if (tk.t === '(') {
      p++;
      const inner = parseOr();
      if (!peek() || peek().t !== ')') fail('missing ")"');
      p++;
      return inner;
    }
    if (tk.t === 'chapter') {
      p++;
      const { op, id } = tk;
      chapterIndex(id, src);
      return (s) => {
        // an unknown or missing current chapter counts as the first one
        const cur = Math.max(0, chapterOrder.indexOf(s.story?.chapter));
        const want = chapterOrder.indexOf(id);
        return op === '>=' ? cur >= want : cur < want;
      };
    }
    if (tk.t === 'word') {
      p++;
      return termFn(tk.v, src, flags);
    }
    return fail(`unexpected "${tk.t}" at ${tk.at}`);
  }

  if (!toks.length) return { fn: () => true, flags };
  const fn = parseOr();
  if (p < toks.length) fail(`unexpected "${toks[p].t === 'word' ? toks[p].v : toks[p].t}" at ${toks[p].at}`);
  return { fn, flags: [...new Set(flags)] };
}

function compiled(src) {
  const key = src == null ? '' : String(src);
  let c = cache.get(key);
  if (!c) {
    c = parse(key);
    cache.set(key, c);
  }
  return c;
}

/** Compile a condition string into a predicate over a game state. Throws Error('cond: ...'). */
export function compileCond(src) {
  return compiled(src).fn;
}

/** Evaluate a condition (undefined, null or '' is true). */
export function testCond(src, state = defaultState) {
  if (src == null || src === '' || src === true) return true;
  if (src === false) return false;
  return compiled(src).fn(state || {});
}

/** Flags a condition reads (not item:, party:, leader: or chapter terms). */
export function condFlags(src) {
  if (src == null || src === '') return [];
  return [...compiled(src).flags];
}
