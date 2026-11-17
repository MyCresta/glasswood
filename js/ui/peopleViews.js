import { h, clear, fmt, dur, progressBar, button, actionButton, costList } from './dom.js';
import { portrait } from './art.js';
import { BUILDINGS, RESOURCE_INFO } from '../data/buildings.js';
import { PROFESSIONS, PROFESSION_ORDER, TRAITS } from '../data/people.js';
import { RETRAIN_COST } from '../data/techs.js';
import { available, skillLevel, wellbeing, RECRUIT_COST, POP_LIMIT, SUPPORT_MAX } from '../sim/economy.js';
import * as A from '../sim/actions.js';

let sortKey = 'name';

function jobLabel(ui, p) {
  if (p.assign?.kind === 'building') {
    const b = ui.colony().buildings.find((x) => x.id === p.assign.bid);
    return b ? BUILDINGS[b.type].name : 'Relief work';
  }
  if (p.assign?.kind === 'support') return 'Construction support';
  return `Relief work (${ui.colony().reliefMode === 'food' ? 'growing Food' : 'salvaging Metal'})`;
}

function availabilityRank(p) {
  if (!p.assign) return 0;
  if (p.assign.kind === 'support') return 1;
  return 2;
}

// Options for "where should this person work?"
function jobOptions(ui, p) {
  const c = ui.colony();
  const sn = ui.snap();
  const opts = [h('option', { value: 'relief', selected: !p.assign }, 'Relief work at headquarters')];
  if (p.profession === 'engineer') {
    const n = sn.people.filter((x) => x.assign?.kind === 'support' && x.id !== p.id).length;
    opts.push(h('option', { value: 'support', selected: p.assign?.kind === 'support', disabled: n >= SUPPORT_MAX && p.assign?.kind !== 'support' }, `Construction support${n >= SUPPORT_MAX && p.assign?.kind !== 'support' ? ' (full)' : ''}`));
  }
  for (const b of c.buildings) {
    if (!BUILDINGS[b.type].staffed || b.level < 1) continue;
    const w = sn.workerOf[b.id];
    const mine = p.assign?.bid === b.id;
    const match = PROFESSIONS[p.profession].building === b.type;
    opts.push(h('option', { value: b.id, selected: mine }, `${BUILDINGS[b.type].name} L${b.level}${match ? ' (matching)' : ''}${w && !mine ? ` — replaces ${w.name}` : ''}`));
  }
  return opts;
}

function onJobChange(ui, p, v) {
  if (v === 'relief') ui.assign(p.id, null);
  else if (v === 'support') ui.assign(p.id, { kind: 'support' });
  else ui.assign(p.id, { kind: 'building', bid: v });
}

export function colonistsView(ui, tab = 'roster') {
  const c = ui.colony();
  const sn = ui.snap();
  const el = h('div.people-view');
  const tabs = h('div.tabs', { role: 'tablist' },
    ['roster', 'recruit'].map((t) => h('button.tab', { type: 'button', role: 'tab', 'aria-selected': String(tab === t), onclick: () => ui.open('colonists', t) }, t === 'roster' ? `Roster (${sn.people.length})` : 'Recruit')));
  el.append(tabs);
  let update = null;
  if (tab === 'recruit') update = recruitPanel(ui, c, el);
  else rosterPanel(ui, c, sn, el);
  return { title: 'Colonists', sub: `${c.name}: ${sn.people.length} of ${Math.min(sn.housing, POP_LIMIT)} homes filled`, el, update };
}

