// The notes on the desk, built from the kit (./kit.js) and placed in fixed slots:
//   left:  village · views · hand (your cards) · tools
//   right: time (camp, the draft, the night, the end) · focus (what the view is about)
// And two cards in the middle of the desk: the draft after every night, and the
// end of a run.
import { h } from './dom.js';
import { ENEMIES, SPAWNS, BUILDINGS } from '../data/village.js';
import { CARD, FAMILIES, RARITY, SYNERGIES, TAG_NAMES } from '../data/cards.js';
import { nightPreview, magicScale } from '../sim/battle.js';
import { build } from '../sim/build.js';
import { rerollCost } from '../sim/run.js';
import { barricadeMax } from '../sim/village.js';
import { LOCATIONS, LOCATION_KINDS } from '../data/world.js';
import { canBlock, routeLengths, EDGE } from '../sim/web.js';
import { ICON, card, head, fact, facts, meter, seal, slip, action, hint, badge, pips, tabs, icon, slots as makeSlots, SLOTS, fill, chips } from './kit.js';

export { slip };

const FAMILY_ICON = { defender: 'people', spell: 'spark', toolkit: 'barr', fortify: 'wall', tower: 'tower' };
const famIcon = (f) => (f === 'toolkit' ? h('span.ic', { html: ICON.barr }) : icon(FAMILY_ICON[f]));

