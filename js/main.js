// Glasswood: boot, the game loop, saving and the link between simulation,
// the Watch view and the notes on the desk.
import { WatchView } from './render/watch.js';
import { Desk } from './ui/notes.js';
import { h, dur } from './ui/dom.js';
import { Audio } from './audio/audio.js';
import { newGame } from './sim/state.js';
import { makeEvents, pump, catchUp, callNight, AWAY_GAP } from './sim/time.js';
import { checkObjectives, queueUpgrade, placeBarricade, removeBarricade, barricadeBlocker } from './sim/village.js';
import { storageAvailable, saveGame, loadGame } from './persist/save.js';
import { createTabLock } from './persist/tablock.js';
import { SPAWNS } from './data/village.js';

const SAVE_EVERY = 15000;
const game = { state: null, audio: new Audio(), lastSave: 0 };
const carry = { ms: 0, alpha: 1 };
let lock = null;
let running = false;
let nightF = 0;
let lastFrame = performance.now();
const lastSound = {};

function sound(kind) {
  const now = performance.now();
  const gap = { hit: 70, death: 90, wall: 160 }[kind] || 0;
  if (gap && now - (lastSound[kind] || 0) < gap) return;
  lastSound[kind] = now;
  game.audio.play(kind);
}

function handleEvents(ev) {
  for (const e of ev.list) if (e.level === 'attention' || e.level === 'done') game.desk.say(e.level, e.text);
  if (ev.list.length || ev.changed) {
    game.desk.refresh();
    game.view.sync(game.state, hoverPreview());
    game.touch();
  }
}

// Every player action goes through here: run it, report a refusal, refresh.
game.act = (fn) => {
  const ev = makeEvents(game.state, sound);
  const r = fn(game.state, ev) || { ok: true };
  if (r.ok === false) { game.desk.say('attention', r.reason || 'That is not possible right now.'); game.audio.play('warn'); return r; }
  checkObjectives(game.state, ev);
  ev.changed = true;
  handleEvents(ev);
  return r;
};
game.upgrade = (id) => game.act((s) => queueUpgrade(s, id));
game.callNight = () => game.act((s, ev) => callNight(s, ev));
game.edge = (key) => game.act((s) => (s.barricades.includes(key) ? removeBarricade(s, key) : placeBarricade(s, key)));

let hoverKey = null;
function hoverPreview() {
  const s = game.state;
  if (!hoverKey || s.phase !== 'day' || s.barricades.includes(hoverKey)) return null;
  return barricadeBlocker(s, hoverKey) ? null : hoverKey;
}

game.touch = () => { clearTimeout(game.saveTimer); game.saveTimer = setTimeout(() => game.saveNow(), 1200); };
game.saveNow = () => {
  if (!game.state || !lock?.isOwner()) return;
  try { saveGame(game.state); game.lastSave = Date.now(); } catch (err) {
    if (!game.warnedSave) game.desk.say('attention', 'Progress could not be saved in this browser. Storage may be full or turned off.');
    game.warnedSave = true;
    console.warn('Save failed', err);
  }
};

// Time away: credit it once and show what happened on a note.
function runCatchUp() {
  const s = game.state;
  if ((Date.now() - s.lastTick) / 1000 <= AWAY_GAP) return false;
  const ev = makeEvents(s);
  const r = catchUp(s, Date.now(), ev);
  carry.ms = 0;
  handleEvents(ev);
  game.desk.overlay((body, close) => body.append(h('div.stack', {},
    h('h2', {}, 'While you were away'),
    h('p.hand.blue', { style: { fontSize: '17px', margin: 0 } }, `${dur(r.elapsed)} passed${r.credited < r.elapsed ? ` (the first ${dur(r.credited)} counted)` : ''}.`),
    r.interrupted ? h('p.hand.blue', { style: { margin: 0 } }, `Night ${r.interrupted} was called off when you left; it will come again.`) : null,
    r.nights ? h('p.hand.blue', { style: { margin: 0 } }, `The village held ${r.nights} quiet nights at night ${r.safe} and gathered ${r.gold} gold.`) : h('p.hand.blue', { style: { margin: 0 } }, 'No nights were fought while you were away. Hold a night yourself and later absences will earn gold.'),
    h('div.row', { style: { marginTop: '6px' } }, h('div.seal', { style: { '--size': '88px' } }, h('button', { type: 'button', onclick: close }, h('span', {}, 'Back to it')))))));
  game.saveNow();
  return true;
}

function step() {
  if (!running || !lock.isOwner()) return;
  if (runCatchUp()) return;
  const ev = makeEvents(game.state, document.hidden ? null : sound);
  pump(game.state, Date.now(), carry, ev);
  handleEvents(ev);
}

