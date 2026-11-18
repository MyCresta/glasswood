// Nights: wave generation, enemy movement, the village's archers, wall damage,
// and the outcome of each night. Runs on a fixed step so results never depend
// on frame rate, speed or quality settings.
import {
  ENEMIES, SCALING, SPAWNS, NIGHT_CAP, DAY_LENGTH, WALL_R, TILE, GRID, archeryStats, wallStats, BUILDINGS,
} from '../data/village.js';
import { defaultField, cellOf, idx, inGrid, cellCenter, spawnPos } from './map.js';
import { availableGold, uid } from './state.js';

const ARROW_SPEED = 18;
const FX_MAX = 80;

export function activeSpawns(n) {
  return SPAWNS.filter((s) => s.opens <= n);
}

export function enemyStats(type, n) {
  const e = ENEMIES[type];
  return {
    hp: e.hp * SCALING.hp ** (n - 1),
    dmg: e.dmg * SCALING.dmg ** (n - 1),
    gold: Math.round(e.gold * (1 + SCALING.gold * (n - 1))),
    speed: e.speed, rate: e.rate, armor: e.armor,
  };
}

export function waveComposition(n) {
  const total = 6 + Math.floor((n - 1) * 0.9);
  const wolves = n >= ENEMIES.wolf.first ? Math.round(total * Math.min(0.4, 0.1 + 0.03 * n)) : 0;
  return { goblin: total - wolves, wolf: wolves };
}

export function waveGold(n) {
  const c = waveComposition(n);
  return Object.entries(c).reduce((a, [t, k]) => a + k * enemyStats(t, n).gold, 0);
}

export function dawnReward(n) { return 10 + 4 * n; }

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic spawn schedule for night n.
export function waveSchedule(seed, n) {
  const r = rng(seed ^ Math.imul(n, 7919));
  const comp = waveComposition(n);
  const types = [];
  for (const [t, k] of Object.entries(comp)) for (let i = 0; i < k; i++) types.push(t);
  for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
  const spawns = activeSpawns(n);
  const spread = Math.min(55, 6 + types.length * 2);
  return types.map((type, i) => ({
    t: 1.5 + (i / types.length) * spread + r() * 1.2,
    type,
    spawn: spawns[i % spawns.length].id,
    off: (r() - 0.5) * 0.5,
  })).sort((a, b) => a.t - b.t);
}

export function nightPreview(state, n = state.night) {
  const comp = waveComposition(n);
  const spawns = activeSpawns(n);
  const newSpawn = spawns.find((s) => s.opens === n && n > 1) || null;
  const newEnemy = Object.entries(ENEMIES).find(([, e]) => e.first === n && n > 1)?.[0] || null;
  return { n, comp, spawns, newSpawn, newEnemy, gold: waveGold(n) + dawnReward(n) };
}

function fx(b, kind, x, z, extra = {}) {
  b.fxId += 1;
  b.fx.push({ id: b.fxId, kind, x, z, t: b.t, ...extra });
  if (b.fx.length > FX_MAX) b.fx.splice(0, b.fx.length - FX_MAX);
}

export function startNight(state, ev) {
  const n = state.night;
  const pv = nightPreview(state, n);
  state.phase = 'night';
  state.phaseT = 0;
  state.battle = {
    n,
    t: 0,
    schedule: waveSchedule(state.seed, n),
    next: 0,
    total: Object.values(pv.comp).reduce((a, b) => a + b, 0),
    enemies: [],
    shots: [],
    cd: 0,
    kills: 0,
    gold: 0,
    wallDamage: 0,
    fx: [],
    fxId: 0,
    firstSpawn: null,
    startIntegrity: state.integrity,
  };
  const parts = Object.entries(pv.comp).filter(([, k]) => k > 0).map(([t, k]) => `${k} ${k === 1 ? ENEMIES[t].name : ENEMIES[t].plural}`);
  ev.emit('info', `Night ${n} falls: ${parts.join(' and ')}.`, { cat: 'dusk' });
  if (pv.newSpawn) ev.emit('attention', `${pv.newSpawn.name} has opened. Enemies now come from ${pv.spawns.length} directions.`, { cat: 'spawn', spawn: pv.newSpawn.id });
  if (pv.newEnemy) ev.emit('attention', `New enemy tonight: ${ENEMIES[pv.newEnemy].plural}. ${ENEMIES[pv.newEnemy].blurb}`, { cat: 'enemy' });
  ev.sound?.('dusk');
}

