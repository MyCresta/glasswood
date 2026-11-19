// The notes on the desk. Kept small on purpose: an icon, a word, a number.
//   left:  the village (name, gold), the three views, the current goal, settings
//   right: the night, and one note for whatever the current view is about
//          (a place in the Wilds, the barricades in the Watch, a building in Hearth)
import { h, dur } from './dom.js';
import { BUILDINGS, ENEMIES, SPAWNS, BARRICADES, archeryStats, wallStats } from '../data/village.js';
import { nightPreview } from '../sim/battle.js';
import { upgradeBlocker, upgradeCost, upgradeTime, OBJECTIVES } from '../sim/village.js';
import { LOCATIONS, LOCATION_KINDS } from '../data/world.js';
import { canBlock, routeLengths, EDGE } from '../sim/web.js';

// A torn edge for a sheet of paper, as a clip-path, the same every time for an id.
function worn(id) {
  let s = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
  const r = () => { s = (s * 16807) % 2147483647 || 1; return s / 2147483647; };
  const pts = [];
  const c = [[0, 0], [100, 0], [100, 100], [0, 100]];
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = c[i], [x1, y1] = c[(i + 1) % 4];
    const n = 12;
    for (let k = 0; k < n; k++) {
      const t = k / n, j = r() * 0.8;
      pts.push([x0 + (x1 - x0) * t + (y1 !== y0 ? (x0 === 0 ? j : -j) : 0), y0 + (y1 - y0) * t + (x1 !== x0 ? (y0 === 0 ? j : -j) : 0)]);
    }
  }
  return `polygon(${pts.map(([x, y]) => `${Math.min(100, Math.max(0, x)).toFixed(2)}% ${Math.min(100, Math.max(0, y)).toFixed(2)}%`).join(', ')})`;
}

function note(id, { tone = '', label } = {}) {
  const body = h('div.body');
  const sheet = h('div.sheet', { style: { clipPath: worn(id) } }, body);
  const root = h(`section.note${tone ? `.${tone}` : ''}`, { 'aria-label': label || null }, sheet);
  return { root, body };
}

const seal = (label, onClick, attrs = {}) => h('div.seal', {}, h('button', { type: 'button', onclick: onClick, ...attrs }, h('span', {}, label)));
export const slip = (label, onClick, attrs = {}) => h('div.slip', {}, h('button', { type: 'button', onclick: onClick, ...attrs }, label));

