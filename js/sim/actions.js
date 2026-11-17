// Player actions. Each validates first and returns { ok } or { ok:false, reason }
// so the interface can always explain why something is unavailable.
import { BUILDINGS, QUEUE_EXTRA, UPGRADE_COST, UPGRADE_TIME, HQ_UPGRADES, RESOURCE_INFO } from '../data/buildings.js';
import { TECHS, RETRAIN_COST } from '../data/techs.js';
import { PROFESSIONS } from '../data/people.js';
import {
  makeBuilding, getColony, buildingAt, plotInGrid, colonistsAt, refreshCandidates,
} from './state.js';
import {
  capacities, housing, available, isBuilt, POP_LIMIT, RECRUIT_COST, RECRUIT_TIME, SUPPORT_MAX,
} from './economy.js';

export function missingFor(colony, cost) {
  const miss = [];
  for (const k in cost) {
    const a = available(colony, k);
    if (a + 1e-9 < cost[k]) miss.push({ res: k, need: cost[k], have: a, short: cost[k] - a });
  }
  return miss;
}

export function describeMissing(miss) {
  return `Needs ${miss.map((m) => `${Math.ceil(m.short)} more ${RESOURCE_INFO[m.res].name}`).join(' and ')}.`;
}

function reserve(colony, cost) {
  for (const k in cost) colony.reserved[k] = (colony.reserved[k] || 0) + cost[k];
}
function unreserve(colony, cost) {
  for (const k in cost) colony.reserved[k] = Math.max(0, (colony.reserved[k] || 0) - cost[k]);
}

export function buildCost(type) {
  return { ...BUILDINGS[type].cost };
}

export function upgradeCost(b) {
  if (b.type === 'hq') return { ...HQ_UPGRADES[b.level + 1]?.cost };
  const base = BUILDINGS[b.type].cost;
  const out = {};
  for (const k in base) out[k] = Math.ceil(base[k] * UPGRADE_COST ** b.level);
  return out;
}

export function upgradeTime(b) {
  if (b.type === 'hq') return HQ_UPGRADES[b.level + 1]?.time || 0;
  return BUILDINGS[b.type].time * UPGRADE_TIME ** b.level;
}

export function queueFull(colony) {
  return colony.queue.length >= 1 + QUEUE_EXTRA;
}

export function buildBlocker(state, colony, type) {
  const def = BUILDINGS[type];
  if (!def) return 'Unknown building.';
  if (!def.buildable) return def.future || 'Cannot be constructed.';
  if (def.requires && !state.research.done.includes(def.requires)) return `Requires ${TECHS[def.requires].name} research.`;
  if (queueFull(colony)) return 'The construction queue is full (one active and four waiting).';
  const miss = missingFor(colony, def.cost);
  if (miss.length) return describeMissing(miss);
  return null;
}

export function placeBuilding(state, colonyId, type, gx, gz, rot = 0) {
  const colony = getColony(state, colonyId);
  const block = buildBlocker(state, colony, type);
  if (block) return { ok: false, reason: block };
  if (!plotInGrid(colony, gx, gz)) return { ok: false, reason: 'That spot is outside the usable plots.' };
  if (buildingAt(colony, gx, gz)) return { ok: false, reason: 'That plot is occupied.' };
  const cost = buildCost(type);
  const b = makeBuilding(state, type, gx, gz, false);
  b.rot = rot;
  colony.buildings.push(b);
  reserve(colony, cost);
  colony.queue.push({ id: `q${b.id}`, kind: 'build', bid: b.id, type, cost, duration: BUILDINGS[type].time, progress: 0, toLevel: 1 });
  return { ok: true, building: b };
}

export function upgradeBlocker(state, colony, b) {
  const def = BUILDINGS[b.type];
  if (!isBuilt(b)) return 'Still under construction.';
  if (b.level >= def.maxLevel) return 'Already at the highest level.';
  if (colony.queue.some((q) => q.bid === b.id)) return 'An upgrade is already planned.';
  if (b.type === 'hq') {
    const next = HQ_UPGRADES[b.level + 1];
    if (!state.research.done.includes(next.requires)) return `Requires ${TECHS[next.requires].name} research (${TECHS[next.requires].future}).`;
  }
  if (queueFull(colony)) return 'The construction queue is full (one active and four waiting).';
  const miss = missingFor(colony, upgradeCost(b));
  if (miss.length) return describeMissing(miss);
  return null;
}

export function upgradeBuilding(state, colonyId, bid) {
  const colony = getColony(state, colonyId);
  const b = colony.buildings.find((x) => x.id === bid);
  if (!b) return { ok: false, reason: 'Building not found.' };
  const block = upgradeBlocker(state, colony, b);
  if (block) return { ok: false, reason: block };
  const cost = upgradeCost(b);
  reserve(colony, cost);
  b.upgrading = true;
  colony.queue.push({ id: `q${b.id}-${b.level + 1}`, kind: 'upgrade', bid: b.id, type: b.type, cost, duration: upgradeTime(b), progress: 0, toLevel: b.level + 1 });
  return { ok: true };
}

