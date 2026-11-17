import { h, clear, fmt, exact, rate, dur, clockAt, costList, progressBar, button, actionButton, resIcon } from './dom.js';
import { glyph, portrait } from './art.js';
import { BUILDINGS, BUILD_ORDER, RESOURCE_INFO, HQ_UPGRADES, LEVEL_OUTPUT, LEVEL_DEMAND, LEVEL_STORAGE } from '../data/buildings.js';
import { PROFESSIONS } from '../data/people.js';
import { TECHS } from '../data/techs.js';
import { available, levelMult, demandMult, researchBonus, workerBonus, skillLevel, SUPPORT_MAX, RELIEF } from '../sim/economy.js';
import * as A from '../sim/actions.js';

const avail = (c) => (k) => available(c, k);

export function statusOf(ui, b) {
  const c = ui.colony();
  const sn = ui.snap();
  const i = sn.info[b.id];
  const q = c.queue.findIndex((x) => x.bid === b.id);
  if (b.level < 1) {
    if (q === 0) { const it = c.queue[0]; return { mark: '◔', tone: 'busy', text: `Under construction, ${Math.floor((it.progress / it.duration) * 100)}%. About ${dur((it.duration - it.progress) / sn.speed)} left.` }; }
    return { mark: '…', tone: 'busy', text: `Waiting in the construction queue (position ${q + 1}).` };
  }
  const up = b.upgrading ? ` Upgrade to level ${b.level + 1} ${q === 0 ? 'in progress' : 'waiting in the queue'}; it keeps working meanwhile.` : '';
  if (!i) return { mark: '•', tone: 'ok', text: 'Ready.' + up };
  if (i.status === 'off') return { mark: '❚❚', tone: 'off', text: 'Switched off. It uses no power and produces nothing.' + up };
  if (i.status === 'unpowered') {
    const need = i.demand - Math.max(0, sn.power.left);
    return { mark: 'ϟ', tone: 'warn', text: `Paused: not enough power. Needs ${fmt(need, 1)} more Power. Build a Solar Array, switch something off, or raise this building’s priority.` + up };
  }
  const rt = c.runtime[b.id];
  if (rt && rt.factor < 0.999 && BUILDINGS[b.type].output) {
    if (rt.reason === 'storage full') return { mark: '▤', tone: 'warn', text: `${rt.factor <= 0.001 ? 'Stopped' : `Running at ${Math.round(rt.factor * 100)}%`}: storage is full. Spend goods, upgrade a Storage Depot or build another.` + up };
    if (rt.reason?.startsWith('short')) return { mark: '!', tone: 'warn', text: `Running at ${Math.round(rt.factor * 100)}%: ${rt.reason}. It slows down instead of wasting inputs.` + up };
  }
  return { mark: '✓', tone: 'ok', text: 'Working normally.' + up };
}

function outputsFor(state, colony, b, level, worker) {
  const def = BUILDINGS[b.type];
  const out = {};
  if (!def.output) return out;
  const wb = workerBonus(colony, worker, b.type, state.time).total;
  const rb = researchBonus(state, b.type);
  for (const k in def.output) out[k] = def.output[k] * levelMult(level) * (1 + rb) * (1 + wb);
  return out;
}