// ---------- icons ----------
const line = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON = {
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="9" fill="#7a5418"/><circle cx="12" cy="11" r="9" fill="#e0a93a" stroke="#7a5418" stroke-width="1.5"/><circle cx="12" cy="11" r="5.5" fill="none" stroke="#7a5418" stroke-width="1.2"/></svg>',
  barr: '<svg viewBox="0 0 46 30" aria-hidden="true"><rect x="3" y="11" width="40" height="9" rx="2" fill="#a07a4e" stroke="#23170f" stroke-width="1.5"/><path d="M9 4 L15 27 M31 4 L37 27" stroke="#5a3e22" stroke-width="4" stroke-linecap="round"/></svg>',
  moon: line('<path d="M16 3.5a8.5 8.5 0 1 0 4.5 13.8A7 7 0 0 1 16 3.5z"/>'),
  time: line('<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>'),
  dmg: line('<path d="M18.5 3.5h2v2L10.5 15.5l-2-2z"/><path d="M6.5 12.5l5 5M8 16l-4 4"/>'),
  reach: line('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  rate: line('<path d="M4 6.5 10.5 12 4 17.5zM12 6.5l6.5 5.5-6.5 5.5zM21 6.5v11"/>'),
  people: line('<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.6 2.4-6 5.5-6s5.5 2.4 5.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.3c2.8.3 4.5 2.4 4.5 5.7"/>'),
  wall: line('<path d="M3 20h18V8H3zM3 12h18M3 16h18M9 8v4M15 8v4M6 12v4M12 12v4M18 12v4M9 16v4M15 16v4"/>'),
  armor: line('<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/>'),
  cap: line('<path d="M12 20V6M6.5 11.5 12 6l5.5 5.5M5 3.5h14"/>'),
  build: line('<path d="M14.5 3.5 20.5 9.5 18 12 12 6zM13 7.5 4 16.5 7.5 20l9-9"/>'),
  paces: line('<ellipse cx="8" cy="8.5" rx="2.6" ry="4"/><ellipse cx="16" cy="15.5" rx="2.6" ry="4"/>'),
  repeat: line('<path d="M4.5 11a7.5 7.5 0 0 1 13.2-4.6M19 3.5v4h-4M19.5 13a7.5 7.5 0 0 1-13.2 4.6M5 20.5v-4h4"/>'),
  goal: line('<path d="M5.5 21V3.5M5.5 4h12l-3 4 3 4h-12"/>'),
  gear: line('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  wilds: line('<circle cx="12" cy="10.5" r="7.5"/><path d="M5 12.5c4.5 2.5 9.5 2.5 14 0M7.5 21h9M10 18v3M14 18v3"/>'),
  watch: line('<circle cx="14" cy="10" r="6.5"/><path d="M9.3 14.7 3 21"/>'),
  hearth: line('<path d="M3.5 21V12l4.5-4.5L12.5 12v9M12.5 21V5.5h5.5V21M17.5 5.5l-2.6-3.3-2.4 3.3M2 21h20"/>'),
  close: line('<path d="M6 6l12 12M18 6 6 18"/>'),
};
const creature = (id) => { const [w, hh] = id === 'wolf' ? [36, 22] : [28, 28]; return `<svg viewBox="0 0 ${w} ${hh}" aria-hidden="true"><use href="#${id === 'goblin' ? 'gob' : id}" width="${w}" height="${hh}"/></svg>`; };
const ic = (name, extra = '') => h(`span.ic${extra}`, { html: ICON[name] });
// one fact: an icon, a number and an optional short word, with a tooltip for the details
const fact = (icon, value, title, word) => h('span.fact', { title }, typeof icon === 'string' ? ic(icon) : icon, h('b', {}, value), word ? h('span.word', {}, word) : null);

// replaceChildren, skipping the parts a note leaves out
const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));

export class Desk {
  constructor(game) {
    this.g = game;
    this.left = document.getElementById('left');
    this.right = document.getElementById('right');
    this.news = document.getElementById('news');
    this.build();
  }

  build() {
    const g = this.g;
    // the village: name and gold
    this.packet = note('packet', { label: 'Village' });
    this.nameEl = h('span.name');
    this.goldEl = h('b');
    this.packet.body.append(h('div.row.between', {}, this.nameEl, h('span.fact.gold', { title: 'Gold' }, ic('coin'), this.goldEl)));
    // the three views
    this.viewBtns = {};
    const views = h('nav.views', { 'aria-label': 'Views' }, ...[['wilds', 'Wilds', '1'], ['watch', 'Watch', '2'], ['hearth', 'Hearth', '3']].map(([id, name, key]) => {
      const btn = h('button.view-btn', { type: 'button', 'aria-current': 'false', title: `${name} (${key}, or scroll)`, onclick: () => g.setView(id) }, ic(id), h('span', {}, name));
      this.viewBtns[id] = btn;
      return btn;
    }));
    // the current goal
    this.task = note('task', { tone: 'mid', label: 'Goal' });
    const settings = h('button.settings-btn', { type: 'button', onclick: () => g.openSettings(), title: 'Settings (O)', 'aria-label': 'Settings' }, h('span.knob', { html: ICON.gear }));
    this.left.append(this.packet.root, views, this.task.root, settings);

    this.night = note('night', { label: 'The night' });
    this.place = note('place', { tone: 'mid', label: 'A place in the globe' });
    this.barr = note('barricades', { tone: 'mid', label: 'Barricades' });
    this.building = note('building', { tone: 'mid', label: 'A building' });
    this.right.append(this.night.root, this.place.root, this.barr.root, this.building.root);
    this.sig = {};
    this.hover = null;
  }