function rosterPanel(ui, c, sn, el) {
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name),
    profession: (a, b) => PROFESSION_ORDER.indexOf(a.profession) - PROFESSION_ORDER.indexOf(b.profession) || a.name.localeCompare(b.name),
    level: (a, b) => skillLevel(b) - skillLevel(a) || a.name.localeCompare(b.name),
    availability: (a, b) => availabilityRank(a) - availabilityRank(b) || a.name.localeCompare(b.name),
  };
  el.append(h('div.row.between', {},
    h('label.field.inline', {}, h('span', {}, 'Sort by'), h('select.select', { onchange: (e) => { sortKey = e.target.value; ui.renderPanel(false); } },
      Object.keys(sorters).map((k) => h('option', { value: k, selected: sortKey === k }, k[0].toUpperCase() + k.slice(1))))),
    h('p.muted.small.desktop-only', {}, 'Tip: drag a colonist onto a building in the scene.')));
  const list = h('ul.roster');
  for (const p of [...sn.people].sort(sorters[sortKey])) {
    const sk = p.skills[p.profession];
    const wb = wellbeing(c, p, ui.state.time);
    const li = h('li.person', { draggable: 'true', ondragstart: (e) => { e.dataTransfer.setData('text/colonist', p.id); e.dataTransfer.effectAllowed = 'move'; } },
      h('button.person-main', { type: 'button', onclick: () => ui.open('colonist', p.id), 'aria-label': `Open ${p.name}` },
        h('span', { html: portrait(p, 48) }),
        h('span.person-text', {},
          h('strong', {}, p.name),
          h('span.muted', {}, `${PROFESSIONS[p.profession].name}, level ${sk.level}`),
          h('span.traits', {}, p.traits.map((t) => h('span.chip', { title: TRAITS[t].effect }, TRAITS[t].name))),
          wb !== 'comfortable' ? h('span.chip.warn', {}, wb) : null)),
      h('label.field.job', {}, h('span.sr', {}, `Job for ${p.name}`),
        h('select.select', { onchange: (e) => onJobChange(ui, p, e.target.value) }, jobOptions(ui, p))));
    list.append(li);
  }
  el.append(list);
}

function recruitPanel(ui, c, el) {
  const s = ui.state;
  const r = c.recruit;
  const block = A.recruitBlocker(s, c);
  const activeBox = h('div');
  el.append(h('p.muted', {}, `A new colonist costs 50 Metal and 20 Food and takes ${dur(A.recruitDuration(s))} to arrive. One at a time. Cancelling refunds everything.`));
  el.append(activeBox);
  const bar = progressBar(0, 'Recruit arrival');
  const statusEl = h('p.muted');
  if (r.active) {
    const cand = r.active.candidate;
    activeBox.append(h('section.card', {}, h('h3', {}, 'On the way'),
      h('div.person-row', {}, h('span', { html: portrait(cand, 44) }), h('div', {}, h('strong', {}, cand.name), h('p.muted', {}, PROFESSIONS[cand.profession].name))),
      bar, statusEl,
      button('Cancel recruitment', () => ui.g.act((st) => A.cancelRecruit(st, c.id), { sound: 'cancel' }))));
  }
  const cards = h('div.candidates');
  for (const cand of r.candidates) {
    cards.append(h('article.candidate', {},
      h('div.person-row', {}, h('span', { html: portrait(cand, 52) }), h('div', {}, h('h3', {}, cand.name), h('p', {}, PROFESSIONS[cand.profession].name, h('span.muted', {}, `, ${PROFESSIONS[cand.profession].strength.toLowerCase()}`)))),
      h('ul.trait-list', {}, cand.traits.map((t) => h('li', {}, h('strong', {}, TRAITS[t].name), ` ${TRAITS[t].effect}`, TRAITS[t].live ? null : h('span.muted', {}, ' Matters once missions arrive.')))),
      actionButton(`Recruit ${cand.name.split(' ')[0]}`, block, () => ui.g.act((st) => A.startRecruit(st, c.id, cand.id), { sound: 'recruit' }), { kind: 'primary' })));
  }
  if (!r.candidates.length) cards.append(h('p.muted', {}, 'No candidates right now. A new list arrives with the next transmission.'));
  el.append(h('h3.section-title', {}, 'Candidates'), cards);
  const refreshWrap = h('div.row');
  el.append(refreshWrap);
  el.append(h('p.cost-line', {}, 'Recruiting costs ', costList(RECRUIT_COST, c, (k) => available(c, k))));
  return () => {
    if (r.active) {
      bar.set(r.active.progress / r.active.duration);
      const left = r.active.duration - r.active.progress;
      statusEl.textContent = r.active.status === 'waiting for housing' ? 'Arrived and waiting: there is no free home. Build or upgrade a Habitat.' : r.active.status.startsWith('paused') ? 'Paused while the colony is short of Food.' : `Arrives in ${dur(left)}.`;
    }
    const wait = r.refreshAt - s.time;
    clear(refreshWrap).append(wait > 0
      ? h('p.muted', {}, `A fresh list of candidates can be requested in ${dur(wait)}.`)
      : button('Request new candidates (free)', () => ui.g.act((st) => A.refreshRecruits(st, c.id), { sound: 'click' })));
  };
}

