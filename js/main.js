// Glasswood: boot, the game loop, saving and the link between simulation,
// the Watch view and the notes on the desk.
import { Scene, preloadImages } from './render/scene.js';
import { Desk, slip } from './ui/notes.js';
import * as kit from './ui/kit.js';
import { h, dur } from './ui/dom.js';
import { Audio } from './audio/audio.js';
import { newGame } from './sim/state.js';
import { makeEvents, pump, catchUp, callNight, AWAY_GAP } from './sim/time.js';
import { checkObjectives, queueUpgrade, placeBarricade, removeBarricade, barricadeBlocker, postWorker, unpostWorker } from './sim/village.js';
import { storageAvailable, saveGame, loadGame, exportCode, parseImport, deleteSave, downloadText } from './persist/save.js';
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
  autoView(ev);
  for (const e of ev.list) {
    if (e.cat === 'upgrade') {
      // a finished building: its new drawing settles in, and the slip says what it brings
      game.view.sync(game.state, hoverPreview());
      game.view.views.hearth.celebrate(e.building);
      game.desk.say('done', `${e.text}. ${e.gain}`);
      continue;
    }
    if (e.level === 'attention' || e.level === 'done') game.desk.say(e.level, e.text);
  }
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
game.post = (id) => game.act((s) => postWorker(s, id));
game.unpost = (id) => game.act((s) => unpostWorker(s, id));
game.callNight = () => game.act((s, ev) => callNight(s, ev));
game.edge = (key) => game.act((s) => (s.barricades.includes(key) ? removeBarricade(s, key) : placeBarricade(s, key)));

// ---------- views ----------
game.setView = (name, auto = false) => {
  const s = game.state;
  if (!auto) s.ui.autoReturn = null;
  s.ui.view = name;
  game.view.setView(name);
  game.view.sync(s, hoverPreview());
  game.desk.refresh();
  if (!auto) {
    game.touch();
    const sc = document.getElementById('scene');
    if (sc.getBoundingClientRect().top < -40) sc.scrollIntoView({ behavior: game.state.settings.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
};
// Move to the Watch at dusk, and back to where you were a moment after dawn.
function autoView(ev) {
  const s = game.state;
  if (!s.settings.autoView) return;
  for (const e of ev.list) {
    if (e.cat === 'dusk' && s.ui.view !== 'watch') { s.ui.autoReturn = s.ui.view; game.setView('watch', true); }
    if (e.cat === 'night' && s.ui.autoReturn) {
      const back = s.ui.autoReturn;
      setTimeout(() => { if (game.state.phase === 'day' && game.state.ui.autoReturn === back) { game.state.ui.autoReturn = null; game.setView(back, true); } }, 4000);
    }
  }
}

// ---------- settings ----------
function applySettings() {
  const st = game.state.settings;
  const v = st.sound ? st.volume : { master: 0, music: 0, ambience: 0, ui: 0 };
  game.audio.setVolumes({ ...v });
  document.body.classList.toggle('reduced-motion', !!st.reducedMotion);
}
game.openSettings = () => {
  const st = game.state.settings;
  const save = () => { applySettings(); game.touch(); };
  const toggle = (label, key, hint) => h('label.check', {}, h('input', { type: 'checkbox', checked: st[key], onchange: (e) => { st[key] = e.target.checked; save(); } }), h('span', {}, label, hint ? h('span.small', { style: { display: 'block', fontFamily: 'var(--sa)', color: '#5a3e26' } }, hint) : null));
  const slider = (label, key) => h('label.slider', {}, h('span', {}, label), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st.volume[key], oninput: (e) => { st.volume[key] = Number(e.target.value); save(); } }));
  game.desk.overlay((body, close) => {
    const io = h('div.stack', { hidden: true });
    const area = h('textarea', { rows: 3, 'aria-label': 'Save code', style: { width: '100%', font: '13px var(--sa)', background: 'rgba(255,248,230,.5)', border: '1px solid #5a3e26', color: '#23170f' } });
    io.append(area, h('div.row', {}, slip('Load this code', () => {
      try { const data = parseImport(area.value); game.state = data; game.saveNow(); game.leaving = true; location.reload(); } catch (err) { game.desk.say('attention', err.message); }
    })));
    body.append(h('div.stack', {},
      h('div.row.between', {}, h('h2', {}, 'Settings'), h('button.close', { type: 'button', onclick: close, 'aria-label': 'Close settings' }, '×')),
      h('h3', { style: { marginTop: '6px' } }, 'Sound'),
      toggle('Sound on', 'sound', 'Music, the forest at night, and the noises of battle.'),
      slider('Everything', 'master'), slider('Music', 'music'), slider('Forest and wind', 'ambience'), slider('Battle and buttons', 'ui'),
      h('h3', { style: { marginTop: '6px' } }, 'Play'),
      toggle('Look through the reading glass at dusk', 'autoView', 'Moves to the Watch when night falls, and back again after dawn.'),
      toggle('Less motion', 'reducedMotion', 'Stills the fireflies, marching routes and sliding lenses.'),
      h('h3', { style: { marginTop: '6px' } }, 'Your village'),
      h('div.row', { style: { flexWrap: 'wrap', gap: '10px' } },
        slip('Download a save', () => downloadText(`${game.state.village.name}-glasswood.txt`, exportCode(game.state))),
        slip('Copy save code', () => { area.value = exportCode(game.state); io.hidden = false; area.select(); navigator.clipboard?.writeText(area.value).then(() => game.desk.say('done', 'Save code copied.'), () => {}); }),
        slip('Load a save code', () => { io.hidden = false; area.value = ''; area.focus(); }),
        slip('Start over', () => {
          if (!confirm(`Start a new village? ${game.state.village.name} will be kept as a backup you can load again.`)) return;
          game.leaving = true; deleteSave(); location.reload();
        })),
      io,
      h('p.hand.small', { style: { margin: '4px 0 0' } }, 'Keys: 1, 2 and 3 switch views. N calls the night, X changes night speed, Space pauses, O opens settings.')));
  });
};

let hoverKey = null;
function hoverPreview() {
  const s = game.state;
  if (!hoverKey || s.phase !== 'day' || s.barricades.includes(hoverKey)) return null;
  return barricadeBlocker(s, hoverKey) ? null : hoverKey;
}

game.touch = () => { clearTimeout(game.saveTimer); game.saveTimer = setTimeout(() => game.saveNow(), 1200); };
game.saveNow = () => {
  if (!game.state || !lock?.isOwner() || game.leaving) return;
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
    h('div.row.between', {}, h('h2', {}, 'While you were away'), h('span.fact', { title: r.credited < r.elapsed ? `Only the first ${dur(r.credited)} count` : '' }, kit.icon('time'), h('b', {}, dur(r.elapsed)))),
    kit.facts(
      kit.fact('moon', r.nights, r.nights ? `Quiet nights held at night ${r.safe}` : 'Hold a night yourself, and time away will hold nights too'),
      kit.fact('coin', `+${r.gold}`, 'Gold'),
      kit.fact('timber', `+${r.timber || 0}`, 'Timber'),
      kit.fact('stone', `+${r.stone || 0}`, 'Stone'),
      r.arrived ? kit.fact('people', `+${r.arrived}`, 'Villagers who settled') : null),
    r.interrupted ? kit.hint(`Night ${r.interrupted} will come again`, 'soft') : null,
    h('div.row', { style: { marginTop: '6px' } }, kit.seal('Back', close)))));
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
  if (e.target.closest('input, textarea') || !document.getElementById('overlay').hidden) { if (e.key === 'Escape') document.querySelector('#overlay .close')?.click(); return; }
  const s = game.state;
  if (e.key === '1') game.setView('wilds');
  else if (e.key === '2') game.setView('watch');
  else if (e.key === '3') game.setView('hearth');
  else if (e.key === 'o' || e.key === 'O') game.openSettings();
  else if (e.key === 'n' || e.key === 'N') { if (s.phase === 'day') game.callNight(); }
  else if (e.key === 'x' || e.key === 'X') { if (s.phase === 'night') game.act((st) => { st.speed = st.speed === 1 ? 2 : 1; return { ok: true }; }); }
  else if (e.key === ' ' && !e.target.closest('button, [role="button"]')) {
    e.preventDefault();
    game.act((st) => { st.paused = !st.paused; st.lastTick = Date.now(); return { ok: true }; });
    game.desk.say('done', s.paused ? 'Paused. Press Space to carry on.' : 'Carrying on.');
  }
}

