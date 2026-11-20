// Nights: wave generation, enemy movement, the village's archers, wall damage,
// and the outcome of each night. Runs on a fixed step so results never depend
// on frame rate, speed or quality settings.
import { ENEMIES, SCALING, SPAWNS, NIGHT_CAP, WALL_R } from '../data/village.js';
import { webFor, ROAD_SPAWNS } from './web.js';
import { uid } from './state.js';
import { build } from './build.js';
import { deal, endRun } from './run.js';
import { LOCATIONS } from '../data/world.js';

// Spells, burning and thorns grow with the night, so magic stays useful late.
export const magicScale = (n) => 1.08 ** (n - 1);
const TOWER = [0, 0];

const ARROW_SPEED = 18;
const FX_MAX = 80;

export function activeSpawns(n) {
  return SPAWNS.filter((s) => s.opens <= n);
}

export function enemyStats(type, n) {
  const e = ENEMIES[type];
  return {
    // bosses grow more slowly than the rest, or the tenth nights would decide every run
    hp: e.hp * (e.boss ? 1.14 : SCALING.hp) ** (n - 1),
    dmg: e.dmg * SCALING.dmg ** (n - 1),
    gold: Math.round(e.gold * (1 + SCALING.gold * (n - 1))),
    speed: e.speed, rate: e.rate, armor: e.armor,
  };
}

