import { h, clear, fmt, exact, rate, dur, resIcon, button } from './dom.js';
import { emblem, EMBLEM_PATHS } from './art.js';
import { RESOURCE_INFO, BUILDINGS } from '../data/buildings.js';
import { CIV_COLORS, EMBLEMS } from '../data/people.js';
import { TECHS } from '../data/techs.js';
import * as A from '../sim/actions.js';

// ---------- activity log ----------

let logFilter = 'all';
let logSearch = '';

export function logView(ui) {
  const s = ui.state;
  const el = h('div.log-view');
  const list = h('ol.log-list', { reversed: true });
  const search = h('input.text', { type: 'search', placeholder: 'Search the log', value: logSearch, 'aria-label': 'Search the activity log', oninput: (e) => { logSearch = e.target.value; draw(); } });
  const filters = h('div.seg-buttons', { role: 'group', 'aria-label': 'Filter' },
    [['all', 'Everything'], ['attention', 'Needs attention'], ['done', 'Completions'], ['info', 'Information']].map(([k, label]) =>
      h('button.chip-btn', { type: 'button', 'aria-pressed': String(logFilter === k), onclick: (e) => { logFilter = k; e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); } }, label)));
  el.append(search, filters, list);
  let lastLen = -1;
  function draw() {
    lastLen = s.log.length;
    const q = logSearch.trim().toLowerCase();
    const items = s.log.filter((e) => (logFilter === 'all' || e.level === logFilter) && (!q || e.text.toLowerCase().includes(q))).slice(-150).reverse();
    clear(list).append(...items.map((e) => h(`li.log.${e.level}`, {},
      h('span.log-mark', { 'aria-hidden': 'true' }, e.level === 'attention' ? '!' : e.level === 'done' ? '✓' : 'i'),
      h('span', {}, e.text),
      h('time.muted.small', { datetime: new Date(e.at).toISOString() }, new Date(e.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })))));
    if (!items.length) list.append(h('li.muted', {}, s.log.length ? 'Nothing matches.' : 'Completed work, arrivals and warnings will collect here.'));
  }
  draw();
  return { title: 'Activity log', sub: 'Most recent first', el, update: () => { if (s.log.length !== lastLen) draw(); } };
}

// ---------- settings ----------

