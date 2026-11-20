// The saved game: what lasts between runs (meta, settings) and the current run.
import { BASE } from '../data/cards.js';

export const SAVE_VERSION = 7;

// Everything that belongs to one run, reset when a new run starts.
export function runFields(seed = Math.floor(Math.random() * 2 ** 31), now = Date.now(), unlocks = {}) {
  return {
    seed: seed | 0,
    nextId: 1,
    time: 0,
    lastTick: now,
    paused: false,
    phase: 'day', // 'starter' (choosing the first card), 'day' (camp between nights), 'night', 'draft' (choosing a card), 'over'
    phaseT: 0,
    night: 1,
    best: 0, // nights held in this run
    gold: 30 + 25 * (unlocks.purse || 0),
    integrity: BASE.walls.integrity + 100 * (unlocks.walls || 0),
    bonus: { walls: 100 * (unlocks.walls || 0) },
    barricades: [],
    cards: [],
    offer: null,
    rerolls: BASE.rerolls + (unlocks.reroll || 0),
    upgrades: {}, // Hearth upgrades bought with gold this run
    expedition: null, // { place, night } the expedition sent this camp
    rested: {}, // place id -> the night it can be visited again
    battle: null,
    lastReport: null,
    stats: { kills: 0, goldEarned: 0, nightsWon: 0 },
    log: [],
  };
}

export function newGame({ name = 'Emberfold', seed, now = Date.now() } = {}) {
  return {
    version: SAVE_VERSION,
    village: { name },
    meta: { embers: 0, best: 0, runs: 1, history: [], unlocks: {}, seenHelp: false },
    settings: {
      quality: 'high', reducedMotion: false, reducedFlashing: false,
      volume: { master: 0.7, music: 0.5, ambience: 0.6, ui: 0.7 },
      mute: { info: false, done: false },
      textScale: 1,
      sound: true,
      autoView: false,
    },
    ui: { view: 'watch', building: 'archery' },
    ...runFields(seed, now),
  };
}

// Start a new run in place, keeping what lasts.
export function newRun(state, seed, now = Date.now()) {
  Object.assign(state, runFields(seed, now, state.meta.unlocks || {}));
  state.meta.runs += 1;
  state.ui.place = null;
}

export function uid(state, p = 'x') {
  state.nextId += 1;
  return `${p}${state.nextId}`;
}

export const availableGold = (state) => Math.max(0, state.gold);
