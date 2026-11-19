// The notes on the desk: the village packet, the view card, the night note,
// the village note, barricades, the current task and the log.
import { h, dur } from './dom.js';
import { BUILDINGS, ENEMIES, SPAWNS, BARRICADES, archeryStats, wallStats } from '../data/village.js';
import { nightPreview } from '../sim/battle.js';
import { upgradeBlocker, upgradeCost, upgradeTime, OBJECTIVES } from '../sim/village.js';
import { LOCATIONS, LOCATION_KINDS } from '../data/world.js';
import { canBlock, routeLengths, EDGE } from '../sim/web.js';

// A torn edge for a sheet of paper, as a clip-path, the same every time for an id.
function worn(id, cut) {
  let s = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
  const r = () => { s = (s * 16807) % 2147483647 || 1; return s / 2147483647; };
  const pts = [];
  const edge = (x0, y0, x1, y1, n) => {
    for (let i = 0; i < n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const j = r() * 0.9;
      pts.push([x + (y1 - y0 ? (x0 === 0 ? j : -j) : 0), y + (x1 - x0 ? (y0 === 0 ? j : -j) : 0)]);
    }
  };
  const c = cut === 'tr' ? [[0, 0], [94, 0], [100, 5], [100, 100], [0, 100]] : [[0, 0], [100, 0], [100, 100], [0, 100]];
  for (let i = 0; i < c.length; i++) {
    const [x0, y0] = c[i], [x1, y1] = c[(i + 1) % c.length];
    edge(x0, y0, x1, y1, Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 8)));
  }
  return `polygon(${pts.map(([x, y]) => `${Math.min(100, Math.max(0, x)).toFixed(2)}% ${Math.min(100, Math.max(0, y)).toFixed(2)}%`).join(', ')})`;
}

function note(id, { rot = 0, tone = '', cut, tape, pin, stain, label } = {}) {
  const sheet = h('div.sheet', { style: { clipPath: worn(id, cut) } });
  if (stain) sheet.append(h('div.stain', { style: { left: `${stain[0]}px`, top: `${stain[1]}px` } }));
  if (cut === 'tr') sheet.append(h('div.fold'));
  const body = h('div.body');
  sheet.append(body);
  const root = h(`section.note${tone ? `.${tone}` : ''}`, { style: { '--rot': `${rot}deg` }, 'aria-label': label || null }, tape ? h('div.tape') : null, pin ? h('div.pin') : null, sheet);
  return { root, body };
}

const seal = (label, onClick, size = 96) => h('div.seal', { style: { '--size': `${size}px` } }, h('button', { type: 'button', onclick: onClick }, h('span', { html: label })));
export const slip = (label, onClick, attrs = {}) => h('div.slip', {}, h('button', { type: 'button', onclick: onClick, ...attrs }, label));
const COIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="9" fill="#7a5418"/><circle cx="12" cy="11" r="9" fill="#e0a93a" stroke="#7a5418" stroke-width="1.5"/><circle cx="12" cy="11" r="5.5" fill="none" stroke="#7a5418" stroke-width="1.2"/></svg>';
const BARR = '<svg viewBox="0 0 46 30" aria-hidden="true"><rect x="3" y="11" width="40" height="9" rx="2" fill="#a07a4e" stroke="#23170f" stroke-width="1.5"/><path d="M9 4 L15 27 M31 4 L37 27" stroke="#5a3e22" stroke-width="4" stroke-linecap="round"/></svg>';
const ICONS = {
  wilds: '<svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="#e9d8b0" stroke-width="1.6"><circle cx="14" cy="12" r="9"/><path d="M6 14 q8 4 16 0"/><path d="M8 22 h12 M11 21 v3 M17 21 v3" stroke-linecap="round"/></svg>',
  watch: '<svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="#e9d8b0" stroke-width="1.8" stroke-linecap="round"><circle cx="16" cy="11" r="7.5"/><path d="M10.5 16.5 L3 24"/></svg>',
  hearth: '<svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="#e9d8b0" stroke-width="1.6" stroke-linejoin="round"><path d="M4 24 V13 L9 8 L14 13 V24"/><path d="M14 24 V6 h6 v18"/><path d="M19 6 l-3 -4 l-3 4"/><path d="M2 24 h24"/></svg>',
};

export class Desk {
  constructor(game) {
    this.g = game;
    this.left = document.getElementById('left');
    this.right = document.getElementById('right');
    this.news = document.getElementById('news');
    this.keys = {};
    this.build();
  }