export function settingsView(ui) {
  const s = ui.state;
  const st = s.settings;
  const g = ui.g;
  const el = h('div.settings-view');
  const toggle = (label, checked, fn, hint) => h('label.switch', {}, h('input', { type: 'checkbox', checked, onchange: (e) => fn(e.target.checked) }), h('span.switch-ui', { 'aria-hidden': 'true' }), h('span', {}, label, hint ? h('span.muted.small.block', {}, hint) : null));
  const slider = (label, key) => h('label.field', {}, h('span', {}, label), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st.volume[key], oninput: (e) => { st.volume[key] = Number(e.target.value); g.audio.setVolumes(st.volume); g.touch(); } }));

  // civilization
  const emblems = h('div.emblem-pick', { role: 'radiogroup', 'aria-label': 'Emblem' }, EMBLEMS.map((e) => h('button.emblem-btn', { type: 'button', role: 'radio', 'aria-checked': String(s.civ.emblem === e), 'aria-label': e, onclick: () => { g.act((x) => { x.civ.emblem = e; return { ok: true }; }); } , html: emblem(e, s.civ.color, 26) })));
  const colors = h('div.color-pick', { role: 'radiogroup', 'aria-label': 'Colour' }, CIV_COLORS.map((c) => h('button.swatch', { type: 'button', role: 'radio', 'aria-checked': String(s.civ.color === c), 'aria-label': `Colour ${c}`, style: { background: c }, onclick: () => { g.act((x) => { x.civ.color = c; return { ok: true }; }); g.applyIdentity(); } })));
  el.append(h('section.card', {}, h('h3', {}, 'Civilization'),
    h('div.row', {}, h('strong', {}, s.civ.name), button('Rename', () => ui.prompt({ title: 'Rename civilization', label: 'Civilization name', value: s.civ.name, onOk: (v) => g.act((x) => A.rename(x, 'civ', null, v)) }))),
    h('div.row', {}, h('span', {}, ui.colony().name), button('Rename colony', () => ui.prompt({ title: 'Rename colony', label: 'Colony name', value: ui.colony().name, onOk: (v) => g.act((x) => A.rename(x, 'colony', ui.colony().id, v)) }))),
    h('p.muted.small', {}, 'Emblem'), emblems, h('p.muted.small', {}, 'Colour'), colors));

  // time
  el.append(h('section.card', {}, h('h3', {}, 'Time'),
    toggle('Pause the game', s.paused, () => ui.togglePause(), 'Opening menus never pauses. A paused game stays paused when you come back.'),
    h('p.muted.small', {}, 'While you are away, your colony keeps working for up to 24 hours.')));

  // display
  el.append(h('section.card', {}, h('h3', {}, 'Display'),
    h('fieldset.seg', {}, h('legend', {}, 'Presentation quality'),
      [['high', 'Detailed'], ['low', 'Light (smoother on older devices)']].map(([v, l]) => h('label', {}, h('input', { type: 'radio', name: 'quality', checked: st.quality === v, onchange: () => { st.quality = v; g.applySettings(); g.touch(); } }), h('span', {}, l)))),
    h('p.muted.small', {}, 'Quality never changes production or rewards.'),
    toggle('Reduce motion', st.reducedMotion, (v) => { st.reducedMotion = v; g.applySettings(); g.touch(); }, 'Slower machines, no drifting particles, instant camera moves.'),
    toggle('Reduce flashing', st.reducedFlashing, (v) => { st.reducedFlashing = v; g.applySettings(); g.touch(); }, 'Steady beacons and gentler pulses.'),
    h('fieldset.seg', {}, h('legend', {}, 'Text size'),
      [[1, 'Standard'], [1.15, 'Larger'], [1.3, 'Largest']].map(([v, l]) => h('label', {}, h('input', { type: 'radio', name: 'textscale', checked: (st.textScale || 1) === v, onchange: () => { st.textScale = v; g.applySettings(); g.touch(); } }), h('span', {}, l)))),
    h('div.row', {}, button('Full screen (F)', () => g.fullscreen()), button('Hide interface (H)', () => ui.setClean(true)))));

  // audio
  el.append(h('section.card', {}, h('h3', {}, 'Sound'), slider('Master volume', 'master'), slider('Music', 'music'), slider('Ambience', 'ambience'), slider('Interface sounds', 'ui')));

  // notifications
  el.append(h('section.card', {}, h('h3', {}, 'Notifications'),
    toggle('Show information pop-ups', !st.mute.info, (v) => { st.mute.info = !v; g.touch(); }),
    toggle('Show completion pop-ups', !st.mute.done, (v) => { st.mute.done = !v; g.touch(); }, 'Warnings always appear. Everything stays in the activity log.')));

  // saving
  el.append(h('section.card', {}, h('h3', {}, 'Saving'),
    h('p.muted', {}, 'Progress saves automatically in this browser. Export a save code to back it up or move to another device.'),
    h('div.row.wrap', {},
      button('Save now', () => g.saveNow(true), { kind: 'primary' }),
      button('Export save', () => g.exportSave()),
      button('Import save…', () => importDialog(ui)),
      button('Restore recent backup…', () => g.restoreBackup())),
    h('div.row', {}, button('Start over…', () => ui.confirm({ title: 'Start a new civilization?', body: `${s.civ.name} will be replaced. The current game is kept as the recoverable backup until it is overwritten by the next one, so export first if you want to keep it.`, ok: 'Start over', danger: true, onOk: () => g.startOver() }), { kind: 'danger-ghost' }))));
  return { title: 'Settings', el };
}

