import { Diorama } from './render/diorama.js';
import { Audio } from './audio/audio.js';
import { UI } from './ui/app.js';
import { h, button, dur } from './ui/dom.js';
import { summaryView, newCivView } from './ui/otherViews.js';
import { statusOf } from './ui/colonyViews.js';
import { BUILDINGS } from './data/buildings.js';
import { newGame, getColony } from './sim/state.js';
import { makeEvents, catchUp } from './sim/tick.js';
import { checkObjectives } from './sim/objectives.js';
import {
  storageAvailable, saveGame, loadGame, loadBackup, deleteSave, exportCode, parseImport, summarizeSave, downloadText,
} from './persist/save.js';
import { createTabLock } from './persist/tablock.js';

const AWAY_SUMMARY = 60; // seconds away before a return summary appears
const SAVE_EVERY = 15000;

const game = {
  state: null,
  diorama: null,
  audio: new Audio(),
  ui: null,
  lastSave: 0,
  saveError: null,
  pending: null,
};

let saveTimer = null;
let running = false;
let lock = null;

function bump() { game.state._rev = (game.state._rev || 0) + 1; }

game.act = (fn, opts = {}) => {
  const r = fn(game.state) || { ok: true };
  if (r.ok === false) {
    game.ui.toast('attention', r.reason || 'That is not possible right now.', { force: true });
    game.audio.play('warn');
    return r;
  }
  bump();
  if (opts.sound) game.audio.play(opts.sound);
  const ev = game.events();
  checkObjectives(game.state, ev);
  flushPending();
  game.ui.refresh(true);
  syncScene();
  game.touch();
  return r;
};

game.events = () => (game.pending ||= makeEvents(game.state));

function flushPending() {
  if (!game.pending) return;
  const ev = game.pending;
  game.pending = null;
  handleEvents(ev);
}

game.touch = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => game.saveNow(false), 1200);
};

game.saveNow = (manual) => {
  if (!game.state || !lock?.isOwner()) return;
  const ind = game.ui?.saveInd;
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
  updateSaveIndicator(ind);
};

function updateSaveIndicator(ind = game.ui?.saveInd) {
  if (!ind) return;
  if (game.saveError) {
    ind.textContent = '⚠ Save problem';
    ind.classList.add('error');
    ind.title = 'Progress could not be saved. Click to export a backup.';
    ind.onclick = () => game.exportSave();
    return;
  }
  ind.classList.remove('error');
  ind.onclick = () => game.saveNow(true);
  const ago = (Date.now() - game.lastSave) / 1000;
  ind.textContent = !game.lastSave ? 'Not saved yet' : ago < 10 ? '✓ Saved' : `✓ Saved ${dur(ago)} ago`;
  ind.title = 'Saved in this browser. Click to save now.';
}

function showSaveProblem(err) {
  const b = document.getElementById('banner');
  b.hidden = false;
  b.replaceChildren(
    h('p', {}, h('strong', {}, 'Progress could not be saved in this browser. '), storageAvailable() ? 'Storage may be full.' : 'Browser storage is turned off or unavailable (private mode can do this).', ' Export a save code now to keep this session.'),
    button('Export save', () => game.exportSave(), { kind: 'primary' }),
    button('Try again', () => game.saveNow(true)),
  );
  console.warn('Save failed', err);
}