  build() {
    const g = this.g;
    // the village packet
    this.packet = note('packet', { rot: -1.6, cut: 'tr', stain: [180, 26], label: 'Village' });
    this.nameEl = h('span.name');
    this.subEl = h('span.hand.small');
    this.goldEl = h('span');
    this.packet.body.append(h('div.ruled.row.between', {}, h('div.stack', { style: { gap: '2px' } }, this.nameEl, this.subEl), h('div.coin', { title: 'Gold' }, h('span', { html: COIN }), this.goldEl)));
    // the view card
    this.viewBtns = {};
    const views = h('nav.views', { 'aria-label': 'Views' }, h('div.leather', {}, h('div.stitch', {},
      [['wilds', 'Wilds', 'the whole globe', '1'], ['watch', 'Watch', 'the reading glass', '2'], ['hearth', 'Hearth', 'the big loupe', '3']].map(([id, name, hint, key]) => {
        const btn = h('button.view-btn', { type: 'button', 'aria-current': 'false', title: `${name} (${key})`, onclick: () => g.setView(id) },
          h('span', { html: ICONS[id] }), h('span', {}, h('span.vname', {}, name), h('span.vhint', {}, hint)), h('span.key', {}, key));
        this.viewBtns[id] = btn;
        return btn;
      }))));
    // the current task
    this.task = note('task', { rot: 1.4, tone: 'older', pin: true, label: 'Current task' });
    // the log
    this.logNote = note('log', { rot: -1, tone: 'mid', label: 'Log' });
    this.logList = h('ul.log', { 'aria-live': 'polite' });
    this.logNote.body.append(h('h3', {}, 'The watch log'), this.logList);
    const gear = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#3a2410" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>';
    const settings = h('button.settings-btn', { type: 'button', onclick: () => g.openSettings(), title: 'Settings (O)' }, h('span.knob', { html: gear }), h('span.hand', {}, 'Settings'));
    this.left.append(this.packet.root, views, this.task.root, this.logNote.root, settings);

    // the night note
    this.night = note('night', { rot: 1.2, cut: 'tr', tape: true, stain: [250, 200], label: 'The night' });
    // the village: tower, walls, town hall
    this.village = note('village', { rot: -1.4, tone: 'mid', label: 'Village defences' });
    // barricades
    this.barr = note('barricades', { rot: 1.6, tone: 'older', pin: true, label: 'Barricades' });
    // a place in the Wilds, and a building in Hearth
    this.place = note('place', { rot: -1.2, cut: 'tr', tape: true, stain: [230, 160], label: 'A place in the globe' });
    this.building = note('building', { rot: -1.1, cut: 'tr', tape: true, stain: [220, 210], label: 'A building' });
    this.right.append(this.night.root, this.place.root, this.building.root, this.village.root, this.barr.root);
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
    this.subEl.textContent = `Town Hall ${s.buildings.townhall.level}${s.best ? `, best night ${s.best}` : ', no nights held yet'}`;
    this.goldEl.textContent = Math.floor(s.gold - s.reserved);
    document.body.classList.toggle('night', s.phase === 'night');
    const v = s.ui.view;
    for (const [id, btn] of Object.entries(this.viewBtns)) btn.setAttribute('aria-current', id === v ? 'true' : 'false');
    this.place.root.hidden = v !== 'wilds';
    this.building.root.hidden = v !== 'hearth';
    this.barr.root.hidden = v !== 'watch';
    this.village.root.hidden = v !== 'watch';
    if (v === 'wilds') this.refreshPlace(s);
    if (v === 'hearth') this.refreshBuilding(s);
    this.refreshTask(s);
    this.refreshLog(s);
    this.refreshNight(s);
    this.refreshVillage(s);
    this.refreshBarricades(s);
  }

  refreshTask(s) {
    const o = OBJECTIVES.find((x) => !x.future && !s.objectives.claimed.includes(x.id));
    this.part('task', o?.id || 'none', () => {
      const b = this.task.body;
      b.replaceChildren();
      if (!o) { b.append(h('p.hand.blue', {}, 'Nothing pressing. Keep the lanterns lit.')); return; }
      b.append(h('div.stack', {}, h('h3', {}, o.title), h('p.hand.blue', { style: { margin: 0, fontSize: '16px', lineHeight: 1.4 } }, o.guide), o.reward ? h('span.small', { style: { color: '#4f6a2a' } }, `Reward: ${o.reward} gold`) : null));
    });
  }

