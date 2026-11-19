import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/sim/state.js';
import { WEB, EDGE, edgeKey, buildField, routeFrom, routeForSpawn, canBlock, routeLengths } from '../js/sim/web.js';
import { SPAWNS, wallStats, archeryStats, DAY_LENGTH, START, BUILDINGS } from '../js/data/village.js';
import { makeEvents, advance, tick, catchUp, callNight, pump } from '../js/sim/time.js';
import { waveSchedule, waveComposition, safeNight, activeSpawns } from '../js/sim/battle.js';
import { queueUpgrade, cancelUpgrade, upgradeBlocker, upgradeCost, placeBarricade, removeBarricade, barricadeMax, workers, postWorker, unpostWorker, villagerArrives, production, builders, levelCap } from '../js/sim/village.js';
import { migrate } from '../js/persist/save.js';

// a village with its Workshop restored to `lv` (for barricade tests)
const withWorkshop = (s, lv) => { s.buildings.workshop.level = lv; return s; };

const fresh = () => newGame({ seed: 7, now: 0 });
const ev = (s) => makeEvents(s);
const runNight = (s) => {
  const e = ev(s);
  if (s.phase === 'day') callNight(s, e);
  let g = 0;
  while (s.phase === 'night' && g++ < 40000) tick(s, 0.05, e);
  return e;
};

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

test('barricades: none until the Workshop is restored', () => {
  const s = fresh();
  assert.equal(barricadeMax(s), 0);
  assert.match(placeBarricade(s, edgeKey('a0', 'b15')).reason, /Workshop/);
  withWorkshop(s, 2);
  assert.equal(barricadeMax(s), 2);
  assert.ok(placeBarricade(s, edgeKey('a0', 'b15')).ok);
});

test('barricades: day only, limited, and they change the night route', () => {
  const s = withWorkshop(fresh(), 4);
  const k = edgeKey('a0', 'b15');
  assert.equal(placeBarricade(s, k).ok, true);
  assert.equal(placeBarricade(s, k).ok, false, 'not twice');
  assert.equal(s.objectives.flags.barricade, true);
  const others = ['a3|b4', 'a9|b12', 'a6|gS', 'b0|b1'].map((x) => edgeKey(...x.split('|')));
  for (const o of others) placeBarricade(s, o);
  assert.equal(s.barricades.length, barricadeMax(s));
  const e = ev(s);
  callNight(s, e);
  assert.equal(placeBarricade(s, edgeKey('b2', 'b3')).ok, false, 'not at night');
  assert.equal(removeBarricade(s, k).ok, false, 'not at night');
  assert.ok(s.battle.routes.hollow.len > 50, `night route ${s.battle.routes.hollow.len}`);
});

test('starting state', () => {
  const s = fresh();
  assert.equal(s.gold, START.gold);
  assert.equal(s.timber, START.timber);
  assert.equal(s.stone, START.stone);
  assert.equal(s.integrity, 500);
  assert.deepEqual(s.villagers.map((v) => v.job), ['archery', 'idle']);
  assert.equal(s.buildings.townhall.level, 0, 'the village starts in ruins');
  assert.equal(s.buildings.tavern.level, 0);
  assert.equal(s.night, 1);
  assert.equal(s.phase, 'day');
  assert.deepEqual(activeSpawns(1).map((x) => x.id), ['hollow']);
  assert.equal(activeSpawns(5).length, 2);
});

test('waves are deterministic and grow', () => {
  assert.deepEqual(waveSchedule(7, 4), waveSchedule(7, 4));
  const c1 = waveComposition(1);
  const c9 = waveComposition(9);
  assert.equal(c1.wolf, 0);
  assert.ok(c9.goblin + c9.wolf > c1.goblin + c1.wolf);
  assert.ok(c9.wolf > 0);
});

test('the first day ends, and one archer wins night 1 untouched', () => {
  const s = fresh();
  const e = ev(s);
  advance(s, 61, e);
  assert.equal(s.phase, 'night');
  let g = 0;
  while (s.phase === 'night' && g++ < 40000) tick(s, 0.05, e);
  assert.equal(s.phase, 'day');
  assert.equal(s.lastReport.won, true);
  assert.equal(s.lastReport.kills, s.lastReport.total);
  assert.equal(s.lastReport.wallDamage, 0);
  assert.equal(s.night, 2);
  assert.equal(s.best, 1);
  assert.ok(s.gold > START.gold);
  assert.equal(s.dayLength, DAY_LENGTH);
});

