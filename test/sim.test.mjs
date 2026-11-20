import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, newRun } from '../js/sim/state.js';
import { edgeKey, makeWeb, webFor, SIZES } from '../js/sim/web.js';
import { generateForest } from '../js/sim/forest.js';
import { SPAWNS } from '../js/data/village.js';
import { BASE, CARD, CARDS } from '../js/data/cards.js';
import { discovered } from '../js/data/world.js';
import { makeEvents, advance, tick, callNight, pump } from '../js/sim/time.js';
import { waveSchedule, waveComposition, activeSpawns, castSpell, restartNight } from '../js/sim/battle.js';
import { placeBarricade, removeBarricade, barricadeMax } from '../js/sim/village.js';
import { build, compute } from '../js/sim/build.js';
import { deal, pick, reroll, rerollCost, embersFor, beginRun, buyUnlock, unlockedCards, buyUpgrade, placesReady, sendExpedition } from '../js/sim/run.js';
import { LOCKED_CARDS, STARTERS } from '../js/data/unlocks.js';
import { migrate } from '../js/persist/save.js';

const fresh = () => newGame({ seed: 7, now: 0 });
const ev = (s) => makeEvents(s);
const runNight = (s) => {
  const e = ev(s);
  if (s.phase === 'day') callNight(s, e);
  let g = 0;
  while (s.phase === 'night' && g++ < 40000) tick(s, 0.05, e);
  return e;
};
// a run holding `n` extra barricade cards
const withCards = (s, n) => { for (let i = 0; i < n; i++) s.cards.push('barricade'); return s; };

const SEEDS = [1, 2, 3, 7, 42, 99, 1234, 98765, 31337, 2026];

test('every run gets its own forest, the same for the same seed', () => {
  assert.deepEqual(generateForest(5), generateForest(5));
  assert.notDeepEqual(generateForest(5).nodes, generateForest(6).nodes);
  for (const sd of SEEDS) {
    const w = makeWeb(generateForest(sd));
    assert.ok(w.WEB.length > 60, `seed ${sd}: ${w.WEB.length} paths`);
    for (const e of w.WEB) assert.ok(e.len > 0.5 && e.len < 22, `${sd} ${e.key} length ${e.len}`);
    const kinds = new Set(w.WEB.map((e) => e.w));
    for (const k of ['trail', 'path', 'road']) assert.ok(kinds.has(k), `seed ${sd} has ${k}s`);
  }
});

test('every burrow reaches the walls, for every size that comes from it', () => {
  for (const sd of SEEDS) {
    const w = makeWeb(generateForest(sd));
    for (const sp of SPAWNS) {
      for (const size of w.sizesFor(sp)) {
        const r = w.routeFrom(w.buildField([], size), sp.node);
        if (size === 'large' && !r) continue;
        assert.ok(r, `${sd} ${sp.name} reachable for ${size}`);
        assert.ok(r.len > 25 && r.len < 130, `${sd} ${sp.name} ${size} length ${r.len}`);
        assert.ok(Math.hypot(...r.pts.at(-1)) <= 3.7, 'route ends at the walls');
        // bosses keep to the roads, wolves keep off trails
        const min = SIZES[size];
        for (let i = 1; i < r.nodes.length; i++) assert.ok(w.EDGE.get(edgeKey(r.nodes[i - 1], r.nodes[i])).wi >= min);
      }
    }
    const f = w.buildField();
    for (const n of Object.keys(w.NODES)) assert.ok(isFinite(f.dist.get(n)), `${sd} ${n} connects`);
  }
});

test('a barricade can never seal the village off, for any size', () => {
  for (const sd of SEEDS) {
    const w = makeWeb(generateForest(sd));
    const placed = [];
    let refused = 0;
    // greedily try to block everything, outside in
    const keys = w.WEB.filter((e) => e.a !== 'c' && e.b !== 'c').map((e) => e.key);
    for (const k of keys) { const r = w.canBlock(placed, k, 999); if (r.ok) placed.push(k); else refused++; }
    assert.ok(refused > 0);
    for (const size of ['small', 'medium', 'large']) {
      const f = w.buildField(placed, size);
      const from = SPAWNS.filter((x) => w.sizesFor(x).includes(size));
      if (size === 'large') assert.ok(from.some((sp) => isFinite(f.dist.get(sp.node))), `${sd} bosses have a way in`);
      else for (const sp of from) assert.ok(isFinite(f.dist.get(sp.node)), `${sd} ${sp.name} ${size}`);
    }
    assert.equal(w.canBlock([], edgeKey('c', 'g0'), 99).ok, false, 'not inside the walls');
  }
});