function spawnEnemy(state, b, s) {
  const st = enemyStats(s.type, b.n);
  const sp = SPAWNS.find((x) => x.id === s.spawn);
  const [x, z] = spawnPos(sp);
  b.enemies.push({
    id: uid(state, 'e'), type: s.type, x, z, px: x, pz: z,
    hp: st.hp, max: st.hp, speed: st.speed, dmg: st.dmg, rate: st.rate, armor: st.armor, gold: st.gold,
    off: s.off, state: 'walk', cd: 0, pending: 0, spawn: s.spawn, heading: 0, attackAt: null,
  });
  if (b.firstSpawn === null) b.firstSpawn = b.t;
}

function moveToward(e, tx, tz, step) {
  const dx = tx - e.x, dz = tz - e.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return 0;
  if (d <= step) { e.x = tx; e.z = tz; return d; }
  e.x += (dx / d) * step;
  e.z += (dz / d) * step;
  e.heading = Math.atan2(dx, dz);
  return step;
}

function remainingDistance(field, e) {
  if (e.state === 'attack') return 0;
  const [i, j] = cellOf(e.x, e.z);
  if (!inGrid(i, j)) return 999;
  const d = field.dist[idx(i, j)];
  return isFinite(d) ? d : Math.hypot(e.x, e.z);
}

function stepEnemies(state, b, field, dt) {
  const walls = wallStats(state.buildings.walls.level);
  for (const e of b.enemies) {
    e.px = e.x; e.pz = e.z;
    if (e.state === 'walk') {
      const r = Math.hypot(e.x, e.z);
      const [i, j] = cellOf(e.x, e.z);
      const k = inGrid(i, j) ? idx(i, j) : -1;
      const d = k >= 0 ? field.dist[k] : Infinity;
      if (r <= WALL_R + 0.75 || d === 0) {
        e.state = 'approach';
        const a = Math.atan2(e.z, e.x) + e.off * 0.12;
        e.attackAt = [Math.cos(a) * (WALL_R + 0.38), Math.sin(a) * (WALL_R + 0.38)];
      } else if (k >= 0 && isFinite(d) && field.next[k] >= 0) {
        const nk = field.next[k];
        const [cx, cz] = cellCenter(nk % GRID, (nk / GRID) | 0);
        // lateral offset keeps a crowd from walking in single file
        const dx = cx - e.x, dz = cz - e.z;
        const len = Math.hypot(dx, dz) || 1;
        moveToward(e, cx + (-dz / len) * e.off * TILE * 0.6, cz + (dx / len) * e.off * TILE * 0.6, e.speed * dt);
      } else {
        moveToward(e, 0, 0, e.speed * dt); // off the field: head straight in
      }
    }
    if (e.state === 'approach') {
      const moved = moveToward(e, e.attackAt[0], e.attackAt[1], e.speed * dt);
      if (moved < e.speed * dt - 1e-6) { e.state = 'attack'; e.cd = 0.3; e.heading = Math.atan2(-e.x, -e.z); }
    } else if (e.state === 'attack') {
      e.cd -= dt;
      if (e.cd <= 0) {
        const hit = Math.max(1, e.dmg - walls.armor);
        state.integrity = Math.max(0, state.integrity - hit);
        b.wallDamage += hit;
        e.cd += 1 / e.rate;
        fx(b, 'wall', e.x, e.z, { dmg: hit });
      }
    }
  }
}

function pickTargets(state, b, field, count) {
  const st = archeryStats(state.buildings.archery.level);
  const mode = state.buildings.archery.target || 'first';
  const cands = b.enemies.filter((e) => e.hp - e.pending > 0 && Math.hypot(e.x, e.z) <= st.range);
  const prog = (e) => remainingDistance(field, e);
  if (mode === 'strongest') cands.sort((a, c) => (c.hp - c.pending) - (a.hp - a.pending) || prog(a) - prog(c));
  else if (mode === 'fastest') cands.sort((a, c) => c.speed - a.speed || prog(a) - prog(c));
  else cands.sort((a, c) => prog(a) - prog(c));
  return cands.slice(0, count);
}

function stepArchers(state, b, field, dt) {
  const st = archeryStats(state.buildings.archery.level);
  const [tx, tz] = BUILDINGS.archery.pos;
  b.cd -= dt;
  if (b.cd > 0) return;
  const targets = pickTargets(state, b, field, st.shots);
  if (!targets.length) { b.cd = 0; return; }
  for (const t of targets) {
    t.pending += st.dmg;
    b.shots.push({ id: uid(state, 'a'), x: tx, z: tz, px: tx, pz: tz, sx: tx, sz: tz, tid: t.id, lx: t.x, lz: t.z, dmg: st.dmg, pierce: st.pierce, travelled: 0 });
  }
  b.cd += 1 / st.rate;
}