export function buildingView(ui, bid) {
  const s = ui.state;
  const c = ui.colony();
  const b = c.buildings.find((x) => x.id === bid);
  if (!b) return null;
  const def = BUILDINGS[b.type];
  const sn = ui.snap();
  const info = sn.info[b.id];
  const built = b.level >= 1;
  const worker = info?.worker || null;
  const el = h('div.building-view');

  // header art + status
  const status = h('p.status', { role: 'status' });
  const prog = progressBar(0, 'Construction progress');
  const progWrap = h('div.prog-wrap', {}, prog, h('span.prog-text', {}));
  el.append(h('div.bv-head', {}, h('span.big-glyph', { html: glyph(b.type, 'var(--accent)', 40) }),
    h('div', {}, h('p.lead', {}, def.blurb), status)), progWrap);

  // production
  if (built && (def.output || def.input)) {
    const sec = h('section.card', {}, h('h3', {}, 'Production'));
    const lines = h('div.lines');
    sec.append(lines);
    if (info?.bonus) {
      const bd = info.bonus;
      sec.append(h('details.breakdown', {}, h('summary', {}, 'How this is calculated'),
        h('ul', {},
          h('li', {}, `Base: ${Object.entries(def.output).map(([k, v]) => `${v} ${RESOURCE_INFO[k].name}/min`).join(', ')}`),
          h('li', {}, `Level ${b.level}: ×${bd.level.toFixed(3)}`),
          bd.research ? h('li', {}, `Research: +${Math.round(bd.research * 100)}%`) : null,
          ...bd.staff.parts.map(([n, v]) => h('li', {}, `${n}: ${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 1000) / 10}%`)),
          bd.staff.parts.length ? h('li', {}, `Staffing total: +${Math.round(bd.staff.total * 1000) / 10}%`) : h('li', {}, 'No worker assigned (automated output only).'),
        )));
    }
    if (def.powerUse) sec.append(h('p.muted', {}, `Uses ${fmt(info?.demand || def.powerUse * demandMult(b.level), 2)} Power${b.priority !== 'normal' ? `, ${b.priority} priority` : ''}.`));
    el.append(sec);
    sec.update = () => {
      const i = ui.snap().info[b.id];
      const rt = c.runtime[b.id];
      const f = rt?.factor ?? 1;
      clear(lines);
      if (!i || ['constructing', 'off', 'unpowered'].includes(i.status)) {
        lines.append(h('p.muted', {}, 'Not producing right now.'));
        return;
      }
      for (const k in i.output) lines.append(h('div.line', {}, resIcon(k), h('span', {}, RESOURCE_INFO[k].name), h('strong', {}, rate(i.output[k] * f)), f < 0.999 ? h('span.muted', {}, ` of ${fmt(i.output[k], 1)} possible`) : null));
      for (const k in i.input) lines.append(h('div.line', {}, resIcon(k), h('span', {}, `${RESOURCE_INFO[k].name} used`), h('strong', {}, rate(-i.input[k] * f))));
    };
  }

  // supply buildings
  if (built && (b.type === 'solar' || b.type === 'depot' || b.type === 'habitat')) {
    const sec = h('section.card', {}, h('h3', {}, 'Provides'));
    if (b.type === 'solar') sec.append(h('p', {}, `${fmt(6 * levelMult(b.level), 2)} Power, day and night.`));
    if (b.type === 'depot') sec.append(h('p', {}, Object.entries(def.storage).map(([k, v]) => `${fmt(v * LEVEL_STORAGE ** (b.level - 1), 0)} ${RESOURCE_INFO[k]?.name || k}`).join(', '), ' of storage.'));
    if (b.type === 'habitat') sec.append(h('p', {}, `Homes for ${4 + b.level - 1} colonists.`));
    el.append(sec);
  }

  // headquarters
  if (b.type === 'hq') el.append(hqSection(ui, c, sn));

  // worker
  if (built && def.staffed) {
    const sec = h('section.card', {}, h('h3', {}, 'Worker'));
    const people = sn.people;
    if (worker) {
      sec.append(h('div.person-row', {}, h('span', { html: portrait(worker, 44) }),
        h('div', {}, h('button.linkish', { type: 'button', onclick: () => ui.open('colonist', worker.id) }, worker.name),
          h('p.muted', {}, `${PROFESSIONS[worker.profession].name}, level ${skillLevel(worker)}${PROFESSIONS[worker.profession].building === b.type ? ', matching profession' : ''}`))));
    } else sec.append(h('p.muted', {}, 'Nobody works here. It still produces automatically; a worker adds at least 50%.'));
    const sel = h('select.select', { 'aria-label': `Choose a worker for ${def.name}`, onchange: (e) => {
      const v = e.target.value;
      if (v === '') { if (worker) ui.assign(worker.id, null); } else ui.assign(v, { kind: 'building', bid: b.id });
    } }, h('option', { value: '' }, worker ? 'Nobody (send to relief work)' : 'Choose a worker…'),
    people.filter((p) => p.id !== worker?.id).map((p) => {
      const cur = jobName(ui, p);
      const match = PROFESSIONS[p.profession].building === b.type;
      return h('option', { value: p.id }, `${p.name}, ${PROFESSIONS[p.profession].name} L${skillLevel(p)}${match ? ' (matching)' : ''}${cur ? ` — leaves ${cur}` : ''}`);
    }));
    sec.append(h('label.field', {}, h('span', {}, worker ? 'Replace or remove' : 'Assign'), sel));
    el.append(sec);
  }

  // upgrade
  if (built) {
    const sec = h('section.card', {}, h('h3', {}, b.level >= def.maxLevel ? `Level ${b.level} (highest)` : `Upgrade to level ${b.level + 1}`));
    if (b.level < def.maxLevel) {
      const cost = A.upgradeCost(b);
      const time = A.upgradeTime(b);
      const benefit = upgradeBenefit(ui, c, b, worker);
      sec.append(h('p', {}, benefit));
      sec.append(h('p.cost-line', {}, costList(cost, c, avail(c)), h('span.muted', {}, ` ${dur(time / sn.speed)}`)));
      const block = A.upgradeBlocker(s, c, b);
      sec.append(actionButton(`Upgrade to level ${b.level + 1}`, block, () => ui.g.act((st) => A.upgradeBuilding(st, c.id, b.id), { sound: 'build' }), { kind: 'primary' }));
    }
    el.append(sec);
  }

  // queue controls
  const qItem = c.queue.find((q) => q.bid === b.id);
  if (qItem) {
    el.append(h('section.card', {}, h('h3', {}, qItem.kind === 'build' ? 'Construction' : 'Upgrade work'),
      h('p.muted', {}, 'Cancelling refunds everything committed. Progress is discarded.'),
      button(qItem.kind === 'build' ? 'Cancel construction' : 'Cancel upgrade', () => {
        ui.g.act((st) => A.cancelQueueItem(st, c.id, qItem.id), { sound: 'cancel' });
        if (qItem.kind === 'build') ui.close();
      })));
  }

  // operation
  if (built && b.type !== 'hq') {
    const sec = h('section.card', {}, h('h3', {}, 'Operation'));
    const usesPower = !!def.powerUse;
    if (usesPower || def.output) {
      sec.append(h('div.row', {},
        button(b.enabled ? 'Switch off' : 'Switch on', () => ui.g.act((st) => A.setEnabled(st, c.id, b.id, !b.enabled), { sound: 'click' }), { aria: b.enabled ? `Switch off ${def.name}` : `Switch on ${def.name}` })));
    }
    if (usesPower) {
      sec.append(h('fieldset.seg', {}, h('legend', {}, 'Power priority'),
        ['high', 'normal', 'low'].map((p) => h('label', {}, h('input', { type: 'radio', name: `prio-${b.id}`, value: p, checked: b.priority === p, onchange: () => ui.g.act((st) => A.setPriority(st, c.id, b.id, p)) }), h('span', {}, p[0].toUpperCase() + p.slice(1))))),
      h('p.muted.small', {}, 'When power runs short, higher priorities stay on first. By default Food comes first, then Fuel, Metal and Research.'));
    }
    sec.append(h('div.row', {},
      button('Move', () => ui.startPlacement(b.type, b.id)),
      button('Rotate', () => ui.g.act((st) => A.rotateBuilding(st, c.id, b.id))),
      button('Demolish…', () => demolishDialog(ui, c, b), { kind: 'danger-ghost' })));
    el.append(sec);
  }

  const update = () => {
    const st = statusOf(ui, b);
    status.className = `status ${st.tone}`;
    status.textContent = `${st.mark} ${st.text}`;
    const item = c.queue.find((q) => q.bid === b.id);
    if (item && c.queue[0] === item) {
      progWrap.hidden = false;
      prog.set(item.progress / item.duration);
      progWrap.lastChild.textContent = `${Math.floor((item.progress / item.duration) * 100)}%, done around ${clockAt((item.duration - item.progress) / ui.snap().speed)}`;
    } else progWrap.hidden = true;
    el.querySelectorAll('section').forEach((x) => x.update?.());
  };
  return { title: `${def.name}${built ? `, level ${b.level}` : ''}`, sub: c.name, el, update };
}

