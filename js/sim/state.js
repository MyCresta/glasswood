import { BUILDINGS } from '../data/buildings.js';
import { PROFESSIONS, TRAIT_KEYS, FIRST_NAMES, LAST_NAMES } from '../data/people.js';
import { nextRandom, pick, randInt } from './rng.js';

export const SAVE_VERSION = 1;

export function uid(state, prefix) {
  state.nextId = (state.nextId || 1) + 1;
  return `${prefix}${state.nextId}`;
}

export function newSkillSet() {
  return { miner: { level: 1, xp: 0 }, scientist: { level: 1, xp: 0 }, engineer: { level: 1, xp: 0 }, explorer: { level: 1, xp: 0 } };
}

export function makeColonist(state, { profession, colonyId } = {}) {
  const prof = profession || pick(state, Object.keys(PROFESSIONS));
  const t1 = pick(state, TRAIT_KEYS);
  let t2 = pick(state, TRAIT_KEYS);
  while (t2 === t1) t2 = pick(state, TRAIT_KEYS);
  const skills = newSkillSet();
  return {
    id: uid(state, 'p'),
    name: `${pick(state, FIRST_NAMES)} ${pick(state, LAST_NAMES)}`,
    profession: prof,
    skills,
    traits: [t1, t2],
    assign: null, // null = headquarters relief work
    colonyId: colonyId || null,
    look: {
      skin: randInt(state, 0, 5),
      hair: randInt(state, 0, 6),
      hairStyle: randInt(state, 0, 4),
      face: randInt(state, 0, 2),
      accent: randInt(state, 0, 4),
    },
    joinedAt: state.time || 0,
    achievements: [],
    workSeconds: 0,
  };
}

export function makeBuilding(state, type, gx, gz, built = true) {
  return {
    id: uid(state, 'b'),
    type,
    level: built ? 1 : 0,
    gx, gz,
    rot: 0,
    enabled: true,
    priority: 'normal',
    invested: built ? (BUILDINGS[type].cost.metal || 0) : 0,
  };
}

export function newColony(state, { name, biome = 'temperate', grid = 4 }) {
  return {
    id: uid(state, 'c'),
    name,
    biome,
    grid,
    inv: { metal: 0, fuel: 0, food: 0, samples: 0 },
    reserved: { metal: 0, fuel: 0, food: 0 },
    buildings: [],
    queue: [],
    reliefMode: 'metal',
    foodShort: false,
    runtime: {},
    recruit: { candidates: [], refreshAt: 0, active: null },
    founded: state.time || 0,
  };
}

export function newGame({ civName = 'The Asterwake Compact', emblem = 'orbit', color = '#7fd6c8', seed, now = Date.now() } = {}) {
  const state = {
    version: SAVE_VERSION,
    seed: (seed ?? Math.floor(Math.random() * 2 ** 31)) | 0,
    nextId: 1,
    time: 0, // credited game seconds
    lastTick: now, // real-time clock (ms) up to which time has been credited
    paused: false,
    civ: { name: civName, emblem, color },
    colonies: [],
    colonists: {},
    research: { bank: 0, active: null, queue: [], progress: {}, done: [] },
    stats: { lifetimeResearch: 0, built: 0, upgraded: 0, recruited: 0 },
    log: [],
    objectives: { claimed: [], flags: {} },
    settings: {
      quality: 'high', reducedMotion: false, reducedFlashing: false,
      volume: { master: 0.7, music: 0.5, ambience: 0.6, ui: 0.7 },
      mute: { info: false, done: false },
      textScale: 1,
    },
    ui: { colonyId: null, guideDismissed: false },
  };
  const home = newColony(state, { name: 'Firstlight' });
  home.inv = { metal: 200, fuel: 40, food: 80, samples: 0 };
  const layout = [['hq', 0, 0], ['habitat', -1, 0], ['farm', -1, 1], ['solar', -2, -1], ['extractor', 1, -1], ['depot', 1, 1]];
  for (const [t, x, z] of layout) home.buildings.push(makeBuilding(state, t, x, z, true));
  home.buildings[0].invested = 0;
  state.colonies.push(home);
  state.ui.colonyId = home.id;

  const miner = makeColonist(state, { profession: 'miner', colonyId: home.id });
  const sci = makeColonist(state, { profession: 'scientist', colonyId: home.id });
  const eng = makeColonist(state, { profession: 'engineer', colonyId: home.id });
  miner.assign = { kind: 'building', bid: home.buildings.find((b) => b.type === 'extractor').id };
  eng.assign = { kind: 'support' };
  for (const c of [miner, sci, eng]) state.colonists[c.id] = c;

  refreshCandidates(state, home, true);
  return state;
}

export function refreshCandidates(state, colony, free = true) {
  const list = [];
  for (let i = 0; i < 3; i++) list.push(makeColonist(state, { colonyId: colony.id }));
  colony.recruit.candidates = list;
  if (free) colony.recruit.refreshAt = state.time + 600;
}

export function colonistsAt(state, colonyId) {
  return Object.values(state.colonists).filter((c) => c.colonyId === colonyId);
}

export function getColony(state, id) {
  return state.colonies.find((c) => c.id === id);
}

export function plotList(colony) {
  const n = colony.grid;
  const lo = -Math.floor(n / 2);
  const out = [];
  for (let gz = lo; gz < lo + n; gz++) for (let gx = lo; gx < lo + n; gx++) out.push({ gx, gz });
  return out;
}

export function plotInGrid(colony, gx, gz) {
  const lo = -Math.floor(colony.grid / 2);
  return gx >= lo && gx < lo + colony.grid && gz >= lo && gz < lo + colony.grid;
}

export function buildingAt(colony, gx, gz) {
  return colony.buildings.find((b) => b.gx === gx && b.gz === gz);
}

export { nextRandom };
