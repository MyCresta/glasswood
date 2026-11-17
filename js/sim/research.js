import { TECHS, RESEARCH_QUEUE_MAX } from '../data/techs.js';

export function techState(state, id) {
  const r = state.research;
  if (r.done.includes(id)) return 'done';
  if (r.active === id) return 'active';
  if (r.queue.includes(id)) return 'queued';
  return 'idle';
}

// Why a technology cannot be started right now (null when it can).
export function techBlocker(state, id, { forQueue = false } = {}) {
  const t = TECHS[id];
  const r = state.research;
  if (!t) return 'Unknown technology.';
  if (r.done.includes(id)) return 'Already researched.';
  if (!t.live) return `Its capabilities arrive in ${t.future}.`;
  const ahead = new Set([...r.done, ...(forQueue ? [r.active, ...r.queue] : [])]);
  const missing = t.pre.filter((p) => !ahead.has(p));
  if (missing.length) return `Requires ${missing.map((p) => TECHS[p].name).join(' and ')}.`;
  return null;
}

export function remaining(state, id) {
  return Math.max(0, TECHS[id].cost - (state.research.progress[id] || 0));
}

export function addResearch(state, amount, ev) {
  if (amount <= 0) return;
  state.stats.lifetimeResearch += amount;
  state.research.bank += amount;
  pump(state, ev);
}

// Move banked points into the active project, completing and advancing the queue.
export function pump(state, ev) {
  const r = state.research;
  let guard = 0;
  while (r.active && guard++ < 50) {
    const id = r.active;
    const need = remaining(state, id);
    const use = Math.min(need, r.bank);
    r.progress[id] = (r.progress[id] || 0) + use;
    r.bank -= use;
    if (remaining(state, id) <= 1e-9) {
      r.done.push(id);
      delete r.progress[id];
      r.active = null;
      ev?.emit('done', `Research complete: ${TECHS[id].name}. ${TECHS[id].result}`, { cat: 'research', tech: id });
      if (ev) ev.changed = true;
      while (r.queue.length && !r.active) {
        const next = r.queue.shift();
        if (!techBlocker(state, next)) r.active = next;
      }
    } else break;
  }
  if (r.bank < 1e-9) r.bank = 0;
}

export function setActiveTech(state, id, ev) {
  const block = techBlocker(state, id);
  if (block) return { ok: false, reason: block };
  const r = state.research;
  r.queue = r.queue.filter((q) => q !== id);
  if (r.active && r.active !== id && r.queue.length < RESEARCH_QUEUE_MAX) r.queue.unshift(r.active);
  r.active = id;
  pump(state, ev);
  return { ok: true };
}

export function queueTech(state, id) {
  const r = state.research;
  if (!r.active) return setActiveTech(state, id);
  if (r.queue.includes(id) || r.active === id) return { ok: false, reason: 'Already planned.' };
  if (r.queue.length >= RESEARCH_QUEUE_MAX) return { ok: false, reason: `The queue holds ${RESEARCH_QUEUE_MAX} successors.` };
  const block = techBlocker(state, id, { forQueue: true });
  if (block) return { ok: false, reason: block };
  r.queue.push(id);
  return { ok: true };
}

export function unqueueTech(state, id) {
  const r = state.research;
  r.queue = r.queue.filter((q) => q !== id);
  // Drop successors whose prerequisites are no longer planned.
  r.queue = r.queue.filter((q, i) => !techBlocker({ ...state, research: { ...r, queue: r.queue.slice(0, i) } }, q, { forQueue: true }));
  return { ok: true };
}

export function pauseResearch(state) {
  const r = state.research;
  r.active = null;
  return { ok: true };
}
