// Shops (PURE, TECH_PLAN 5.6). Prices live on ItemDefs (a stock entry may override one).
//
//   ShopDef = { name, keeper, portrait, greeting, sellRate, stock: [{ item, when?, price? }] }
//   shopStock(shop, state = gameState) -> [{ item, price, owned }]   entries whose `when` holds
//   buy(itemId, n = 1, price)  -> { ok, message }   credits and inventory (price per unit)
//   sell(itemId, n = 1, rate)  -> { ok, message }   key items, unpriced items and worn gear can't be sold
//   sellPrice(itemId, rate)    -> credits per unit (floor(price * rate))
//   sellable(state = gameState) -> [{ item, count, price }] the Sell tab's list (rate applied by the UI)

import { ITEMS } from '../battle/data.js';
import { gameState, itemCount, addItem, removeItem, equippedCount } from './state.js';
import { testCond } from '../world/cond.js';

export const MAX_STACK = 99;
export const DEFAULT_SELL_RATE = 0.5;

const isCount = (n) => Number.isInteger(n) && n > 0;

export function priceOf(itemId) {
  return ITEMS[itemId]?.price || 0;
}

export function sellPrice(itemId, rate = DEFAULT_SELL_RATE) {
  return Math.floor(priceOf(itemId) * rate);
}

export function shopStock(shop, state = gameState) {
  const out = [];
  for (const entry of shop?.stock || []) {
    const it = ITEMS[entry.item];
    if (!it) {
      console.warn(`shop "${shop.name}": unknown item "${entry.item}"`);
      continue;
    }
    if (!testCond(entry.when, state)) continue;
    const held = state.inventory?.[entry.item] || 0;
    const worn = state === gameState ? equippedCount(entry.item) : 0;
    out.push({ item: entry.item, price: entry.price ?? it.price ?? 0, owned: held + worn });
  }
  return out;
}

export function buy(itemId, n = 1, price) {
  const it = ITEMS[itemId];
  if (!it) return { ok: false, message: 'Unknown item.' };
  if (!isCount(n)) return { ok: false, message: 'Choose how many to buy.' };
  if (it.key) return { ok: false, message: `The ${it.name} isn't for sale.` };
  const unit = price ?? it.price ?? 0;
  if (!(unit > 0)) return { ok: false, message: `The ${it.name} isn't for sale.` };
  if (itemCount(itemId) + n > MAX_STACK) return { ok: false, message: `You can't carry more than ${MAX_STACK}.` };
  const total = unit * n;
  if (gameState.credits < total) return { ok: false, message: 'Not enough credits.' };
  gameState.credits -= total;
  addItem(itemId, n);
  return { ok: true, message: n > 1 ? `Bought ${n} x ${it.name}.` : `Bought the ${it.name}.` };
}

export function sell(itemId, n = 1, rate = DEFAULT_SELL_RATE) {
  const it = ITEMS[itemId];
  if (!it) return { ok: false, message: 'Unknown item.' };
  if (!isCount(n)) return { ok: false, message: 'Choose how many to sell.' };
  if (it.key) return { ok: false, message: `The ${it.name} is too important to sell.` };
  const unit = sellPrice(itemId, rate);
  if (!(unit > 0)) return { ok: false, message: `Nobody here will buy the ${it.name}.` };
  const have = itemCount(itemId);
  if (have < n) {
    if (have === 0 && equippedCount(itemId) > 0) return { ok: false, message: `Unequip the ${it.name} first.` };
    return { ok: false, message: have ? `You only have ${have}.` : `No ${it.name} to sell.` };
  }
  removeItem(itemId, n);
  gameState.credits += unit * n;
  return { ok: true, message: n > 1 ? `Sold ${n} x ${it.name} for ${unit * n} credits.` : `Sold the ${it.name} for ${unit} credits.` };
}

export function sellable(state = gameState) {
  const out = [];
  for (const [id, count] of Object.entries(state.inventory || {})) {
    const it = ITEMS[id];
    if (!it || it.key || !(count > 0) || !(it.price > 0)) continue;
    out.push({ item: id, count, price: it.price });
  }
  return out;
}
