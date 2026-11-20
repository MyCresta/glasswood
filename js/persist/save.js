// Browser persistence: autosave, a rolling recoverable backup, export/import.
import { beginRun } from '../sim/run.js';
import { webForSeed } from '../sim/web.js';
import { newGame } from '../sim/state.js';
import { restartNight } from '../sim/battle.js';
import { SAVE_VERSION } from '../sim/state.js';

const KEY = 'glasswood.save';
const BACKUP = 'glasswood.backup';
const BACKUP_EVERY = 5 * 60 * 1000;

let lastBackup = 0;

export function storageAvailable() {
  try {
    const k = '__gw_probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch { return false; }
}

export function serialize(state) {
  return JSON.stringify(state);
}

export function migrate(data) {
  if (!data || typeof data !== 'object') throw new Error('This is not a Glasswood save.');
  if (data.colonies && !data.village) throw new Error('This save is from the earlier colony prototype, which works differently.');
  if (!data.village) throw new Error('The save is missing required parts.');
  if ((data.version || 0) > SAVE_VERSION) throw new Error('This save comes from a newer version of Glasswood.');
  if ((data.version || 0) < 6) {
    // Before version 6 the game was an idle village. It is a roguelike now:
    // keep the village's name and the settings, and start the first run.
    const fresh = newGame({ name: data.village.name });
    fresh.settings = { ...fresh.settings, ...data.settings, autoView: false };
    fresh.restarted = true;
    return fresh;
  }
  if (data.version < 7) {
    // Version 7 grows a new forest every run, so the old run's barricades no
    // longer fit: keep everything kept between runs and start a fresh run.
    const fresh = newGame({ name: data.village.name });
    fresh.settings = { ...fresh.settings, ...data.settings };
    fresh.meta = { ...fresh.meta, ...data.meta, unlocks: data.meta?.unlocks || {} };
    beginRun(fresh);
    return fresh;
  }
  data.meta.unlocks ||= {};
  data.upgrades ||= {};
  data.rested ||= {};
  // a run saved before the forests were redrawn: drop barricades on paths that no longer exist
  const web = webForSeed(data.seed);
  data.barricades = (data.barricades || []).filter((k) => web.EDGE.has(k));
  data.ui ||= {};
  data.ui.view ||= 'watch';
  // a night left half-fought starts again from its beginning
  restartNight(data);
  return data;
}

export function saveGame(state) {
  const text = serialize(state);
  const now = Date.now();
  if (now - lastBackup > BACKUP_EVERY) {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(BACKUP, prev);
    lastBackup = now;
  }
  localStorage.setItem(KEY, text);
  return { ok: true, at: now, bytes: text.length };
}

export function loadGame() {
  const text = localStorage.getItem(KEY);
  if (!text) return null;
  return migrate(JSON.parse(text));
}

export function loadBackup() {
  const text = localStorage.getItem(BACKUP);
  if (!text) return null;
  try { return migrate(JSON.parse(text)); } catch { return null; }
}

export function deleteSave() {
  const cur = localStorage.getItem(KEY);
  if (cur) localStorage.setItem(BACKUP, cur);
  localStorage.removeItem(KEY);
}

// Export is a plain text code: base64 of UTF-8 JSON with a short prefix.
export function exportCode(state) {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `GLASSWOOD1:${btoa(bin)}`;
}

export function parseImport(text) {
  const t = String(text || '').trim();
  let json;
  if (t.startsWith('GLASSWOOD1:')) {
    const bin = atob(t.slice(11).replace(/\s+/g, ''));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } else if (t.startsWith('{')) json = t;
  else throw new Error('Paste a save code that starts with GLASSWOOD1, or choose an exported file.');
  return migrate(JSON.parse(json));
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
