// Early objectives double as the introduction. Each checks the current state,
// so progress made before an objective appears still counts. Rewards help but
// are never needed to avoid a blocked game.
import { capacities } from './economy.js';

const anyBuilt = (s, type, lvl = 1) => s.colonies.some((c) => c.buildings.some((b) => b.type === type && b.level >= lvl));

export const OBJECTIVES = [
  { id: 'select', title: 'Look around your colony', guide: 'Select any building, either in the scene or with Tab and Enter, to see what it does.', check: (s) => s.objectives.flags.selected },
  { id: 'rates', title: 'Read net production', guide: 'Open a resource in the top bar to see production, consumption and the time until it fills or runs out.', check: (s) => s.objectives.flags.rates },
  { id: 'assign', title: 'Put a colonist to work', guide: 'Open Colonists and give the Scientist a job, or pick a worker from a building’s panel. Staffed buildings produce 50% more.', check: (s) => Object.values(s.colonists).filter((c) => c.assign?.kind === 'building').length >= 2, reward: { metal: 30 } },
  { id: 'lab', title: 'Build a Laboratory', guide: 'Use Build, choose Laboratory and pick an empty plot. Laboratories produce Research.', check: (s) => anyBuilt(s, 'lab'), reward: { metal: 40 } },
  { id: 'research', title: 'Choose a research project', guide: 'Open Research and start Fuel Refining or another available technology.', check: (s) => !!s.research.active || s.research.done.length > 0, reward: { food: 30 } },
  { id: 'upgrade', title: 'Upgrade a building', guide: 'Select a building and choose Upgrade. Higher levels produce 25% more each.', check: (s) => s.colonies.some((c) => c.buildings.some((b) => b.type !== 'hq' && b.level >= 2)), reward: { metal: 60 } },
  { id: 'recruit', title: 'Welcome a new colonist', guide: 'Open Colonists → Recruit and choose one of three candidates.', check: (s) => Object.keys(s.colonists).length >= 4, reward: { food: 40 } },
  { id: 'fuel', title: 'Refine your first Fuel', guide: 'Research Fuel Refining, then build a Fuel Refinery. Ships will need it soon.', check: (s) => anyBuilt(s, 'refinery'), reward: { metal: 80 } },
  { id: 'survey', title: 'Launch the first survey', guide: 'Surveys arrive with the System Map in the next update. Your colony will keep growing until then.', check: () => false, future: true },
];

export function checkObjectives(state, ev) {
  const home = state.colonies[0];
  for (const o of OBJECTIVES) {
    if (o.future || state.objectives.claimed.includes(o.id)) continue;
    if (!o.check(state)) continue;
    state.objectives.claimed.push(o.id);
    if (o.reward && home) {
      const cap = capacities(home);
      const got = [];
      for (const k in o.reward) {
        const add = Math.min(o.reward[k], Math.max(0, cap[k] - home.inv[k]));
        home.inv[k] += add;
        got.push(`${Math.floor(add)} ${k[0].toUpperCase()}${k.slice(1)}`);
      }
      ev?.emit('done', `Objective complete: ${o.title}. Reward: ${got.join(', ')}.`, { cat: 'objective' });
    } else ev?.emit('info', `Objective complete: ${o.title}.`, { cat: 'objective' });
    if (ev) ev.changed = true;
  }
}
