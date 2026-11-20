// Glasswood: boot, the game loop, saving and the link between simulation,
// the Watch view and the notes on the desk.
import { Scene, preloadImages } from './render/scene.js';
import { Desk, slip } from './ui/notes.js';
import * as kit from './ui/kit.js';
import { h, dur } from './ui/dom.js';
import { Audio } from './audio/audio.js';
import { newGame, newRun } from './sim/state.js';
import { makeEvents, pump, callNight } from './sim/time.js';
import { placeBarricade, removeBarricade, barricadeBlocker } from './sim/village.js';
import { pick, reroll, endRun, beginRun, buyUnlock, buyUpgrade, sendExpedition } from './sim/run.js';
import { UPGRADES } from './sim/build.js';
import { UNLOCK } from './data/unlocks.js';
import { CARD } from './data/cards.js';
import { castSpell } from './sim/battle.js';
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
  for (const e of ev.list) if (e.level === 'attention' || e.level === 'done') game.desk.say(e.level, e.text);
  if (ev.list.length || ev.changed) {
    game.desk.refresh();
    game.view.sync(game.state, hoverPreview());
    game.touch();
  }
  // the draft and the end of a run open on their own
  const ph = game.state.phase;
  if (ph !== game.shownPhase && !game.menuOpen) {
    game.shownPhase = ph;
    if (ph === 'draft' || ph === 'starter' || ph === 'bonus') game.desk.draft();
    if (ph === 'over') game.desk.runOver();
    if (ph !== 'night') game.arm(null);
  }
}

// Every player action goes through here: run it, report a refusal, refresh.
game.act = (fn) => {
  const ev = makeEvents(game.state, sound);
  const r = fn(game.state, ev) || { ok: true };
  if (r.ok === false) { game.desk.say('attention', r.reason || 'That is not possible right now.'); game.audio.play('warn'); return r; }
  ev.changed = true;
  handleEvents(ev);
  return r;
};
game.callNight = () => game.act((s, ev) => callNight(s, ev));
game.pick = (id) => {
  const r = game.act((s) => pick(s, id));
  if (r.ok) {
    document.getElementById('overlay').hidden = true;
    game.desk.say('done', `${r.card.name}: ${r.card.text}`);
    const bld = { defender: 'archery', tower: 'archery', fortify: 'walls', toolkit: 'workshop', spell: 'shrine' }[r.card.family];
    game.view.views.hearth.celebrate(bld);
  }
  return r;
};
game.upgrade = (id) => {
  const r = game.act((s) => buyUpgrade(s, id));
  if (r.ok) {
    game.desk.say('done', `${UPGRADES[id].name}, level ${r.level}: ${UPGRADES[id].text}`);
    game.view.views.hearth.celebrate(id);
    game.audio.play('upgrade');
  }
  return r;
};
game.expedition = (id) => {
  const r = game.act((s) => sendExpedition(s, id));
  if (r.ok) {
    const w = r.reward;
    game.desk.say('done', `${r.place.name}: ${w.gold ? `+${w.gold} gold` : w.reroll ? `+${w.reroll} free rerolls` : w.embers ? `+${w.embers} Embers` : 'choose a card'}`);
    game.audio.play('build');
  }
  return r;
};
game.selectPlace = (id) => { game.state.ui.place = id; game.view.views.wilds.select(id); game.act(() => ({ ok: true })); };
game.reroll = () => { const r = game.act((s) => reroll(s)); if (r.ok) game.desk.draft(); };
game.newRun = (abandon = false) => {
  const s = game.state;
  if (abandon && s.phase !== 'over') { s.battle = null; endRun(s, null); }
  newRun(s, undefined, Date.now());
  beginRun(s);
  game.closeMenu(false);
  game.shownPhase = null;
  document.getElementById('overlay').hidden = true;
  game.act(() => ({ ok: true }));
  game.desk.say('done', 'A new forest grows in the globe');
};
// the very first run, after the village is named
game.begin = () => {
  beginRun(game.state);
  game.shownPhase = null;
  game.act(() => ({ ok: true }));
};
game.buy = (id) => {
  const r = game.act((s) => buyUnlock(s, id));
  if (r.ok) { const u = UNLOCK[id]; game.desk.say('done', u.kind === 'card' ? `${CARD[u.card].name} joins the deck` : `${u.name} bought`); game.audio.play('build'); }
  return r;
};

