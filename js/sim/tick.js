// Global time advancement, event collection and offline catch-up.
import { tickColony } from './economy.js';
import { addResearch } from './research.js';
import { checkObjectives } from './objectives.js';

export const OFFLINE_CAP = 24 * 3600; // seconds
const LOG_MAX = 300;

export function makeEvents(state) {
  const ev = {
    list: [],
    research: 0,
    changed: false,
    buckets: {},
    bucket(cid) { return (this.buckets[cid] ||= { made: {}, used: {} }); },
    emit(level, text, meta = {}) {
      const e = { level, text, t: state.time, at: Date.now(), ...meta };
      this.list.push(e);
      state.log.push(e);
      if (state.log.length > LOG_MAX) state.log.splice(0, state.log.length - LOG_MAX);
    },
  };
  return ev;
}

// Advance the whole civilization by dt seconds of game time.
export function tick(state, dt, ev) {
  if (state.paused || dt <= 0) return;
  state.time += dt;
  ev.research = 0;
  for (const colony of state.colonies) tickColony(state, colony, dt, ev);
  addResearch(state, ev.research, ev);
  ev.researchTotal = (ev.researchTotal || 0) + ev.research;
  checkObjectives(state, ev);
}

// Advance in bounded steps (used for live play and catch-up alike).
export function advance(state, seconds, ev, step = 5) {
  let left = seconds;
  while (left > 1e-9) {
    const dt = Math.min(step, left);
    tick(state, dt, ev);
    left -= dt;
  }
}

// Credit real elapsed time once. Returns details for the return summary.
// `lastTick` always moves to `now`, so the same period is never credited twice.
export function catchUp(state, now, ev) {
  const elapsed = Math.max(0, (now - state.lastTick) / 1000);
  state.lastTick = now;
  if (state.paused) return { elapsed, credited: 0 };
  const credited = Math.min(elapsed, OFFLINE_CAP);
  advance(state, credited, ev, credited > 600 ? 10 : 2);
  return { elapsed, credited };
}
