import { h, clear, fmt, dur, button, actionButton, progressBar } from './dom.js';
import { emblem, EMBLEM_PATHS } from './art.js';
import {
  BUILDINGS, BUILDING_ORDER, ENEMIES, SPAWNS, TARGETING, archeryStats, wallStats, OFFLINE_REWARD,
} from '../data/village.js';
import { CIV_COLORS, EMBLEMS } from '../data/people.js';
import { availableGold } from '../sim/state.js';
import { upgradeBlocker, upgradeCost, upgradeTime, queueUpgrade, levelCap, setTargeting } from '../sim/village.js';
import { nightPreview, activeSpawns, waveSchedule, safeNight } from '../sim/battle.js';
import { defaultField, routeFrom, spawnPos } from '../sim/map.js';
import { LOCATIONS, LOCATION_KINDS } from '../data/world.js';

const pct = (x) => `${Math.round(x * 100)}%`;

function statLines(rows) {
  return h('dl.stats', {}, rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
}

function upgradeSection(ui, id, benefit) {
  const s = ui.state;
  const def = BUILDINGS[id];
  const b = s.buildings[id];
  const sec = h('section.card', {});
  if (b.level >= def.max) {
    sec.append(h('h3', {}, `Level ${b.level}, the highest`), h('p.muted', {}, 'Fully upgraded.'));
    return sec;
  }
  const q = s.queue.find((x) => x.bid === id);
  sec.append(h('h3', {}, `Upgrade to level ${b.level + 1}`));
  if (benefit) sec.append(h('p', {}, benefit));
  const cost = upgradeCost(id, b.level);
  sec.append(h('p.cost-line', {}, h('span.gold-cost', {}, `${cost} gold`), h('span.muted', {}, `, ${dur(upgradeTime(id, b.level))} of work`)));
  if (q) {
    const i = s.queue.indexOf(q);
    sec.append(h('p.muted', {}, i === 0 ? 'The builders are working on it now.' : `Waiting for the builders (position ${i + 1}).`));
  } else {
    sec.append(actionButton(`Upgrade to level ${b.level + 1}`, upgradeBlocker(s, id), () => ui.g.act((st) => queueUpgrade(st, id), { sound: 'click' }), { kind: 'primary' }));
  }
  if (id !== 'townhall') sec.append(h('p.muted.small', {}, `Current limit from the Town Hall: level ${levelCap(s, id)}.`));
  return sec;
}

export function buildingView(ui, id) {
  const s = ui.state;
  const def = BUILDINGS[id];
  if (!def) return null;
  const b = s.buildings[id];
  const el = h('div.building-view');
  el.append(h('p.lead', {}, def.blurb));
  let update = null;

  if (id === 'archery') {
    const st = archeryStats(b.level);
    const nx = archeryStats(Math.min(def.max, b.level + 1));
    el.append(h('section.card', {}, h('h3', {}, 'Archers'),
      statLines([
        ['Damage per arrow', fmt(st.dmg, 1)],
        ['Shots per second', st.rate.toFixed(2)],
        ['Arrows per volley', st.shots === 2 ? '2 (double shot)' : '1'],
        ['Range from the village centre', `${st.range.toFixed(1)}`],
        ['Damage per second', fmt(st.dmg * st.rate * st.shots, 1)],
        ['Piercing', st.pierce ? 'Yes: half damage to a second enemy' : 'From level 10'],
      ]),
      h('p.muted.small', {}, 'The ring on the field shows how far the archers reach. Enemies are only hit inside it.')));
    el.append(h('section.card', {}, h('h3', {}, 'Targeting'),
      h('fieldset.seg', {}, h('legend', {}, 'Archers shoot at'),
        Object.entries(TARGETING).map(([k, t]) => h('label', { title: t.blurb }, h('input', { type: 'radio', name: 'targeting', checked: (b.target || 'first') === k, onchange: () => ui.g.act((x) => setTargeting(x, k), { sound: 'click' }) }), h('span', {}, t.name)))),
      h('p.muted.small', {}, TARGETING[b.target || 'first'].blurb)));
    let benefit = `Damage ${fmt(st.dmg, 1)} → ${fmt(nx.dmg, 1)}, shots per second ${st.rate.toFixed(2)} → ${nx.rate.toFixed(2)}, range ${st.range.toFixed(1)} → ${nx.range.toFixed(1)}.`;
    if (b.level + 1 === 5) benefit += ' Unlocks double shot: two targets per volley.';
    if (b.level + 1 === 10) benefit += ' Unlocks piercing arrows.';
    el.append(upgradeSection(ui, id, benefit));
  } else if (id === 'walls') {
    const st = wallStats(b.level);
    const nx = wallStats(Math.min(def.max, b.level + 1));
    const integ = h('dd');
    el.append(h('section.card', {}, h('h3', {}, 'Integrity'),
      h('dl.stats', {}, h('dt', {}, 'Integrity'), integ, h('dt', {}, 'Armour'), h('dd', {}, `${st.armor} (removed from every hit, at least 1 damage gets through)`)),
      h('p.muted.small', {}, 'Enemies that reach the walls hit them. If integrity reaches zero, the night is lost. The walls are fully repaired at every dawn.')));
    update = () => { integ.textContent = `${Math.ceil(s.integrity)} of ${wallStats(b.level).integrity}`; };
    let benefit = `Integrity ${st.integrity} → ${nx.integrity}, armour ${st.armor} → ${nx.armor}.`;
    if (b.level + 1 === 4) benefit += ' The palisade is rebuilt in stone.';
    if (b.level + 1 === 7) benefit += ' Adds towers around the ring.';
    el.append(upgradeSection(ui, id, benefit));
  } else if (id === 'townhall') {
    const nx = b.level + 1;
    el.append(h('section.card', {}, h('h3', {}, 'The village'),
      statLines([
        ['Building level limit', `${b.level * 2} (twice the Town Hall level)`],
        ['Best night held', s.best ? `Night ${s.best}` : 'None yet'],
        ['Nights won / lost', `${s.stats.nightsWon} / ${s.stats.nightsLost}`],
        ['Enemies defeated', fmt(s.stats.kills, 0)],
        ['Gold earned', fmt(s.stats.goldEarned, 0)],
      ])));
    el.append(upgradeSection(ui, id, b.level < def.max ? `The Great Tower and Walls can reach level ${nx * 2}. The hall gains a new wing or tower.` : ''));
  } else if (b.level >= 1) {
    el.append(h('section.card', {}, h('h3', {}, 'Coming soon'), h('p', {}, def.later)));
  } else {
    el.append(h('section.card.ruin', {}, h('h3', {}, 'A ruin waiting to be restored'), h('p', {}, def.later), h('p.muted.small', {}, 'It already has its place in the village; restoring it will rebuild it right here.')));
  }
  return { title: b.level >= 1 ? `${def.name}${def.upgradable ? `, level ${b.level}` : ''}` : `${def.name} (ruin)`, sub: s.village.name, el, update };
}

export function spawnView(ui, sid) {
  const s = ui.state;
  const sp = SPAWNS.find((x) => x.id === sid);
  if (!sp) return null;
  const el = h('div.spawn-view');
  const n = s.battle ? s.battle.n : s.night;
  const open = sp.opens <= n;
  el.append(h('p.lead', {}, sp.blurb));
  const [x, z] = spawnPos(sp);
  const route = routeFrom(defaultField(), x, z);
  if (open) {
    const sched = waveSchedule(s.seed, n).filter((e) => e.spawn === sid);
    const counts = {};
    for (const e of sched) counts[e.type] = (counts[e.type] || 0) + 1;
    el.append(h('section.card', {}, h('h3', {}, `Night ${n} from here`),
      h('p', {}, Object.entries(counts).map(([t, k]) => `${k} ${k === 1 ? ENEMIES[t].name : ENEMIES[t].plural}`).join(' and ') || 'Nobody tonight.'),
      statLines([
        ['Route to the walls', `${route.length.toFixed(1)} paces`],
        ...Object.keys(counts).map((t) => [`${ENEMIES[t].plural} arrive in`, `about ${dur(route.length / ENEMIES[t].speed)}`]),
      ]),
      h('p.muted.small', {}, 'The dotted line on the field shows the route. Mazes built in the next update will make it longer.')));
  } else {
    el.append(h('section.card', {}, h('h3', {}, 'Sealed for now'), h('p', {}, `Opens on night ${sp.opens}. Until then, nothing comes through.`)));
  }
  return { title: sp.name, sub: open ? `Spawn point, open since night ${sp.opens}` : `Spawn point, opens on night ${sp.opens}`, el };
}

export function locationView(ui, id) {
  const s = ui.state;
  const l = LOCATIONS.find((x) => x.id === id);
  if (!l) return null;
  const el = h('div.location-view');
  if (l.kind === 'home') {
    el.append(h('p.lead', {}, `${s.village.name}, your village. Its Great Tower can be seen from every road around.`),
      h('div.row', {}, button('Go to the village', () => ui.g.setView('village'), { kind: 'primary' }), button('Go to the defence', () => ui.g.setView('defense'))));
    return { title: s.village.name, sub: 'Your village', el };
  }
  el.append(h('p.lead', {}, l.blurb));
  el.append(h('section.card', {}, h('h3', {}, 'What is known'),
    statLines([
      ['Kind of place', LOCATION_KINDS[l.kind].name],
      ['Danger', l.difficulty ? `${l.difficulty} of 5` : 'Friendly'],
      ['Journey there and back', `about ${dur(l.hours * 3600 * 2)}`],
      ['Worth bringing back', l.rewards.join(', ')],
    ])));
  el.append(h('section.card.ruin', {}, h('h3', {}, 'Expeditions'),
    h('p', {}, 'Expeditions set out from the Tavern in Milestone 6. A party of villagers in their Blacksmith gear will travel here, fight what they meet and bring the rewards home.'),
    h('p.muted.small', {}, 'Villagers and gear arrive first, in Milestones 3 and 4.')));
  return { title: l.name, sub: LOCATION_KINDS[l.kind].name, el };
}

export function villageView(ui) {
  const s = ui.state;
  const el = h('div.village-view');
  const pv = nightPreview(s, s.night);
  el.append(h('section.card', {}, h('h3', {}, 'The siege'),
    statLines([
      ['Next night', `Night ${s.night}${s.hold ? ' (holding)' : ''}`],
      ['Best night held', s.best ? `Night ${s.best}` : 'None yet'],
      ['Open spawn points', `${activeSpawns(s.night).length} of ${SPAWNS.length}`],
      ['Expected gold tonight', `about ${pv.gold}`],
      ['Defended while away', safeNight(s) ? `Night ${safeNight(s)} at ${pct(OFFLINE_REWARD)} rewards` : 'Win a night first'],
    ])));
  const list = h('ul.building-list');
  for (const id of BUILDING_ORDER) {
    const def = BUILDINGS[id];
    const b = s.buildings[id];
    const ruin = b.level < 1;
    const block = def.upgradable ? upgradeBlocker(s, id) : null;
    list.append(h(`li${ruin ? '.ruin' : ''}`, {},
      h('button.bl-main', { type: 'button', onclick: () => { ui.select(id); ui.g.diorama.focus(id); } },
        h('strong', {}, def.name), h('span.muted', {}, ruin ? 'Ruin' : def.upgradable ? `Level ${b.level}` : 'Working')),
      def.upgradable && !block ? button(`Upgrade, ${upgradeCost(id, b.level)} gold`, () => ui.g.act((st) => queueUpgrade(st, id), { sound: 'click' }), { aria: `Upgrade ${def.name} for ${upgradeCost(id, b.level)} gold` }) : null));
  }
  el.append(h('h3.section-title', {}, 'Buildings'), list);
  return { title: s.village.name, sub: 'Village overview', el };
}

// ---------- log ----------
let logFilter = 'all';
export function logView(ui) {
  const s = ui.state;
  const el = h('div.log-view');
  const list = h('ol.log-list');
  const filters = h('div.seg-buttons', { role: 'group', 'aria-label': 'Filter' },
    [['all', 'Everything'], ['attention', 'Needs attention'], ['done', 'Completions'], ['info', 'Information']].map(([k, label]) =>
      h('button.chip-btn', { type: 'button', 'aria-pressed': String(logFilter === k), onclick: (e) => { logFilter = k; e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); } }, label)));
  el.append(filters, list);
  let last = -1;
  function draw() {
    last = s.log.length;
    const items = s.log.filter((e) => logFilter === 'all' || e.level === logFilter).slice(-150).reverse();
    clear(list).append(...items.map((e) => h(`li.log.${e.level}`, {},
      h('span.log-mark', { 'aria-hidden': 'true' }, e.level === 'attention' ? '!' : e.level === 'done' ? '✓' : 'i'),
      h('span', {}, e.text),
      h('time.muted.small', { datetime: new Date(e.at).toISOString() }, new Date(e.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })))));
    if (!items.length) list.append(h('li.muted', {}, 'Nights, upgrades and warnings will collect here.'));
  }
  draw();
  return { title: 'Activity log', sub: 'Most recent first', el, update: () => { if (s.log.length !== last) draw(); } };
}