// ---------- the menu: pauses the game while it is open ----------
game.openMenu = (opts = {}) => {
  const s = game.state;
  if (!game.menuOpen) { game.menuOpen = true; game.menuPaused = s.paused; s.paused = true; }
  game.menuFresh = !!opts.fresh;
  game.arm(null);
  game.desk.menu(opts);
};
game.closeMenu = (reopen = true) => {
  if (!game.menuOpen) return;
  const s = game.state;
  game.menuOpen = false;
  s.paused = !!game.menuPaused;
  s.lastTick = Date.now();
  const root = document.getElementById('overlay');
  root.hidden = true; root.replaceChildren();
  if (!reopen) return;
  // put back whatever the phase needs on the desk
  if (s.phase === 'draft' || s.phase === 'starter') game.desk.draft();
  else if (s.phase === 'over') game.desk.runOver();
  game.shownPhase = s.phase;
  game.desk.refresh();
};
// Spells: arm one, then click the glass (Mend needs no aim).
game.armed = null;
game.arm = (id) => {
  game.armed = id;
  document.body.classList.toggle('armed', !!id);
  game.desk?.refreshSpells?.();
};
game.cast = (id, x = 0, z = 0) => {
  const r = game.act((s) => castSpell(s, id, x, z));
  if (r.ok) game.arm(null);
  return r;
};
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
  game.desk.overlay((body, closeOverlay) => {
    // from the menu, closing settings goes back to the menu
    const close = () => { closeOverlay(); if (game.menuOpen) game.desk.menu({ fresh: game.menuFresh }); };
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
      toggle('Move to the Watch at dusk', 'autoView', 'Off by default: the view stays where you are when night falls.'),
      toggle('Less motion', 'reducedMotion', 'Stills the fireflies, marching routes and sliding lenses.'),
      h('h3', { style: { marginTop: '6px' } }, 'Your village'),
      h('div.row', { style: { flexWrap: 'wrap', gap: '10px' } },
        slip('Download a save', () => downloadText(`${game.state.village.name}-glasswood.txt`, exportCode(game.state))),
        slip('Copy save code', () => { area.value = exportCode(game.state); io.hidden = false; area.select(); navigator.clipboard?.writeText(area.value).then(() => game.desk.say('done', 'Save code copied.'), () => {}); }),
        slip('Load a save code', () => { io.hidden = false; area.value = ''; area.focus(); }),
        slip('Give up this run', () => {
          if (!confirm('End this run now? Its Embers are kept.')) return;
          game.closeMenu(false);
          closeOverlay();
          game.act((st, ev) => { st.battle = null; endRun(st, ev); return { ok: true }; });
        }),
        slip('Erase everything', () => {
          if (!confirm('Erase all progress, Embers included? A backup is kept.')) return;
          game.leaving = true; deleteSave(); location.reload();
        })),
      io,
      h('p.hand.small', { style: { margin: '4px 0 0' } }, 'Keys: 1, 2 and 3 switch views. N calls the night, Q W E R cast spells, Space pauses, Esc opens the menu, O settings.')));
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

function step() {
  if (!running || !lock.isOwner()) return;
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
    const target = s.phase === 'night' ? 1 : 0.25;
    nightF += (target - nightF) * Math.min(1, dt * 1.5);
    const reduced = s.settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    game.view.frame(dt, s, Math.min(1, carry.alpha ?? 1), nightF, reduced);
    if (now - lastUi > 250) { lastUi = now; game.desk.refresh(); }
  }
  requestAnimationFrame(frame);
}

function keys(e) {
  if (e.target.closest('input, textarea') || !document.getElementById('overlay').hidden) {
    if (e.key !== 'Escape') return;
    if (game.menuOpen) { if (!game.menuFresh) game.closeMenu(); }
    else if (document.querySelector('#overlay .close')) document.querySelector('#overlay .close').click();
    else game.openMenu();
    return;
  }
  const s = game.state;
  if (e.key === '1') game.setView('wilds');
  else if (e.key === '2') game.setView('watch');
  else if (e.key === '3') game.setView('hearth');
  else if (e.key === 'o' || e.key === 'O') game.openSettings();
  else if (e.key === 'n' || e.key === 'N') { if (s.phase === 'day') game.callNight(); }
  else if (s.phase === 'night' && /^[qwer]$/i.test(e.key)) game.desk.spellKey('qwer'.indexOf(e.key.toLowerCase()));
  else if (e.key === 'Escape') { if (game.armed) game.arm(null); else game.openMenu(); }
  else if (e.key === 'm' || e.key === 'M') game.openMenu();
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
    onEdge: (key) => { if (game.state.phase === 'day') game.edge(key); else if (!game.armed) game.desk.say('attention', 'Barricades can only be moved between nights.'); },
    onGlass: (x, z) => { if (game.armed && game.state.phase === 'night') game.cast(game.armed, x, z); },
    onEdgeHover: (key) => { hoverKey = key; game.desk.setHover(key); game.view.sync(game.state, hoverPreview()); },
    onFx: (kind) => { if (!document.hidden && !game.state.paused) sound(kind); },
    onSpawn: (id) => {
      const sp = SPAWNS.find((x) => x.id === id);
      const n = game.state.battle ? game.state.battle.n : game.state.night;
      game.desk.say('done', `${sp.name}: ${sp.opens <= n ? 'open' : `opens night ${sp.opens}`}`);
    },
    onStep: (dir) => { const order = ['wilds', 'watch', 'hearth']; const i = order.indexOf(game.state.ui.view) + dir; if (i >= 0 && i < order.length) game.setView(order[i]); },
    onPlace: (id) => { game.state.ui.place = id; game.view.views.wilds.select(id); game.act(() => ({ ok: true })); },
    onBuilding: (id) => { game.state.ui.building = id; game.view.views.hearth.select(id); game.act(() => ({ ok: true })); },
  });
  game.desk = new Desk(game);
  state.ui.view ||= 'watch';
  game.view.setView(state.ui.view);
  if (state.ui.place) game.view.views.wilds.select(state.ui.place);
  game.view.views.hearth.select(state.ui.building || 'archery');
  applySettings();
  running = true;
  const restarted = !!state.restarted;
  delete state.restarted;
  game.shownPhase = state.phase;
  game.desk.refresh();
  game.view.sync(state, null);
  // every visit opens on the menu
  game.openMenu({ fresh: fresh || restarted });
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
  begin(newGame({ now: Date.now() }), true);
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
