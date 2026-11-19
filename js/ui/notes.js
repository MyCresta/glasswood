// The notes on the desk, built from the kit (./kit.js) and placed in fixed slots:
//   left:  village · views · goal · hand (later) · tools
//   right: time (the night) · focus (what the current view is about) · detail (later)
import { h, dur } from './dom.js';
import { BUILDINGS, ENEMIES, SPAWNS, archeryStats, wallStats, level } from '../data/village.js';
import { nightPreview } from '../sim/battle.js';
import { upgradeBlocker, upgradeCost, upgradeTime, OBJECTIVES, available, barricadeMax, workers, slots, housing, production, builders, levelCap, rewardText } from '../sim/village.js';
import { LOCATIONS, LOCATION_KINDS } from '../data/world.js';
import { canBlock, routeLengths, EDGE } from '../sim/web.js';
import { ICON, card, head, fact, facts, meter, seal, slip, action, tokens, toggle, pieces, chips, hint, badge, pips, tabs, icon, slots as makeSlots, SLOTS, fill, stepper } from './kit.js';

export { slip };

export class Desk {
  constructor(game) {
    this.g = game;
    this.news = document.getElementById('news');
    this.L = makeSlots(document.getElementById('left'), SLOTS.left);
    this.R = makeSlots(document.getElementById('right'), SLOTS.right);
    this.sig = {};
    this.hover = null;
    this.build();
  }

  build() {
    const g = this.g;
    this.village = card('village', { label: 'Village' });
    this.L.village.append(this.village.root);
    this.views = tabs([
      { id: 'wilds', label: 'Wilds', title: 'Wilds (1, or scroll out)' },
      { id: 'watch', label: 'Watch', title: 'Watch (2)' },
      { id: 'hearth', label: 'Hearth', title: 'Hearth (3, or scroll in)' },
    ], (id) => g.setView(id));
    this.L.views.append(this.views.el);
    this.goal = card('goal', { tone: 'mid', label: 'Goal' });
    this.L.goal.append(this.goal.root);
    this.L.tools.append(h('button.knob', { type: 'button', onclick: () => g.openSettings(), title: 'Settings (O)', 'aria-label': 'Settings', html: ICON.gear }));

    this.time = card('time', { label: 'The night' });
    this.R.time.append(this.time.root);
    this.focus = card('focus', { tone: 'mid', label: 'Selected' });
    this.R.focus.append(this.focus.root);
  }

  // Rebuild a card only when what it shows has changed.
  part(key, sig, fn) {
    if (this.sig[key] === sig) return;
    this.sig[key] = sig;
    fn();
  }

  refresh() {
    const s = this.g.state;
    document.body.classList.toggle('night', s.phase === 'night');
    this.views.select(s.ui.view);
    const have = ['gold', 'timber', 'stone'].map((r) => Math.floor(available(s, r)));
    const prod = production(s);
    this.part('village', `${s.village.name}|${have}|${s.villagers.length}|${housing(s)}|${prod.timber}|${prod.stone}`, () => this.village.set({
      head: head(null, s.village.name, fact('people', `${s.villagers.length}/${housing(s)}`, 'Villagers, and beds for them')),
      content: h('div.res', {},
        fact('coin', have[0], 'Gold', null, 'gold'),
        fact('timber', have[1], prod.timber ? `Timber: +${Math.round(prod.timber * 60)} a minute` : 'Timber: restore the Lumber Camp'),
        fact('stone', have[2], prod.stone ? `Stone: +${Math.round(prod.stone * 60)} a minute` : 'Stone: restore the Quarry')),
    }));
    this.refreshGoal(s);
    this.refreshTime(s);
    if (s.ui.view === 'wilds') this.refreshPlace(s);
    if (s.ui.view === 'watch') this.refreshBarricades(s);
    if (s.ui.view === 'hearth') this.refreshBuilding(s);
  }

  refreshGoal(s) {
    const o = OBJECTIVES.find((x) => !x.future && !s.objectives.claimed.includes(x.id));
    this.L.goal.hidden = !o;
    if (!o) return;
    const [r, n] = Object.entries(o.reward || {})[0] || [];
    this.part('goal', o.id, () => this.goal.set({ head: head(icon('goal', 'red'), o.title, r ? fact(r === 'gold' ? 'coin' : r, `+${n}`, `${rewardText(o.reward)} when done`) : null, { title: o.guide }) }));
  }