game.exportSave = () => {
  const code = exportCode(game.state);
  const name = `asterwake-${game.state.civ.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
  try { downloadText(name, code); } catch { /* fall through to copy */ }
  navigator.clipboard?.writeText(code).then(() => game.ui.toast('info', 'Save exported as a file and copied to the clipboard.', { force: true }), () => game.ui.toast('info', 'Save exported as a file.', { force: true }));
};

game.parseImport = parseImport;
game.summarize = summarizeSave;

game.loadState = (data, msg) => {
  if (game.state) { try { saveGame(game.state); } catch { /* keep going */ } }
  game.state = data;
  data.lastTick = Math.min(data.lastTick || Date.now(), Date.now());
  game.diorama.setColony(getColony(data, data.ui.colonyId) || data.colonies[0]);
  game.applySettings();
  game.applyIdentity();
  const away = runCatchUp(true);
  game.ui.open('colony');
  bump();
  game.ui.refresh(true);
  game.saveNow(false);
  if (msg) game.ui.toast('info', msg, { force: true });
  if (!away) syncScene();
};

game.restoreBackup = () => {
  const b = loadBackup();
  if (!b) { game.ui.toast('attention', 'There is no recent backup in this browser yet. Backups are made every few minutes while you play.', { force: true }); return; }
  const sm = summarizeSave(b);
  game.ui.confirm({
    title: 'Restore the recent backup?',
    body: `${sm.civ}: ${sm.colonists} colonists, ${sm.techs} technologies, ${sm.hours.toFixed(1)} hours played. The current game is kept as the new backup.`,
    ok: 'Restore backup',
    onOk: () => game.loadState(b, 'Backup restored.'),
  });
};

game.startOver = () => {
  deleteSave();
  game.ui.modal(newCivView((opts) => {
    game.ui.closeModal();
    game.loadState(newGame(opts), `${opts.civName} begins.`);
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
  const col = game.state.civ.color;
  document.documentElement.style.setProperty('--accent', col);
  game.diorama.setAccent(col);
};

game.fullscreen = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => game.ui.toast('attention', 'Full screen is not available in this browser.', { force: true }));
};

// ---------- events → toasts and sounds ----------

function handleEvents(ev) {
  if (!ev.list.length) return;
  bump();
  let sound = null;
  for (const e of ev.list) {
    game.ui.toast(e.level, e.text, e);
    if (e.level === 'attention') sound = 'warn';
    else if (!sound && e.cat === 'research') sound = 'research';
    else if (!sound && e.cat === 'recruit') sound = 'recruit';
    else if (!sound && e.level === 'done') sound = 'done';
  }
  if (sound) game.audio.play(sound);
}

function syncScene() {
  const s = game.state;
  const c = getColony(s, s.ui.colonyId) || s.colonies[0];
  game.diorama.sync(c, game.ui.snap(), { state: s });
}

// Credits elapsed real time. Long gaps show a return summary instead of toasts.
function runCatchUp(showSummary) {
  const s = game.state;
  const now = Date.now();
  const gap = (now - s.lastTick) / 1000;
  if (gap <= AWAY_SUMMARY) return false;
  const before = {};
  for (const c of s.colonies) before[c.id] = { ...c.inv };
  const ev = makeEvents(s);
  const r = catchUp(s, now, ev);
  bump();
  game.ui.refresh(true);
  syncScene();
  if (showSummary) game.ui.modal(summaryView(game.ui, { ...r, ev, before }));
  game.saveNow(false);
  return true;
}

function simStep() {
  if (!running || !lock.isOwner() || document.hidden) return;
  if (runCatchUp(true)) return;
  const ev = makeEvents(game.state);
  catchUp(game.state, Date.now(), ev);
  flushPending();
  handleEvents(ev);
  game.ui.refresh(ev.changed);
  syncScene();
}

function frame() {
  if (running) game.diorama.frame();
  requestAnimationFrame(frame);
}

// ---------- boot ----------

function begin(state, fresh) {
  game.state = state;
  game.ui = new UI(game);
  game.applySettings();
  game.applyIdentity();
  game.diorama.setColony(getColony(state, state.ui.colonyId) || state.colonies[0]);
  running = true;
  const away = !fresh && runCatchUp(true);
  if (!away) { const ev = makeEvents(state); catchUp(state, Date.now(), ev); }
  bump();
  game.ui.refresh(true);
  syncScene();
  game.saveNow(false);
  setInterval(simStep, 250);
  setInterval(() => game.saveNow(false), SAVE_EVERY);
  setInterval(() => updateSaveIndicator(), 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.saveNow(false);
    else simStep();
  });
  window.addEventListener('pagehide', () => game.saveNow(false));
}

function lostTab() {
  running = false;
  const wrap = document.getElementById('modal-root');
  wrap.replaceChildren(h('div.modal-wrap', {}, h('div.modal', { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'lost-title' },
    h('div.modal-head', {}, h('h2', { id: 'lost-title' }, 'Continued in another tab')),
    h('div.modal-body', {}, h('p', {}, 'Your civilization is now running in another tab, so this one has stopped to avoid two sessions spending the same progress.'),
      h('div.row.end', {}, button('Continue here instead', () => location.reload(), { kind: 'primary' }))))));
}

function askTakeover(onYes) {
  const wrap = document.getElementById('modal-root');
  wrap.replaceChildren(h('div.modal-wrap', {}, h('div.modal', { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'tab-title' },
    h('div.modal-head', {}, h('h2', { id: 'tab-title' }, 'Asterwake is open in another tab')),
    h('div.modal-body', {}, h('p', {}, 'Only one tab can run your civilization at a time. If you continue here, the other tab stops and this one picks up exactly where it left off.'),
      h('div.row.end', {}, button('Continue here', () => { wrap.replaceChildren(); onYes(); }, { kind: 'primary' }))))));
}

function startGame() {
  lock.claim();
  let saved = null;
  let loadError = null;
  if (storageAvailable()) {
    try { saved = loadGame(); } catch (err) { loadError = err; }
  }
  if (saved) return begin(saved, false);
  // first visit: a fresh colony is visible behind the naming dialog
  const state = newGame({ now: Date.now() });
  begin(state, true);
  if (!storageAvailable()) showSaveProblem(new Error('Storage unavailable'));
  if (loadError) game.ui.toast('attention', `The saved game could not be read (${loadError.message}). A new colony was started; the old save is kept as the recoverable backup.`, { force: true });
  game.ui.modal(newCivView((opts) => {
    game.ui.closeModal();
    Object.assign(game.state.civ, { name: opts.civName, emblem: opts.emblem, color: opts.color });
    game.applyIdentity();
    bump();
    game.ui.refresh(true);
    game.saveNow(false);
  }), { dismissable: false });
}

function boot() {
  const canvas = document.getElementById('scene');
  try {
    game.diorama = new Diorama(canvas, {
      onSelect: (bid) => game.ui?.selectBuilding(bid),
      onPlot: (plot, pt) => game.ui?.pickPlot(plot, pt),
      onPlotHover: (plot) => game.ui?.hoverPlot(plot),
      onHover: (bid, e) => showTooltip(bid, e),
    });
  } catch (err) {
    document.getElementById('app').replaceChildren(h('div.fatal', {}, h('h1', {}, 'Asterwake needs 3D graphics'), h('p', {}, 'This browser could not start WebGL. Try a current version of Chrome, Firefox, Safari or Edge, and check that hardware acceleration is turned on.')));
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

function showTooltip(bid, e) {
  const tip = document.getElementById('tooltip');
  if (!bid || !game.ui || game.ui.placing) { tip.hidden = true; return; }
  const c = game.ui.colony();
  const b = c.buildings.find((x) => x.id === bid);
  if (!b) { tip.hidden = true; return; }
  const st = statusOf(game.ui, b);
  tip.replaceChildren(h('strong', {}, `${BUILDINGS[b.type].name}${b.level >= 1 ? `, level ${b.level}` : ''}`), h('span', {}, `${st.mark} ${st.text.split('. ')[0].replace(/\.$/, '')}.`));
  tip.hidden = false;
  tip.style.left = `${e.clientX + 14}px`;
  tip.style.top = `${e.clientY + 14}px`;
}

window.asterwake = game; // handy for debugging in the console
boot();