function jobName(ui, p) {
  if (p.assign?.kind === 'building') {
    const bb = ui.colony().buildings.find((x) => x.id === p.assign.bid);
    return bb ? BUILDINGS[bb.type].name : null;
  }
  if (p.assign?.kind === 'support') return 'construction support';
  return null;
}

function upgradeBenefit(ui, c, b, worker) {
  const def = BUILDINGS[b.type];
  const s = ui.state;
  if (b.type === 'hq') {
    const nx = HQ_UPGRADES[b.level + 1];
    return `Expands the colony to ${nx.plots} plots.`;
  }
  if (def.output) {
    const a = outputsFor(s, c, b, b.level, worker);
    const z = outputsFor(s, c, b, b.level + 1, worker);
    const parts = Object.keys(a).map((k) => `${RESOURCE_INFO[k].name} ${fmt(a[k], 1)} → ${fmt(z[k], 1)}/min`);
    if (def.input) for (const k in def.input) parts.push(`${RESOURCE_INFO[k].name} used ${fmt(def.input[k] * demandMult(b.level), 2)} → ${fmt(def.input[k] * demandMult(b.level + 1), 2)}/min`);
    if (def.powerUse) parts.push(`Power ${fmt(def.powerUse * demandMult(b.level), 2)} → ${fmt(def.powerUse * demandMult(b.level + 1), 2)}`);
    return parts.join('. ') + '.';
  }
  if (b.type === 'solar') return `Power ${fmt(6 * levelMult(b.level), 2)} → ${fmt(6 * levelMult(b.level + 1), 2)}.`;
  if (b.type === 'depot') return `Storage ×1.5: Metal ${fmt(400 * LEVEL_STORAGE ** (b.level - 1), 0)} → ${fmt(400 * LEVEL_STORAGE ** b.level, 0)}, and the same for Food, Fuel and samples.`;
  if (b.type === 'habitat') return `Homes ${4 + b.level - 1} → ${4 + b.level}.`;
  return '';
}

