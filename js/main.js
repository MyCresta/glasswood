import { Diorama } from './render/diorama.js';
import { Audio } from './audio/audio.js';
import { UI } from './ui/app.js';
import { h, button, dur } from './ui/dom.js';
import { summaryView, newVillageView } from './ui/views.js';
import { BUILDINGS, SPAWNS } from './data/village.js';
import { newGame } from './sim/state.js';
import { makeEvents, pump, catchUp, AWAY_GAP } from './sim/time.js';
import { checkObjectives } from './sim/village.js';
import {
  storageAvailable, saveGame, loadGame, loadBackup, deleteSave, exportCode, parseImport, summarizeSave, downloadText,
} from './persist/save.js';
import { createTabLock } from './persist/tablock.js';

const SAVE_EVERY = 15000;

const game = { state: null, diorama: null, audio: new Audio(), ui: null, lastSave: 0, saveError: null, pending: null };
const carry = { ms: 0, alpha: 1 };
let saveTimer = null;
let running = false;
let lock = null;
const lastSound = {};

function bump() { game.state._rev = (game.state._rev || 0) + 1; }

// Battle sounds are throttled so a big wave never turns into noise.
function sound(kind) {
  const now = performance.now();
  const gap = { hit: 70, death: 90, wall: 160 }[kind] || 0;
  if (gap && now - (lastSound[kind] || 0) < gap) return;
  lastSound[kind] = now;
  game.audio.play(kind);
}

game.events = () => (game.pending ||= makeEvents(game.state, sound));

game.act = (fn, opts = {}) => {
  const r = fn(game.state) || { ok: true };
  if (r.ok === false) {
    game.ui.toast('attention', r.reason || 'That is not possible right now.', { force: true });
    game.audio.play('warn');
    return r;
  }
  bump();
  if (opts.sound) game.audio.play(opts.sound);
  checkObjectives(game.state, game.events());
  flushPending();
  game.ui.refresh(true);
  game.diorama.sync(game.state);
  game.touch();
  return r;
};

function flushPending() {
  if (!game.pending) return;
  const ev = game.pending;
  game.pending = null;
  handleEvents(ev);
}

function handleEvents(ev) {
  if (!ev.list.length && !ev.changed) return;
  bump();
  for (const e of ev.list) game.ui.toast(e.level, e.text, e);
  if (ev.list.some((e) => e.cat === 'night' || e.cat === 'upgrade')) game.touch();
}

game.touch = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => game.saveNow(false), 1200);
};

game.saveNow = (manual) => {
  if (!game.state || !lock?.isOwner()) return;
  try {
    saveGame(game.state);
    game.lastSave = Date.now();
    game.saveError = null;
    document.getElementById('banner').hidden = true;
    if (manual) game.ui?.toast('info', 'Game saved.', { force: true });
  } catch (err) {
    game.saveError = err;
    showSaveProblem(err);
  }
  updateSaveIndicator();
};

function updateSaveIndicator() {
  const ind = game.ui?.saveInd;
  if (!ind) return;
  if (game.saveError) {
    ind.textContent = '⚠ Save problem';
    ind.classList.add('error');
    ind.onclick = () => game.exportSave();
    return;
  }
  ind.classList.remove('error');
  ind.onclick = () => game.saveNow(true);
  const ago = (Date.now() - game.lastSave) / 1000;
  ind.textContent = !game.lastSave ? 'Not saved yet' : ago < 10 ? '✓ Saved' : `✓ Saved ${dur(ago)} ago`;
}

function showSaveProblem(err) {
  const b = document.getElementById('banner');
  b.hidden = false;
  b.replaceChildren(
    h('p', {}, h('strong', {}, 'Progress could not be saved in this browser. '), storageAvailable() ? 'Storage may be full.' : 'Browser storage is turned off or unavailable (private browsing can do this).', ' Export a save code now to keep this session.'),
    button('Export save', () => game.exportSave(), { kind: 'primary' }),
    button('Try again', () => game.saveNow(true)),
  );
  console.warn('Save failed', err);
}