// ---------- settings ----------
export function settingsView(ui) {
  const s = ui.state;
  const st = s.settings;
  const g = ui.g;
  const el = h('div.settings-view');
  const toggle = (label, checked, fn, hint) => h('label.switch', {}, h('input', { type: 'checkbox', checked, onchange: (e) => fn(e.target.checked) }), h('span.switch-ui', { 'aria-hidden': 'true' }), h('span', {}, label, hint ? h('span.muted.small.block', {}, hint) : null));
  const slider = (label, key) => h('label.field', {}, h('span', {}, label), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st.volume[key], oninput: (e) => { st.volume[key] = Number(e.target.value); g.audio.setVolumes(st.volume); g.touch(); } }));
  el.append(h('section.card', {}, h('h3', {}, 'Village'),
    h('div.row', {}, h('strong', {}, s.village.name), button('Rename', () => ui.prompt({ title: 'Rename the village', label: 'Village name', value: s.village.name, onOk: (v) => g.act((x) => { const c = String(v).trim().slice(0, 40); if (!c) return { ok: false, reason: 'Names cannot be empty.' }; x.village.name = c; return { ok: true }; }) }))),
    h('p.muted.small', {}, 'Banner'),
    h('div.emblem-pick', { role: 'radiogroup', 'aria-label': 'Banner emblem' }, EMBLEMS.map((e) => h('button.emblem-btn', { type: 'button', role: 'radio', 'aria-checked': String(s.village.emblem === e), 'aria-label': e, html: emblem(e, s.village.color, 26), onclick: () => g.act((x) => { x.village.emblem = e; return { ok: true }; }) }))),
    h('p.muted.small', {}, 'Colour'),
    h('div.color-pick', { role: 'radiogroup', 'aria-label': 'Banner colour' }, CIV_COLORS.map((c) => h('button.swatch', { type: 'button', role: 'radio', 'aria-checked': String(s.village.color === c), 'aria-label': `Colour ${c}`, style: { background: c }, onclick: () => { g.act((x) => { x.village.color = c; return { ok: true }; }); g.applyIdentity(); } })))));
  el.append(h('section.card', {}, h('h3', {}, 'Time'),
    toggle('Pause the game', s.paused, () => ui.togglePause(), 'Menus never pause the game. A paused game stays paused when you come back.'),
    toggle('Switch to the Defence view at nightfall', st.autoView !== false, (v) => { st.autoView = v; g.touch(); }, 'Returns to where you were at dawn.'),
    h('p.muted.small', {}, `While you are away, the village keeps defending your best safely won night at ${pct(OFFLINE_REWARD)} of its rewards, for up to 24 hours. Time away never loses a night.`)));
  el.append(h('section.card', {}, h('h3', {}, 'Display'),
    h('fieldset.seg', {}, h('legend', {}, 'Presentation quality'),
      [['high', 'Detailed'], ['low', 'Light (smoother on older devices)']].map(([v, l]) => h('label', {}, h('input', { type: 'radio', name: 'quality', checked: st.quality === v, onchange: () => { st.quality = v; g.applySettings(); g.touch(); } }), h('span', {}, l)))),
    h('p.muted.small', {}, 'Quality never changes how battles turn out.'),
    toggle('Reduce motion', st.reducedMotion, (v) => { st.reducedMotion = v; g.applySettings(); g.touch(); }, 'Calmer animation, fewer particles, instant camera moves.'),
    toggle('Reduce flashing', st.reducedFlashing, (v) => { st.reducedFlashing = v; g.applySettings(); g.touch(); }, 'No hit flashes and gentler pulses.'),
    h('fieldset.seg', {}, h('legend', {}, 'Text size'),
      [[1, 'Standard'], [1.15, 'Larger'], [1.3, 'Largest']].map(([v, l]) => h('label', {}, h('input', { type: 'radio', name: 'textscale', checked: (st.textScale || 1) === v, onchange: () => { st.textScale = v; g.applySettings(); g.touch(); } }), h('span', {}, l)))),
    h('div.row', {}, button('Full screen (F)', () => g.fullscreen()), button('Hide interface (H)', () => ui.setClean(true)))));
  el.append(h('section.card', {}, h('h3', {}, 'Sound'), slider('Master volume', 'master'), slider('Music', 'music'), slider('Ambience', 'ambience'), slider('Battle and interface sounds', 'ui')));
  el.append(h('section.card', {}, h('h3', {}, 'Notifications'),
    toggle('Show information pop-ups', !st.mute.info, (v) => { st.mute.info = !v; g.touch(); }),
    toggle('Show completion pop-ups', !st.mute.done, (v) => { st.mute.done = !v; g.touch(); }, 'Warnings always appear. Everything stays in the log.')));
  el.append(h('section.card', {}, h('h3', {}, 'Saving'),
    h('p.muted', {}, 'Progress saves automatically in this browser. Export a save code to back it up or move it to another device.'),
    h('div.row', {}, button('Save now', () => g.saveNow(true), { kind: 'primary' }), button('Export save', () => g.exportSave()), button('Import save…', () => importDialog(ui)), button('Restore recent backup…', () => g.restoreBackup())),
    h('div.row', {}, button('Start over…', () => ui.confirm({ title: 'Start a new village?', body: `${s.village.name} will be replaced. It stays available as the recoverable backup until the next one overwrites it, so export first if you want to keep it.`, ok: 'Start over', danger: true, onOk: () => g.startOver() }), { kind: 'danger-ghost' }))));
  return { title: 'Settings', el };
}