function hqSection(ui, c, sn) {
  const s = ui.state;
  const wrap = h('div');
  // relief
  const idle = sn.idle;
  wrap.append(h('section.card', {}, h('h3', {}, 'Relief work'),
    h('p.muted', {}, 'Anyone without a job helps here. It needs no power or materials, so the colony can always recover.'),
    h('fieldset.seg', {}, h('legend', {}, 'Relief workers'),
      ['metal', 'food'].map((m) => h('label', {}, h('input', { type: 'radio', name: 'relief', value: m, checked: c.reliefMode === m, onchange: () => ui.g.act((st) => A.setReliefMode(st, c.id, m), { sound: 'click' }) }),
        h('span', {}, m === 'metal' ? `Salvage ${RELIEF.metal} Metal/min each` : `Grow ${RELIEF.food} Food/min each`)))),
    h('p', {}, idle.length ? `${idle.map((p) => p.name).join(', ')} ${idle.length === 1 ? 'is' : 'are'} on relief work (${rate(sn.reliefRate)} ${RESOURCE_INFO[c.reliefMode].name}).` : 'Nobody is on relief work.')));
  // construction support
  const engs = sn.people.filter((p) => p.profession === 'engineer');
  const sup = sn.people.filter((p) => p.assign?.kind === 'support');
  const sec = h('section.card', {}, h('h3', {}, 'Construction support'),
    h('p.muted', {}, `Each supporting Engineer speeds construction by 10% (up to ${SUPPORT_MAX}). Current speed: ${Math.round(sn.speed * 100)}%.`));
  for (const p of sup) sec.append(h('div.person-row.compact', {}, h('span', { html: portrait(p, 32) }), h('span', {}, p.name), button('Release', () => ui.assign(p.id, null), { aria: `Release ${p.name} from construction support` })));
  const free = engs.filter((p) => p.assign?.kind !== 'support');
  if (sup.length < SUPPORT_MAX) {
    if (free.length) sec.append(h('label.field', {}, h('span', {}, 'Add an Engineer'), h('select.select', { onchange: (e) => e.target.value && ui.assign(e.target.value, { kind: 'support' }) },
      h('option', { value: '' }, 'Choose…'), free.map((p) => h('option', { value: p.id }, `${p.name}, Engineer L${skillLevel(p)}${jobName(ui, p) ? ` — leaves ${jobName(ui, p)}` : ''}`)))));
    else sec.append(h('p.blocker', {}, 'No free Engineers. Recruit one, or retrain a colonist.'));
  }
  wrap.append(sec);
  wrap.append(h('section.card', {}, h('h3', {}, 'Headquarters'),
    h('p', {}, `Homes for 2, supplies 2 Power, stores ${Object.entries(BUILDINGS.hq.storage).map(([k, v]) => `${v} ${RESOURCE_INFO[k]?.name || k}`).join(', ')}.`),
    h('p.muted', {}, `Colony size: ${c.grid * c.grid} plots.`)));
  return wrap;
}

function demolishDialog(ui, c, b) {
  const s = ui.state;
  const pv = A.demolishPreview(s, c.id, b.id);
  const def = BUILDINGS[b.type];
  const body = h('div', {},
    h('p', {}, `Demolishing returns ${pv.refund} Metal, half of what was invested.`),
    pv.effects.length ? h('ul', {}, pv.effects.map((e) => h('li', {}, e))) : null,
    pv.blockers.length ? h('div.blocker-box', {}, h('strong', {}, 'Not possible yet'), h('ul', {}, pv.blockers.map((x) => h('li', {}, x)))) : null,
    ...pv.overflow.filter((o) => o.discardable >= o.amount).map((o) => h('div.row', {},
      button(`Discard ${o.amount} ${RESOURCE_INFO[o.res].name} first`, () => {
        ui.confirm({ title: `Discard ${o.amount} ${RESOURCE_INFO[o.res].name}?`, body: 'The goods are lost for good.', ok: `Discard ${o.amount}`, danger: true, onOk: () => { ui.g.act((st) => A.discardGoods(st, c.id, o.res, o.amount)); demolishDialog(ui, c, b); } });
      }, { kind: 'danger-ghost' }))));
  ui.modal({
    title: `Demolish ${def.name}?`,
    el: h('div', {}, body, h('div.row.end', {}, button('Keep it', () => ui.closeModal()),
      pv.blockers.length ? null : button(`Demolish ${def.name}`, () => { ui.closeModal(); const r = ui.g.act((st) => A.demolish(st, c.id, b.id), { sound: 'cancel' }); if (r.ok) ui.close(); }, { kind: 'danger' }))),
  });
}