test('barricades lengthen routes', () => {
  const w = makeWeb(generateForest(11));
  const sp = SPAWNS[0];
  const before = w.routeLengths([]).hollow;
  const r = w.routeFrom(w.buildField([]), sp.node);
  // block the first blockable edge of the route
  const placed = [];
  for (let i = 1; i < r.nodes.length && !placed.length; i++) {
    const k = edgeKey(r.nodes[i - 1], r.nodes[i]);
    if (w.canBlock([], k, 9).ok) placed.push(k);
  }
  assert.ok(w.routeLengths(placed).hollow > before);
});

test('barricades: as many as the cards allow, only between nights, and they change the route', () => {
  const s = fresh();
  assert.equal(barricadeMax(s), BASE.barricades);
  const k = webFor(s).WEB.find((e) => e.a.startsWith('d') && e.b.startsWith('d')).key;
  assert.ok(placeBarricade(s, k).ok);
  assert.equal(placeBarricade(s, k).ok, false, 'not twice');
  withCards(s, 1);
  assert.equal(barricadeMax(s), BASE.barricades + 1);
  callNight(s, ev(s));
  assert.match(removeBarricade(s, k).reason, /between nights/);
});

test('a new game: one run, the tower alone, nothing picked yet', () => {
  const s = fresh();
  assert.equal(s.phase, 'day');
  assert.equal(s.night, 1);
  assert.deepEqual(s.cards, []);
  assert.equal(build(s).shooters.length, 1, 'just the tower');
  assert.equal(s.integrity, BASE.walls.integrity);
  assert.equal(s.meta.embers, 0);
});

test('waves are deterministic and grow', () => {
  assert.deepEqual(waveSchedule(5, 3), waveSchedule(5, 3));
  assert.ok(waveComposition(20).goblin + waveComposition(20).wolf > waveComposition(2).goblin);
  assert.ok(activeSpawns(30).length > activeSpawns(1).length);
});

test('no clock between nights: the night waits to be called', () => {
  const s = fresh();
  advance(s, 600, ev(s));
  assert.equal(s.phase, 'day');
});

test('the tower alone holds night 1, then three cards are dealt', () => {
  const s = fresh();
  runNight(s);
  assert.equal(s.lastReport.won, true);
  assert.ok(s.lastReport.wallDamage < 0.3 * BASE.walls.integrity, 'barely scratched');
  assert.equal(s.phase, 'draft');
  assert.equal(s.offer.length, 3);
  assert.equal(new Set(s.offer).size, 3, 'three different cards');
  assert.equal(s.best, 1);
  assert.equal(s.night, 2);
});

test('picking a card: it joins the run and camp resumes', () => {
  const s = fresh();
  runNight(s);
  const id = s.offer[0];
  assert.equal(pick(s, 'nonsense').ok, false);
  assert.ok(pick(s, id).ok);
  assert.deepEqual(s.cards, [id]);
  assert.equal(s.phase, 'day');
  assert.equal(s.offer, null);
});

test('rerolls: free ones first, then gold', () => {
  const s = fresh();
  runNight(s);
  const first = [...s.offer];
  assert.ok(reroll(s).ok);
  assert.notDeepEqual(s.offer, first);
  assert.ok(reroll(s).ok);
  assert.equal(s.rerolls, 0);
  s.gold = 0;
  assert.match(reroll(s).reason, /gold/);
  s.gold = rerollCost(s);
  assert.ok(reroll(s).ok);
  assert.equal(s.gold, 0);
});

test('the deal is the same for the same run, night and reroll', () => {
  const a = fresh(), b = fresh();
  a.night = b.night = 9;
  assert.deepEqual(deal(a), deal(b));
  assert.deepEqual(deal(a, 2), deal(b, 2));
});

