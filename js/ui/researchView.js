import { h, fmt, dur, progressBar, button, actionButton } from './dom.js';
import { TECHS, TECH_ORDER, RESEARCH_QUEUE_MAX } from '../data/techs.js';
import { techBlocker, techState, remaining, setActiveTech, queueTech, unqueueTech, pauseResearch } from '../sim/research.js';
import { computeColony } from '../sim/economy.js';

function researchRate(s) {
  return s.colonies.reduce((a, c) => a + computeColony(s, c).research, 0);
}

export function researchView(ui) {
  const s = ui.state;
  const r = s.research;
  const el = h('div.research-view');
  const rateNow = researchRate(s);
  const bankLine = h('p.lead');
  el.append(bankLine);

  // active project
  const activeBar = progressBar(0, 'Research progress');
  const activeText = h('p.muted');
  if (r.active) {
    const t = TECHS[r.active];
    el.append(h('section.card.active-tech', {}, h('h3', {}, `Studying ${t.name}`), h('p', {}, t.result), activeBar, activeText,
      h('div.row', {}, button('Pause research', () => ui.g.act((st) => pauseResearch(st), { sound: 'click' }), { aria: 'Pause research. Progress is kept.' }))));
  } else {
    el.append(h('section.card', {}, h('h3', {}, 'No active project'),
      h('p.muted', {}, rateNow > 0 ? 'Laboratory output is saved in the Research bank until you choose a project.' : 'Build a Laboratory to start earning Research.')));
  }

  if (r.queue.length) {
    el.append(h('section.card', {}, h('h3', {}, `Up next (${r.queue.length} of ${RESEARCH_QUEUE_MAX})`),
      h('ol.queue-list', {}, r.queue.map((id) => h('li', {}, h('span', {}, TECHS[id].name), h('span.muted', {}, ` ${fmt(remaining(s, id), 0)} Research`),
        button('Remove', () => ui.g.act((st) => unqueueTech(st, id)), { aria: `Remove ${TECHS[id].name} from the queue` }))))));
  }

  const groups = { available: [], done: [], later: [] };
  for (const id of TECH_ORDER) {
    const t = TECHS[id];
    const st = techState(s, id);
    if (st === 'done') groups.done.push(id);
    else if (!t.live) groups.later.push(id);
    else groups.available.push(id);
  }

  const techCard = (id) => {
    const t = TECHS[id];
    const st = techState(s, id);
    const prog = r.progress[id] || 0;
    const left = remaining(s, id);
    const eta = rateNow > 0 ? dur((Math.max(0, left - r.bank) / rateNow) * 60) : null;
    const pre = t.pre.length ? `Requires ${t.pre.map((p) => TECHS[p].name).join(', ')}.` : 'No prerequisites.';
    const actions = [];
    if (st === 'idle') {
      const block = techBlocker(s, id);
      actions.push(actionButton(r.active ? 'Study now' : 'Start research', block, () => ui.g.act((st2) => setActiveTech(st2, id, ui.g.events()), { sound: 'click' }), { kind: 'primary' }));
      if (r.active && !block) {
        const qb = r.queue.length >= RESEARCH_QUEUE_MAX ? `The queue holds ${RESEARCH_QUEUE_MAX}.` : techBlocker(s, id, { forQueue: true });
        actions.push(actionButton('Add to queue', qb, () => ui.g.act((st2) => queueTech(st2, id), { sound: 'click' })));
      }
    }
    return h(`article.tech.${st}${t.live ? '' : '.later'}`, {},
      h('div.tech-head', {}, h('h3', {}, t.name), h('span.tech-cost', {}, st === 'done' ? 'Researched' : `${fmt(t.cost, 0)} Research`)),
      h('p', {}, t.result),
      st !== 'done' ? h('p.muted.small', {}, pre, prog > 0 ? ` ${fmt(prog, 0)} already invested.` : '', t.live && eta && st !== 'done' ? ` About ${eta} at the current rate.` : '') : null,
      !t.live && st !== 'done' ? h('p.blocker', {}, `Its capabilities arrive in ${t.future}.`) : null,
      actions.length ? h('div.row', {}, actions) : null);
  };

  el.append(h('h3.section-title', {}, 'Available'), h('div.tech-list', {}, groups.available.length ? groups.available.map(techCard) : h('p.muted', {}, 'Everything available has been researched. New technologies arrive in coming updates; Research keeps banking meanwhile.')));
  if (groups.done.length) el.append(h('details.tech-group', {}, h('summary', {}, `Researched (${groups.done.length})`), h('div.tech-list', {}, groups.done.map(techCard))));
  el.append(h('details.tech-group', {}, h('summary', {}, `Later in the journey (${groups.later.length})`), h('p.muted.small', {}, 'These appear in the full plan. They unlock as surveys, ships, other worlds and neighbours arrive.'), h('div.tech-list', {}, groups.later.map(techCard))));

  const update = () => {
    const rt = researchRate(s);
    bankLine.textContent = `Research bank: ${fmt(r.bank, 0)}. Laboratories produce ${fmt(rt, 1)} a minute. Lifetime: ${fmt(s.stats.lifetimeResearch, 0)}.`;
    if (r.active) {
      const t = TECHS[r.active];
      const p = r.progress[r.active] || 0;
      activeBar.set(p / t.cost);
      activeText.textContent = `${fmt(p, 0)} of ${fmt(t.cost, 0)}. ${rt > 0 ? `About ${dur(((t.cost - p) / rt) * 60)} left.` : 'No laboratory is producing right now.'}`;
    }
  };
  return { title: 'Research', sub: 'Shared across the civilization', el, update };
}