export function importDialog(ui) {
  const g = ui.g;
  const ta = h('textarea.text', { rows: 5, placeholder: 'Paste a save code (ASTERWAKE1:…)', 'aria-label': 'Save code' });
  const file = h('input', { type: 'file', accept: '.txt,.json,text/plain,application/json', 'aria-label': 'Choose an exported save file', onchange: async (e) => { const f = e.target.files[0]; if (f) ta.value = await f.text(); preview(); } });
  const out = h('div.preview');
  function preview() {
    clear(out);
    if (!ta.value.trim()) return;
    try {
      const parsed = g.parseImport(ta.value);
      const sm = g.summarize(parsed);
      out.append(h('div.card', {}, h('strong', {}, sm.name), h('p', {}, `Best night ${sm.best}, Town Hall level ${sm.townhall}, ${sm.hours.toFixed(1)} hours played.`),
        h('p.muted', {}, 'Loading it replaces the current village. The current one becomes the recoverable backup.'),
        button(`Load ${sm.name}`, () => { ui.closeModal(); g.loadState(parsed, 'Imported save loaded.'); }, { kind: 'primary' })));
    } catch (err) {
      out.append(h('p.blocker', {}, `This save cannot be loaded: ${err.message} Your current game is unchanged.`));
    }
  }
  ta.addEventListener('input', preview);
  ui.modal({ title: 'Import a save', el: h('div', {}, h('label.field', {}, h('span', {}, 'Save file'), file), h('label.field', {}, h('span', {}, 'Or paste a save code'), ta), out) });
}