test('cards add up: defenders shoot, tower and fortify cards stack, synergies unlock', () => {
  const b = compute(['archer', 'mage', 'lookout', 'footings', 'irongate', 'cart']);
  assert.equal(b.shooters.length, 3);
  assert.equal(b.shooters[0].range, BASE.tower.range + CARD.lookout.tower.range);
  assert.equal(b.shooters[1].range, CARD.archer.shooter.range + CARD.lookout.tower.range, 'Lookout reaches every shooter');
  assert.equal(b.walls.integrity, BASE.walls.integrity + CARD.footings.walls.integrity + CARD.irongate.walls.integrity);
  assert.ok(b.walls.taken < 1, 'armour takes some off every hit');
  assert.equal(b.barricades, BASE.barricades + 2);
  assert.ok(!b.synergies.has('fire'));
  assert.ok(compute(['mage', 'firebolt', 'firearrows']).synergies.has('fire'), 'three fire cards: Wildfire');
  assert.equal(compute(['mage', 'firebolt', 'firearrows']).burnMul, 2);
  assert.equal(compute(['mage', 'firebolt', 'firearrows', 'oil', 'emberward']).burnMul, 3.2, 'five: the second tier');
  // copies of a spell make one stronger spell
  const two = compute(['firebolt', 'firebolt']);
  assert.equal(two.active.length, 1);
  assert.ok(two.active[0].dmg > CARD.firebolt.spell.dmg);
  for (const c of CARDS) assert.ok(c.name && c.text && c.family && c.rarity, c.id);
});

test('spells: cast on the glass, with a cooldown', () => {
  const s = fresh();
  s.cards.push('firebolt');
  assert.match(castSpell(s, 'firebolt', 0, 0).reason, /night/);
  callNight(s, ev(s));
  advance(s, 12, ev(s));
  const e = s.battle.enemies[0];
  const hp = e.hp;
  assert.ok(castSpell(s, 'firebolt', e.x, e.z).ok);
  assert.ok(e.hp < hp || e.dead);
  assert.match(castSpell(s, 'firebolt', e.x, e.z).reason, /ready/);
  assert.match(castSpell(s, 'snare', 0, 0).reason, /do not have/);
});

test('when the walls fall the run is over, and Embers are earned', () => {
  const s = fresh();
  s.night = 30; s.best = 12;
  runNight(s);
  assert.equal(s.lastReport.won, false);
  assert.equal(s.phase, 'over');
  assert.equal(s.meta.embers, embersFor(12));
  assert.equal(s.meta.best, 12);
  assert.equal(callNight(s, ev(s)).ok, false);
  newRun(s, 3, 0);
  assert.equal(s.phase, 'day');
  assert.equal(s.night, 1);
  assert.deepEqual(s.cards, []);
  assert.equal(s.meta.embers, embersFor(12), 'Embers last');
  assert.equal(s.meta.runs, 2);
});

test('a night left half-fought starts again, gold earned in it undone', () => {
  const s = fresh();
  const g = s.gold;
  callNight(s, ev(s));
  advance(s, 25, ev(s));
  const saved = migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(saved.phase, 'day');
  assert.equal(saved.battle, null);
  assert.equal(saved.gold, g);
});

test('time away is not played', () => {
  const s = fresh();
  callNight(s, ev(s));
  const carry = { ms: 0 };
  s.lastTick = 0;
  pump(s, 3600 * 1000, carry, ev(s));
  assert.ok(s.time < 0.3);
});

test('a save from the idle version starts a fresh run, keeping the name', () => {
  const s = migrate({ version: 5, village: { name: 'Mossbank' }, buildings: {}, gold: 900, settings: { sound: false } });
  assert.equal(s.village.name, 'Mossbank');
  assert.equal(s.settings.sound, false);
  assert.equal(s.night, 1);
  assert.equal(s.restarted, true);
});

test('places in the globe are discovered by holding nights', () => {
  assert.deepEqual(discovered(0).map((l) => l.id), ['home']);
  const s = fresh();
  runNight(s); pick(s, s.offer[0]);
  const e = runNight(s);
  assert.ok(e.list.some((x) => x.cat === 'discover' && x.place === 'whispering'));
});

test('deterministic, and survives JSON round-trips', () => {
  const a = fresh();
  const b = JSON.parse(JSON.stringify(a));
  runNight(a);
  runNight(b);
  assert.equal(a.gold, b.gold);
  assert.deepEqual(a.offer, b.offer);
});

test('a run starts with a choice of starter card', () => {
  const s = fresh();
  beginRun(s);
  assert.equal(s.phase, 'starter');
  assert.equal(s.offer.length, 3);
  for (const id of s.offer) assert.ok(STARTERS.includes(id), id);
  assert.equal(callNight(s, ev(s)).ok, false, 'no night before a card');
  assert.ok(pick(s, s.offer[0]).ok);
  assert.equal(s.phase, 'day');
  assert.equal(s.cards.length, 1);
});