export function colonistDetail(ui, id) {
  const s = ui.state;
  const p = s.colonists[id];
  if (!p) return null;
  const c = ui.colony();
  const el = h('div.colonist-view');
  const wb = wellbeing(c, p, s.time);
  el.append(h('div.bv-head', {}, h('span', { html: portrait(p, 84) }),
    h('div', {},
      h('p.lead', {}, `${PROFESSIONS[p.profession].name}, level ${skillLevel(p)}. ${wb === 'comfortable' ? 'Comfortable.' : `Currently ${wb}: their worker bonus is halved.`}`),
      h('p.muted', {}, `Lives in ${c.name}. Works on ${jobLabel(ui, p).toLowerCase()}.`),
      h('div.row', {},
        button('Rename', () => ui.prompt({ title: 'Rename colonist', label: 'Name', value: p.name, onOk: (v) => ui.g.act((st) => A.rename(st, 'colonist', p.id, v)) })),
        button(ui.g.diorama.followId === p.id ? 'Stop following' : 'Follow in scene', () => {
          ui.g.diorama.follow(ui.g.diorama.followId === p.id ? null : p.id);
          if (window.matchMedia('(max-width: 720px)').matches) ui.close(); else ui.renderPanel(false);
        })))));

  el.append(h('section.card', {}, h('h3', {}, 'Job'),
    h('label.field', {}, h('span', {}, 'Works at'), h('select.select', { onchange: (e) => onJobChange(ui, p, e.target.value) }, jobOptions(ui, p)))));

  el.append(h('section.card', {}, h('h3', {}, 'Personality'),
    h('ul.trait-list', {}, p.traits.map((t) => h('li', {}, h('strong', {}, TRAITS[t].name), ` ${TRAITS[t].effect} `, h('em.muted', {}, TRAITS[t].line))))));

  const skills = h('div.skills');
  for (const k of PROFESSION_ORDER) {
    const sk = p.skills[k];
    const need = 20 * sk.level;
    const bar = progressBar(sk.level >= 20 ? 1 : sk.xp / need, `${PROFESSIONS[k].name} experience`);
    skills.append(h(`div.skill${k === p.profession ? '.current' : ''}`, {},
      h('span', {}, PROFESSIONS[k].name, k === p.profession ? ' (current)' : ''),
      h('span.muted', {}, `L${sk.level}`), bar,
      h('span.muted.small', {}, sk.level >= 20 ? 'Mastered' : `${Math.floor(sk.xp)} / ${need}`)));
  }
  el.append(h('section.card', {}, h('h3', {}, 'Experience'),
    h('p.muted.small', {}, 'Useful work earns 4 experience a minute. Each level needs 20 × the current level.'), skills));

  const retrainSel = h('select.select', { 'aria-label': 'New profession' }, PROFESSION_ORDER.filter((k) => k !== p.profession).map((k) => h('option', { value: k }, `${PROFESSIONS[k].name} (level ${p.skills[k].level})`)));
  const doRetrain = () => {
    const prof = retrainSel.value;
    const block = A.retrainBlocker(s, p, prof);
    if (block) { ui.toast('attention', block); return; }
    ui.confirm({ title: `Retrain ${p.name}?`, body: `${p.name} becomes a ${PROFESSIONS[prof].name}. This costs ${RETRAIN_COST} Research from the bank. Experience in each profession is kept.`, ok: `Retrain for ${RETRAIN_COST} Research`, onOk: () => ui.g.act((st) => A.retrain(st, p.id, prof), { sound: 'done' }) });
  };
  el.append(h('section.card', {}, h('h3', {}, 'Retrain'),
    h('p.muted', {}, `Switching profession costs ${RETRAIN_COST} banked Research. Each profession keeps its own level. Bank: ${fmt(s.research.bank, 0)}.`),
    h('div.row', {}, retrainSel, button('Retrain…', doRetrain))));

  el.append(h('section.card', {}, h('h3', {}, 'Recent achievements'),
    p.achievements.length ? h('ul', {}, p.achievements.slice(-6).reverse().map((a) => h('li', {}, a.text))) : h('p.muted', {}, p.joinedAt ? `Joined ${dur(s.time - p.joinedAt)} of colony time ago. Milestones such as profession levels 5, 10 and 20 appear here.` : 'A founding member of the colony. Milestones such as profession levels 5, 10 and 20 appear here.')));

  return { title: p.name, sub: 'Colonist', el };
}

export { RESOURCE_INFO };