  refreshLog(s) {
    const last = s.log.slice(-5);
    this.part('log', `${s.log.length}:${last.at(-1)?.at || 0}`, () => {
      this.logList.replaceChildren(...(last.length ? last.reverse().map((e) => h(`li.${e.level}`, {}, e.text)) : [h('li', {}, 'All quiet. The candle is lit.')]));
    });
  }

  refreshNight(s) {
    const b = this.night.body;
    if (s.phase === 'day') {
      const pv = nightPreview(s);
      this.part('night', `day:${s.night}:${s.hold}:${s.buildings.walls.level}`, () => {
        b.replaceChildren();
        const by = {};
        const comp = Object.entries(pv.comp).filter(([, k]) => k > 0);
        const lines = comp.map(([t, k]) => `${k} ${k === 1 ? ENEMIES[t].name.toLowerCase() : ENEMIES[t].plural.toLowerCase()}`);
        const from = pv.spawns.map((x) => x.name).join(' and ');
        this.timerEl = h('span');
        this.holdBox = h('input', { type: 'checkbox', checked: s.hold, onchange: (e) => this.g.act((st) => { st.hold = e.target.checked; return { ok: true }; }) });
        b.append(h('div.ruled.stack', {},
          h('h2', {}, `Night ${s.night} is coming`),
          h('p.hand.blue', { style: { margin: 0, fontSize: '17px', lineHeight: 1.45 } }, `${lines.join(' and ')} from the ${from}`, h('br'), 'dusk falls in ', this.timerEl),
          pv.newSpawn ? h('p.hand', { style: { margin: 0, color: '#8a2e22' } }, `The ${pv.newSpawn.name} opens tonight.`) : null,
          pv.newEnemy ? h('p.hand', { style: { margin: 0, color: '#8a2e22' } }, `New tonight: ${ENEMIES[pv.newEnemy].plural.toLowerCase()}.`) : null,
          h('div.row', { style: { marginTop: '4px', gap: '16px' } },
            seal('Call the<br>night', () => this.g.callNight(), 100),
            h('label.check', { title: 'Repeat this night instead of moving on after a win' }, this.holdBox, 'Hold the night'))));
        void by;
      });
      if (this.timerEl) this.timerEl.textContent = dur(s.dayLength - s.phaseT);
    } else {
      const bt = s.battle;
      this.part('night', `night:${bt.n}`, () => {
        b.replaceChildren();
        this.nightLeft = h('span.hand');
        this.wallBar = h('span');
        this.wallNum = h('span.small');
        const speed = (v) => h('button.token', { type: 'button', 'aria-pressed': s.speed === v ? 'true' : 'false', onclick: () => this.g.act((st) => { st.speed = v; return { ok: true }; }), title: v === 1 ? 'Normal speed (X)' : 'Double speed (X)' }, `×${v}`);
        this.speedRow = h('div.row', {}, speed(1), speed(2), h('span.hand.small', {}, 'speed'));
        b.append(h('div.stack', {},
          h('div.row.between', {}, h('h2', {}, `Night ${bt.n}`), this.nightLeft),
          h('div.row', { style: { fontSize: '14px', gap: '10px' } }, h('span', {}, 'Walls'), h('span.bar', {}, this.wallBar), this.wallNum),
          this.speedRow));
      });
      const left = bt.total - bt.kills;
      this.nightLeft.textContent = `${left} of ${bt.total} left, +${bt.gold} gold`;
      const max = wallStats(s.buildings.walls.level).integrity;
      const f = Math.max(0, s.integrity / max);
      this.wallBar.style.width = `${(f * 100).toFixed(1)}%`;
      this.wallBar.parentElement.classList.toggle('low', f < 0.3);
      this.wallNum.textContent = `${Math.ceil(s.integrity)} / ${max}`;
      for (const t of this.speedRow.querySelectorAll('.token')) t.setAttribute('aria-pressed', t.textContent === `×${s.speed}` ? 'true' : 'false');
    }
  }