  // Rebuild a note's body only when what it shows has changed.
  part(key, sig, fn) {
    if (this.sig[key] === sig) return;
    this.sig[key] = sig;
    fn();
  }

  refresh() {
    const s = this.g.state;
    this.nameEl.textContent = s.village.name;
    this.goldEl.textContent = Math.floor(s.gold - s.reserved);
    document.body.classList.toggle('night', s.phase === 'night');
    const v = s.ui.view;
    for (const [id, btn] of Object.entries(this.viewBtns)) btn.setAttribute('aria-current', id === v ? 'true' : 'false');
    this.place.root.hidden = v !== 'wilds';
    this.barr.root.hidden = v !== 'watch';
    this.building.root.hidden = v !== 'hearth';
    if (v === 'wilds') this.refreshPlace(s);
    if (v === 'watch') this.refreshBarricades(s);
    if (v === 'hearth') this.refreshBuilding(s);
    this.refreshTask(s);
    this.refreshNight(s);
  }

  refreshTask(s) {
    const o = OBJECTIVES.find((x) => !x.future && !s.objectives.claimed.includes(x.id));
    this.task.root.hidden = !o;
    if (!o) return;
    this.part('task', o.id, () => {
      fill(this.task.body, h('div.row', { title: o.guide }, ic('goal', '.red'), h('span.title', {}, o.title), o.reward ? h('span.fact.push', { title: `${o.reward} gold when done` }, ic('coin'), h('b', {}, `+${o.reward}`)) : null));
    });
  }

  refreshNight(s) {
    const b = this.night.body;
    if (s.phase === 'day') {
      const pv = nightPreview(s);
      this.part('night', `day:${s.night}:${s.hold}`, () => {
        this.timerEl = h('b');
        const comp = Object.entries(pv.comp).filter(([, k]) => k > 0);
        fill(b, 
          h('div.row.between', {}, h('span.head', {}, ic('moon'), `Night ${s.night}`), h('span.fact', { title: 'Until dusk' }, ic('time'), this.timerEl)),
          h('div.row', { style: { gap: '14px' } }, ...comp.map(([t, k]) => h('span.fact', { title: `${k} ${(k === 1 ? ENEMIES[t].name : ENEMIES[t].plural).toLowerCase()}${pv.newEnemy === t ? ', new tonight' : ''}` }, h('span.ic.mob', { html: creature(t) }), h('b', {}, k), pv.newEnemy === t ? h('span.word.red', {}, 'new') : null))),
          pv.newSpawn ? h('div.row.red.word', { title: `${pv.newSpawn.name} opens tonight` }, `+ ${pv.newSpawn.name}`) : null,
          h('div.row.between', {},
            seal('Night', () => this.g.callNight(), { title: 'Call the night now (N)' }),
            h('label.toggle', { title: 'Repeat this night after a win, instead of moving on' }, h('input', { type: 'checkbox', checked: s.hold, onchange: (e) => this.g.act((st) => { st.hold = e.target.checked; return { ok: true }; }) }), ic('repeat'), h('span.word', {}, 'Repeat'))));
      });
      if (this.timerEl) this.timerEl.textContent = dur(s.dayLength - s.phaseT);
    } else {
      const bt = s.battle;
      this.part('night', `night:${bt.n}`, () => {
        this.leftEl = h('b'); this.goldNight = h('b'); this.foeBar = h('span'); this.wallBar = h('span'); this.wallNum = h('b');
        const speed = (v) => h('button.token', { type: 'button', 'aria-pressed': 'false', 'data-speed': v, onclick: () => this.g.act((st) => { st.speed = v; return { ok: true }; }), title: v === 1 ? 'Normal speed (X)' : 'Double speed (X)' }, `×${v}`);
        this.speedRow = h('div.row', {}, speed(1), speed(2));
        fill(b, 
          h('div.row.between', {}, h('span.head', {}, ic('moon'), `Night ${bt.n}`), h('span.fact', { title: 'Gold earned tonight' }, ic('coin'), this.goldNight)),
          h('div.meter', { title: 'Creatures still out there' }, h('span.ic.mob', { html: creature('goblin') }), h('span.bar.red', {}, this.foeBar), this.leftEl),
          h('div.meter', { title: 'Walls' }, ic('wall'), h('span.bar', {}, this.wallBar), this.wallNum),
          this.speedRow);
      });
      const left = bt.total - bt.kills;
      this.leftEl.textContent = left;
      this.foeBar.style.width = `${((left / Math.max(1, bt.total)) * 100).toFixed(1)}%`;
      this.goldNight.textContent = `+${bt.gold}`;
      const max = wallStats(s.buildings.walls.level).integrity;
      const f = Math.max(0, s.integrity / max);
      this.wallBar.style.width = `${(f * 100).toFixed(1)}%`;
      this.wallBar.parentElement.classList.toggle('low', f < 0.3);
      this.wallNum.textContent = Math.ceil(s.integrity);
      for (const t of this.speedRow.children) t.setAttribute('aria-pressed', String(Number(t.dataset.speed) === s.speed));
    }
  }

