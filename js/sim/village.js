// The village: restoring and upgrading buildings, the builders, resources,
// villagers and their jobs, barricades and the early goals.
import { BUILDINGS, RESOURCES, QUEUE_MAX, VILLAGERS, level, wallStats } from '../data/village.js';
import { canBlock } from './web.js';

// ---------- resources ----------
export const available = (state, r) => Math.max(0, state[r] - (state.reserved[r] || 0));
// what is still missing to pay a cost: [{ r, need }]
export function missing(state, cost = {}) {
  return RESOURCES.filter((r) => cost[r]).map((r) => ({ r, need: Math.ceil(cost[r] - available(state, r)) })).filter((m) => m.need > 0);
}

// ---------- levels, costs, builders ----------
export function levelCap(state, bid) {
  if (bid === 'townhall') return BUILDINGS.townhall.max;
  return Math.min(BUILDINGS[bid].max, level('townhall', state.buildings.townhall.level).cap);
}
export const upgradeCost = (bid, L) => BUILDINGS[bid].levels[L + 1]?.cost || {};
export const upgradeTime = (bid, L) => BUILDINGS[bid].levels[L + 1]?.time || 0;
export const builders = (state) => level('townhall', state.buildings.townhall.level).builders;

export function upgradeBlocker(state, bid) {
  const def = BUILDINGS[bid];
  const b = state.buildings[bid];
  if (b.level >= def.max) return 'Already at its highest level.';
  if (state.queue.some((q) => q.bid === bid)) return 'Already being built, or waiting for a builder.';
  if (b.level >= levelCap(state, bid)) return `Raise the Town Hall first. It lets buildings grow to level ${levelCap(state, bid)}.`;
  if (state.queue.length >= QUEUE_MAX) return 'The builders have enough to do: four jobs at most, building or waiting.';
  const m = missing(state, upgradeCost(bid, b.level));
  if (m.length) return `Needs ${m[0].need} more ${m[0].r}.`;
  return null;
}

export function queueUpgrade(state, bid) {
  const block = upgradeBlocker(state, bid);
  if (block) return { ok: false, reason: block };
  const b = state.buildings[bid];
  const cost = { ...upgradeCost(bid, b.level) };
  for (const r of RESOURCES) state.reserved[r] = (state.reserved[r] || 0) + (cost[r] || 0);
  state.queue.push({ id: `${bid}-${b.level + 1}`, bid, toLevel: b.level + 1, cost, duration: upgradeTime(bid, b.level), progress: 0 });
  return { ok: true };
}

const unreserve = (state, cost) => { for (const r of RESOURCES) state.reserved[r] = Math.max(0, (state.reserved[r] || 0) - (cost[r] || 0)); };

export function cancelUpgrade(state, qid) {
  const i = state.queue.findIndex((q) => q.id === qid);
  if (i < 0) return { ok: false, reason: 'Nothing to cancel.' };
  const [q] = state.queue.splice(i, 1);
  unreserve(state, q.cost);
  return { ok: true };
}

function finish(state, q, ev) {
  for (const r of RESOURCES) state[r] -= q.cost[r] || 0;
  unreserve(state, q.cost);
  const b = state.buildings[q.bid];
  const before = q.bid === 'walls' ? wallStats(b.level).integrity : 0;
  b.level = q.toLevel;
  if (q.bid === 'walls') state.integrity = state.phase === 'night' ? state.integrity + wallStats(b.level).integrity - before : wallStats(b.level).integrity;
  assignIdle(state);
  state.objectives.flags.lastBuilt = q.bid;
  ev?.emit('done', `${BUILDINGS[q.bid].name}: ${b.level === 1 && BUILDINGS[q.bid].start === 0 ? 'restored' : `level ${b.level}`}`, { cat: 'upgrade', building: q.bid, level: b.level, gain: level(q.bid, b.level).gain });
  ev?.sound?.('upgrade');
  if (ev) ev.changed = true;
}

