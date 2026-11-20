// A run: the three cards dealt after every night held, picking and rerolling,
// and the end of the run with its Embers.
import { CARDS, CARD, RARITY } from '../data/cards.js';
import { build } from './build.js';
import { wallsMax } from './battle.js';
import { UNLOCK, LOCKED_CARDS, STARTERS } from '../data/unlocks.js';
import { UPGRADES, UPGRADE_IDS, upgradeCost } from './build.js';
import { LOCATIONS } from '../data/world.js';

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rarer cards come up more often the further the run gets.
export function rarityWeights(n) {
  return { common: Math.max(35, RARITY.common.weight - 1.4 * n), rare: RARITY.rare.weight + 0.9 * n, epic: RARITY.epic.weight + 0.5 * n };
}

// the cards this player can be dealt: everything not still locked
export const unlockedCards = (state) => CARDS.filter((c) => !LOCKED_CARDS.has(c.id) || (state.meta.unlocks?.[`card:${c.id}`] || 0) > 0);
export const unlockLevel = (state, id) => state.meta.unlocks?.[id] || 0;

const RANK = { common: 0, rare: 1, epic: 2 };

export function deal(state, salt = 0, min = state.phase === 'bonus' ? state.bonusMin : null) {
  const r = rng(state.seed ^ Math.imul(state.night, 9973) ^ Math.imul(salt + 1, 7919) ^ (min ? 0x5bd1 : 0));
  const w = { ...rarityWeights(state.night) };
  if (min) for (const k of Object.keys(w)) if (RANK[k] < RANK[min]) w[k] = 0;
  const starter = state.phase === 'starter';
  const avail = starter ? unlockedCards(state).filter((c) => STARTERS.includes(c.id)) : unlockedCards(state);
  const n = starter && unlockLevel(state, 'wider') ? 4 : 3;
  const out = [];
  for (let k = 0; k < n; k++) {
    const pool = avail.filter((c) => !out.includes(c.id));
    const total = pool.reduce((a, c) => a + w[c.rarity], 0);
    let x = r() * total;
    const c = pool.find((cc) => (x -= w[cc.rarity]) <= 0) || pool[pool.length - 1];
    out.push(c.id);
  }
  return out;
}

export const rerollCost = (state) => 10 + 3 * state.night;

export function reroll(state) {
  if (!['draft', 'starter', 'bonus'].includes(state.phase)) return { ok: false, reason: 'Nothing to reroll.' };
  if (state.rerolls > 0) state.rerolls -= 1;
  else {
    const cost = rerollCost(state);
    if (state.gold < cost) return { ok: false, reason: `A reroll costs ${cost} gold.` };
    state.gold -= cost;
  }
  state.offerSalt = (state.offerSalt || 0) + 1;
  state.offer = deal(state, state.offerSalt);
  return { ok: true };
}

export function pick(state, id) {
  if (!['draft', 'starter', 'bonus'].includes(state.phase) || !state.offer?.includes(id)) return { ok: false, reason: 'That card is not on offer.' };
  state.cards.push(id);
  state.offer = null;
  state.phase = 'day';
  state.integrity = wallsMax(state, state.night);
  return { ok: true, card: CARD[id] };
}

// Embers for a run: one for every night held, and more for every fifth.
export const embersFor = (held) => held + 2 * Math.floor(held / 5);

export function endRun(state, ev) {
  const held = state.best;
  const embers = embersFor(held);
  state.meta.embers += embers;
  const record = held > state.meta.best;
  state.meta.best = Math.max(state.meta.best, held);
  state.meta.history.unshift({ held, embers, cards: [...state.cards], kills: state.stats.kills, at: Date.now() });
  state.meta.history.length = Math.min(state.meta.history.length, 20);
  state.phase = 'over';
  state.runEnd = { held, embers, record };
  ev?.emit('attention', `The walls fell on night ${state.night}`, { cat: 'runover' });
}

// ---------- Embers between runs ----------
export function unlockCost(state, id) {
  const u = UNLOCK[id];
  return u?.costs[unlockLevel(state, id)];
}

export function buyUnlock(state, id) {
  const cost = unlockCost(state, id);
  if (cost === undefined) return { ok: false, reason: 'Already fully unlocked.' };
  if (state.meta.embers < cost) return { ok: false, reason: `Needs ${cost - state.meta.embers} more Embers.` };
  state.meta.embers -= cost;
  state.meta.unlocks ||= {};
  state.meta.unlocks[id] = unlockLevel(state, id) + 1;
  return { ok: true };
}

// A run begins with a choice of starter card.
export function beginRun(state) {
  state.phase = 'starter';
  state.offerSalt = 0;
  state.offer = deal(state);
}

// ---------- camp: Hearth upgrades for gold ----------
export function buyUpgrade(state, id) {
  if (state.phase !== 'day') return { ok: false, reason: 'Upgrades are built between nights.' };
  if (!UPGRADES[id]) return { ok: false, reason: 'There is no such building.' };
  state.upgrades ||= {};
  const lv = state.upgrades[id] || 0;
  const cost = upgradeCost(id, lv);
  if (cost === undefined) return { ok: false, reason: 'Fully built.' };
  if (state.gold < cost) return { ok: false, reason: `Needs ${cost - state.gold} more gold.` };
  state.gold -= cost;
  state.upgrades[id] = lv + 1;
  return { ok: true, level: lv + 1 };
}

export const affordableUpgrades = (state) => UPGRADE_IDS.filter((id) => {
  const c = upgradeCost(id, state.upgrades?.[id] || 0);
  return c !== undefined && c <= state.gold;
});

// ---------- camp: one expedition into the Wilds ----------
export const expeditionReady = (state, id) => {
  const l = LOCATIONS.find((x) => x.id === id);
  return !!l?.reward && l.found <= state.best && (state.rested?.[id] || 0) <= state.night;
};
export const placesReady = (state) => LOCATIONS.filter((l) => expeditionReady(state, l.id));

// What a place gives tonight, as plain data.
export function rewardOf(l, night) {
  const r = l.reward;
  return r.gold ? { ...r, gold: Math.round(r.gold[0] + r.gold[1] * night) } : r;
}

export function sendExpedition(state, id) {
  if (state.phase !== 'day') return { ok: false, reason: 'Expeditions leave between nights.' };
  if (state.expedition === state.night) return { ok: false, reason: 'One expedition each day. The next can go after the night.' };
  if (!expeditionReady(state, id)) return { ok: false, reason: 'That place is not ready.' };
  const l = LOCATIONS.find((x) => x.id === id);
  const r = rewardOf(l, state.night);
  state.expedition = state.night;
  state.rested ||= {};
  state.rested[id] = state.night + l.reward.rest;
  if (r.gold) state.gold += r.gold;
  if (r.reroll) state.rerolls += r.reroll;
  if (r.embers) state.meta.embers += r.embers;
  if (r.card) {
    state.phase = 'bonus';
    state.bonusMin = r.card;
    state.offerSalt = 0;
    state.offer = deal(state, 0, r.card);
  }
  return { ok: true, reward: r, place: l };
}