function damage(state, b, e, amount) {
  const real = Math.max(1, amount - e.armor);
  e.hp -= real;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    b.kills += 1;
    b.gold += e.gold;
    state.gold += e.gold;
    state.stats.kills += 1;
    state.stats.goldEarned += e.gold;
    fx(b, 'death', e.x, e.z, { gold: e.gold, type: e.type });
  } else fx(b, 'hit', e.x, e.z, { eid: e.id });
}

function stepShots(state, b, dt) {
  const byId = new Map(b.enemies.map((e) => [e.id, e]));
  const keep = [];
  for (const s of b.shots) {
    s.px = s.x; s.pz = s.z;
    const t = byId.get(s.tid);
    if (t && !t.dead) { s.lx = t.x; s.lz = t.z; }
    const dx = s.lx - s.x, dz = s.lz - s.z;
    const d = Math.hypot(dx, dz);
    const step = ARROW_SPEED * dt;
    s.travelled += Math.min(d, step);
    if (d <= step + 0.05) {
      if (t && !t.dead) {
        t.pending = Math.max(0, t.pending - s.dmg);
        damage(state, b, t, s.dmg);
        if (s.pierce) {
          const near = b.enemies.filter((o) => o !== t && !o.dead && Math.hypot(o.x - t.x, o.z - t.z) < 0.9).sort((a, c) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(c.x - t.x, c.z - t.z))[0];
          if (near) damage(state, b, near, s.dmg * 0.5);
        }
      } else if (t) t.pending = Math.max(0, t.pending - s.dmg);
      continue;
    }
    s.x += (dx / d) * step;
    s.z += (dz / d) * step;
    keep.push(s);
  }
  b.shots = keep;
  b.enemies = b.enemies.filter((e) => !e.dead);
}

export function stepNight(state, dt, ev) {
  const b = state.battle;
  if (!b) return;
  const field = defaultField();
  b.t += dt;
  state.phaseT += dt;
  while (b.next < b.schedule.length && b.schedule[b.next].t <= b.t) spawnEnemy(state, b, b.schedule[b.next++]);
  stepEnemies(state, b, field, dt);
  stepArchers(state, b, field, dt);
  stepShots(state, b, dt);
  if (state.integrity <= 0) return endNight(state, false, ev);
  const allSpawned = b.next >= b.schedule.length;
  if (allSpawned && !b.enemies.length) return endNight(state, true, ev);
  if (b.firstSpawn !== null && b.t - b.firstSpawn >= NIGHT_CAP) {
    b.retreated = b.enemies.length;
    return endNight(state, true, ev);
  }
}

export function endNight(state, won, ev) {
  const b = state.battle;
  const n = b.n;
  const report = { n, won, kills: b.kills, total: b.total, gold: b.gold, wallDamage: b.wallDamage, retreated: b.retreated || 0, lost: 0, reward: 0 };
  if (won) {
    const reward = dawnReward(n);
    state.gold += reward;
    state.stats.goldEarned += reward;
    report.reward = reward;
    state.lastResult[n] = 'won';
    state.stats.nightsWon += 1;
    const record = n > state.best;
    state.best = Math.max(state.best, n);
    if (!state.hold) state.night = n + 1;
    const flawless = b.wallDamage === 0 ? ' The walls were not even scratched.' : '';
    ev.emit('done', `Night ${n} held. ${b.kills} enemies defeated${report.retreated ? `, ${report.retreated} fled at dawn` : ''}. +${b.gold + reward} gold.${flawless}${record && n > 1 ? ' A new best.' : ''}`, { cat: 'night', record });
    ev.sound?.('dawn');
  } else {
    const lost = Math.floor(availableGold(state) * 0.1);
    state.gold -= lost;
    report.lost = lost;
    state.lastResult[n] = 'lost';
    state.stats.nightsLost += 1;
    state.night = Math.max(1, n - 2);
    ev.emit('attention', `The walls fell on night ${n}. Raiders carried off ${lost} gold. The siege falls back to night ${state.night}.`, { cat: 'night' });
    ev.sound?.('fall');
  }
  state.lastReport = report;
  state.battle = null;
  state.phase = 'day';
  state.phaseT = 0;
  state.dayLength = DAY_LENGTH;
  state.integrity = wallStats(state.buildings.walls.level).integrity;
  ev.changed = true;
}

export function safeNight(state) {
  let best = 0;
  for (const [n, r] of Object.entries(state.lastResult)) if (r === 'won') best = Math.max(best, Number(n));
  return best;
}
