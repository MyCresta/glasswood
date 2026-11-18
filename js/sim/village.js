// Building upgrades, the build queue and early objectives.
import { BUILDINGS, UPGRADES, QUEUE_MAX, wallStats } from '../data/village.js';
import { availableGold } from './state.js';

export function levelCap(state, bid) {
  if (bid === 'townhall') return BUILDINGS.townhall.max;
  return Math.min(BUILDINGS[bid].max, state.buildings.townhall.level * 2);
}

export function upgradeCost(bid, level) {
  const u = UPGRADES[bid];
  return typeof u.cost === 'function' ? u.cost(level) : u.cost[level - 1];
}

export function upgradeTime(bid, level) {
  return UPGRADES[bid].time(level);
}

export function upgradeBlocker(state, bid) {
  const def = BUILDINGS[bid];
  const b = state.buildings[bid];
  if (!def.upgradable) return def.later || 'This building cannot be improved yet.';
  if (b.level >= def.max) return 'Already at its highest level.';
  if (state.queue.some((q) => q.bid === bid)) return 'An upgrade is already under way or waiting.';
  const cap = levelCap(state, bid);
  if (b.level >= cap) return `Raise the Town Hall to level ${Math.ceil((b.level + 1) / 2)} first. Each Town Hall level allows two more levels here.`;
  if (state.queue.length >= QUEUE_MAX) return 'The builders are busy: one upgrade at a time with three more waiting.';
  const cost = upgradeCost(bid, b.level);
  const have = availableGold(state);
  if (have + 1e-9 < cost) return `Needs ${Math.ceil(cost - have)} more gold.`;
  return null;
}

export function queueUpgrade(state, bid) {
  const block = upgradeBlocker(state, bid);
  if (block) return { ok: false, reason: block };
  const b = state.buildings[bid];
  const cost = upgradeCost(bid, b.level);
  state.reserved += cost;
  state.queue.push({ id: `${bid}-${b.level + 1}`, bid, toLevel: b.level + 1, cost, duration: upgradeTime(bid, b.level), progress: 0 });
  return { ok: true };
}

export function cancelUpgrade(state, qid) {
  const i = state.queue.findIndex((q) => q.id === qid);
  if (i < 0) return { ok: false, reason: 'Nothing to cancel.' };
  const [q] = state.queue.splice(i, 1);
  state.reserved = Math.max(0, state.reserved - q.cost);
  return { ok: true };
}

// Advance the build queue by dt seconds; returns leftover-safe for long offline spans.
export function advanceQueue(state, dt, ev) {
  let left = dt;
  while (left > 0 && state.queue.length) {
    const q = state.queue[0];
    const need = q.duration - q.progress;
    if (need > left) { q.progress += left; return; }
    left -= need;
    state.queue.shift();
    state.gold -= q.cost;
    state.reserved = Math.max(0, state.reserved - q.cost);
    const b = state.buildings[q.bid];
    const before = q.bid === 'walls' ? wallStats(b.level).integrity : 0;
    b.level = q.toLevel;
    if (q.bid === 'walls' && state.phase === 'night') state.integrity += wallStats(b.level).integrity - before;
    else if (q.bid === 'walls') state.integrity = wallStats(b.level).integrity;
    ev?.emit('done', `${BUILDINGS[q.bid].name} reached level ${b.level}.`, { cat: 'upgrade', building: q.bid });
    ev?.sound?.('upgrade');
    if (ev) ev.changed = true;
  }
}

export function setTargeting(state, mode) {
  state.buildings.archery.target = mode;
  return { ok: true };
}

export const OBJECTIVES = [
  { id: 'select', title: 'Look around the village', guide: 'Select a building in the scene, or press Tab and Enter, to see what it does.', check: (s) => s.objectives.flags.selected },
  { id: 'night1', title: 'Survive the first night', guide: 'When the day ends, goblins come from the Hollow Gate in the north. The view zooms out to the battlefield and the tower’s archers fight on their own.', check: (s) => s.best >= 1, reward: 20 },
  { id: 'archery2', title: 'Train the archers', guide: 'Select the Great Tower in the middle of the village and upgrade it. Each level adds 30% damage and a little range.', check: (s) => s.buildings.archery.level >= 2, reward: 30 },
  { id: 'walls2', title: 'Strengthen the walls', guide: 'Upgrade the Walls & Gate for more integrity and armour against every hit.', check: (s) => s.buildings.walls.level >= 2, reward: 30 },
  { id: 'townhall2', title: 'Grow the Town Hall', guide: 'Buildings can reach twice the Town Hall’s level. Raise it to level 2 to keep improving.', check: (s) => s.buildings.townhall.level >= 2, reward: 60 },
  { id: 'night5', title: 'Hold until night 5', guide: 'On night 5 the Mossy Cave in the west opens and enemies come from two sides.', check: (s) => s.best >= 5, reward: 60 },
  { id: 'night10', title: 'Hold until night 10', guide: 'Keep raising the archers and walls. Use Hold to repeat a night you can win while you save up.', check: (s) => s.best >= 10, reward: 120 },
  { id: 'maze', title: 'Build the first barricade', guide: 'Mazes arrive with the Workshop in the next update: barricades will make enemies take the long way round.', check: () => false, future: true },
];

export function checkObjectives(state, ev) {
  for (const o of OBJECTIVES) {
    if (o.future || state.objectives.claimed.includes(o.id) || !o.check(state)) continue;
    state.objectives.claimed.push(o.id);
    if (o.reward) {
      state.gold += o.reward;
      state.stats.goldEarned += o.reward;
    }
    ev?.emit('done', `Objective complete: ${o.title}.${o.reward ? ` +${o.reward} gold.` : ''}`, { cat: 'objective' });
    if (ev) ev.changed = true;
  }
}
