import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, colonistsAt, buildingAt } from '../js/sim/state.js';
import { computeColony, capacities, housing } from '../js/sim/economy.js';
import { makeEvents, advance, catchUp, OFFLINE_CAP } from '../js/sim/tick.js';
import * as A from '../js/sim/actions.js';
import { setActiveTech, queueTech } from '../js/sim/research.js';

const fresh = () => newGame({ seed: 42, now: 0 });
const home = (s) => s.colonies[0];
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('starting colony matches the plan', () => {
  const s = fresh();
  const c = home(s);
  assert.deepEqual(capacities(c), { metal: 600, food: 300, fuel: 180, samples: 30 });
  assert.equal(housing(c), 6);
  assert.deepEqual(c.inv, { metal: 200, fuel: 40, food: 80, samples: 0 });
  assert.equal(colonistsAt(s, c.id).length, 3);
  assert.deepEqual(colonistsAt(s, c.id).map((p) => p.profession).sort(), ['engineer', 'miner', 'scientist']);
  const snap = computeColony(s, c);
  assert.equal(snap.power.supply, 8);
  assert.equal(snap.power.demand, 3);
  assert.equal(s.research.bank, 0);
});

test('staffing, profession and relief rates', () => {
  const s = fresh();
  const c = home(s);
  const snap = computeColony(s, c);
  const ext = c.buildings.find((b) => b.type === 'extractor');
  const miner = snap.workerOf[ext.id];
  let expectBonus = 0.6; // 50% + matching 10% at level 1
  if (miner.traits.includes('diligent')) expectBonus += 0.05;
  if (miner.traits.includes('homebody')) expectBonus *= 1.1;
  near(snap.info[ext.id].output.metal, 12 * (1 + expectBonus));
  near(snap.reliefRate, 2); // the idle scientist salvages 2 Metal/min
  near(snap.cons.food, 0.3);
});

test('one minute of production is applied and capped by storage', () => {
  const s = fresh();
  const c = home(s);
  const before = c.inv.metal;
  const snap = computeColony(s, c);
  advance(s, 60, makeEvents(s), 1);
  near(c.inv.metal, before + snap.gross.metal, 1e-6);
  c.inv.metal = 599.9;
  advance(s, 60, makeEvents(s), 1);
  assert.equal(c.inv.metal, 600);
  const ext = c.buildings.find((b) => b.type === 'extractor');
  assert.equal(c.runtime[ext.id].reason, 'storage full');
});

test('construction reserves costs, cannot double-spend, and refunds on cancel', () => {
  const s = fresh();
  const c = home(s);
  c.inv.metal = 100;
  const r1 = A.placeBuilding(s, c.id, 'lab', 0, 1);
  assert.ok(r1.ok);
  assert.equal(c.reserved.metal, 90);
  const r2 = A.placeBuilding(s, c.id, 'extractor', -2, -2);
  assert.equal(r2.ok, false);
  assert.match(r2.reason, /Needs 50 more Metal/);
  A.cancelQueueItem(s, c.id, c.queue[0].id);
  assert.equal(c.reserved.metal, 0);
  assert.equal(c.inv.metal, 100);
  assert.equal(buildingAt(c, 0, 1), undefined);
});

test('construction completes with supporting engineer speed', () => {
  const s = fresh();
  const c = home(s);
  A.placeBuilding(s, c.id, 'lab', 0, 1);
  const snap = computeColony(s, c);
  assert.ok(snap.speed >= 1.1);
  advance(s, 30 / snap.speed + 0.5, makeEvents(s), 0.5);
  const lab = buildingAt(c, 0, 1);
  assert.equal(lab.level, 1);
  assert.equal(c.reserved.metal, 0);
});

test('upgrade cost and time follow the formulas', () => {
  const s = fresh();
  const c = home(s);
  const ext = c.buildings.find((b) => b.type === 'extractor');
  assert.deepEqual(A.upgradeCost(ext), { metal: 96 });
  near(A.upgradeTime(ext), 27);
  ext.level = 3;
  assert.deepEqual(A.upgradeCost(ext), { metal: Math.ceil(60 * 1.6 ** 3) });
});

test('queue holds one active and four waiting', () => {
  const s = fresh();
  const c = home(s);
  c.inv.metal = 600;
  const spots = [[-2, -2], [-1, -2], [0, -2], [1, -2], [-2, 1], [0, 1]];
  const res = spots.map(([x, z]) => A.placeBuilding(s, c.id, 'farm', x, z));
  assert.deepEqual(res.map((r) => r.ok), [true, true, true, true, true, false]);
  assert.match(res[5].reason, /queue is full/);
});

test('refinery scales down instead of wasting Metal', () => {
  const s = fresh();
  s.research.done.push('fuel_refining');
  const c = home(s);
  const r = A.placeBuilding(s, c.id, 'refinery', 0, 1);
  assert.ok(r.ok);
  advance(s, 40, makeEvents(s), 1);
  c.buildings.filter((b) => b.type === 'extractor').forEach((b) => (b.enabled = false));
  for (const p of colonistsAt(s, c.id)) p.assign = { kind: 'support' }; // no relief Metal
  c.inv.metal = 1; // only enough for 15 seconds at 4/min
  const fuel0 = c.inv.fuel;
  advance(s, 60, makeEvents(s), 1);
  assert.ok(c.inv.metal >= 0);
  near(c.inv.metal, 0, 1e-6);
  near(c.inv.fuel - fuel0, 0.5, 1e-6); // 1 Metal → 0.5 Fuel, never more
});