  refreshTime(s) {
    if (s.phase === 'day') {
      const pv = nightPreview(s);
      this.part('time', `day:${s.night}:${s.hold}`, () => {
        this.timer = h('b');
        const comp = Object.entries(pv.comp).filter(([, k]) => k > 0);
        this.time.set({
          head: head('moon', `Night ${s.night}`, h('span.fact', { title: 'Until dusk' }, icon('time'), this.timer)),
          content: [
            facts(...comp.map(([t, k]) => fact(icon(t, 'mob'), k, `${k} ${(k === 1 ? ENEMIES[t].name : ENEMIES[t].plural).toLowerCase()}`, pv.newEnemy === t ? 'new' : null))),
            pv.newSpawn ? hint(`+ ${pv.newSpawn.name}`, 'red', `${pv.newSpawn.name} opens tonight`) : null,
          ],
          foot: action(seal('Night', () => this.g.callNight(), { title: 'Call the night now (N)' }),
            toggle('repeat', 'Repeat', s.hold, (on) => this.g.act((st) => { st.hold = on; return { ok: true }; }), 'Repeat this night after a win, instead of moving on')),
        });
      });
      this.timer.textContent = dur(s.dayLength - s.phaseT);
    } else {
      const bt = s.battle;
      this.part('time', `night:${bt.n}:${s.speed}`, () => {
        this.foes = meter(icon('goblin', 'mob'), 'Creatures still out there', 'red');
        this.walls = meter('wall', 'Walls');
        this.earned = h('b');
        this.time.set({
          head: head('moon', `Night ${bt.n}`, h('span.fact', { title: 'Gold earned tonight' }, icon('coin'), this.earned)),
          content: [this.foes.el, this.walls.el],
          foot: tokens([{ value: 1, label: '×1', title: 'Normal speed (X)' }, { value: 2, label: '×2', title: 'Double speed (X)' }], s.speed, (v) => this.g.act((st) => { st.speed = v; return { ok: true }; })),
        });
      });
      const left = bt.total - bt.kills;
      this.foes.set(left / Math.max(1, bt.total), left);
      const max = wallStats(s.buildings.walls.level).integrity;
      this.walls.set(s.integrity / max, Math.ceil(s.integrity), s.integrity / max < 0.3);
      this.earned.textContent = `+${bt.gold}`;
    }
  }

  refreshPlace(s) {
    const id = s.ui.place || null;
    this.part('focus', `place|${id}|${s.village.name}`, () => {
      const l = LOCATIONS.find((x) => x.id === id);
      if (!l) { this.focus.set({ head: head('wilds', 'Wilds'), foot: hint('Click a place') }); return; }
      if (l.kind === 'home') { this.focus.set({ head: head('place', s.village.name, hint('Home')), foot: slip('Watch', () => this.g.setView('watch')) }); return; }
      this.focus.set({
        head: head('place', l.name, null, { title: l.blurb }),
        content: [
          facts(h('span.fact', {}, h('span.word.soft', {}, LOCATION_KINDS[l.kind].name)), l.difficulty ? h('span.fact', { title: `Danger ${l.difficulty} of 5` }, pips(l.difficulty)) : null, l.hours ? fact('time', `${Math.round(l.hours * 60)}m`, 'There and back') : null),
          l.rewards ? chips(l.rewards) : null,
        ],
        foot: hint('Expeditions soon', 'soft', 'Expeditions arrive with the villager cards'),
      });
    });
  }

