import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../js/sim/state.js';
import { defaultField, buildFlowField, routeFrom, spawnPos, TERRAIN, cellCenter } from '../js/sim/map.js';
import { SPAWNS, wallStats, archeryStats, DAY_LENGTH } from '../js/data/village.js';
import { makeEvents, advance, tick, catchUp, callNight, pump } from '../js/sim/time.js';
import { waveSchedule, waveComposition, safeNight, activeSpawns } from '../js/sim/battle.js';
import { queueUpgrade, cancelUpgrade, upgradeBlocker, upgradeCost } from '../js/sim/village.js';

const fresh = () => newGame({ seed: 7, now: 0 });
const ev = (s) => makeEvents(s);
const runNight = (s) => {
  const e = ev(s);
  if (s.phase === 'day') callNight(s, e);
  let g = 0;
  while (s.phase === 'night' && g++ < 40000) tick(s, 0.05, e);
  return e;
};

test('every spawn point has a route to the walls', () => {
  const f = defaultField();
  for (const sp of SPAWNS) {
    const [x, z] = spawnPos(sp);
    const r = routeFrom(f, x, z);
    assert.ok(isFinite(r.length), `${sp.name} reachable`);
    assert.ok(r.length > 15 && r.length < 26, `${sp.name} length ${r.length}`);
  }
});

test('every walkable cell connects to the village', () => {
  const f = defaultField();
  let free = 0, reached = 0;
  for (let k = 0; k < TERRAIN.length; k++) if (TERRAIN[k] === 0) { free++; if (isFinite(f.dist[k])) reached++; }
  assert.equal(reached, free);
});

test('blocking a path reroutes enemies through a loop', () => {
  const tiles = TERRAIN.slice();
  const [x, z] = spawnPos(SPAWNS[0]);
  const before = routeFrom(buildFlowField(tiles), x, z).length;
  // barricade the northern path between its two junctions
  for (let k = 0; k < tiles.length; k++) {
    const [cx, cz] = cellCenter(k % 53, (k / 53) | 0);
    if (tiles[k] === 0 && Math.hypot(cx - 0.5, cz + 10.6) < 1.7) tiles[k] = 4;
  }
  const after = routeFrom(buildFlowField(tiles), x, z).length;
  assert.ok(isFinite(after), 'still a way through');
  assert.ok(after > before + 2, `route ${before.toFixed(1)} → ${after.toFixed(1)}`);
});

test('starting state', () => {
  const s = fresh();
  assert.equal(s.gold, 150);
  assert.equal(s.integrity, 500);
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

test('the first day ends, and the archers win night 1 untouched', () => {
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
  assert.ok(s.gold > 150);
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

test('upgrades reserve gold, respect Town Hall caps and refund on cancel', () => {
  const s = fresh();
  assert.equal(upgradeCost('archery', 1), 40);
  assert.ok(queueUpgrade(s, 'archery').ok);
  assert.equal(s.reserved, 40);
  assert.equal(queueUpgrade(s, 'archery').ok, false, 'one entry per building');
  assert.ok(cancelUpgrade(s, s.queue[0].id).ok);
  assert.equal(s.reserved, 0);
  assert.ok(queueUpgrade(s, 'archery').ok);
  advance(s, 16, ev(s));
  assert.equal(s.buildings.archery.level, 2);
  assert.equal(s.gold, 140, '150 − 40 + 30 objective reward');
  assert.match(upgradeBlocker(s, 'archery'), /Town Hall to level 2/);
  assert.match(upgradeBlocker(s, 'farmstead'), /Milestone 3/);
  s.gold = 10;
  assert.match(upgradeBlocker(s, 'walls'), /more gold/);
});

test('walls upgrade raises integrity', () => {
  const s = fresh();
  queueUpgrade(s, 'walls');
  advance(s, 21, ev(s));
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
  queueUpgrade(s, 'walls');
  const r = catchUp(s, 3600 * 1000, ev(s));
  assert.equal(r.nights, 0);
  assert.equal(s.buildings.walls.level, 2);
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

test('archery stats grow as described', () => {
  assert.equal(archeryStats(5).shots, 2);
  assert.equal(archeryStats(10).pierce, true);
  assert.ok(archeryStats(3).range > archeryStats(1).range);
});
