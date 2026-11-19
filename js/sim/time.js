// Time: fixed steps for the nights. Between nights (camp, the draft) nothing
// runs on a clock: the next night starts when the player calls it.
import { STEP } from '../data/village.js';
import { startNight, stepNight } from './battle.js';

export const LOG_MAX = 60;

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
  if (state.phase === 'night') stepNight(state, dt, ev);
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
  if (state.phase === 'night') return { ok: false, reason: 'It is already night.' };
  if (state.phase === 'draft') return { ok: false, reason: 'Choose a card first.' };
  if (state.phase === 'over') return { ok: false, reason: 'This run is over.' };
  startNight(state, ev);
  return { ok: true };
}

// Live play: consume real time in fixed steps.
// `carry` holds unspent real milliseconds between calls (kept out of the save).
export function pump(state, now, carry, ev) {
  // time away is not played: a long gap (a hidden tab, a closed laptop) only
  // moves the night on by a moment
  let budget = carry.ms + Math.min(250, Math.max(0, now - state.lastTick));
  state.lastTick = now;
  if (state.paused) { carry.ms = 0; return; }
  let guard = 0;
  for (;;) {
    const cost = STEP * 1000;
    if (budget < cost || guard++ > 4000) break;
    budget -= cost;
    tick(state, STEP, ev);
  }
  carry.ms = Math.min(budget, 1000);
  carry.alpha = budget / (STEP * 1000);
}