test('locked cards are never dealt until bought with Embers', () => {
  const s = fresh();
  for (let night = 1; night < 60; night++) {
    s.night = night;
    for (const id of deal(s, night)) assert.ok(!LOCKED_CARDS.has(id), `${id} dealt while locked`);
  }
  assert.equal(buyUnlock(s, 'card:witch').ok, false, 'no Embers yet');
  s.meta.embers = 100;
  assert.ok(buyUnlock(s, 'card:witch').ok);
  assert.equal(s.meta.embers, 84);
  assert.ok(unlockedCards(s).some((c) => c.id === 'witch'));
  assert.equal(buyUnlock(s, 'card:witch').ok, false, 'only once');
});

test('boosts carry into the next run', () => {
  const s = fresh();
  s.meta.embers = 200;
  for (const id of ['reroll', 'walls', 'purse', 'wider']) assert.ok(buyUnlock(s, id).ok, id);
  newRun(s, 3, 0);
  assert.equal(s.rerolls, BASE.rerolls + 1);
  assert.equal(s.gold, 55);
  assert.equal(build(s).walls.integrity, BASE.walls.integrity + 100);
  assert.equal(s.integrity, BASE.walls.integrity + 100);
  beginRun(s);
  assert.equal(s.offer.length, 4, 'wider choice');
});

test('every tenth night a boss walks the roads', () => {
  assert.equal(waveComposition(9).troll, 0);
  assert.equal(waveComposition(10).troll, 1);
  assert.equal(waveComposition(20).troll, 1);
  assert.equal(waveComposition(40).troll, 2);
  const s = fresh();
  s.night = 10;
  for (let i = 0; i < 6; i++) s.cards.push('heavy', 'archer');
  const e = ev(s);
  callNight(s, e);
  const b = s.battle;
  let seen = false, g = 0;
  while (s.phase === 'night' && g++ < 40000) {
    tick(s, 0.05, e);
    for (const en of s.battle?.enemies || []) if (en.type === 'troll') {
      seen = true;
      const r = b.routes[`${en.spawn}:large`];
      const w = webFor(s);
      for (let i = 1; i < r.nodes.length; i++) assert.equal(w.EDGE.get(edgeKey(r.nodes[i - 1], r.nodes[i])).w === 'road' || r.nodes[i] === 'c' || r.nodes[i - 1] === 'c', true);
    }
  }
  assert.ok(seen, 'a troll came');
});

test('saves from before generated forests keep the Embers and start a fresh run', () => {
  const old = JSON.parse(JSON.stringify(fresh()));
  old.version = 6;
  old.meta.embers = 33;
  old.barricades = ['a0|b15'];
  const s = migrate(old);
  assert.equal(s.meta.embers, 33);
  assert.deepEqual(s.barricades, []);
  assert.equal(s.phase, 'starter');
});

test('Hearth upgrades cost gold and make the village stronger', () => {
  const s = fresh();
  s.gold = 1000;
  const before = build(s).shooters[0].dmg;
  assert.ok(buyUpgrade(s, 'archery').ok);
  assert.ok(build(s).shooters[0].dmg > before);
  const w = build(s).barricades;
  assert.ok(buyUpgrade(s, 'workshop').ok);
  assert.equal(build(s).barricades, w + 1);
  for (let i = 0; i < 5; i++) buyUpgrade(s, 'workshop');
  assert.equal(s.upgrades.workshop, 3, 'the workshop has a top level');
  s.gold = 0;
  assert.equal(buyUpgrade(s, 'walls').ok, false);
});

test('one expedition a day; places rest afterwards', () => {
  const s = fresh();
  assert.equal(placesReady(s).length, 0, 'nothing found on night 1');
  s.best = 8; s.night = 9;
  const ready = placesReady(s).map((l) => l.id);
  assert.ok(ready.includes('whispering') && ready.includes('brindlecross'));
  const gold = s.gold;
  assert.ok(sendExpedition(s, 'whispering').ok);
  assert.ok(s.gold > gold);
  assert.equal(sendExpedition(s, 'quarry').ok, false, 'one a day');
  s.night = 10;
  assert.equal(sendExpedition(s, 'whispering').ok, false, 'resting');
  assert.ok(sendExpedition(s, 'brindlecross').ok);
  assert.equal(s.phase, 'bonus');
  assert.equal(s.offer.length, 3);
  assert.equal(callNight(s, ev(s)).ok, false);
  assert.ok(pick(s, s.offer[0]).ok);
  assert.equal(s.phase, 'day');
});
