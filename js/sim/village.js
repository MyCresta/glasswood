// Barricades on the forest paths. How many the village has comes from its cards.
import { canBlock } from './web.js';
import { build } from './build.js';

export const barricadeMax = (state) => build(state).barricades;

export function barricadeBlocker(state, key) {
  if (state.phase === 'night') return 'Barricades can only be moved between nights.';
  if (state.phase === 'over') return 'This run is over.';
  const r = canBlock(state.barricades, key, barricadeMax(state));
  return r.ok ? null : r.reason;
}

export function placeBarricade(state, key) {
  const block = barricadeBlocker(state, key);
  if (block) return { ok: false, reason: block };
  state.barricades.push(key);
  return { ok: true };
}

export function removeBarricade(state, key) {
  if (state.phase === 'night') return { ok: false, reason: 'Barricades can only be moved between nights.' };
  const i = state.barricades.indexOf(key);
  if (i < 0) return { ok: false, reason: 'There is no barricade there.' };
  state.barricades.splice(i, 1);
  return { ok: true };
}