  refreshBuilding(s) {
    const id = s.ui.building || 'archery';
    const def = BUILDINGS[id];
    const lv = s.buildings[id]?.level ?? 0;
    const bl = upgradeBlocker(s, id) || '';
    const q = s.queue.find((x) => x.bid === id);
    const w = def.job ? workers(s, id) : 0;
    const idle = s.villagers.filter((v) => v.job === 'idle').length;
    this.part('focus', `bld|${id}|${lv}|${bl.startsWith('Needs') ? 'res' : bl}|${q ? q.id : ''}|${w}|${idle}|${s.villagers.length}|${barricadeMax(s)}`, () => {
      const v = level(id, lv);
      const stats = [];
      if (def.job) stats.push(stepper(`${w}/${v.slots || 0}`, () => this.g.unpost(id), () => this.g.post(id), `${def.jobs}: ${w} of ${v.slots || 0} posts filled${idle ? `, ${idle} resting` : ''}`, { canMinus: w > 0, canPlus: w < (v.slots || 0) && s.villagers.length > w }));
      if (id === 'archery') { const st = archeryStats(lv, w); stats.push(fact('dmg', st.dmg.toFixed(1), 'Damage per arrow'), fact('reach', st.range.toFixed(1), 'Reach'), st.shots > 1 ? fact('rate', `×${st.shots}`, 'Arrows per shot') : null); }
      if (id === 'walls') { const st = wallStats(lv); stats.push(fact('wall', st.integrity, 'Strength (mended every dawn)'), fact('armor', st.armor, 'Armour against every hit')); }
      if (id === 'townhall') stats.push(fact('cap', levelCap(s, 'tavern'), 'Other buildings can grow to this level'), fact('build', builders(s), 'Builders working at the same time'));
      if (id === 'tavern') stats.push(fact('people', `${s.villagers.length}/${housing(s)}`, 'Villagers and beds. A traveller settles after every night held, if there is a bed'));
      if (def.makes) stats.push(fact(def.makes, `+${Math.round(Math.min(w, v.slots || 0) * (v.per || 0))}`, `${def.makes[0].toUpperCase() + def.makes.slice(1)} a minute`, '/min'));
      if (id === 'workshop') stats.push(fact(h('span.ic', { html: ICON.barr }), barricadeMax(s), 'Barricades you can place'));
      const next = def.levels[lv + 1];
      const kids = [facts(...stats)];
      if (next) kids.push(h('div.next', { title: 'The next level' }, icon('next'), h('span', {}, next.gain)));
      let foot;
      this.qBar = null;
      if (q) { this.qBar = meter('build', s.queue.indexOf(q) < builders(s) ? 'Being built' : 'Waiting for a builder', 'gold'); foot = this.qBar.el; }
      else if (!next) foot = hint('Highest level');
      else {
        let why = null;
        if (bl.startsWith('Needs')) { const [, n, r] = bl.match(/(\d+) more (\w+)/); why = hint(`${n} more ${r}`, 'red', bl); }
        else if (bl.startsWith('Raise the Town Hall')) why = hint('Town Hall first', 'red', bl);
        else if (bl) why = hint('Builders busy', 'red', bl);
        const cost = upgradeCost(id, lv);
        kids.push(h('div.res.cost', { title: 'Cost' }, ['gold', 'timber', 'stone'].map((r) => cost[r] ? fact(r === 'gold' ? 'coin' : r, cost[r], r, null, s[r] - (s.reserved[r] || 0) < cost[r] ? 'red' : '') : h('span'))));
        foot = action(seal(lv === 0 ? 'Restore' : 'Upgrade', () => this.g.upgrade(id), { title: lv === 0 ? 'Restore it' : `To level ${lv + 1}` }),
          fact('time', dur(upgradeTime(id, lv)), 'Build time'), why);
      }
      this.focus.set({ head: head('hearth', def.name, lv === 0 ? hint('Ruin', 'soft') : badge(lv, `Level ${lv}`), { title: def.blurb }), content: kids, foot });
    });
    if (q && this.qBar) this.qBar.set(q.progress / q.duration, dur(q.duration - q.progress));
  }

  setHover(key) {
    this.hover = key;
    if (this.g.state.ui.view === 'watch') this.refreshBarricades(this.g.state);
  }

  refreshBarricades(s) {
    const key = this.hover;
    this.part('focus', `barr|${s.barricades.join(',')}|${key || ''}|${s.phase}|${s.night}|${barricadeMax(s)}`, () => {
      const max = barricadeMax(s);
      const left = max - s.barricades.length;
      let content = null, foot = null;
      if (!max) foot = slip('Restore the Workshop', () => { this.g.state.ui.building = 'workshop'; this.g.setView('hearth'); this.g.view.views.hearth.select('workshop'); });
      else if (s.phase === 'night') foot = hint('Locked until dawn');
      else if (key && s.barricades.includes(key)) foot = hint('Click to remove', 'ink');
      else if (key) {
        const r = canBlock(s.barricades, key, max);
        if (!r.ok) foot = hint(r.reason.includes('seal') ? 'Would seal the village' : left ? 'Not here' : 'None left', 'red', r.reason);
        else {
          const before = routeLengths(s.barricades);
          const after = routeLengths([...s.barricades, key]);
          const rows = nightPreview(s).spawns.filter((sp) => Math.abs(after[sp.id] - before[sp.id]) > 0.5)
            .map((sp) => fact('paces', `${Math.round(before[sp.id])} → ${Math.round(after[sp.id])}`, `${sp.name}: the walk becomes ${Math.round(after[sp.id])} paces instead of ${Math.round(before[sp.id])}`, sp.name.split(' ').at(-1)));
          if (rows.length) content = h('div.list', {}, rows); else foot = hint('No change tonight', 'soft', 'Nobody walks this path tonight');
        }
      } else foot = hint(left ? 'Click a path' : 'Click one to remove');
      this.focus.set({ head: head(null, 'Barricades', h('b.count', {}, max ? left : '–')), content: [max ? pieces(ICON.barr, left, max, `${left} of ${max} left`) : null, content], foot });
    });
  }

  // News: a paper slip that rises at the bottom of the desk for a few seconds.
  say(level, text) {
    const item = h(`div.item.${level}`, { role: level === 'attention' ? 'alert' : 'status' }, h('div', {}, text));
    this.news.append(item);
    while (this.news.children.length > 2) this.news.firstChild.remove();
    setTimeout(() => item.remove(), level === 'attention' ? 6000 : 3500);
  }

  // A card in the middle of the desk (first visit, time away, settings).
  overlay(build) {
    const root = document.getElementById('overlay');
    const c = card('overlay');
    c.content.hidden = false;
    const close = () => { root.hidden = true; root.replaceChildren(); };
    build(c.content, close);
    fill(root, c.root);
    root.hidden = false;
    root.querySelector('input, button')?.focus();
  }
}

export { EDGE, SPAWNS };