// ---------- help ----------
export function helpView(ui) {
  const s = ui.state;
  const sec = (title, ...ps) => h('section.card', {}, h('h3', {}, title), ...ps.map((p) => h('p', {}, p)));
  const el = h('div.help-view', {},
    s.ui.guideDismissed ? h('div.row', {}, button('Show the getting-started guide', () => { s.ui.guideDismissed = false; ui.g.touch(); ui.renderGuide(); }, { kind: 'primary' })) : null,
    sec('Three views', 'The Village view is the village up close, where you look after its buildings. The Defence view zooms far out: the village sits small in a wide landscape and the Great Tower shoots at whatever comes out of the forest. The World view shows the land beyond, with other villages, ruins and dungeons for expeditions. Switch with the tabs at the top or 1, 2 and 3.'),
    sec('Days and nights', 'Each day lasts two minutes. When it ends, a wave attacks from the open spawn points. The village fights on its own; you prepare between nights. Call the night early whenever you are ready.'),
    sec('The village is the tower', 'Archers on the Great Tower shoot at any enemy inside the range ring. Enemies that reach the walls hit them. If wall integrity reaches zero, the night is lost. Walls are fully repaired every dawn.'),
    sec('Winning and losing', 'A won night pays gold at dawn, and the next night is harder. A lost night costs 10% of your free gold and moves the siege back two nights. Nothing is ever destroyed. Turn on Hold to repeat a night you can win while you save up.'),
    sec('Upgrades', 'Upgrades cost gold and take a little time; one is built at a time with three more waiting. Buildings can reach twice the Town Hall’s level. Cancelling refunds everything.'),
    sec('Spawn points', 'Six spawn points ring the battlefield. One is open at first; more open as the nights go on. The dotted lines show the routes enemies will take tonight.'),
    sec('Time away', 'While you are away, the village keeps defending your best safely won night for part of its rewards, up to 24 hours. Upgrades keep building. Time away never loses a night.'),
    h('section.card', {}, h('h3', {}, 'Keyboard'),
      h('dl.keys', {}, ...[
        ['Arrows or WASD', 'Move the camera'], ['Q and E', 'Rotate'], ['+ and −', 'Zoom'], ['Home or 0', 'Default view'],
        ['1, 2, 3', 'Village, Defence and World views'], ['N', 'Call the night'], ['X', 'Night speed ×1 or ×2'], ['T, R, G', 'Town Hall, Great Tower, Walls'],
        ['B', 'Building overview'], ['L', 'Log'], ['O', 'Settings'], ['?', 'Help'],
        ['P', 'Pause or resume'], ['H', 'Hide or show the interface'], ['F', 'Full screen'], ['Esc', 'Close'],
      ].flatMap(([k, v]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, v)])),
      h('p.muted.small', {}, 'Mouse: drag to move, right-drag to rotate, scroll to zoom. Touch: drag to move, pinch to zoom and twist to rotate.')));
  return { title: 'Help', sub: 'How Asterwake works', el };
}