  refreshPlace(s) {
    const id = s.ui.place || null;
    this.part('place', `${id}|${s.village.name}`, () => {
      const b = this.place.body;
      const l = LOCATIONS.find((x) => x.id === id);
      if (!l) { fill(b, h('div.row', {}, ic('wilds'), h('span.title', {}, 'Wilds')), h('span.word.soft', {}, 'Click a place')); return; }
      const home = l.kind === 'home';
      const kids = [h('span.title', { title: l.blurb }, home ? s.village.name : l.name), h('span.word.soft', {}, home ? 'Home' : LOCATION_KINDS[l.kind].name)];
      if (!home) {
        kids.push(h('div.row', { style: { gap: '14px' } },
          l.difficulty ? h('span.fact', { title: `Danger ${l.difficulty} of 5` }, h('span.pips', {}, h('b.red', {}, '◆'.repeat(l.difficulty)), h('span.dim', {}, '◆'.repeat(5 - l.difficulty)))) : null,
          l.hours ? fact('time', `${Math.round(l.hours * 60)}m`, 'There and back') : null));
        if (l.rewards) kids.push(h('div.chips', {}, ...l.rewards.map((r) => h('span.chip', {}, r))));
        kids.push(h('span.word.soft', { title: 'Expeditions arrive with the villager cards' }, 'Expeditions soon'));
      } else kids.push(slip('Watch', () => this.g.setView('watch')));
      fill(b, ...kids);
    });
  }

  refreshBuilding(s) {
    const id = s.ui.building || 'archery';
    const def = BUILDINGS[id];
    const lv = s.buildings[id]?.level ?? 0;
    const bl = upgradeBlocker(s, id) || '';
    const q = s.queue.find((x) => x.bid === id);
    this.part('building', `${id}|${lv}|${bl.startsWith('Needs') ? 'gold' : bl}|${q ? q.id : ''}`, () => {
      const b = this.building.body;
      const facts = [];
      if (id === 'archery') {
        const st = archeryStats(lv);
        facts.push(fact('dmg', st.dmg.toFixed(1), 'Damage per arrow'), fact('reach', st.range.toFixed(1), 'Reach'), fact('rate', st.rate.toFixed(2), 'Shots a second'), fact('people', st.archers || 2 + Math.floor(lv / 2), 'Archers'));
      }
      if (id === 'walls') { const st = wallStats(lv); facts.push(fact('wall', st.integrity, 'Strength (repaired every dawn)'), fact('armor', st.armor, 'Armour against every hit')); }
      if (id === 'townhall') facts.push(fact('cap', lv * 2, 'Other buildings can grow to this level'));
      const kids = [h('div.row.between', {}, h('span.title', { title: def.blurb }, def.name), h('span.badge', { title: `Level ${lv}` }, lv)), h('div.facts', {}, ...facts)];
      const cost = upgradeCost(id, lv);
      if (q) {
        this.qBar = h('span');
        kids.push(h('div.meter', { title: q === s.queue[0] ? 'Being built' : 'Waiting for the builders' }, ic('build'), h('span.bar.gold', {}, this.qBar), h('b', {}, `→ ${lv + 1}`)));
      } else if (bl.startsWith('Already')) kids.push(h('span.word.soft', {}, 'Highest level'));
      else {
        let why = null;
        if (bl.startsWith('Needs')) why = h('span.fact.red', { title: bl }, ic('coin'), h('b', {}, `−${bl.match(/\d+/)[0]}`));
        else if (bl.startsWith('Raise the Town Hall')) why = h('span.word.red', { title: bl }, 'Town Hall first');
        else if (bl) why = h('span.word.red', { title: bl }, 'Builders busy');
        kids.push(h('div.row.between', {},
          seal('Upgrade', () => this.g.upgrade(id), { title: `To level ${lv + 1}` }),
          h('div.stack.tight', {}, fact('coin', cost, 'Cost'), fact('time', dur(upgradeTime(id, lv)), 'Build time'), why)));
      }
      fill(b, ...kids);
    });
    if (q && this.qBar) this.qBar.style.width = `${Math.min(100, (q.progress / q.duration) * 100).toFixed(1)}%`;
  }

