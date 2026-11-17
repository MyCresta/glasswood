// Colony economy: a pure snapshot of rates/power/bonuses, and the tick that
// advances one colony by dt seconds. The same code runs for visible play and
// offline catch-up, so both follow identical rules.
import {
  BUILDINGS, POWER_CATEGORY_ORDER, LEVEL_OUTPUT, LEVEL_DEMAND, LEVEL_STORAGE,
} from '../data/buildings.js';
import { TECHS } from '../data/techs.js';
import { PROFESSIONS, TRAITS } from '../data/people.js';
import { colonistsAt, makeColonist, uid } from './state.js';

export const FOOD_PER_COLONIST = 0.1; // per minute
export const RELIEF = { metal: 2, food: 1 }; // per minute per idle colonist
export const XP_PER_MIN = 4;
export const POP_LIMIT = 20;
export const RECRUIT_TIME = 180;
export const RECRUIT_COST = { metal: 50, food: 20 };
export const SUPPORT_MAX = 2;

export const levelMult = (L) => LEVEL_OUTPUT ** Math.max(0, L - 1);
export const demandMult = (L) => LEVEL_DEMAND ** Math.max(0, L - 1);

export function isBuilt(b) { return b.level >= 1; }

export function capacities(colony, excludeId = null) {
  const cap = { metal: 0, food: 0, fuel: 0, samples: 0 };
  for (const b of colony.buildings) {
    if (b.id === excludeId || !isBuilt(b)) continue;
    const def = BUILDINGS[b.type];
    if (!def.storage) continue;
    const m = b.type === 'hq' ? 1 : LEVEL_STORAGE ** (b.level - 1);
    for (const k in def.storage) cap[k] += def.storage[k] * m;
  }
  for (const k in cap) cap[k] = Math.floor(cap[k]);
  return cap;
}

export function housing(colony, excludeId = null) {
  let h = 0;
  for (const b of colony.buildings) {
    if (b.id === excludeId || !isBuilt(b)) continue;
    if (b.type === 'hq') h += 2;
    if (b.type === 'habitat') h += 4 + (b.level - 1);
  }
  return h;
}

export function researchBonus(state, type) {
  let s = 0;
  for (const id of state.research.done) {
    const bn = TECHS[id]?.bonus;
    if (bn && bn.building === type) s += bn.amount;
  }
  return s;
}

export function skillLevel(c, prof = c.profession) {
  return c.skills[prof]?.level || 1;
}

export function wellbeing(colony, c, time = 0) {
  if (c.recoveringUntil && c.recoveringUntil > time) return 'recovering';
  if (colony?.foodShort) return 'short of food';
  return 'comfortable';
}

// Staffing bonus for a colonist working at a building, with an itemised breakdown.
export function workerBonus(colony, c, type, time = 0) {
  const parts = [];
  if (!c) return { total: 0, parts };
  let b = 0.5;
  parts.push(['Assigned worker', 0.5]);
  const match = PROFESSIONS[c.profession]?.building === type;
  if (match) {
    const lv = Math.min(20, skillLevel(c));
    const m = 0.1 + 0.02 * (lv - 1);
    b += m;
    parts.push([`Matching profession (${PROFESSIONS[c.profession].name} L${lv})`, m]);
  }
  if (c.traits.includes('diligent')) { b += 0.05; parts.push(['Diligent', 0.05]); }
  if (type === 'lab' && c.traits.includes('methodical')) { b += 0.05; parts.push(['Methodical', 0.05]); }
  if (c.traits.includes('homebody')) { const x = b * 0.1; b += x; parts.push(['Homebody (+10% staffing bonus)', x]); }
  const wb = wellbeing(colony, c, time);
  if (wb !== 'comfortable') { const x = -b / 2; b += x; parts.push([`Halved: ${wb}`, x]); }
  return { total: b, parts };
}

function categoryRank(type) {
  return POWER_CATEGORY_ORDER[type] ?? 4;
}
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

