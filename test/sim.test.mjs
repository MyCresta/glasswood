import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, newRun } from '../js/sim/state.js';
import { WEB, EDGE, edgeKey, buildField, routeFrom, routeForSpawn, canBlock, routeLengths } from '../js/sim/web.js';
import { SPAWNS } from '../js/data/village.js';
import { BASE, CARD, CARDS } from '../js/data/cards.js';
import { discovered } from '../js/data/world.js';
import { makeEvents, advance, tick, callNight, pump } from '../js/sim/time.js';
import { waveSchedule, waveComposition, activeSpawns, castSpell, restartNight } from '../js/sim/battle.js';
import { placeBarricade, removeBarricade, barricadeMax } from '../js/sim/village.js';
import { build, compute } from '../js/sim/build.js';
import { deal, pick, reroll, rerollCost, embersFor } from '../js/sim/run.js';
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

test('the path web matches the design', () => {
  assert.equal(WEB.length, 111);
  for (const e of WEB) assert.ok(e.len > 0.5 && e.len < 20, `${e.key} length ${e.len}`);
});

test('every burrow has a route to the walls', () => {
  const f = buildField();
  for (const sp of SPAWNS) {
    const r = routeFrom(f, sp.node);
    assert.ok(r, `${sp.name} reachable`);
    assert.ok(r.len > 25 && r.len < 50, `${sp.name} length ${r.len}`);
    const [x, z] = r.pts.at(-1);
    assert.ok(Math.hypot(x, z) <= 3.7, 'route ends at the walls');
  }
});

test('every node of the web connects to the village', () => {
  const f = buildField();
  const nodes = new Set(WEB.flatMap((e) => [e.a, e.b]));
  for (const n of nodes) assert.ok(isFinite(f.dist.get(n)), n);
});

test('the design detour: four barricades send Hollow Gate goblins the whole way round', () => {
  const blocked = ['a0|b15', 'a3|b4', 'a9|b12', 'a6|gS'].map((k) => { const [a, b] = k.split('|'); return edgeKey(a, b); });
  for (const k of blocked) assert.ok(EDGE.has(k), k);
  const before = routeLengths([]).hollow;
  const after = routeLengths(blocked).hollow;
  assert.ok(before > 35 && before < 46, `before ${before}`);
  assert.ok(after > before * 2.4, `after ${after}`);
});

test('a barricade can never seal the village off', () => {
  // closing both gates would seal everything: the second one must be refused
  const gates = WEB.filter((e) => (e.a === 'gN' || e.b === 'gN' || e.a === 'gS' || e.b === 'gS') && e.a !== 'c' && e.b !== 'c').map((e) => e.key);
  const placed = [];
  let refused = null;
  for (const k of gates) {
    const r = canBlock(placed, k, 99);
    if (r.ok) placed.push(k); else { refused = r; break; }
  }
  assert.ok(refused, 'one gate road stays open');
  assert.match(refused.reason, /seal the village off/);
  const f = buildField(placed);
  for (const sp of SPAWNS) assert.ok(isFinite(f.dist.get(sp.node)), sp.name);
  // and nothing inside the walls can be blocked
  assert.equal(canBlock([], edgeKey('c', 'gN'), 99).ok, false);
});

test('barricades: as many as the cards allow, only between nights, and they change the route', () => {
  const s = fresh();
  assert.equal(barricadeMax(s), BASE.barricades);
  const k = edgeKey('a0', 'b15');
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
  assert.equal(s.lastReport.wallDamage, 0);
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
  assert.equal(b.shooters[0].range, BASE.tower.range + 1.5);
  assert.equal(b.shooters[1].range, CARD.archer.shooter.range + 1.5, 'Lookout reaches every shooter');
  assert.equal(b.walls.integrity, BASE.walls.integrity + 250);
  assert.equal(b.walls.armor, 2);
  assert.equal(b.barricades, BASE.barricades + 2);
  assert.ok(!b.synergies.has('fire'));
  assert.ok(compute(['mage', 'firebolt', 'firearrows']).synergies.has('fire'), 'three fire cards: Wildfire');
  assert.equal(compute(['mage', 'firebolt', 'firearrows']).burnMul, 2);
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