test('enemies that reach the walls damage integrity', () => {
  const s = fresh();
  s.buildings.archery.level = 1;
  s.night = 6;
  callNight(s, ev(s));
  s.battle.cd = 1e9; // archers asleep
  advance(s, 36, ev(s));
  assert.equal(s.phase, 'night');
  assert.ok(s.integrity < 500);
});

test('losing a night costs 10% of gold and falls back two nights; nothing else is lost', () => {
  const s = fresh();
  s.night = 9;
  s.best = 9;
  s.integrity = 3;
  s.gold = 1000;
  const e = runNight(s);
  assert.equal(s.lastReport.won, false);
  assert.ok(s.lastReport.lost >= 100 && s.lastReport.lost <= 120, `lost ${s.lastReport.lost}`);
  assert.equal(s.night, 7);
  assert.equal(s.integrity, wallStats(1).integrity, 'walls repaired at dawn');
  assert.equal(s.buildings.archery.level, 1);
  assert.ok(e.list.some((x) => x.level === 'attention'));
});

test('hold repeats the same night', () => {
  const s = fresh();
  s.hold = true;
  runNight(s);
  assert.equal(s.night, 1);
  assert.equal(s.lastResult[1], 'won');
});

test('restoring and upgrading: costs in three resources, Town Hall caps, refunds', () => {
  const s = fresh();
  assert.match(upgradeBlocker(s, 'archery'), /Town Hall first/, 'nothing grows past level 1 before the Town Hall is restored');
  assert.deepEqual(upgradeCost('lumber', 0), { gold: 30 });
  assert.ok(queueUpgrade(s, 'lumber').ok);
  assert.equal(s.reserved.gold, 30);
  assert.equal(queueUpgrade(s, 'lumber').ok, false, 'one entry per building');
  assert.ok(cancelUpgrade(s, s.queue[0].id).ok);
  assert.equal(s.reserved.gold, 0);
  assert.ok(queueUpgrade(s, 'lumber').ok);
  advance(s, BUILDINGS.lumber.levels[1].time + 1, ev(s));
  assert.equal(s.buildings.lumber.level, 1);
  assert.equal(workers(s, 'lumber'), 1, 'Bram takes the new post');
  s.timber = 0;
  s.gold = 500;
  assert.match(upgradeBlocker(s, 'townhall'), /more timber/);
  s.timber = 100;
  s.gold = 500;
  assert.ok(queueUpgrade(s, 'townhall').ok);
  advance(s, BUILDINGS.townhall.levels[1].time + 1, ev(s));
  assert.equal(levelCap(s, 'archery'), 2);
  s.gold = 500;
  assert.equal(upgradeBlocker(s, 'archery'), null);
});

test('builders: one at first, two from Town Hall level 2', () => {
  const s = fresh();
  assert.equal(builders(s), 1);
  s.buildings.townhall.level = 2;
  assert.equal(builders(s), 2);
  Object.assign(s, { gold: 1000, timber: 1000, stone: 1000 });
  queueUpgrade(s, 'lumber'); queueUpgrade(s, 'quarry');
  advance(s, 121, ev(s));
  assert.equal(s.buildings.lumber.level, 1);
  assert.equal(s.buildings.quarry.level, 1, 'both built at the same time');
});

test('villagers: jobs, posts and the tower', () => {
  const s = fresh();
  s.buildings.lumber.level = 1;
  assert.ok(postWorker(s, 'lumber').ok);
  assert.equal(workers(s, 'lumber'), 1);
  assert.equal(postWorker(s, 'lumber').ok, false, 'no room for another');
  assert.ok(unpostWorker(s, 'archery').ok);
  assert.equal(archeryStats(1, workers(s, 'archery')).archers, 0);
  assert.ok(postWorker(s, 'archery').ok);
});

test('production: timber and stone from the workers, also while away', () => {
  const s = fresh();
  s.buildings.lumber.level = 1;
  postWorker(s, 'lumber');
  s.objectives.claimed.push('lumber1');
  assert.ok(Math.abs(production(s).timber - BUILDINGS.lumber.levels[1].per / 60) < 1e-9);
  const t = s.timber;
  catchUp(s, 600 * 1000, ev(s));
  assert.ok(Math.abs(s.timber - (t + BUILDINGS.lumber.levels[1].per * 10)) < 1e-6);
});