export function cancelQueueItem(state, colonyId, qid) {
  const colony = getColony(state, colonyId);
  const idx = colony.queue.findIndex((q) => q.id === qid);
  if (idx < 0) return { ok: false, reason: 'Nothing to cancel.' };
  const [item] = colony.queue.splice(idx, 1);
  unreserve(colony, item.cost);
  const b = colony.buildings.find((x) => x.id === item.bid);
  if (item.kind === 'build') {
    colony.buildings = colony.buildings.filter((x) => x.id !== item.bid);
    for (const c of Object.values(state.colonists)) if (c.assign?.bid === item.bid) c.assign = null;
  } else if (b) delete b.upgrading;
  return { ok: true };
}

export function moveBuilding(state, colonyId, bid, gx, gz) {
  const colony = getColony(state, colonyId);
  const b = colony.buildings.find((x) => x.id === bid);
  if (!b) return { ok: false, reason: 'Building not found.' };
  if (b.type === 'hq') return { ok: false, reason: 'Headquarters stay in their founding position.' };
  if (!plotInGrid(colony, gx, gz)) return { ok: false, reason: 'That spot is outside the usable plots.' };
  const other = buildingAt(colony, gx, gz);
  if (other && other.id !== b.id) return { ok: false, reason: 'That plot is occupied.' };
  b.gx = gx; b.gz = gz;
  return { ok: true };
}

export function rotateBuilding(state, colonyId, bid) {
  const colony = getColony(state, colonyId);
  const b = colony.buildings.find((x) => x.id === bid);
  if (!b) return { ok: false };
  b.rot = ((b.rot || 0) + 1) % 4;
  return { ok: true };
}

export function demolishPreview(state, colonyId, bid) {
  const colony = getColony(state, colonyId);
  const b = colony.buildings.find((x) => x.id === bid);
  const res = { refund: Math.floor((b?.invested || 0) / 2), blockers: [], effects: [], overflow: [] };
  if (!b) { res.blockers.push('Building not found.'); return res; }
  if (b.type === 'hq') res.blockers.push('A colony always keeps its headquarters.');
  if (!isBuilt(b) || b.upgrading) res.blockers.push('Cancel its construction work in the queue first.');
  const pop = colonistsAt(state, colony.id).length;
  const hNow = housing(colony);
  const hAfter = housing(colony, b.id);
  if (hAfter < hNow) {
    res.effects.push(`Housing ${hNow} → ${hAfter}`);
    if (hAfter < pop) res.blockers.push(`${pop} residents would be left with only ${hAfter} homes.`);
  }
  const capNow = capacities(colony);
  const capAfter = capacities(colony, b.id);
  for (const k of ['metal', 'food', 'fuel']) {
    if (capAfter[k] < capNow[k]) {
      res.effects.push(`${RESOURCE_INFO[k].name} storage ${capNow[k]} → ${capAfter[k]}`);
      const held = colony.inv[k];
      if (held > capAfter[k] + 1e-9) {
        res.blockers.push(`${Math.ceil(held - capAfter[k])} ${RESOURCE_INFO[k].name} would not fit afterwards.`);
        res.overflow.push({ res: k, amount: Math.ceil(held - capAfter[k]), discardable: Math.floor(available(colony, k)) });
      }
    }
  }
  const def = BUILDINGS[b.type];
  if (def.powerSupply) res.effects.push(`Power supply −${def.powerSupply * 1.25 ** (b.level - 1)}`);
  if (def.output) res.effects.push(`Stops its ${Object.keys(def.output).map((k) => RESOURCE_INFO[k].name).join(' and ')} production`);
  // Refund that would not fit
  const free = Math.max(0, capAfter.metal - colony.inv.metal);
  if (res.refund > free) res.effects.push(`Only ${Math.floor(free)} of the ${res.refund} refunded Metal fits in storage`);
  return res;
}

export function demolish(state, colonyId, bid) {
  const colony = getColony(state, colonyId);
  const pv = demolishPreview(state, colonyId, bid);
  if (pv.blockers.length) return { ok: false, reason: pv.blockers.join(' ') };
  colony.buildings = colony.buildings.filter((x) => x.id !== bid);
  for (const c of Object.values(state.colonists)) if (c.assign?.bid === bid) c.assign = null;
  const cap = capacities(colony);
  colony.inv.metal = Math.min(cap.metal, colony.inv.metal + pv.refund);
  delete colony.runtime[bid];
  return { ok: true };
}

export function discardGoods(state, colonyId, res, amount) {
  const colony = getColony(state, colonyId);
  const a = Math.min(amount, available(colony, res));
  if (a <= 0) return { ok: false, reason: 'Nothing available to discard.' };
  colony.inv[res] -= a;
  return { ok: true, amount: a };
}

export function setEnabled(state, colonyId, bid, enabled) {
  const b = getColony(state, colonyId).buildings.find((x) => x.id === bid);
  if (!b) return { ok: false };
  b.enabled = enabled;
  return { ok: true };
}

export function setPriority(state, colonyId, bid, priority) {
  const b = getColony(state, colonyId).buildings.find((x) => x.id === bid);
  if (!b) return { ok: false };
  b.priority = priority;
  return { ok: true };
}