// Advance the builders by dt seconds. The first `builders` jobs in the queue are
// worked on at the same time; the rest wait. Safe for long offline spans.
export function advanceQueue(state, dt, ev) {
  let left = dt;
  while (left > 1e-9 && state.queue.length) {
    const active = state.queue.slice(0, builders(state));
    const step = Math.min(left, ...active.map((q) => q.duration - q.progress));
    for (const q of active) q.progress += step;
    left -= step;
    for (const q of active) {
      if (q.progress < q.duration - 1e-9) continue;
      state.queue.splice(state.queue.indexOf(q), 1);
      finish(state, q, ev);
    }
  }
}

// ---------- villagers and jobs ----------
// Jobs are named after the building: 'archery' (on the tower), 'lumber', 'quarry', or 'idle'.
export const JOB_BUILDINGS = ['archery', 'lumber', 'quarry'];
export const slots = (state, bid) => level(bid, state.buildings[bid].level).slots || 0;
export const workers = (state, bid) => state.villagers.filter((v) => v.job === bid).length;
export const housing = (state) => level('tavern', state.buildings.tavern.level).housing;

// Idle villagers take any free post: the tower first, then timber, then stone.
export function assignIdle(state) {
  for (const bid of JOB_BUILDINGS) {
    for (const v of state.villagers) if (v.job === 'idle' && workers(state, bid) < slots(state, bid)) v.job = bid;
  }
  // a building that lost slots sends the extra workers home
  for (const bid of JOB_BUILDINGS) {
    let extra = workers(state, bid) - slots(state, bid);
    for (const v of [...state.villagers].reverse()) if (extra > 0 && v.job === bid) { v.job = 'idle'; extra -= 1; }
  }
}

// Post one more villager to a building, taking an idle one first, otherwise
// one from the least urgent other job.
export function postWorker(state, bid) {
  if (workers(state, bid) >= slots(state, bid)) return { ok: false, reason: 'No room for another.' };
  const order = ['idle', ...[...JOB_BUILDINGS].reverse()].filter((j) => j !== bid);
  for (const j of order) {
    const v = state.villagers.find((x) => x.job === j);
    if (v) { v.job = bid; return { ok: true }; }
  }
  return { ok: false, reason: 'Nobody to send. The Tavern brings more villagers.' };
}

export function unpostWorker(state, bid) {
  const v = [...state.villagers].reverse().find((x) => x.job === bid);
  if (!v) return { ok: false, reason: 'Nobody works here.' };
  v.job = 'idle';
  return { ok: true };
}

// After a night held, a traveller settles if the Tavern has a bed.
export function villagerArrives(state, ev) {
  if (state.villagers.length >= housing(state)) return false;
  const used = new Set(state.villagers.map((v) => v.name));
  const name = VILLAGERS.names.find((n) => !used.has(n)) || `Traveller ${state.villagers.length + 1}`;
  state.villagers.push({ id: `v${state.villagers.length + 1}`, name, job: 'idle' });
  assignIdle(state);
  ev?.emit('done', `${name} settles in ${state.village.name}`, { cat: 'villager' });
  return true;
}

// Timber and stone from the workers, per second of time.
export function production(state) {
  const out = {};
  for (const bid of ['lumber', 'quarry']) {
    const v = level(bid, state.buildings[bid].level);
    out[BUILDINGS[bid].makes] = (Math.min(workers(state, bid), v.slots || 0) * (v.per || 0)) / 60;
  }
  return out;
}
export function produce(state, dt) {
  const p = production(state);
  for (const [r, perSec] of Object.entries(p)) state[r] += perSec * dt;
}

// ---------- barricades ----------
export const barricadeMax = (state) => level('workshop', state.buildings.workshop.level).barricades;

export function barricadeBlocker(state, key) {
  if (state.phase === 'night') return 'Barricades can only be moved by day.';
  if (!state.barricades.includes(key) && barricadeMax(state) === 0) return 'Restore the Workshop to build barricades.';
  const r = canBlock(state.barricades, key, barricadeMax(state));
  return r.ok ? null : r.reason;
}