game.exportSave = () => {
  const code = exportCode(game.state);
  const name = `asterwake-${game.state.village.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
  try { downloadText(name, code); } catch { /* clipboard below */ }
  navigator.clipboard?.writeText(code).then(() => game.ui.toast('info', 'Save exported as a file and copied to the clipboard.', { force: true }), () => game.ui.toast('info', 'Save exported as a file.', { force: true }));
};
game.parseImport = parseImport;
game.summarize = summarizeSave;

game.loadState = (data, msg) => {
  game.state = data;
  data.lastTick = Math.min(data.lastTick || Date.now(), Date.now());
  carry.ms = 0;
  game.applySettings();
  game.applyIdentity();
  const away = runCatchUp(true);
  game.ui.close();
  bump();
  game.ui.refresh(true);
  game.diorama.sync(game.state);
  game.saveNow(false);
  if (msg && !away) game.ui.toast('info', msg, { force: true });
};

game.restoreBackup = () => {
  const b = loadBackup();
  if (!b) { game.ui.toast('attention', 'There is no recent backup in this browser yet. One is made every few minutes while you play.', { force: true }); return; }
  const sm = summarizeSave(b);
  game.ui.confirm({
    title: 'Restore the recent backup?',
    body: `${sm.name}: best night ${sm.best}, Town Hall level ${sm.townhall}, ${sm.hours.toFixed(1)} hours played. The current village is kept as the new backup.`,
    ok: 'Restore backup',
    onOk: () => { try { saveGame(game.state); } catch { /* ignore */ } game.loadState(b, 'Backup restored.'); },
  });
};

game.startOver = () => {
  deleteSave();
  game.ui.modal(newVillageView((opts) => {
    game.ui.closeModal();
    game.loadState(newGame(opts), `${opts.name} raises its banner.`);
  }), { dismissable: false });
};

game.applySettings = () => {
  const st = game.state.settings;
  game.diorama.setQuality(st.quality || 'high');
  game.diorama.setMotion(!!st.reducedMotion, !!st.reducedFlashing);
  document.documentElement.style.fontSize = `${16 * (st.textScale || 1)}px`;
  document.body.classList.toggle('reduced-motion', !!st.reducedMotion);
  game.audio.setVolumes(st.volume);
};

game.applyIdentity = () => {
  const col = game.state.village.color;
  document.documentElement.style.setProperty('--accent', col);
  game.diorama.setAccent(col);
};

game.fullscreen = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => game.ui.toast('attention', 'Full screen is not available in this browser.', { force: true }));
};

// Long gaps are time away: credit them once and show a summary.
function runCatchUp(showSummary) {
  const s = game.state;
  const gap = (Date.now() - s.lastTick) / 1000;
  if (gap <= AWAY_GAP) return false;
  const ev = makeEvents(s);
  const r = catchUp(s, Date.now(), ev);
  carry.ms = 0;
  bump();
  game.ui.refresh(true);
  game.diorama.sync(s);
  if (showSummary) game.ui.modal(summaryView(game.ui, { ...r, ev }));
  game.saveNow(false);
  return true;
}

let lastSync = 0;
function step() {
  if (!running || !lock.isOwner()) return;
  if (runCatchUp(!document.hidden)) return;
  const ev = makeEvents(game.state, document.hidden ? null : sound);
  pump(game.state, Date.now(), carry, ev);
  flushPending();
  handleEvents(ev);
  const now = performance.now();
  if (ev.changed || now - lastSync > 250) {
    lastSync = now;
    game.ui.refresh(ev.changed);
    game.diorama.sync(game.state);
  }
}

function frame() {
  if (running) {
    step();
    game.diorama.frame(game.state, Math.min(1, carry.alpha ?? 1));
  }
  requestAnimationFrame(frame);
}

function begin(state, fresh) {
  game.state = state;
  game.ui = new UI(game);
  game.applySettings();
  game.applyIdentity();
  running = true;
  if (!fresh) runCatchUp(true);
  bump();
  game.ui.refresh(true);
  game.diorama.sync(state);
  game.saveNow(false);
  setInterval(() => { if (document.hidden) step(); }, 250);
  setInterval(() => game.saveNow(false), SAVE_EVERY);
  setInterval(updateSaveIndicator, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.saveNow(false); });
  window.addEventListener('pagehide', () => game.saveNow(false));
}

function lostTab() {
  running = false;
  document.getElementById('modal-root').replaceChildren(h('div.modal-wrap', {}, h('div.modal', { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'lost-title' },
    h('div.modal-head', {}, h('h2', { id: 'lost-title' }, 'Continued in another tab')),
    h('div.modal-body', {}, h('p', {}, 'Your village is now running in another tab, so this one has stopped to avoid two sessions spending the same gold.'),
      h('div.row.end', {}, button('Continue here instead', () => location.reload(), { kind: 'primary' }))))));
}

function askTakeover(onYes) {
  const root = document.getElementById('modal-root');
  root.replaceChildren(h('div.modal-wrap', {}, h('div.modal', { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'tab-title' },
    h('div.modal-head', {}, h('h2', { id: 'tab-title' }, 'Asterwake is open in another tab')),
    h('div.modal-body', {}, h('p', {}, 'Only one tab can run your village at a time. If you continue here, the other tab stops and this one picks up exactly where it left off.'),
      h('div.row.end', {}, button('Continue here', () => { root.replaceChildren(); onYes(); }, { kind: 'primary' }))))));
}

function startGame() {
  lock.claim();
  let saved = null;
  let loadError = null;
  if (storageAvailable()) {
    try { saved = loadGame(); } catch (err) { loadError = err; }
  }
  if (saved) return begin(saved, false);
  // First visit: the village is visible (and waiting) behind the naming dialog.
  const state = newGame({ now: Date.now() });
  state.paused = true;
  begin(state, true);
  if (!storageAvailable()) showSaveProblem(new Error('Storage unavailable'));
  if (loadError) game.ui.toast('attention', `${loadError.message} A new village was started; the old save is kept as the recoverable backup.`, { force: true });
  game.ui.modal(newVillageView((opts) => {
    game.ui.closeModal();
    Object.assign(game.state.village, opts);
    game.state.paused = false;
    game.state.lastTick = Date.now();
    game.applyIdentity();
    bump();
    game.ui.refresh(true);
    game.saveNow(false);
  }), { dismissable: false });
}

function showTooltip(id, e) {
  const tip = document.getElementById('tooltip');
  if (!id || !game.ui) { tip.hidden = true; return; }
  const s = game.state;
  let title = '';
  let line = '';
  if (id.startsWith('spawn:')) {
    const sp = SPAWNS.find((x) => `spawn:${x.id}` === id);
    const n = s.battle ? s.battle.n : s.night;
    title = sp.name;
    line = sp.opens <= n ? 'Open: enemies come from here.' : `Sealed until night ${sp.opens}.`;
  } else {
    const def = BUILDINGS[id];
    const b = s.buildings[id];
    title = b.level >= 1 ? `${def.name}${def.upgradable ? `, level ${b.level}` : ''}` : `${def.name} (ruin)`;
    line = id === 'walls' ? `Integrity ${Math.ceil(s.integrity)}.` : b.level >= 1 ? `${def.blurb.split('. ')[0].replace(/\.$/, '')}.` : 'Waiting to be restored.';
  }
  tip.replaceChildren(h('strong', {}, title), h('span', {}, line));
  tip.hidden = false;
  tip.style.left = `${e.clientX + 14}px`;
  tip.style.top = `${e.clientY + 14}px`;
}

function boot() {
  const canvas = document.getElementById('scene');
  try {
    game.diorama = new Diorama(canvas, {
      onSelect: (id) => game.ui?.select(id),
      onHover: (id, e) => showTooltip(id, e),
      onFx: (kind) => { if (!document.hidden && game.state && !game.state.paused) sound(kind); },
    });
  } catch (err) {
    document.getElementById('app').replaceChildren(h('div.fatal', {}, h('h1', {}, 'Asterwake needs 3D graphics'), h('p', {}, 'This browser could not start WebGL. Try a current version of Chrome, Firefox, Safari or Edge, with hardware acceleration turned on.')));
    console.error(err);
    return;
  }
  const startAudio = () => game.audio.start();
  window.addEventListener('pointerdown', startAudio, { once: true });
  window.addEventListener('keydown', startAudio, { once: true });
  lock = createTabLock({ onLost: lostTab });
  if (lock.otherActive()) askTakeover(startGame);
  else startGame();
  requestAnimationFrame(frame);
}

window.asterwake = game; // handy for debugging in the console
boot();