test('power shortage pauses lowest-priority buildings first', () => {
  const s = fresh();
  const c = home(s);
  const solar = c.buildings.find((b) => b.type === 'solar');
  solar.enabled = false; // only HQ's 2 power
  const snap = computeColony(s, c);
  const farm = c.buildings.find((b) => b.type === 'farm');
  const ext = c.buildings.find((b) => b.type === 'extractor');
  assert.equal(snap.info[farm.id].status, 'running');
  assert.equal(snap.info[ext.id].status, 'unpowered');
  ext.priority = 'high';
  const snap2 = computeColony(s, c);
  assert.equal(snap2.info[ext.id].status, 'running');
  assert.equal(snap2.info[farm.id].status, 'unpowered');
});

test('food shortage halves bonuses and never kills colonists', () => {
  const s = fresh();
  const c = home(s);
  c.buildings.find((b) => b.type === 'farm').enabled = false;
  c.inv.food = 0.01;
  advance(s, 600, makeEvents(s), 1);
  assert.equal(c.foodShort, true);
  assert.equal(colonistsAt(s, c.id).length, 3);
  const snap = computeColony(s, c);
  const ext = c.buildings.find((b) => b.type === 'extractor');
  assert.ok(snap.info[ext.id].bonus.staff.total < 0.4);
  // Relief food work brings recovery without any reward
  c.reliefMode = 'food';
  advance(s, 120, makeEvents(s), 1);
  assert.equal(c.foodShort, false);
  assert.ok(c.inv.food > 0);
});

test('offline catch-up is capped at 24h and never credited twice', () => {
  const s = fresh();
  const ev = makeEvents(s);
  const r = catchUp(s, 48 * 3600 * 1000, ev);
  assert.equal(r.credited, OFFLINE_CAP);
  near(s.time, OFFLINE_CAP, 1e-3);
  const r2 = catchUp(s, 48 * 3600 * 1000, makeEvents(s));
  assert.equal(r2.credited, 0);
  near(s.time, OFFLINE_CAP, 1e-3);
});

test('paused games make no progress', () => {
  const s = fresh();
  s.paused = true;
  const m = home(s).inv.metal;
  catchUp(s, 3600 * 1000, makeEvents(s));
  assert.equal(home(s).inv.metal, m);
  assert.equal(s.lastTick, 3600 * 1000);
});

test('research bank flows into projects and the queue', () => {
  const s = fresh();
  s.research.bank = 100;
  assert.ok(setActiveTech(s, 'fuel_refining', makeEvents(s)).ok);
  assert.ok(s.research.done.includes('fuel_refining'));
  near(s.research.bank, 70);
  assert.ok(setActiveTech(s, 'efficient_extraction', makeEvents(s)).ok);
  assert.equal(s.research.progress.efficient_extraction, 70);
  assert.equal(s.research.bank, 0);
  assert.equal(queueTech(s, 'cargo_logistics').ok, false); // later milestone
});

test('demolition blocks stranding residents and refunds half', () => {
  const s = fresh();
  const c = home(s);
  const hab = c.buildings.find((b) => b.type === 'habitat');
  const pv = A.demolishPreview(s, c.id, hab.id);
  assert.ok(pv.blockers.some((b) => /residents/.test(b)));
  const farm = c.buildings.find((b) => b.type === 'farm');
  const m = c.inv.metal;
  assert.ok(A.demolish(s, c.id, farm.id).ok);
  assert.equal(c.inv.metal, m + 20);
  const depot = c.buildings.find((b) => b.type === 'depot');
  c.inv.metal = 500;
  assert.equal(A.demolish(s, c.id, depot.id).ok, false);
});

test('recruitment waits for housing and refunds on cancel', () => {
  const s = fresh();
  const c = home(s);
  const cand = c.recruit.candidates[0];
  assert.ok(A.startRecruit(s, c.id, cand.id).ok);
  assert.equal(c.reserved.metal, 50);
  assert.ok(A.cancelRecruit(s, c.id).ok);
  assert.equal(c.reserved.metal, 0);
  assert.ok(A.startRecruit(s, c.id, cand.id).ok);
  advance(s, 181, makeEvents(s), 1);
  assert.equal(colonistsAt(s, c.id).length, 4);
  assert.equal(c.reserved.metal, 0);
});

test('experience levels a working colonist', () => {
  const s = fresh();
  const c = home(s);
  advance(s, 60 * 10, makeEvents(s), 2);
  const miner = colonistsAt(s, c.id).find((p) => p.profession === 'miner');
  assert.ok(miner.skills.miner.level >= 2);
});

test('pacing: lab and first research inside the early window', () => {
  const s = fresh();
  const c = home(s);
  const ev = makeEvents(s);
  assert.ok(A.placeBuilding(s, c.id, 'lab', 0, 1).ok);
  advance(s, 40, ev, 1);
  const sci = colonistsAt(s, c.id).find((p) => p.profession === 'scientist');
  A.assignColonist(s, sci.id, { kind: 'building', bid: buildingAt(c, 0, 1).id });
  setActiveTech(s, 'fuel_refining', ev);
  advance(s, 10 * 60, ev, 2);
  assert.ok(s.research.done.includes('fuel_refining'), 'Fuel Refining within ~10 minutes');
});

test('save data round-trips through JSON', () => {
  const s = fresh();
  advance(s, 300, makeEvents(s), 2);
  const copy = JSON.parse(JSON.stringify(s));
  advance(s, 60, makeEvents(s), 2);
  advance(copy, 60, makeEvents(copy), 2);
  near(home(s).inv.metal, home(copy).inv.metal, 1e-6);
});