let lastUi = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (running) {
    step();
    const s = game.state;
    const target = s.phase === 'night' ? 1 : Math.max(0, (s.phaseT - (s.dayLength - 20)) / 20) * 0.6;
    nightF += (target - nightF) * Math.min(1, dt * 1.5);
    const reduced = s.settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    game.view.frame(dt, s, Math.min(1, carry.alpha ?? 1), nightF, reduced);
    if (now - lastUi > 250) { lastUi = now; game.desk.refresh(); }
  }
  requestAnimationFrame(frame);
}

function keys(e) {
  if (e.target.closest('input, textarea')) return;
  const s = game.state;
  if (e.key === 'n' || e.key === 'N') { if (s.phase === 'day') game.callNight(); }
  else if (e.key === 'x' || e.key === 'X') { if (s.phase === 'night') game.act((st) => { st.speed = st.speed === 1 ? 2 : 1; return { ok: true }; }); }
  else if (e.key === ' ' && !e.target.closest('button')) {
    e.preventDefault();
    game.act((st) => { st.paused = !st.paused; st.lastTick = Date.now(); return { ok: true }; });
    game.desk.say('done', s.paused ? 'Paused. Press Space to carry on.' : 'Carrying on.');
  }
}

function begin(state, fresh) {
  game.state = state;
  game.view = new WatchView(document.getElementById('scene'), {
    onEdge: (key) => { if (game.state.phase === 'day') game.edge(key); else game.desk.say('attention', 'Barricades can only be moved by day.'); },
    onEdgeHover: (key) => { hoverKey = key; game.desk.setHover(key); game.view.sync(game.state, hoverPreview()); },
    onFx: (kind) => { if (!document.hidden && !game.state.paused) sound(kind); },
    onSpawn: (id) => {
      const sp = SPAWNS.find((x) => x.id === id);
      const n = game.state.battle ? game.state.battle.n : game.state.night;
      game.act((st) => { st.objectives.flags.selected = true; return { ok: true }; });
      game.desk.say('done', `${sp.name}: ${sp.blurb} ${sp.opens <= n ? 'Open.' : `Opens on night ${sp.opens}.`}`);
    },
  });
  game.desk = new Desk(game);
  running = true;
  if (!fresh) runCatchUp();
  game.desk.refresh();
  game.view.sync(state, null);
  game.saveNow();
  setInterval(() => { if (document.hidden) step(); }, 250);
  setInterval(() => game.saveNow(), SAVE_EVERY);
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.saveNow(); });
  window.addEventListener('pagehide', () => game.saveNow());
  window.addEventListener('keydown', keys);
}

function startGame() {
  lock.claim();
  let saved = null;
  if (storageAvailable()) { try { saved = loadGame(); } catch (err) { console.warn(err); } }
  if (saved) return begin(saved, false);
  const state = newGame({ now: Date.now() });
  state.paused = true;
  begin(state, true);
  game.desk.overlay((body, close) => {
    const input = h('input', { type: 'text', value: 'Emberfold', maxlength: 24, 'aria-label': 'Village name' });
    const go = () => {
      game.state.village.name = input.value.trim() || 'Emberfold';
      game.state.paused = false;
      game.state.lastTick = Date.now();
      close();
      game.act(() => ({ ok: true }));
      game.desk.say('done', `${game.state.village.name} lights its lanterns. The first night comes when the candle burns down.`);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    body.append(h('div.stack', {},
      h('h2', {}, 'A village under glass'),
      h('p.hand.blue', { style: { fontSize: '17px', margin: 0, lineHeight: 1.45 } }, 'Inside the globe on your desk, a tiny village keeps watch over a dark forest. At night, creatures leave their burrows and walk the forest paths towards it. The tower’s archers fight on their own; you train them, mend the walls, and block paths so the creatures must take the long way round.'),
      h('label', { class: 'hand', style: { fontSize: '15px' } }, 'Name the village', input),
      h('div.row', { style: { marginTop: '6px' } }, h('div.seal', { style: { '--size': '92px' } }, h('button', { type: 'button', onclick: go }, h('span', {}, 'Light the<br>lanterns'.replace('<br>', ' ')))))));
  });
}

function boot() {
  const startAudio = () => game.audio.start();
  window.addEventListener('pointerdown', startAudio, { once: true });
  window.addEventListener('keydown', startAudio, { once: true });
  lock = createTabLock({ onLost: () => { running = false; game.desk?.overlay((body) => body.append(h('h2', {}, 'Continued in another tab'), h('p.hand.blue', {}, 'The village is now running in another tab. Reload this one to take it back.'))); } });
  startGame();
  requestAnimationFrame(frame);
}

window.glasswood = game; // handy for debugging in the console
boot();