// the numbers that matter on a card, as facts
function cardFacts(c) {
  const out = [];
  if (c.shooter) out.push(fact('dmg', c.shooter.dmg, 'Damage', 'damage'), fact('reach', c.shooter.range, 'Reach', 'reach'), fact('rate', c.shooter.rate, 'Shots a second', 'per sec'));
  if (c.spell?.active) out.push(fact('time', `${c.spell.cd}s`, 'Cooldown', 'cooldown'));
  if (c.spell?.dmg) out.push(fact('dmg', c.spell.dmg, 'Damage on night 1; grows each night', 'damage'));
  if (c.walls?.integrity) out.push(fact('wall', `+${c.walls.integrity}`, 'Wall strength', 'strength'));
  if (c.walls?.armor) out.push(fact('armor', `+${c.walls.armor}`, 'Armour', 'armour'));
  if (c.barricades) out.push(fact(h('span.ic', { html: ICON.barr }), `+${c.barricades}`, 'Barricades', 'barricades'));
  return out;
}

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
    this.hand = card('hand', { tone: 'mid', label: 'Your cards' });
    this.L.hand.append(this.hand.root);
    this.L.tools.append(h('button.knob', { type: 'button', onclick: () => g.openSettings(), title: 'Settings (O)', 'aria-label': 'Settings', html: ICON.gear }));
    this.time = card('time', { label: 'The night' });
    this.R.time.append(this.time.root);
    this.focus = card('focus', { tone: 'mid', label: 'Selected' });
    this.R.focus.append(this.focus.root);
  }

  part(key, sig, fn) {
    if (this.sig[key] === sig) return;
    this.sig[key] = sig;
    fn();
  }

  refresh() {
    const s = this.g.state;
    document.body.classList.toggle('night', s.phase === 'night');
    this.views.select(s.ui.view);
    this.part('village', `${s.village.name}|${Math.floor(s.gold)}|${s.rerolls}|${s.meta.embers}|${s.meta.best}`, () => this.village.set({
      head: head(null, s.village.name, fact('ember', s.meta.embers, 'Embers: kept between runs', 'embers')),
      content: h('div.res', {}, fact('coin', Math.floor(s.gold), 'Gold: for rerolls', 'gold', 'gold'), fact('repeat', s.rerolls, 'Free rerolls left this run', 'rerolls'), fact('moon', s.meta.best, 'The most nights held in one run', 'best')),
    }));
    this.refreshHand(s);
    this.refreshTime(s);
    if (s.ui.view === 'wilds') this.refreshPlace(s);
    if (s.ui.view === 'watch') this.refreshBarricades(s);
    if (s.ui.view === 'hearth') this.refreshBuilding(s);
  }

  // your cards, by family, and any synergy they have unlocked
  refreshHand(s) {
    this.part('hand', s.cards.join(','), () => {
      const b = build(s);
      if (!s.cards.length) { this.hand.set({ head: head('card', 'Your cards'), foot: hint('One after every night held') }); return; }
      const rows = Object.keys(FAMILIES).filter((f) => b.counts[f]).map((f) => {
        const names = {};
        for (const id of s.cards) if (CARD[id].family === f) names[CARD[id].name] = (names[CARD[id].name] || 0) + 1;
        return h('div.handrow', { title: FAMILIES[f].plural }, famIcon(f), h('span.names', {}, Object.entries(names).map(([n, k]) => (k > 1 ? `${n} ×${k}` : n)).join(', ')));
      });
      const syn = SYNERGIES.filter((x) => b.synergies.has(x.tag)).map((x) => h('span.chip.syn', { title: x.text }, x.name));
      this.hand.set({ head: head('card', 'Your cards', h('b.count', {}, s.cards.length)), content: [h('div.list', {}, rows), syn.length ? h('div.chips', {}, syn) : null] });
    });
  }

  refreshTime(s) {
    if (s.phase === 'day') {
      const pv = nightPreview(s);
      this.part('time', `day:${s.night}`, () => {
        const comp = Object.entries(pv.comp).filter(([, k]) => k > 0);
        this.time.set({
          head: head('moon', `Night ${s.night}`),
          content: [
            facts(...comp.map(([t, k]) => fact(icon(t, 'mob'), k, '', `${(k === 1 ? ENEMIES[t].name : ENEMIES[t].plural).toLowerCase()}${pv.newEnemy === t ? ', new' : ''}`, pv.newEnemy === t ? 'red' : ''))),
            pv.newSpawn ? hint(`+ ${pv.newSpawn.name} opens`, 'red') : null,
          ],
          foot: action(seal('Night', () => this.g.callNight(), { title: 'Start the night (N)' }), hint('When you are ready', 'soft')),
        });
      });
    } else if (s.phase === 'draft') {
      this.part('time', `draft:${s.night}`, () => this.time.set({
        head: head('moon', `Night ${s.night - 1} held`),
        content: hint('Choose a card', 'ink'),
        foot: slip('Show the cards', () => this.draft()),
      }));
    } else if (s.phase === 'over') {
      this.part('time', `over:${s.night}`, () => this.time.set({
        head: head('moon', 'The walls fell'),
        content: facts(fact('moon', s.runEnd?.held ?? s.best, 'Nights held', 'nights held'), fact('ember', `+${s.runEnd?.embers ?? 0}`, 'Embers earned', 'embers')),
        foot: action(seal('New run', () => this.g.newRun()), null),
      }));
    } else {
      const bt = s.battle;
      const active = build(s).active;
      this.part('time', `night:${bt.n}:${active.map((a) => a.id).join(',')}`, () => {
        this.foes = meter(icon('goblin', 'mob'), 'Creatures still out there', 'red', 'left');
        this.walls = meter('wall', 'Walls', '', 'walls');
        this.spellBtns = active.map((sp, i) => {
          const c = CARD[sp.id];
          const fillEl = h('span.cdfill');
          const btn = h('button.spell', { type: 'button', title: `${c.name}: ${c.text} (${'QWER'[i] || ''})`, onclick: () => this.spellKey(i) }, fillEl, icon(FAMILY_ICON.spell), h('span.sname', {}, c.name), h('span.key', {}, 'QWER'[i] || ''));
          return { id: sp.id, btn, fillEl, self: !!sp.self, cd: sp.cd };
        });
        this.time.set({
          head: head('moon', `Night ${bt.n}`),
          content: [this.foes.el, this.walls.el],
          foot: this.spellBtns.length ? h('div.spells', {}, this.spellBtns.map((x) => x.btn)) : hint('Spells come as cards', 'soft'),
        });
      });
      const left = bt.total - bt.kills;
      this.foes.set(left / Math.max(1, bt.total), left);
      const max = build(s).walls.integrity;
      this.walls.set(s.integrity / max, Math.ceil(s.integrity), s.integrity / max < 0.3);
      this.refreshSpells();
    }
  }

  refreshSpells() {
    const b = this.g.state.battle;
    if (!b || !this.spellBtns) return;
    for (const x of this.spellBtns) {
      const left = b.spellCd[x.id] || 0;
      x.fillEl.style.height = `${((left / x.cd) * 100).toFixed(1)}%`;
      x.btn.disabled = left > 0;
      x.btn.classList.toggle('armed', this.g.armed === x.id);
    }
  }

  // Q W E R, or a click on the button: Mend works at once, the others wait for a click on the glass
  spellKey(i) {
    const x = this.spellBtns?.[i];
    if (!x) return;
    if (x.self) { this.g.cast(x.id); return; }
    this.g.arm(this.g.armed === x.id ? null : x.id);
  }

  refreshPlace(s) {
    const id = s.ui.place || null;
    this.part('focus', `place|${id}|${s.village.name}|${s.best}`, () => {
      const l = LOCATIONS.find((x) => x.id === id && x.found <= s.best);
      const next = LOCATIONS.filter((x) => x.found > s.best).sort((a, b) => a.found - b.found)[0];
      if (!l) {
        this.focus.set({ head: head('wilds', 'Wilds'), content: facts(fact('place', LOCATIONS.filter((x) => x.found <= s.best).length - 1, 'Places discovered this run', 'discovered'), next ? fact('moon', `Night ${next.found}`, 'Hold this night to discover the next place', 'next discovery') : null), foot: hint('Click a place') });
        return;
      }
      if (l.kind === 'home') { this.focus.set({ head: head('place', s.village.name, hint('Home')), foot: slip('Watch', () => this.g.setView('watch')) }); return; }
      this.focus.set({
        head: head('place', l.name, null, { title: l.blurb }),
        content: [
          facts(h('span.fact.labelled', {}, icon('place'), h('span.v', {}, h('b', {}, LOCATION_KINDS[l.kind].name), h('span.lbl', {}, 'kind'))), l.difficulty ? h('span.fact.labelled', { title: `Danger ${l.difficulty} of 5` }, icon('danger'), h('span.v', {}, pips(l.difficulty), h('span.lbl', {}, 'danger'))) : null),
          l.rewards ? chips(l.rewards) : null,
        ],
        foot: hint('Expeditions come in a later update', 'soft'),
      });
    });
  }

  refreshBuilding(s) {
    const id = s.ui.building || 'archery';
    const def = BUILDINGS[id];
    this.part('focus', `bld|${id}|${s.cards.join(',')}`, () => {
      const b = build(s);
      const mine = s.cards.filter((c) => def.families.includes(CARD[c].family));
      const stats = [];
      if (id === 'archery') stats.push(fact('people', b.shooters.length - 1, 'Defenders on the tower', 'defenders'), fact('dmg', b.tower.dmg.toFixed(1), 'The tower’s own arrows', 'damage'), fact('reach', b.tower.range.toFixed(1), 'Reach', 'reach'), fact('rate', b.tower.rate.toFixed(2), 'Shots a second', 'per sec'));
      if (id === 'walls') stats.push(fact('wall', b.walls.integrity, 'Strength, mended every dawn', 'strength'), fact('armor', b.walls.armor, 'Taken off every hit', 'armour'), b.walls.thorns ? fact('dmg', b.walls.thorns, 'Thorns: hurt every attacker', 'thorns') : null);
      if (id === 'workshop') stats.push(fact(h('span.ic', { html: ICON.barr }), barricadeMax(s), 'Barricades', 'barricades'));
      if (id === 'shrine') stats.push(fact('spark', b.active.length, 'Spells you cast', 'active'), fact('spark', b.auras.length, 'Spells that work on their own', 'passive'), fact('dmg', `×${magicScale(s.night).toFixed(1)}`, 'Spells grow stronger every night', 'tonight'));
      const names = {};
      for (const c of mine) names[c] = (names[c] || 0) + 1;
      this.focus.set({
        head: head('hearth', def.name, badge(mine.length, `${mine.length} cards`), { title: def.blurb }),
        content: [facts(...stats), Object.keys(names).length ? h('div.chips', {}, Object.entries(names).map(([c, k]) => h('span.chip', { title: CARD[c].text }, k > 1 ? `${CARD[c].name} ×${k}` : CARD[c].name))) : null],
        foot: mine.length ? null : hint(`${def.families.map((f) => FAMILIES[f].plural).join(' and ')} cards grow it`, 'soft'),
      });
    });
  }

  setHover(key) {
    this.hover = key;
    if (this.g.state.ui.view === 'watch') this.refreshBarricades(this.g.state);
  }

  refreshBarricades(s) {
    const key = this.hover;
    const max = barricadeMax(s);
    this.part('focus', `barr|${s.barricades.join(',')}|${key || ''}|${s.phase}|${s.night}|${max}`, () => {
      const left = max - s.barricades.length;
      let content = null, foot = null;
      if (s.phase === 'night') foot = hint('Locked until dawn');
      else if (key && s.barricades.includes(key)) foot = hint('Click to remove', 'ink');
      else if (key) {
        const r = canBlock(s.barricades, key, max);
        if (!r.ok) foot = hint(r.reason.includes('seal') ? 'Would seal the village' : left ? 'Not here' : 'None left', 'red', r.reason);
        else {
          const before = routeLengths(s.barricades);
          const after = routeLengths([...s.barricades, key]);
          const rows = nightPreview(s).spawns.filter((sp) => Math.abs(after[sp.id] - before[sp.id]) > 0.5)
            .map((sp) => fact('paces', `${Math.round(before[sp.id])} → ${Math.round(after[sp.id])}`, `${sp.name}: the walk becomes ${Math.round(after[sp.id])} paces instead of ${Math.round(before[sp.id])}`, `paces from ${sp.name}`));
          if (rows.length) content = h('div.list', {}, rows); else foot = hint('No change tonight', 'soft');
        }
      } else foot = hint(left ? 'Click a path' : 'Click one to remove');
      this.focus.set({ head: head(null, 'Barricades', fact(h('span.ic', { html: ICON.barr }), `${left}/${max}`, 'Barricades left to place', 'left')), content: [h('div.pieces-wrap', {}, h('div.pieces', { title: `${left} of ${max} left` }, Array.from({ length: max }, (_, i) => h(`span${i < left ? '' : '.used'}`, { html: ICON.barr })))), content], foot });
    });
  }

  // ---------- the draft: three cards in the middle of the desk ----------
  draft() {
    const s = this.g.state;
    if (s.phase !== 'draft' || !s.offer) return;
    const b = build(s);
    const root = document.getElementById('overlay');
    const cardEl = (id) => {
      const c = CARD[id];
      const tagRow = c.tags.map((t) => {
        const syn = SYNERGIES.find((x) => x.tag === t);
        const have = (b.tags[t] || 0) + 1;
        const done = syn && have >= syn.need;
        return h(`span.chip${done ? '.syn' : ''}`, { title: syn ? `${syn.name}: ${syn.text}` : '' }, `${TAG_NAMES[t]} ${syn ? `${Math.min(have, syn.need)}/${syn.need}` : ''}`);
      });
      return h(`button.tcard.fam-${c.family}.rar-${c.rarity}`, { type: 'button', onclick: () => this.g.pick(id) },
        h('span.band', {}, h('span', {}, FAMILIES[c.family].name), h('span.rar', {}, RARITY[c.rarity].name)),
        h('span.emblem', {}, c.family === 'defender' && ['archer', 'axe', 'hunter', 'crossbow', 'mage', 'witch'].includes(id) ? icon('people') : famIcon(c.family)),
        h('span.cname', {}, c.name),
        h('span.ctext', {}, c.text),
        h('span.cfacts', {}, cardFacts(c)),
        tagRow.length ? h('span.ctags', {}, tagRow) : null);
    };
    const rr = s.rerolls > 0 ? `Reroll (${s.rerolls} free)` : `Reroll: ${rerollCost(s)} gold`;
    const wrap = h('div.draft', {},
      h('div.draft-head', {}, h('h2', {}, `Night ${s.night - 1} held`), h('span.hint.ink', {}, 'Choose one card')),
      h('div.draft-cards', {}, s.offer.map(cardEl)),
      h('div.row', { style: { justifyContent: 'center', gap: '14px' } }, slip(rr, () => this.g.reroll()), slip('Look at the globe first', () => { root.hidden = true; })));
    fill(root, wrap);
    root.hidden = false;
    root.querySelector('.tcard')?.focus();
  }

  // ---------- the end of a run ----------
  runOver() {
    const s = this.g.state;
    const e = s.runEnd || { held: s.best, embers: 0 };
    this.overlay((body) => body.append(h('div.stack', {},
      h('h2', {}, 'The walls fell'),
      hint(`${s.village.name} held ${e.held} ${e.held === 1 ? 'night' : 'nights'}${e.record ? '. A new best' : ''}.`, 'ink'),
      facts(fact('moon', e.held, 'Nights held', 'nights held'), fact('ember', `+${e.embers}`, 'Embers earned; they are kept', 'embers'), fact('card', s.cards.length, 'Cards taken', 'cards'), fact('dmg', s.stats.kills, 'Creatures defeated', 'defeated')),
      hint('Embers will buy lasting unlocks on the desk in a coming update.', 'soft'),
      h('div.row', { style: { marginTop: '6px' } }, seal('New run', () => this.g.newRun()), slip('Look at the globe', () => { document.getElementById('overlay').hidden = true; })))));
  }

  say(level, text) {
    const item = h(`div.item.${level}`, { role: level === 'attention' ? 'alert' : 'status' }, h('div', {}, text));
    this.news.append(item);
    while (this.news.children.length > 2) this.news.firstChild.remove();
    setTimeout(() => item.remove(), level === 'attention' ? 6000 : 3500);
  }

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