function begin(state, fresh) {
  game.state = state;
  preloadImages();
  game.view = new Scene(document.getElementById('scene'), {
    onEdge: (key) => { if (game.state.phase === 'day') game.edge(key); else game.desk.say('attention', 'Barricades can only be moved by day.'); },
    onEdgeHover: (key) => { hoverKey = key; game.desk.setHover(key); game.view.sync(game.state, hoverPreview()); },
    onFx: (kind) => { if (!document.hidden && !game.state.paused) sound(kind); },
    onSpawn: (id) => {
      const sp = SPAWNS.find((x) => x.id === id);
      const n = game.state.battle ? game.state.battle.n : game.state.night;
      game.act((st) => { st.objectives.flags.selected = true; return { ok: true }; });
      game.desk.say('done', `${sp.name}: ${sp.opens <= n ? 'open' : `opens night ${sp.opens}`}`);
    },
    onStep: (dir) => { const order = ['wilds', 'watch', 'hearth']; const i = order.indexOf(game.state.ui.view) + dir; if (i >= 0 && i < order.length) game.setView(order[i]); },
    onPlace: (id) => { game.state.ui.place = id; game.view.views.wilds.select(id); game.act((st) => { st.objectives.flags.selected = true; return { ok: true }; }); },
    onBuilding: (id) => { game.state.ui.building = id; game.view.views.hearth.select(id); game.act((st) => { st.objectives.flags.selected = true; return { ok: true }; }); },
  });
  game.desk = new Desk(game);
  state.ui.view ||= 'watch';
  game.view.setView(state.ui.view);
  if (state.ui.place) game.view.views.wilds.select(state.ui.place);
  game.view.views.hearth.select(state.ui.building || 'archery');
  applySettings();
  running = true;
  if (state.restarted) {
    // a save from before the village started in ruins
    delete state.restarted;
    game.desk.overlay((body, close) => body.append(h('div.stack', {},
      h('h2', {}, `${state.village.name}, from the ruins`),
      kit.hint('The village now starts overgrown, and grows back one building at a time. Your old village could not come along.', 'soft'),
      h('div.row', { style: { marginTop: '6px' } }, kit.seal('Begin', close)))));
  } else if (!fresh) runCatchUp();
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
      game.desk.say('done', `${game.state.village.name} lights its lanterns`);
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