export function waveComposition(n) {
  const total = 6 + Math.floor((n - 1) * 1.1);
  const wolves = n >= ENEMIES.wolf.first ? Math.round(total * Math.min(0.4, 0.1 + 0.03 * n)) : 0;
  // every tenth night a boss: one troll, two from night 40
  const trolls = n % 10 === 0 ? 1 + Math.floor(n / 40) : 0;
  return { goblin: total - wolves, wolf: wolves, troll: trolls };
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
  const big = spawns.filter((sp) => ROAD_SPAWNS.includes(sp.node));
  const spread = Math.min(55, 6 + types.length * 2);
  return types.map((type, i) => ({
    // bosses come in the middle of the night, from a burrow with roads
    t: ENEMIES[type].boss ? spread * 0.45 + r() * 4 : 1.5 + (i / types.length) * spread + r() * 1.2,
    type,
    spawn: ENEMIES[type].boss ? big[Math.floor(r() * big.length)].id : spawns[i % spawns.length].id,
    off: ENEMIES[type].boss ? 0 : (r() - 0.5) * 0.5,
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
    cds: {},
    spellCd: {},
    startGold: state.gold,
    kills: 0,
    gold: 0,
    wallDamage: 0,
    fx: [],
    fxId: 0,
    firstSpawn: null,
    startIntegrity: state.integrity,
    routes: nightRoutes(state, n),
  };
  const parts = Object.entries(pv.comp).filter(([, k]) => k > 0).map(([t, k]) => `${k} ${k === 1 ? ENEMIES[t].name : ENEMIES[t].plural}`);
  ev.emit('info', `Night ${n} falls: ${parts.join(' and ')}.`, { cat: 'dusk' });
  if (pv.newSpawn) ev.emit('attention', `${pv.newSpawn.name} opens`, { cat: 'spawn', spawn: pv.newSpawn.id });
  if (pv.newEnemy) ev.emit('attention', `New: ${ENEMIES[pv.newEnemy].plural}`, { cat: 'enemy' });
  ev.sound?.('dusk');
}

// Tonight's route from every open burrow, for each size of creature.
export function nightRoutes(state, n) {
  const web = webFor(state);
  const out = {};
  for (const sp of activeSpawns(n)) {
    for (const size of web.sizesFor(sp)) {
      const r = web.routeForSpawn(state.barricades || [], sp, size);
      if (!r) continue;
      const rem = new Array(r.pts.length).fill(0);
      for (let i = r.pts.length - 2; i >= 0; i--) rem[i] = rem[i + 1] + Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
      out[`${sp.id}:${size}`] = { pts: r.pts, rem, len: r.len, nodes: r.nodes };
    }
    out[sp.id] = out[`${sp.id}:small`];
  }
  return out;
}

const routeOf = (b, e) => b.routes[`${e.spawn}:${ENEMIES[e.type].sizeClass}`] || b.routes[e.spawn];

function spawnEnemy(state, b, s) {
  const st = enemyStats(s.type, b.n);
  const [x, z] = (b.routes[`${s.spawn}:${ENEMIES[s.type].sizeClass}`] || b.routes[s.spawn]).pts[0];
  b.enemies.push({
    id: uid(state, 'e'), type: s.type, x, z, px: x, pz: z,
    hp: st.hp, max: st.hp, speed: st.speed, dmg: st.dmg, rate: st.rate, armor: st.armor, gold: st.gold,
    off: s.off, state: 'walk', cd: 0, pending: 0, spawn: s.spawn, k: 1, heading: 0, attackAt: null,
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

function remainingDistance(b, e) {
  if (e.state !== 'walk') return 0;
  const r = routeOf(b, e);
  const p = r.pts[Math.min(e.k, r.pts.length - 1)];
  return Math.hypot(p[0] - e.x, p[1] - e.z) + r.rem[Math.min(e.k, r.pts.length - 1)];
}

// How fast a creature moves now: roots hold it, slows and the frost ward slow it.
function speedNow(e, bd) {
  if (e.root > 0) return 0;
  let f = 1;
  if (e.slowT > 0) f *= 1 - e.slowF;
  for (const a of bd.auras) if (a.aura === 'slow' && Math.hypot(e.x, e.z) <= a.radius) f *= 1 - a.slow;
  return e.speed * f;
}

function stepStatuses(state, b, bd, dt) {
  const m = magicScale(b.n);
  for (const e of b.enemies) {
    if (e.root > 0) e.root -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    let burn = 0;
    if (e.burnT > 0) { e.burnT -= dt; burn += e.burnDps; }
    for (const a of bd.auras) if (a.aura === 'burn' && Math.hypot(e.x, e.z) <= a.radius) burn += a.dps * bd.burnMul * m;
    if (burn > 0 && !e.dead) {
      e.burnAcc = (e.burnAcc || 0) + burn * dt;
      if (e.burnAcc >= 1) { const d = Math.floor(e.burnAcc); e.burnAcc -= d; damage(state, b, e, d, true, true); }
    }
  }
}

function stepEnemies(state, b, dt) {
  const bd = build(state);
  const walls = bd.walls;
  const thorns = walls.thorns * magicScale(b.n);
  for (const e of b.enemies) {
    if (e.dead) continue;
    e.px = e.x; e.pz = e.z;
    const sp = speedNow(e, bd);
    if (e.state === 'walk') {
      const route = routeOf(b, e);
      let budget = sp * dt;
      while (budget > 1e-6 && e.k < route.pts.length) {
        const [tx, tz] = route.pts[e.k];
        // a small sideways offset keeps a crowd from walking in single file
        const [fx0, fz0] = route.pts[e.k - 1] || route.pts[e.k];
        const dx = tx - fx0, dz = tz - fz0, len = Math.hypot(dx, dz) || 1;
        const ox = (-dz / len) * e.off * 0.45, oz = (dx / len) * e.off * 0.45;
        const moved = moveToward(e, tx + ox, tz + oz, budget);
        budget -= moved;
        if (Math.hypot(tx + ox - e.x, tz + oz - e.z) < 1e-4) e.k += 1; else break;
      }
      if (e.k >= route.pts.length || Math.hypot(e.x, e.z) <= WALL_R + 0.6) {
        e.state = 'approach';
        const a = Math.atan2(e.z, e.x) + e.off * 0.12;
        e.attackAt = [Math.cos(a) * (WALL_R + 0.38), Math.sin(a) * (WALL_R + 0.38)];
      }
    }
    if (e.state === 'approach') {
      const moved = moveToward(e, e.attackAt[0], e.attackAt[1], sp * dt);
      if (sp > 0 && moved < sp * dt - 1e-6) { e.state = 'attack'; e.cd = 0.3; e.heading = Math.atan2(-e.x, -e.z); }
    } else if (e.state === 'attack' && !(e.root > 0)) {
      e.cd -= dt;
      if (e.cd <= 0) {
        const hit = Math.max(1, e.dmg - walls.armor);
        state.integrity = Math.max(0, state.integrity - hit);
        b.wallDamage += hit;
        e.cd += 1 / e.rate;
        fx(b, 'wall', e.x, e.z, { dmg: hit });
        if (thorns > 0) damage(state, b, e, thorns, true);
      }
    }
  }
}

function pickTargets(b, range, count) {
  const cands = b.enemies.filter((e) => !e.dead && e.hp - e.pending > 0 && Math.hypot(e.x, e.z) <= range);
  cands.sort((a, c) => remainingDistance(b, a) - remainingDistance(b, c));
  return cands.slice(0, count);
}

// The tower and every defender on it shoot on their own clocks.
function stepShooters(state, b, dt) {
  const bd = build(state);
  bd.shooters.forEach((sh, i) => {
    const key = `${sh.id}:${i}`;
    b.cds[key] = (b.cds[key] ?? Math.random() * 0) - dt;
    if (b.cds[key] > 0) return;
    const targets = pickTargets(b, sh.range, sh.shots);
    if (!targets.length) { b.cds[key] = 0; return; }
    for (const t of targets) {
      t.pending += sh.dmg;
      b.shots.push({ id: uid(state, 'a'), kind: sh.id, x: TOWER[0], z: TOWER[1], px: TOWER[0], pz: TOWER[1], sx: TOWER[0], sz: TOWER[1], tid: t.id, lx: t.x, lz: t.z, dmg: sh.dmg, sh: i, travelled: 0 });
    }
    b.cds[key] += 1 / sh.rate;
  });
}

function damage(state, b, e, amount, quiet = false, ignoreArmor = false) {
  if (e.dead) return;
  const real = ignoreArmor ? amount : Math.max(1, amount - e.armor);
  e.hp -= real;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    b.kills += 1;
    b.gold += e.gold;
    state.gold += e.gold;
    state.stats.kills += 1;
    state.stats.goldEarned += e.gold;
    fx(b, 'death', e.x, e.z, { gold: e.gold, type: e.type });
  } else if (!quiet) fx(b, 'hit', e.x, e.z, { eid: e.id });
}

// What a shot does when it lands, by the shooter that loosed it.
function hitWith(state, b, t, s) {
  const sh = build(state).shooters[s.sh] || build(state).shooters[0];
  const beast = ENEMIES[t.type]?.beast;
  const dmg = s.dmg * (beast ? sh.vsBeast : 1);
  const m = magicScale(b.n);
  const apply = (e, d) => {
    damage(state, b, e, d, false, sh.ignoreArmor);
    if (sh.burn) { e.burnT = 3 * (build(state).burnMul); e.burnDps = Math.max(e.burnDps && e.burnT > 0 ? e.burnDps : 0, sh.burn * m); }
    if (sh.slow) { e.slowT = 2; e.slowF = Math.max(e.slowT > 0 ? e.slowF || 0 : 0, sh.slow); }
  };
  apply(t, dmg);
  if (sh.splash) {
    fx(b, 'splash', t.x, t.z, { r: sh.splash, kind: s.kind });
    for (const o of b.enemies) if (o !== t && !o.dead && Math.hypot(o.x - t.x, o.z - t.z) <= sh.splash) apply(o, dmg * 0.6);
  }
  if (sh.pierce) {
    const near = b.enemies.filter((o) => o !== t && !o.dead && Math.hypot(o.x - t.x, o.z - t.z) < 1.4).sort((a, c) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(c.x - t.x, c.z - t.z))[0];
    if (near) apply(near, dmg * 0.7);
  }
}

// A spell cast on the glass at (x, z). Active spells have a cooldown.
export function castSpell(state, id, x, z) {
  const b = state.battle;
  if (!b) return { ok: false, reason: 'Spells are cast during the night.' };
  const sp = build(state).active.find((s) => s.id === id);
  if (!sp) return { ok: false, reason: 'You do not have that spell.' };
  if ((b.spellCd[id] || 0) > 0) return { ok: false, reason: 'Not ready yet.' };
  const m = magicScale(b.n);
  if (sp.mend) {
    const max = build(state).walls.integrity;
    state.integrity = Math.min(max, state.integrity + max * sp.mend);
    fx(b, 'mend', 0, 0, {});
  } else {
    for (const e of b.enemies) {
      if (e.dead || Math.hypot(e.x - x, e.z - z) > sp.radius) continue;
      if (sp.dmg) damage(state, b, e, sp.dmg * m, false, true);
      if (sp.burn) { e.burnT = 3 * build(state).burnMul; e.burnDps = sp.burn * m; }
      if (sp.root) e.root = sp.root;
    }
    fx(b, id, x, z, { r: sp.radius });
  }
  b.spellCd[id] = sp.cd;
  return { ok: true };
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
        hitWith(state, b, t, s);
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
  b.t += dt;
  state.phaseT += dt;
  while (b.next < b.schedule.length && b.schedule[b.next].t <= b.t) spawnEnemy(state, b, b.schedule[b.next++]);
  const bd = build(state);
  stepStatuses(state, b, bd, dt);
  stepEnemies(state, b, dt);
  stepShooters(state, b, dt);
  stepShots(state, b, dt);
  for (const k of Object.keys(b.spellCd)) b.spellCd[k] = Math.max(0, b.spellCd[k] - dt);
  b.enemies = b.enemies.filter((e) => !e.dead);
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
  const report = { n, won, kills: b.kills, total: b.total, gold: b.gold, wallDamage: b.wallDamage, retreated: b.retreated || 0, reward: 0 };
  state.lastReport = report;
  state.battle = null;
  state.phaseT = 0;
  ev.changed = true;
  if (!won) {
    ev.sound?.('fall');
    endRun(state, ev);
    return;
  }
  const reward = dawnReward(n);
  state.gold += reward;
  state.stats.goldEarned += reward;
  report.reward = reward;
  state.stats.nightsWon += 1;
  const before = state.best;
  state.best = Math.max(state.best, n);
  // holding a new night can reveal a new place in the globe
  for (const l of LOCATIONS) if (l.found > before && l.found <= state.best && l.name) ev.emit('done', `Discovered: ${l.name}`, { cat: 'discover', place: l.id });
  state.night = n + 1;
  ev.emit('done', `Night ${n} held. +${b.gold + reward} gold`, { cat: 'night' });
  ev.sound?.('dawn');
  // the walls are mended at dawn, and three cards are dealt
  state.integrity = build(state).walls.integrity;
  state.offerSalt = 0;
  state.offer = deal(state);
  state.phase = 'draft';
}

// A night left half-fought (the page closed) starts again from its beginning.
export function restartNight(state) {
  if (state.phase !== 'night' || !state.battle) return;
  state.gold = state.battle.startGold ?? state.gold;
  state.battle = null;
  state.phase = 'day';
  state.integrity = build(state).walls.integrity;
}