// Full read-only snapshot used by both the tick and the interface.
export function computeColony(state, colony) {
  const people = colonistsAt(state, colony.id);
  const workerOf = {};
  let support = [];
  const idle = [];
  for (const c of people) {
    if (c.assign?.kind === 'building') workerOf[c.assign.bid] = c;
    else if (c.assign?.kind === 'support') support.push(c);
    else idle.push(c);
  }
  support = support.slice(0, SUPPORT_MAX);

  const cap = capacities(colony);
  const house = housing(colony);

  // Power
  let supply = 0;
  const supplyParts = [];
  for (const b of colony.buildings) {
    if (!isBuilt(b)) continue;
    if (b.type === 'hq') { supply += 2; supplyParts.push([b.id, 2]); }
    if (b.type === 'solar' && b.enabled) { const s = 6 * levelMult(b.level); supply += s; supplyParts.push([b.id, s]); }
  }
  const consumers = colony.buildings
    .filter((b) => isBuilt(b) && BUILDINGS[b.type].powerUse && b.enabled)
    .map((b) => {
      const w = workerOf[b.id];
      let d = BUILDINGS[b.type].powerUse * demandMult(b.level);
      if (w?.traits.includes('efficient')) d *= 0.95;
      return { b, d };
    })
    .sort((x, y) => (PRIORITY_RANK[x.b.priority] - PRIORITY_RANK[y.b.priority])
      || (categoryRank(x.b.type) - categoryRank(y.b.type))
      || (x.b.gz - y.b.gz) || (x.b.gx - y.b.gx));
  let left = supply;
  let demand = 0;
  let shortfall = 0;
  const powered = {};
  for (const { b, d } of consumers) {
    demand += d;
    if (d <= left + 1e-9) { powered[b.id] = true; left -= d; } else { powered[b.id] = false; shortfall = Math.max(shortfall, d - left); }
  }

  // Buildings
  const info = {};
  const gross = { metal: 0, fuel: 0, food: 0, research: 0 };
  const cons = { metal: 0, fuel: 0, food: 0 };
  for (const b of colony.buildings) {
    const def = BUILDINGS[b.type];
    const w = workerOf[b.id] || null;
    const i = { worker: w, status: 'running', output: {}, input: {}, bonus: null, research: 0, demand: 0 };
    info[b.id] = i;
    if (!isBuilt(b)) { i.status = 'constructing'; continue; }
    if (!def.output && !def.input) { i.status = b.enabled ? 'running' : 'off'; continue; }
    const cd = consumers.find((x) => x.b.id === b.id);
    i.demand = cd ? cd.d : 0;
    if (!b.enabled) { i.status = 'off'; continue; }
    if (!powered[b.id]) { i.status = 'unpowered'; continue; }
    const lv = levelMult(b.level);
    const rb = researchBonus(state, b.type);
    const wb = workerBonus(colony, w, b.type, state.time);
    i.bonus = { level: lv, research: rb, staff: wb };
    const mult = lv * (1 + rb) * (1 + wb.total);
    for (const k in def.output) { i.output[k] = def.output[k] * mult; gross[k] += i.output[k]; }
    if (def.input) for (const k in def.input) { i.input[k] = def.input[k] * demandMult(b.level); cons[k] += i.input[k]; }
    const rt = colony.runtime[b.id];
    if (rt && rt.factor < 0.999) i.status = rt.reason || 'limited';
  }

  // Relief work at headquarters
  const reliefRate = RELIEF[colony.reliefMode] * idle.length;
  gross[colony.reliefMode] += reliefRate;

  cons.food += FOOD_PER_COLONIST * people.length;

  // Construction speed
  let speed = 1;
  for (const c of support) speed += c.traits.includes('inventive') ? 0.11 : 0.1;

  const net = {};
  for (const k of ['metal', 'fuel', 'food']) net[k] = gross[k] - cons[k];

  return {
    people, workerOf, support, idle, cap, housing: house,
    power: { supply, demand, left, shortfall, powered, supplyParts },
    info, gross, cons, net, research: gross.research, reliefRate, speed,
  };
}