export function importDialog(ui) {
  const g = ui.g;
  const ta = h('textarea.text', { rows: 5, placeholder: 'Paste a save code (ASTERWAKE1:…)', 'aria-label': 'Save code' });
  const file = h('input', { type: 'file', accept: '.txt,.json,text/plain,application/json', 'aria-label': 'Choose an exported save file', onchange: async (e) => { const f = e.target.files[0]; if (f) ta.value = await f.text(); preview(); } });
  const out = h('div.preview');
  let parsed = null;
  function preview() {
    clear(out);
    parsed = null;
    if (!ta.value.trim()) return;
    try {
      parsed = g.parseImport(ta.value);
      const sm = g.summarize(parsed);
      out.append(h('div.card', {}, h('strong', {}, sm.civ), h('p', {}, `Era ${sm.era}. ${sm.colonies} colony, ${sm.colonists} colonists, ${sm.techs} technologies, ${sm.hours.toFixed(1)} hours played.`),
        h('p.muted', {}, 'Loading it replaces the current civilization. The current one becomes the recoverable backup.'),
        button(`Load ${sm.civ}`, () => { ui.closeModal(); g.loadState(parsed, 'Imported save loaded.'); }, { kind: 'primary' })));
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
  const el = h('div.help-view',
    {},
    s.ui.guideDismissed ? h('div.row', {}, button('Show the getting-started guide', () => { s.ui.guideDismissed = false; ui.g.touch(); ui.renderGuide(); }, { kind: 'primary' })) : null,
    sec('Production', 'Every producer works on its own. An assigned colonist adds 50%, plus more for a matching profession. Each building level adds 25% output and 15% upkeep. Open a resource in the top bar to see gross production, consumption and when storage fills or empties.'),
    sec('Storage', 'Metal, Food and Fuel are stored at each colony. When storage is full, producers stop rather than waste inputs. Costs for queued construction and recruits are set aside as soon as you confirm, shown as committed.'),
    sec('Food', 'Each colonist eats 0.1 Food a minute. If Food runs out nobody is harmed, but worker bonuses are halved and recruitment pauses. Relief work can grow Food at headquarters without power or materials.'),
    sec('Power', 'Headquarters and Solar Arrays supply power. If demand is higher than supply, the lowest-priority buildings pause instead of everything slowing down. Food production comes first by default; you can raise any building’s priority.'),
    sec('Construction', 'One item builds at a time with four more waiting. Buildings keep working while they upgrade. Moving a building is free. Cancelling refunds everything; demolishing returns half the Metal invested.'),
    sec('Colonists', 'Colonists gain 4 experience a minute of useful work. Engineers can support construction at headquarters for 10% faster building each. Recruits take three minutes to arrive and need a free home.'),
    sec('Research', 'Laboratories feed a shared bank. Choosing a project spends banked points at once, then new Research continues it. You can queue three more projects.'),
    sec('Time away', 'Your civilization keeps working for up to 24 hours while you are away, following exactly the same rules. When you return you see what changed. Pausing stops everything.'),
    h('section.card', {}, h('h3', {}, 'Keyboard'),
      h('dl.keys', {}, ...[
        ['Arrows or WASD', 'Move the camera'], ['Q and E', 'Rotate'], ['+ and −', 'Zoom'], ['Home or 0', 'Default view'],
        ['B', 'Build'], ['C', 'Colonists'], ['R', 'Research'], ['L', 'Log'], ['O', 'Settings'], ['?', 'Help'],
        ['P', 'Pause or resume'], ['H', 'Hide or show the interface'], ['F', 'Full screen'], ['Enter', 'Confirm a placement'], ['Esc', 'Close or cancel'],
      ].flatMap(([k, v]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, v)])),
      h('p.muted.small', {}, 'Mouse: drag to move, right-drag to rotate, scroll to zoom. Touch: drag to move, pinch to zoom and twist to rotate.')),
  );
  return { title: 'Help', sub: 'How Asterwake works', el };
}

// ---------- resource detail (modal) ----------

export function resourceDetail(ui, r) {
  const c = ui.colony();
  const el = h('div.res-detail');
  const update = () => {
    const sn = ui.snap();
    const s = ui.state;
    clear(el);
    if (['metal', 'fuel', 'food'].includes(r)) {
      const q = c.inv[r];
      const cap = sn.cap[r];
      const res = c.reserved[r] || 0;
      const net = sn.net[r];
      const rt = (sn.gross[r] || 0);
      let eta = '';
      if (net > 0.01 && q < cap) eta = `Full in about ${dur(((cap - q) / net) * 60)}.`;
      else if (net < -0.01 && q > 0) eta = `Empty in about ${dur((q / -net) * 60)}.`;
      else if (q >= cap - 0.01) eta = 'Storage is full. Producers of this resource are paused.';
      el.append(
        h('dl.stats', {},
          h('dt', {}, 'Held'), h('dd', {}, `${Math.floor(q)} of ${cap}`),
          h('dt', {}, 'Committed'), h('dd', {}, res ? `${Math.ceil(res)} set aside for construction or recruits` : 'Nothing'),
          h('dt', {}, 'Available to spend'), h('dd', {}, String(Math.floor(Math.max(0, q - res)))),
          h('dt', {}, 'Produced'), h('dd', {}, rate(rt)),
          h('dt', {}, 'Consumed'), h('dd', {}, rate(-(sn.cons[r] || 0))),
          h('dt', {}, 'Net change'), h('dd', {}, h('strong', {}, rate(net)))),
        eta ? h('p', {}, eta) : null,
        h('h3', {}, 'Where it comes from'));
      const rows = [];
      for (const b of c.buildings) {
        const i = sn.info[b.id];
        if (i?.output?.[r]) rows.push([`${BUILDINGS[b.type].name} L${b.level}`, i.output[r] * (c.runtime[b.id]?.factor ?? 1)]);
        if (i?.input?.[r]) rows.push([`${BUILDINGS[b.type].name} L${b.level} (uses)`, -i.input[r]]);
      }
      if (sn.idle.length && c.reliefMode === r) rows.push([`Relief work (${sn.idle.length})`, sn.reliefRate]);
      if (r === 'food') rows.push([`${sn.people.length} colonists eating`, -0.1 * sn.people.length]);
      el.append(h('ul.breakdown-list', {}, rows.length ? rows.map(([n, v]) => h('li', {}, h('span', {}, n), h('span', {}, rate(v)))) : h('li.muted', {}, 'Nothing produces or uses this yet.')));
      if (r === 'food' && c.foodShort) el.append(h('p.blocker', {}, 'The colony is short of Food: worker bonuses are halved and recruitment is paused. Build or staff a farm, or switch relief work to growing Food.'));
    } else if (r === 'research') {
      el.append(h('p', {}, `Bank: ${exact(s.research.bank)}. Laboratories: ${rate(sn.research)}.`),
        h('p', {}, s.research.active ? `Currently studying ${TECHS[s.research.active].name}.` : 'No active project; new Research is saved in the bank.'),
        button('Open Research', () => { ui.closeModal(); ui.open('research'); }, { kind: 'primary' }));
    } else if (r === 'power') {
      const p = sn.power;
      el.append(h('dl.stats', {}, h('dt', {}, 'Supply'), h('dd', {}, exact(p.supply)), h('dt', {}, 'Demand'), h('dd', {}, exact(p.demand)), h('dt', {}, 'Spare'), h('dd', {}, exact(Math.max(0, p.left)))));
      const paused = c.buildings.filter((b) => sn.info[b.id]?.status === 'unpowered');
      if (paused.length) el.append(h('p.blocker', {}, `Paused for lack of power: ${paused.map((b) => BUILDINGS[b.type].name).join(', ')}. About ${fmt(p.shortfall, 1)} more Power is needed for the next one.`));
      else el.append(h('p.muted', {}, 'Every powered building is running. Power is not stored; spare supply is simply unused.'));
    } else if (r === 'housing') {
      el.append(h('p', {}, `${sn.people.length} colonists live here and there are ${sn.housing} homes. A colony holds at most 20 people.`),
        h('p.muted', {}, 'Headquarters house 2; each Habitat houses 4, plus 1 per level.'));
    }
  };
  update();
  return { title: `${RESOURCE_INFO[r].name} in ${c.name}`, el, update };
}

// ---------- return summary ----------

export function summaryView(ui, data) {
  const s = ui.state;
  const el = h('div.summary');
  const capped = data.elapsed > data.credited + 1;
  el.append(h('p.lead', {}, `You were away for ${dur(data.elapsed)}.`,
    s.paused ? ' The game was paused, so nothing changed.' : capped ? ` Your colony worked for the first ${dur(data.credited)} of that, the most it can do on its own.` : ' Your colony kept working the whole time.'));
  for (const col of s.colonies) {
    const before = data.before[col.id];
    if (!before) continue;
    const b = data.ev.buckets[col.id] || { made: {}, used: {} };
    el.append(h('section.card', {}, h('h3', {}, col.name),
      h('ul.breakdown-list', {}, ['metal', 'fuel', 'food'].map((r) => {
        const d = col.inv[r] - before[r];
        return h('li', {}, h('span', {}, resIcon(r), ` ${RESOURCE_INFO[r].name}`), h('span', {}, `${d >= 0 ? '+' : '−'}${fmt(Math.abs(d), 0)}`, h('span.muted.small', {}, ` (made ${fmt(b.made[r] || 0, 0)}, used ${fmt(b.used[r] || 0, 0)})`)));
      }))));
  }
  if (data.ev.researchTotal > 0) el.append(h('p', {}, `Laboratories produced ${fmt(data.ev.researchTotal, 0)} Research.`));
  const done = data.ev.list.filter((e) => e.level === 'done');
  const att = data.ev.list.filter((e) => e.level === 'attention');
  if (done.length) el.append(h('h3', {}, 'Completed'), h('ul.summary-list', {}, done.slice(0, 12).map((e) => h('li', {}, e.text)), done.length > 12 ? h('li.muted', {}, `And ${done.length - 12} more in the activity log.`) : null));
  const warnings = [...att.map((e) => e.text)];
  for (const col of s.colonies) {
    if (col.foodShort) warnings.push(`${col.name} is short of Food right now.`);
    const full = ['metal', 'fuel', 'food'].filter((r) => col.inv[r] >= ui.snap().cap[r] - 0.5 && ui.snap().gross[r] > 0);
    if (full.length) warnings.push(`${col.name}: ${full.map((r) => RESOURCE_INFO[r].name).join(' and ')} storage is full.`);
    if (!col.queue.length) warnings.push(`${col.name} has nothing under construction.`);
  }
  if (!s.research.active) warnings.push('No research project is selected.');
  if (warnings.length) el.append(h('h3', {}, 'Worth a look'), h('ul.summary-list.attention', {}, [...new Set(warnings)].slice(0, 8).map((t) => h('li', {}, t))));
  el.append(h('div.row.end', {}, button('Back to the colony', () => ui.closeModal(), { kind: 'primary' })));
  return { title: 'Welcome back', el };
}

// ---------- new civilization ----------

export function newCivView(onBegin) {
  let em = 'orbit';
  let col = CIV_COLORS[0];
  const name = h('input.text', { type: 'text', value: 'The Asterwake Compact', maxlength: 40, 'aria-label': 'Civilization name', autofocus: true });
  const preview = h('span.civ-preview');
  const draw = () => { preview.innerHTML = emblem(em, col, 64); };
  const emblems = h('div.emblem-pick', { role: 'radiogroup', 'aria-label': 'Emblem' }, EMBLEMS.map((e) => h('button.emblem-btn', { type: 'button', role: 'radio', 'aria-checked': String(e === em), 'aria-label': e, html: `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">${EMBLEM_PATHS[e]}</svg>`, onclick: (ev) => { em = e; emblems.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b === ev.currentTarget))); draw(); } })));
  const colors = h('div.color-pick', { role: 'radiogroup', 'aria-label': 'Colour' }, CIV_COLORS.map((c) => h('button.swatch', { type: 'button', role: 'radio', 'aria-checked': String(c === col), 'aria-label': `Colour ${c}`, style: { background: c }, onclick: (ev) => { col = c; colors.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b === ev.currentTarget))); draw(); } })));
  draw();
  const el = h('div.newciv', {},
    h('p.lead', {}, 'A small settlement on a gentle homeworld is ready. Name the people who will grow it into something larger.'),
    h('div.newciv-grid', {}, preview, h('div', {},
      h('label.field', {}, h('span', {}, 'Civilization name'), name),
      h('p.muted.small', {}, 'Emblem'), emblems, h('p.muted.small', {}, 'Colour'), colors)),
    h('div.row.end', {}, button('Found the colony', () => onBegin({ civName: name.value.trim() || 'The Asterwake Compact', emblem: em, color: col }), { kind: 'primary' })),
    h('p.muted.small', {}, 'You can change all of this later in Settings.'));
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.querySelector('.btn.primary').click(); });
  return { title: 'Asterwake', el };
}