// ---------- new village ----------
export function newVillageView(onBegin) {
  let em = 'leaf';
  let col = '#f0a86b';
  const name = h('input.text', { type: 'text', value: 'Emberfold', maxlength: 40, 'aria-label': 'Village name', autofocus: true });
  const preview = h('span.civ-preview');
  const draw = () => { preview.innerHTML = emblem(em, col, 64); };
  const emblems = h('div.emblem-pick', { role: 'radiogroup', 'aria-label': 'Banner emblem' }, EMBLEMS.map((e) => h('button.emblem-btn', { type: 'button', role: 'radio', 'aria-checked': String(e === em), 'aria-label': e, html: `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">${EMBLEM_PATHS[e]}</svg>`, onclick: (ev) => { em = e; emblems.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b === ev.currentTarget))); draw(); } })));
  const colors = h('div.color-pick', { role: 'radiogroup', 'aria-label': 'Banner colour' }, ['#f0a86b', ...CIV_COLORS.filter((c) => c !== '#f0a86b')].map((c) => h('button.swatch', { type: 'button', role: 'radio', 'aria-checked': String(c === col), 'aria-label': `Colour ${c}`, style: { background: c }, onclick: (ev) => { col = c; colors.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b === ev.currentTarget))); draw(); } })));
  draw();
  const el = h('div.newciv', {},
    h('p.lead', {}, 'A small village in a clearing among strange stars. Every night, something comes out of the woods. Name the people who will hold the walls.'),
    h('div.newciv-grid', {}, preview, h('div', {}, h('label.field', {}, h('span', {}, 'Village name'), name), h('p.muted.small', {}, 'Banner'), emblems, h('p.muted.small', {}, 'Colour'), colors)),
    h('div.row.end', {}, button('Raise the banner', () => onBegin({ name: name.value.trim() || 'Emberfold', emblem: em, color: col }), { kind: 'primary' })),
    h('p.muted.small', {}, 'You can change all of this later in Settings.'));
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.querySelector('.btn.primary').click(); });
  return { title: 'Asterwake', el };
}