export function placeBarricade(state, key) {
  const block = barricadeBlocker(state, key);
  if (block) return { ok: false, reason: block };
  state.barricades.push(key);
  state.objectives.flags.barricade = true;
  return { ok: true };
}

export function removeBarricade(state, key) {
  if (state.phase === 'night') return { ok: false, reason: 'Barricades can only be moved by day.' };
  const i = state.barricades.indexOf(key);
  if (i < 0) return { ok: false, reason: 'There is no barricade there.' };
  state.barricades.splice(i, 1);
  return { ok: true };
}

export function setTargeting(state, mode) {
  state.buildings.archery.target = mode;
  return { ok: true };
}

// ---------- goals: they walk the player through bringing the village back ----------
const lv = (s, b) => s.buildings[b].level;
export const OBJECTIVES = [
  { id: 'select', title: 'Look into the glass', guide: 'Click the paper tag of a burrow under the reading glass to see what lives there.', check: (s) => s.objectives.flags.selected },
  { id: 'night1', title: 'Survive the first night', guide: 'When the candle burns down, goblins come from the Hollow Gate. Wren shoots from the tower stump on her own.', check: (s) => s.best >= 1, reward: { gold: 20 } },
  { id: 'lumber1', title: 'Restore the Lumber Camp', guide: 'In Hearth, click the Lumber Camp. Bram will cut timber there.', check: (s) => lv(s, 'lumber') >= 1, reward: { timber: 20 } },
  { id: 'tavern1', title: 'Restore the Tavern', guide: 'With beds to spare, a traveller settles after every night you hold.', check: (s) => lv(s, 'tavern') >= 1, reward: { gold: 30 } },
  { id: 'workshop1', title: 'Restore the Workshop', guide: 'The Workshop builds barricades for the forest paths.', check: (s) => lv(s, 'workshop') >= 1, reward: { gold: 30 } },
  { id: 'barricade', title: 'Block a forest path', guide: 'Click a path under the reading glass. The creatures must take the long way round, past the archers.', check: (s) => s.objectives.flags.barricade, reward: { gold: 20 } },
  { id: 'quarry1', title: 'Restore the Quarry', guide: 'Stone for walls and the bigger buildings.', check: (s) => lv(s, 'quarry') >= 1, reward: { stone: 20 } },
  { id: 'townhall1', title: 'Restore the Town Hall', guide: 'Buildings can only grow as far as the Town Hall allows.', check: (s) => lv(s, 'townhall') >= 1, reward: { gold: 50 } },
  { id: 'archery2', title: 'Raise the Great Tower', guide: 'A lookout on the tower: more reach and room for a second archer.', check: (s) => lv(s, 'archery') >= 2, reward: { gold: 40 } },
  { id: 'night5', title: 'Hold until night 5', guide: 'On night 5 the Mossy Cave in the west opens and creatures come from two sides.', check: (s) => s.best >= 5, reward: { gold: 60 } },
  { id: 'night10', title: 'Hold until night 10', guide: 'Use Repeat to hold a night you can win while the builders work.', check: (s) => s.best >= 10, reward: { gold: 120 } },
];
export const rewardText = (rw = {}) => Object.entries(rw).map(([r, n]) => `+${n} ${r}`).join(', ');

export function checkObjectives(state, ev) {
  for (const o of OBJECTIVES) {
    if (state.objectives.claimed.includes(o.id) || !o.check(state)) continue;
    state.objectives.claimed.push(o.id);
    for (const [r, n] of Object.entries(o.reward || {})) { state[r] += n; if (r === 'gold') state.stats.goldEarned += n; }
    ev?.emit('done', `Done: ${o.title}${o.reward ? `. ${rewardText(o.reward)}` : ''}`, { cat: 'objective' });
    if (ev) ev.changed = true;
  }
}
