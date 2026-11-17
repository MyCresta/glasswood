// Small deterministic RNG (mulberry32). The seed lives in the save so that
// reloading never rerolls an outcome.
export function nextRandom(state) {
  let t = (state.seed = (state.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function pick(state, arr) {
  return arr[Math.floor(nextRandom(state) * arr.length)];
}
export function randInt(state, min, max) {
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}