  setHover(key) {
    this.hover = key;
    this.sig.barr = null;
    if (this.g.state.ui.view === 'watch') this.refreshBarricades(this.g.state);
  }

  refreshBarricades(s) {
    const key = this.hover;
    this.part('barr', `${s.barricades.join(',')}|${key || ''}|${s.phase}|${s.night}`, () => {
      const b = this.barr.body;
      const left = BARRICADES - s.barricades.length;
      const icons = h('div.barr-row', { title: `${left} of ${BARRICADES} barricades left` }, ...Array.from({ length: BARRICADES }, (_, i) => h(`span${i < left ? '' : '.used'}`, { html: ICON.barr })));
      let info;
      if (s.phase === 'night') info = h('span.word.soft', {}, 'Locked until dawn');
      else if (key && s.barricades.includes(key)) info = h('span.word', {}, 'Click to remove');
      else if (key) {
        const r = canBlock(s.barricades, key, BARRICADES);
        if (!r.ok) info = h('span.word.red', { title: r.reason }, r.reason.includes('seal') ? 'Would seal the village' : left ? 'Not here' : 'None left');
        else {
          const before = routeLengths(s.barricades);
          const after = routeLengths([...s.barricades, key]);
          const rows = nightPreview(s).spawns.filter((sp) => Math.abs(after[sp.id] - before[sp.id]) > 0.5)
            .map((sp) => h('span.fact', { title: `${sp.name}: the walk from there becomes ${Math.round(after[sp.id])} paces instead of ${Math.round(before[sp.id])}` }, ic('paces'), h('span.word', {}, sp.name.split(' ').at(-1)), h('b', {}, `${Math.round(before[sp.id])} → ${Math.round(after[sp.id])}`)));
          info = rows.length ? h('div.stack.tight', {}, ...rows) : h('span.word.soft', { title: 'Nobody walks this path tonight' }, 'No change tonight');
        }
      } else info = h('span.word.soft', {}, left ? 'Click a path' : 'Click one to remove');
      fill(b, h('div.row.between', {}, h('span.title', {}, 'Barricades'), h('b.count', {}, `${left}`)), icons, info);
    });
  }

  // News: a paper slip that drops in at the top of the desk for a few seconds.
  say(level, text) {
    const item = h(`div.item.${level}`, { role: level === 'attention' ? 'alert' : 'status' }, h('div', {}, text));
    this.news.append(item);
    while (this.news.children.length > 2) this.news.firstChild.remove();
    setTimeout(() => item.remove(), level === 'attention' ? 6000 : 3500);
  }

  // A note in the middle of the desk (first visit, time away, settings).
  overlay(build) {
    const root = document.getElementById('overlay');
    const n = note('overlay');
    const close = () => { root.hidden = true; root.replaceChildren(); };
    build(n.body, close);
    fill(root, n.root);
    root.hidden = false;
    root.querySelector('input, button')?.focus();
  }
}

export { EDGE, SPAWNS };
