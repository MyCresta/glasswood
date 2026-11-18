// Advancing time: the fixed-step tick, the live pump and offline catch-up.
import { STEP, OFFLINE_CAP, OFFLINE_CYCLE, OFFLINE_REWARD, DAY_LENGTH, wallStats } from '../data/village.js';
import { startNight, stepNight, safeNight, waveGold, dawnReward } from './battle.js';
import { advanceQueue, checkObjectives } from './village.js';

const LOG_MAX = 300;
export const AWAY_GAP = 90; // seconds; longer gaps are treated as time away

export function makeEvents(state, sound) {
  return {
    list: [],
    changed: false,
    sound,
    emit(level, text, meta = {}) {
      const e = { level, text, at: Date.now(), t: state.time, ...meta };
      this.list.push(e);
      state.log.push(e);
      if (state.log.length > LOG_MAX) state.log.splice(0, state.log.length - LOG_MAX);
    },
  };
}

export function tick(state, dt, ev) {
  if (state.paused) return;
  state.time += dt;
  advanceQueue(state, dt, ev);
  if (state.phase === 'day') {
    state.phaseT += dt;
    if (state.phaseT >= state.dayLength) startNight(state, ev);
  } else stepNight(state, dt, ev);
  checkObjectives(state, ev);
}

export function advance(state, seconds, ev) {
  let left = seconds;
  while (left > 1e-9) {
    const dt = Math.min(STEP, left);
    tick(state, dt, ev);
    left -= dt;
  }
}

export function callNight(state, ev) {
  if (state.phase !== 'day') return { ok: false, reason: 'It is already night.' };
  startNight(state, ev);
  return { ok: true };
}

// Live play: consume real time in fixed steps. Night speed only applies at night.
// `carry` holds unspent real milliseconds between calls (kept out of the save).
export function pump(state, now, carry, ev) {
  let budget = carry.ms + Math.max(0, now - state.lastTick);
  state.lastTick = now;
  if (state.paused) { carry.ms = 0; return; }
  let guard = 0;
  for (;;) {
    const f = state.phase === 'night' ? state.speed : 1;
    const cost = (STEP * 1000) / f;
    if (budget < cost || guard++ > 4000) break;
    budget -= cost;
    tick(state, STEP, ev);
  }
  carry.ms = Math.min(budget, 1000);
  carry.alpha = budget / ((STEP * 1000) / (state.phase === 'night' ? state.speed : 1));
}

// Time away: upgrades continue; nights are defended at the safe night for
// reduced rewards. Away time never loses a night or advances the siege.
export function catchUp(state, now, ev) {
  const elapsed = Math.max(0, (now - state.lastTick) / 1000);
  state.lastTick = now;
  const res = { elapsed, credited: 0, nights: 0, safe: 0, gold: 0, interrupted: false };
  if (state.paused) return res;
  const credited = Math.min(elapsed, OFFLINE_CAP);
  res.credited = credited;
  if (state.phase === 'night') {
    res.interrupted = state.battle?.n || true;
    state.battle = null;
  }
  state.time += credited;
  advanceQueue(state, credited, ev);
  const safe = safeNight(state);
  res.safe = safe;
  if (safe > 0) {
    const nights = Math.floor(credited / OFFLINE_CYCLE);
    const per = OFFLINE_REWARD * (waveGold(safe) + dawnReward(safe));
    const g = Math.floor(nights * per);
    state.gold += g;
    state.stats.goldEarned += g;
    state.stats.offlineNights += nights;
    res.nights = nights;
    res.gold = g;
  }
  state.phase = 'day';
  state.phaseT = 0;
  state.dayLength = DAY_LENGTH;
  state.integrity = wallStats(state.buildings.walls.level).integrity;
  checkObjectives(state, ev);
  ev.changed = true;
  return res;
}