export function buildView(ui) {
  const s = ui.state;
  const c = ui.colony();
  const el = h('div.build-view');
  const used = c.queue.length;
  el.append(h('p.muted', {}, `Construction queue: ${used} of 5. One item builds at a time; costs are set aside when you place it.`));
  const list = h('div.build-list');
  for (const type of BUILD_ORDER) {
    const def = BUILDINGS[type];
    const block = A.buildBlocker(s, c, type);
    const count = c.buildings.filter((b) => b.type === type).length;
    const locked = !def.buildable || (def.requires && !s.research.done.includes(def.requires));
    const card = h(`div.build-card${locked ? '.locked' : ''}`, {},
      h('span.big-glyph', { html: glyph(type, locked ? 'var(--muted)' : 'var(--accent)', 34) }),
      h('div.build-info', {},
        h('h3', {}, def.name, count ? h('span.count', {}, ` ×${count}`) : null),
        h('p', {}, def.blurb),
        h('p.stats', {},
          def.output ? `${Object.entries(def.output).map(([k, v]) => `${v} ${RESOURCE_INFO[k].name}/min`).join(', ')}` : '',
          def.input ? ` from ${Object.entries(def.input).map(([k, v]) => `${v} ${RESOURCE_INFO[k].name}/min`).join(', ')}` : '',
          def.powerUse ? `${def.output ? ', ' : ''}uses ${def.powerUse} Power` : '',
          def.powerSupply ? `Supplies ${def.powerSupply} Power` : '',
          def.storage ? 'Adds storage' : '', def.housing ? `Homes for ${def.housing}` : ''),
        h('p.cost-line', {}, costList(def.cost, c, avail(c)), h('span.muted', {}, ` ${dur(def.time)}`)),
        actionButton(`Place ${def.name}`, block, () => ui.startPlacement(type), { kind: 'primary' })));
    list.append(card);
  }
  el.append(list);
  return { title: 'Build', sub: c.name, el };
}

export function queueStrip(ui) {
  const c = ui.colony();
  const el = ui.queueEl;
  if (!c.queue.length) { el.hidden = true; clear(el); el._key = ''; return; }
  el.hidden = false;
  const key = c.queue.map((q) => q.id).join('|');
  const sn = ui.snap();
  if (el._key !== key) {
    el._key = key;
    clear(el).append(h('span.queue-label', {}, 'Construction'), ...c.queue.map((q, i) => {
      const b = c.buildings.find((x) => x.id === q.bid);
      const name = BUILDINGS[q.type].name;
      return h(`div.q-item${i === 0 ? '.active' : ''}`, { dataset: { q: q.id } },
        h('button.q-main', { type: 'button', onclick: () => { ui.selectBuilding(q.bid); ui.g.diorama.focusBuilding(q.bid); }, 'aria-label': `${name} ${q.kind === 'build' ? 'construction' : `upgrade to level ${q.toLevel}`}` },
          h('span', { html: glyph(q.type, 'currentColor', 18) }),
          h('span.q-name', {}, q.kind === 'build' ? name : `${name} → L${q.toLevel}`),
          h('span.q-time', {})),
        progressBar(0, `${name} progress`),
        h('button.icon-btn.q-x', { type: 'button', 'aria-label': `Cancel ${name} and refund its costs`, title: 'Cancel (full refund)', onclick: () => ui.g.act((st) => A.cancelQueueItem(st, c.id, q.id), { sound: 'cancel' }) }, '✕'));
    }));
  }
  c.queue.forEach((q, i) => {
    const node = el.querySelector(`[data-q="${q.id}"]`);
    if (!node) return;
    node.querySelector('.bar').set(q.progress / q.duration);
    node.querySelector('.q-time').textContent = i === 0 ? dur((q.duration - q.progress) / sn.speed) : 'waiting';
  });
}

export { TECHS, exact };