// ---------- return summary ----------
export function summaryView(ui, r) {
  const s = ui.state;
  const el = h('div.summary');
  const capped = r.elapsed > r.credited + 1;
  el.append(h('p.lead', {}, `You were away for ${dur(r.elapsed)}.`, s.paused ? ' The game was paused, so nothing changed.' : capped ? ` The village kept going for the first ${dur(r.credited)}, the most it can do on its own.` : ''));
  const items = [];
  if (r.interrupted) items.push(`The night in progress when you left was called off. Nothing was lost; it will come again.`);
  if (r.nights) items.push(`The walls held through ${r.nights} night${r.nights === 1 ? '' : 's'} at night ${r.safe}, earning ${fmt(r.gold, 0)} gold.`);
  else if (!r.safe && !s.paused) items.push('No nights were fought while you were away. Win a night first, and the village will keep defending it for you.');
  const done = r.ev.list.filter((e) => e.level === 'done');
  for (const e of done.slice(0, 8)) items.push(e.text);
  if (items.length) el.append(h('ul.summary-list', {}, items.map((t) => h('li', {}, t))));
  el.append(h('p', {}, `Night ${s.night} is next. ${s.queue.length ? '' : 'The builders are idle.'}`));
  el.append(h('div.row.end', {}, button('Back to the village', () => ui.closeModal(), { kind: 'primary' })));
  return { title: 'Welcome back', el };
}

export { progressBar };
