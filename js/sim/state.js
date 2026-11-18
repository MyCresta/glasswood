import { BUILDINGS, START_GOLD, FIRST_DAY, wallStats } from '../data/village.js';

export const SAVE_VERSION = 3;

export function newGame({ name = 'Emberfold', emblem = 'leaf', color = '#f0a86b', seed, now = Date.now() } = {}) {
  const buildings = {};
  for (const [id, b] of Object.entries(BUILDINGS)) buildings[id] = { level: b.start };
  buildings.archery.target = 'first';
  const integrity = wallStats(1).integrity;
  return {
    version: SAVE_VERSION,
    seed: (seed ?? Math.floor(Math.random() * 2 ** 31)) | 0,
    nextId: 1,
    time: 0,
    lastTick: now,
    paused: false,
    speed: 1, // night speed: 1 or 2
    village: { name, emblem, color },
    gold: START_GOLD,
    reserved: 0,
    buildings,
    queue: [],
    phase: 'day',
    phaseT: 0,
    dayLength: FIRST_DAY,
    night: 1,
    best: 0,
    hold: false,
    lastResult: {},
    integrity,
    barricades: [],
    battle: null,
    lastReport: null,
    stats: { kills: 0, goldEarned: 0, nightsWon: 0, nightsLost: 0, offlineNights: 0 },
    objectives: { claimed: [], flags: {} },
    log: [],
    settings: {
      quality: 'high', reducedMotion: false, reducedFlashing: false,
      volume: { master: 0.7, music: 0.5, ambience: 0.6, ui: 0.7 },
      mute: { info: false, done: false },
      textScale: 1,
    },
    ui: { guideDismissed: false },
  };
}

export function uid(state, p = 'x') {
  state.nextId += 1;
  return `${p}${state.nextId}`;
}

export function availableGold(state) {
  return Math.max(0, state.gold - state.reserved);
}