  refreshVillage(s) {
    const rows = ['archery', 'walls', 'townhall'];
    const sig = rows.map((id) => { const bl = upgradeBlocker(s, id) || ''; return `${s.buildings[id].level}:${bl.startsWith('Needs') ? 'gold' : bl}`; }).join('|') + `|${s.queue.map((q) => q.id).join(',')}`;
    this.part('village', sig, () => {
      const b = this.village.body;
      b.replaceChildren(h('h3', { style: { marginBottom: '4px' } }, 'The village'));
      this.qBars = {};
      for (const id of rows) {
        const lv = s.buildings[id].level;
        let stat = '';
        if (id === 'archery') { const st = archeryStats(lv); stat = `${st.dmg.toFixed(1)} damage, reach ${st.range.toFixed(1)}, ${st.rate.toFixed(2)} shots a second`; }
        if (id === 'walls') { const st = wallStats(lv); stat = `${st.integrity} strength, armour ${st.armor}`; }
        if (id === 'townhall') stat = `buildings up to level ${lv * 2}`;
        const q = s.queue.find((x) => x.bid === id);
        const block = upgradeBlocker(s, id);
        const verb = { archery: 'Train', walls: 'Mend', townhall: 'Raise' }[id];
        const cost = upgradeCost(id, lv);
        const bar = h('span');
        if (q) this.qBars[id] = { bar, q };
        b.append(h('div.bld', {},
          h('span.bname', {}, `${BUILDINGS[id].name}, level ${lv}`),
          q ? h('span.hand.small', { style: { gridRow: '1 / span 2', gridColumn: 2 } }, q === s.queue[0] ? 'building' : 'waiting')
            : slip(cost ? `${verb}, ${cost}` : 'Highest level', () => this.g.upgrade(id), { disabled: !!block && !block.startsWith('Needs') ? true : null, title: block || `${verb} to level ${lv + 1} for ${cost} gold` }),
          h('span.bstat', {}, stat),
          q ? h('span.bar.gold', {}, bar) : null));
      }
    });
    for (const { bar, q } of Object.values(this.qBars || {})) bar.style.width = `${Math.min(100, (q.progress / q.duration) * 100).toFixed(1)}%`;
  }

  refreshPlace(s) {
    const id = s.ui.place || null;
    this.part('place', `${id}|${s.village.name}`, () => {
      const b = this.place.body;
      b.replaceChildren();
      const l = LOCATIONS.find((x) => x.id === id);
      if (!l) {
        b.append(h('div.stack', {}, h('h2', {}, 'The Wilds'), h('p.hand.blue', { style: { margin: 0, fontSize: '17px', lineHeight: 1.45 } }, 'The whole world inside the globe: friendly villages, ruins, and dungeons the creatures crawl out of. Click a paper tag to read about a place.'), h('p.hand', { style: { margin: 0 } }, 'Expeditions to these places come with the villager cards.')));
        return;
      }
      const name = l.kind === 'home' ? s.village.name : l.name;
      const danger = l.difficulty ? h('span', {}, 'Danger ', h('b', { style: { color: '#9e3426', letterSpacing: '2px' } }, '◆'.repeat(l.difficulty)), h('span', { style: { color: 'rgba(90,62,38,.35)', letterSpacing: '2px' } }, '◆'.repeat(5 - l.difficulty))) : null;
      b.append(h('div.ruled.stack', {},
        h('h2', {}, name),
        h('span.hand', {}, l.kind === 'home' ? 'your village, under the reading glass' : LOCATION_KINDS[l.kind].name.toLowerCase()),
        h('p', { style: { margin: 0, lineHeight: 1.45 } }, l.blurb),
        l.kind !== 'home' ? h('div.small.stack', { style: { gap: '4px' } }, danger, l.hours ? h('span', {}, `About ${Math.round(l.hours * 60)} minutes there and back`) : null, l.rewards ? h('span', {}, `Brings back ${l.rewards.join(', ').toLowerCase()}`) : null) : null,
        l.kind === 'home' ? slip('Look through the reading glass', () => this.g.setView('watch')) : h('p.hand', { style: { margin: 0, color: '#8a2e22' } }, 'Expeditions arrive with the villager cards in a coming update.')));
    });
  }