export function setReliefMode(state, colonyId, mode) {
  getColony(state, colonyId).reliefMode = mode === 'food' ? 'food' : 'metal';
  return { ok: true };
}

// --- colonists ---

export function assignBlocker(state, c, target) {
  if (!c) return 'Colonist not found.';
  if (c.away) return `${c.name} is away on a mission.`;
  if (!target) return null;
  const colony = getColony(state, c.colonyId);
  if (target.kind === 'support') {
    if (c.profession !== 'engineer') return 'Only Engineers can support construction.';
    const n = colonistsAt(state, colony.id).filter((x) => x.assign?.kind === 'support' && x.id !== c.id).length;
    if (n >= SUPPORT_MAX) return `At most ${SUPPORT_MAX} Engineers can support construction.`;
    return null;
  }
  const b = colony.buildings.find((x) => x.id === target.bid);
  if (!b) return 'That building is not in this colony.';
  if (!BUILDINGS[b.type].staffed) return `${BUILDINGS[b.type].name} has no job slot.`;
  return null;
}

// Returns who would lose their job: used for the assignment preview.
export function assignPreview(state, c, target) {
  const out = { vacates: null, displaces: null };
  if (c.assign?.kind === 'building') out.vacates = c.assign.bid;
  if (target?.kind === 'building') {
    const cur = Object.values(state.colonists).find((x) => x.id !== c.id && x.assign?.kind === 'building' && x.assign.bid === target.bid);
    if (cur) out.displaces = cur;
  }
  return out;
}

export function assignColonist(state, colonistId, target) {
  const c = state.colonists[colonistId];
  const block = assignBlocker(state, c, target);
  if (block) return { ok: false, reason: block };
  if (target?.kind === 'building') {
    for (const x of Object.values(state.colonists)) {
      if (x.id !== c.id && x.assign?.kind === 'building' && x.assign.bid === target.bid) x.assign = null;
    }
  }
  c.assign = target ? { ...target } : null;
  return { ok: true };
}

export function retrainBlocker(state, c, prof) {
  if (!PROFESSIONS[prof]) return 'Unknown profession.';
  if (c.profession === prof) return 'Already that profession.';
  if (state.research.bank + 1e-9 < RETRAIN_COST) return `Needs ${RETRAIN_COST} banked Research (have ${Math.floor(state.research.bank)}).`;
  return null;
}

export function retrain(state, colonistId, prof) {
  const c = state.colonists[colonistId];
  const block = retrainBlocker(state, c, prof);
  if (block) return { ok: false, reason: block };
  state.research.bank -= RETRAIN_COST;
  c.profession = prof;
  if (c.assign?.kind === 'support' && prof !== 'engineer') c.assign = null;
  return { ok: true };
}

export function rename(state, what, id, name) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!clean) return { ok: false, reason: 'Names cannot be empty.' };
  if (what === 'civ') state.civ.name = clean;
  if (what === 'colony') getColony(state, id).name = clean;
  if (what === 'colonist') state.colonists[id].name = clean;
  return { ok: true };
}

// --- recruitment ---

export function recruitBlocker(state, colony) {
  const pop = colonistsAt(state, colony.id).length;
  if (colony.recruit.active) return 'Already welcoming a recruit. One at a time.';
  if (pop >= POP_LIMIT) return `This colony has reached its population limit of ${POP_LIMIT}.`;
  if (pop >= housing(colony)) return 'No free housing. Build or upgrade a Habitat.';
  if (colony.foodShort) return 'Recruitment is paused while the colony is short of Food.';
  const miss = missingFor(colony, RECRUIT_COST);
  if (miss.length) return describeMissing(miss);
  return null;
}

export function recruitDuration(state) {
  return RECRUIT_TIME * (state.research.done.includes('habitat_comfort') ? 0.75 : 1);
}

export function startRecruit(state, colonyId, candidateId) {
  const colony = getColony(state, colonyId);
  const block = recruitBlocker(state, colony);
  if (block) return { ok: false, reason: block };
  const idx = colony.recruit.candidates.findIndex((c) => c.id === candidateId);
  if (idx < 0) return { ok: false, reason: 'That candidate is no longer available.' };
  const [cand] = colony.recruit.candidates.splice(idx, 1);
  reserve(colony, RECRUIT_COST);
  colony.recruit.active = { candidate: cand, cost: { ...RECRUIT_COST }, progress: 0, duration: recruitDuration(state), status: 'travelling' };
  return { ok: true };
}

export function cancelRecruit(state, colonyId) {
  const colony = getColony(state, colonyId);
  const a = colony.recruit.active;
  if (!a) return { ok: false, reason: 'No recruitment in progress.' };
  unreserve(colony, a.cost);
  colony.recruit.candidates.push(a.candidate);
  colony.recruit.active = null;
  return { ok: true };
}

export function refreshRecruits(state, colonyId) {
  const colony = getColony(state, colonyId);
  if (state.time < colony.recruit.refreshAt) return { ok: false, reason: 'A fresh list arrives with the next transmission.', wait: colony.recruit.refreshAt - state.time };
  refreshCandidates(state, colony, true);
  return { ok: true };
}