test('a traveller settles after a night held, if the Tavern has a bed', () => {
  const s = fresh();
  runNight(s);
  assert.equal(s.villagers.length, 2, 'two beds in the ruin');
  s.buildings.tavern.level = 1;
  runNight(s);
  assert.equal(s.villagers.length, 3);
  assert.equal(villagerArrives(s), true);
  assert.equal(villagerArrives(s), false, 'four beds');
});

test('a save from before the ruins starts the village again, keeping its name', () => {
  const old = { version: 3, village: { name: 'Mossbank' }, buildings: { archery: { level: 7 } }, gold: 900, settings: { sound: false } };
  const s = migrate(old);
  assert.equal(s.village.name, 'Mossbank');
  assert.equal(s.buildings.archery.level, 1);
  assert.equal(s.settings.sound, false);
  assert.equal(s.restarted, true);
});

test('walls upgrade raises integrity', () => {
  const s = fresh();
  s.buildings.townhall.level = 1;
  queueUpgrade(s, 'walls');
  advance(s, BUILDINGS.walls.levels[2].time + 1, ev(s));
  assert.equal(s.buildings.walls.level, 2);
  assert.equal(s.integrity, wallStats(2).integrity);
});

test('offline: safe-night rewards, 24h cap, no losses, no double credit', () => {
  const s = fresh();
  runNight(s);
  runNight(s);
  assert.equal(safeNight(s), 2);
  const gold = s.gold;
  const night = s.night;
  const r = catchUp(s, 48 * 3600 * 1000, ev(s));
  assert.equal(r.credited, 24 * 3600);
  assert.equal(r.nights, 480);
  assert.equal(s.gold, gold + r.gold);
  assert.ok(r.gold > 0);
  assert.equal(s.night, night, 'siege level unchanged');
  assert.equal(catchUp(s, 48 * 3600 * 1000, ev(s)).credited, 0);
});

test('offline before any won night gives no night rewards; upgrades still finish', () => {
  const s = fresh();
  queueUpgrade(s, 'lumber');
  const r = catchUp(s, 3600 * 1000, ev(s));
  assert.equal(r.nights, 0);
  assert.equal(s.buildings.lumber.level, 1);
});

test('an interrupted night is abandoned without loss', () => {
  const s = fresh();
  callNight(s, ev(s));
  advance(s, 10, ev(s));
  const r = catchUp(s, s.lastTick + 600 * 1000, ev(s));
  assert.ok(r.interrupted);
  assert.equal(s.phase, 'day');
  assert.equal(s.night, 1);
  assert.equal(s.lastResult[1], undefined);
});

test('pump: pausing stops time, and night speed only speeds up nights', () => {
  const s = fresh();
  s.paused = true;
  const carry = { ms: 0 };
  pump(s, 5000, carry, ev(s));
  assert.equal(s.time, 0);
  s.paused = false;
  pump(s, 15000, carry, ev(s));
  assert.ok(Math.abs(s.time - 10) < 0.06);
  callNight(s, ev(s));
  s.speed = 2;
  const t0 = s.time;
  pump(s, 16000, carry, ev(s));
  assert.ok(Math.abs(s.time - t0 - 2) < 0.06);
});

test('deterministic, and survives JSON round-trips mid-night', () => {
  const a = fresh();
  const b = JSON.parse(JSON.stringify(a));
  runNight(a);
  runNight(b);
  assert.equal(a.gold, b.gold);
  const mid = fresh();
  mid.night = 7;
  callNight(mid, ev(mid));
  advance(mid, 15, ev(mid));
  const copy = JSON.parse(JSON.stringify(mid));
  advance(mid, 30, ev(mid));
  advance(copy, 30, ev(copy));
  assert.equal(mid.integrity, copy.integrity);
  assert.equal(mid.battle?.kills, copy.battle?.kills);
});

test('every tower level is a milestone', () => {
  assert.equal(archeryStats(1).slots, 1);
  assert.ok(archeryStats(2).range > archeryStats(1).range);
  assert.ok(archeryStats(4).dmg > archeryStats(3).dmg * 1.3, 'fire arrows');
  assert.equal(archeryStats(6).shots, 2);
  for (const b of Object.values(BUILDINGS)) for (const [i, L] of b.levels.entries()) if (i > b.start) assert.ok(L.cost && L.time && L.gain, `${b.name} ${i}`);
});