  refreshBuilding(s) {
    const id = s.ui.building || 'archery';
    const def = BUILDINGS[id];
    const lv = s.buildings[id]?.level ?? 0;
    const bl = def.upgradable ? upgradeBlocker(s, id) || '' : '';
    const q = s.queue.find((x) => x.bid === id);
    this.part('building', `${id}|${lv}|${bl.startsWith('Needs') ? 'gold' : bl}|${q ? q.id : ''}`, () => {
      const b = this.building.body;
      b.replaceChildren();
      let stat = null;
      if (id === 'archery') { const st = archeryStats(lv); stat = `${st.dmg.toFixed(1)} damage, reach ${st.range.toFixed(1)}, ${st.rate.toFixed(2)} shots a second, ${st.archers || 2 + Math.floor(lv / 2)} archers on the walk.`; }
      if (id === 'walls') { const st = wallStats(lv); stat = `${st.integrity} strength, armour ${st.armor}. Repaired at every dawn.`; }
      if (id === 'townhall') stat = `Lets every other building grow to level ${lv * 2}.`;
      const head = def.upgradable ? `level ${lv}` : lv >= 1 ? 'standing' : 'a ruin';
      const kids = [h('h2', {}, def.name), h('span.hand', {}, head), h('p', { style: { margin: 0, lineHeight: 1.45 } }, def.blurb)];
      if (stat) kids.push(h('p.small', { style: { margin: 0 } }, stat));
      if (def.upgradable) {
        const cost = upgradeCost(id, lv);
        const verb = { archery: 'Train the archers', walls: 'Strengthen the walls', townhall: 'Raise the Town Hall' }[id];
        if (q) kids.push(h('p.hand.blue', { style: { margin: 0 } }, q === s.queue[0] ? 'The builders are on it.' : 'Waiting for the builders.'));
        else if (cost) {
          kids.push(h('span.small', {}, `${cost} gold and ${dur(upgradeTime(id, lv))} of work`));
          kids.push(h('div.row', { style: { marginTop: '4px', gap: '14px' } }, seal(verb.split(' ')[0] === 'Raise' ? 'Raise' : verb.split(' ')[0], () => this.g.upgrade(id), 86), bl ? h('span.hand', { style: { color: '#8a2e22' } }, bl) : h('span.hand', {}, `to level ${lv + 1}`)));
        } else kids.push(h('p.hand', { style: { margin: 0 } }, 'As strong as it gets.'));
      } else if (def.later) kids.push(h('p.hand', { style: { margin: 0, color: '#8a2e22' } }, def.later));
      b.append(h('div.ruled.stack', {}, ...kids));
    });
  }

  setHover(key) {
    this.hover = key;
    this.sig.barr = null;
    this.refreshBarricades(this.g.state);
  }

  refreshBarricades(s) {
    const key = this.hover;
    this.part('barr', `${s.barricades.join(',')}|${key || ''}|${s.phase}|${s.night}`, () => {
      const b = this.barr.body;
      b.replaceChildren();
      const icons = [];
      for (let i = 0; i < BARRICADES; i++) icons.push(i < BARRICADES - s.barricades.length ? h('span', { html: BARR }) : h('span.empty'));
      let line;
      if (s.phase === 'night') line = 'The barricades hold until dawn. They can be moved again by day.';
      else if (key && s.barricades.includes(key)) line = 'Click to take this barricade up again.';
      else if (key) {
        const r = canBlock(s.barricades, key, BARRICADES);
        if (!r.ok) line = h('span', { style: { color: '#8a2e22' } }, r.reason);
        else {
          const before = routeLengths(s.barricades);
          const after = routeLengths([...s.barricades, key]);
          const open = nightPreview(s).spawns;
          const changes = open.filter((sp) => Math.abs(after[sp.id] - before[sp.id]) > 0.5).map((sp) => `${sp.name}: ${Math.round(before[sp.id])} paces become ${Math.round(after[sp.id])}`);
          line = changes.length ? changes.join('. ') + '.' : 'Nobody walks this path tonight, so it changes nothing yet.';
        }
      } else line = s.barricades.length ? 'Click a barricade to take it up, or another path to block it.' : 'Click a path under the glass to block it. The creatures must then take the long way round, past more of the archers.';
      b.append(h('div.stack', {}, h('div.row.between', {}, h('h3', {}, 'Barricades'), h('span.hand', {}, `${BARRICADES - s.barricades.length} of ${BARRICADES} left`)), h('div.barr-row', {}, icons), h('p.hand.blue', { style: { margin: 0, fontSize: '16px', lineHeight: 1.4 } }, line)));
    });
  }

  // News: a paper slip that drops in at the top of the desk for a few seconds.
  say(level, text) {
    const item = h(`div.item.${level}`, { style: { '--rot': `${(Math.random() * 2 - 1).toFixed(1)}deg` }, role: level === 'attention' ? 'alert' : 'status' }, h('div', {}, text));
    this.news.append(item);
    while (this.news.children.length > 3) this.news.firstChild.remove();
    setTimeout(() => item.remove(), level === 'attention' ? 7000 : 4500);
  }

  // A note in the middle of the desk (first visit, time away).
  overlay(build) {
    const root = document.getElementById('overlay');
    const n = note('overlay', { rot: -0.8, cut: 'tr', tape: true });
    const close = () => { root.hidden = true; root.replaceChildren(); };
    build(n.body, close);
    root.replaceChildren(n.root);
    root.hidden = false;
    root.querySelector('input, button')?.focus();
  }
}

export { EDGE, SPAWNS };