export function available(colony, r) {
  return Math.max(0, colony.inv[r] - (colony.reserved[r] || 0));
}

function addXp(c, prof, amount, ev, state) {
  const s = c.skills[prof];
  if (!s) return;
  s.xp += amount;
  while (s.level < 20 && s.xp >= 20 * s.level) {
    s.xp -= 20 * s.level;
    s.level += 1;
    ev.emit('done', `${c.name} reached ${PROFESSIONS[prof].name} level ${s.level}.`, { cat: 'levelup', colonist: c.id });
    if (s.level === 5 || s.level === 10 || s.level === 20) c.achievements.push({ t: state.time, text: `Reached ${PROFESSIONS[prof].name} level ${s.level}` });
  }
}

export function tickColony(state, colony, dt, ev) {
  const snap = computeColony(state, colony);
  const m = dt / 60;
  const cap = snap.cap;
  const inv = colony.inv;
  const prod = ev.bucket(colony.id);

  // --- construction (one active item) ---
  let constructing = false;
  const item = colony.queue[0];
  if (item) {
    constructing = true;
    item.started = true;
    item.progress += dt * snap.speed;
    if (item.progress >= item.duration) completeQueueItem(state, colony, item, ev);
  }

  // --- simple producers ---
  const factorOf = {};
  for (const b of colony.buildings) {
    const i = snap.info[b.id];
    const def = BUILDINGS[b.type];
    if (!def.output || def.input || i.status === 'constructing' || i.status === 'off' || i.status === 'unpowered') continue;
    let f = 1;
    let reason = null;
    for (const k in i.output) {
      const amt = i.output[k] * m;
      if (k === 'research') { ev.research += amt; continue; }
      const free = Math.max(0, cap[k] - inv[k]);
      const add = Math.min(amt, free);
      inv[k] += add;
      prod.made[k] = (prod.made[k] || 0) + add;
      if (amt > 0 && add < amt) { f = Math.min(f, add / amt); reason = 'storage full'; }
    }
    factorOf[b.id] = f;
    colony.runtime[b.id] = { factor: f, reason };
  }

  // --- relief work ---
  if (snap.idle.length) {
    const r = colony.reliefMode;
    const amt = snap.reliefRate * m;
    const add = Math.min(amt, Math.max(0, cap[r] - inv[r]));
    inv[r] += add;
    prod.made[r] = (prod.made[r] || 0) + add;
    colony.runtime.relief = { factor: amt ? add / amt : 1 };
  }

  // --- input-consuming producers: scale down, never waste ---
  for (const b of colony.buildings) {
    const i = snap.info[b.id];
    const def = BUILDINGS[b.type];
    if (!def.input || i.status === 'constructing' || i.status === 'off' || i.status === 'unpowered') continue;
    let f = 1;
    let reason = null;
    for (const k in i.input) {
      const need = i.input[k] * m;
      const have = available(colony, k);
      if (need > 0 && have < need) { const x = have / need; if (x < f) { f = x; reason = `short of ${k}`; } }
    }
    for (const k in i.output) {
      const amt = i.output[k] * m;
      const free = Math.max(0, cap[k] - inv[k]);
      if (amt > 0 && free < amt) { const x = free / amt; if (x < f) { f = x; reason = 'storage full'; } }
    }
    f = Math.max(0, Math.min(1, f));
    for (const k in i.input) { const u = i.input[k] * m * f; inv[k] -= u; prod.used[k] = (prod.used[k] || 0) + u; }
    for (const k in i.output) { const a = i.output[k] * m * f; inv[k] += a; prod.made[k] = (prod.made[k] || 0) + a; }
    factorOf[b.id] = f;
    colony.runtime[b.id] = { factor: f, reason };
  }

  // --- food upkeep ---
  const need = FOOD_PER_COLONIST * snap.people.length * m;
  const have = available(colony, 'food');
  const wasShort = colony.foodShort;
  if (have + 1e-9 >= need) {
    inv.food -= need; prod.used.food = (prod.used.food || 0) + need;
    colony.foodShort = false;
  } else {
    inv.food -= have; prod.used.food = (prod.used.food || 0) + have;
    colony.foodShort = true;
  }
  if (colony.foodShort && !wasShort) ev.emit('attention', `${colony.name} has run out of Food. Worker bonuses are halved and recruitment is paused until Food recovers.`, { cat: 'shortage', colony: colony.id });
  if (!colony.foodShort && wasShort) ev.emit('info', `${colony.name} has Food again.`, { cat: 'shortage', colony: colony.id });

  // --- experience ---
  for (const c of snap.people) {
    let gain = 0;
    if (c.assign?.kind === 'building') {
      const f = factorOf[c.assign.bid];
      if (f > 0) gain = XP_PER_MIN * m * (c.traits.includes('patient') ? 1.1 : 1);
    } else if (c.assign?.kind === 'support') {
      if (constructing && snap.support.includes(c)) gain = XP_PER_MIN * m * (c.traits.includes('patient') ? 1.1 : 1);
    } else if (colony.runtime.relief?.factor > 0) {
      gain = XP_PER_MIN * m * (c.traits.includes('patient') ? 1.1 : 1);
    }
    if (gain > 0) { c.workSeconds += dt; addXp(c, c.profession, gain, ev, state); }
  }

  // --- recruitment ---
  const rec = colony.recruit.active;
  if (rec) {
    if (colony.foodShort) rec.status = 'paused: no Food';
    else if (rec.progress < rec.duration) { rec.progress = Math.min(rec.duration, rec.progress + dt); rec.status = 'travelling'; }
    if (rec.progress >= rec.duration) {
      const pop = snap.people.length;
      if (pop >= snap.housing || pop >= POP_LIMIT) {
        if (rec.status !== 'waiting for housing') ev.emit('attention', `${rec.candidate.name} is ready to join ${colony.name} but there is no free housing.`, { cat: 'recruit', colony: colony.id });
        rec.status = 'waiting for housing';
      } else {
        for (const k in rec.cost) { colony.inv[k] -= rec.cost[k]; colony.reserved[k] -= rec.cost[k]; prod.used[k] = (prod.used[k] || 0) + rec.cost[k]; }
        const c = rec.candidate;
        c.colonyId = colony.id;
        c.joinedAt = state.time;
        c.assign = null;
        state.colonists[c.id] = c;
        colony.recruit.active = null;
        state.stats.recruited++;
        ev.emit('done', `${c.name} (${PROFESSIONS[c.profession].name}) joined ${colony.name}.`, { cat: 'recruit', colony: colony.id, colonist: c.id });
      }
    }
  }
  clampColony(colony);
}

function clampColony(colony) {
  for (const k of ['metal', 'fuel', 'food']) {
    if (colony.inv[k] < 1e-7) colony.inv[k] = Math.max(0, colony.inv[k]);
    if (colony.reserved[k] < 1e-7) colony.reserved[k] = 0;
  }
}

export function completeQueueItem(state, colony, item, ev) {
  colony.queue.shift();
  for (const k in item.cost) {
    colony.inv[k] -= item.cost[k];
    colony.reserved[k] -= item.cost[k];
  }
  const b = colony.buildings.find((x) => x.id === item.bid);
  if (!b) return;
  b.invested += item.cost.metal || 0;
  b.level = item.toLevel;
  delete b.upgrading;
  const name = BUILDINGS[b.type].name;
  if (item.kind === 'build') {
    state.stats.built++;
    ev.emit('done', `${name} completed in ${colony.name}.`, { cat: 'construction', colony: colony.id, building: b.id });
  } else {
    state.stats.upgraded++;
    ev.emit('done', `${name} upgraded to level ${b.level} in ${colony.name}.`, { cat: 'construction', colony: colony.id, building: b.id });
  }
  ev.changed = true;
}

export { uid, makeColonist };
