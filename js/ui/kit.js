// The desk kit: every note on the desk is built from these parts, so they all
// line up and anything new has a place to go. Sizes live in css/glasswood.css
// (--pad, --row, --head, --seal); see docs/ui/ for every part on its own.
//
//   card     a sheet of paper with three zones: head, content, foot
//   head     icon + title on the left, one small thing on the right (aside)
//   fact     icon + number (+ a word); facts sit in a two-column grid
//   meter    icon + bar + number, for anything that fills or drains
//   action   a wax seal with up to three facts beside it (cost, time, reason)
//   tokens   a row of small round choices (speed, later: stances)
//   toggle   an icon and a word that can be switched on
//   pieces   a row of identical things, some used (barricades, later: charges)
//   chips    short words (rewards, traits)
//   hint     one soft line of help at the foot of a card
//   tabs     the leather strip of views
//   stepper  − value +, for moving villagers between posts
//   portrait the slot for a trading card's picture (villagers, creatures)
import { h } from './dom.js';

const line = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON = {
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="9" fill="#7a5418"/><circle cx="12" cy="11" r="9" fill="#e0a93a" stroke="#7a5418" stroke-width="1.5"/><circle cx="12" cy="11" r="5.5" fill="none" stroke="#7a5418" stroke-width="1.2"/></svg>',
  barr: '<svg viewBox="0 0 46 30" aria-hidden="true"><rect x="3" y="11" width="40" height="9" rx="2" fill="#a07a4e" stroke="#23170f" stroke-width="1.5"/><path d="M9 4 L15 27 M31 4 L37 27" stroke="#5a3e22" stroke-width="4" stroke-linecap="round"/></svg>',
  moon: line('<path d="M16 3.5a8.5 8.5 0 1 0 4.5 13.8A7 7 0 0 1 16 3.5z"/>'),
  time: line('<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>'),
  dmg: line('<path d="M18.5 3.5h2v2L10.5 15.5l-2-2z"/><path d="M6.5 12.5l5 5M8 16l-4 4"/>'),
  reach: line('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  rate: line('<path d="M4 6.5 10.5 12 4 17.5zM12 6.5l6.5 5.5-6.5 5.5zM21 6.5v11"/>'),
  people: line('<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.6 2.4-6 5.5-6s5.5 2.4 5.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.3c2.8.3 4.5 2.4 4.5 5.7"/>'),
  wall: line('<path d="M3 20h18V8H3zM3 12h18M3 16h18M9 8v4M15 8v4M6 12v4M12 12v4M18 12v4M9 16v4M15 16v4"/>'),
  armor: line('<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/>'),
  cap: line('<path d="M12 20V6M6.5 11.5 12 6l5.5 5.5M5 3.5h14"/>'),
  build: line('<path d="M14.5 3.5 20.5 9.5 18 12 12 6zM13 7.5 4 16.5 7.5 20l9-9"/>'),
  paces: line('<ellipse cx="8" cy="8.5" rx="2.6" ry="4"/><ellipse cx="16" cy="15.5" rx="2.6" ry="4"/>'),
  repeat: line('<path d="M4.5 11a7.5 7.5 0 0 1 13.2-4.6M19 3.5v4h-4M19.5 13a7.5 7.5 0 0 1-13.2 4.6M5 20.5v-4h4"/>'),
  goal: line('<path d="M5.5 21V3.5M5.5 4h12l-3 4 3 4h-12"/>'),
  menu: line('<path d="M4 6.5h16M4 12h16M4 17.5h16"/>'),
  lock: line('<rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  gear: line('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  wilds: line('<circle cx="12" cy="10.5" r="7.5"/><path d="M5 12.5c4.5 2.5 9.5 2.5 14 0M7.5 21h9M10 18v3M14 18v3"/>'),
  watch: line('<circle cx="14" cy="10" r="6.5"/><path d="M9.3 14.7 3 21"/>'),
  hearth: line('<path d="M3.5 21V12l4.5-4.5L12.5 12v9M12.5 21V5.5h5.5V21M17.5 5.5l-2.6-3.3-2.4 3.3M2 21h20"/>'),
  place: line('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  danger: line('<path d="M12 3.5 21 19.5H3z"/><path d="M12 9.5v4.5M12 16.8v.2"/>'),
  timber: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="16" height="8" rx="4" fill="#8a5a32" stroke="#3a2410" stroke-width="1.4"/><ellipse cx="19" cy="12" rx="3" ry="4" fill="#d9b07a" stroke="#3a2410" stroke-width="1.4"/><circle cx="19" cy="12" r="1.2" fill="#8a5a32"/></svg>',
  stone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 7 9l6-3 6 4 1 7-8 3z" fill="#a39e95" stroke="#3a3530" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 9l5 4 7-3M12 13v7" fill="none" stroke="#6e6a62" stroke-width="1.2"/></svg>',
  next: line('<path d="M4 12h14M13 6l6 6-6 6"/>'),
  spark: line('<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>'),
  tower: line('<path d="M7 21V9l-2-3V3h3v2h2V3h4v2h2V3h3v3l-2 3v12zM10 21v-4a2 2 0 0 1 4 0v4M11 11h2"/>'),
  ember: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 4 6 5 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-5 1-8z" fill="#e8743a" stroke="#7a2e12" stroke-width="1.3"/><path d="M12 12c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 2-3 0 1 1 1 1 1 0-1 0-2 0-3z" fill="#ffd27a"/></svg>',
  card: line('<rect x="5" y="3.5" width="14" height="17" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8.5 17c.8-2 2-3 3.5-3s2.7 1 3.5 3"/>'),
};
export const creatureIcon = (id) => {
  const [w, hh] = id === 'wolf' ? [36, 22] : [28, 28];
  return `<svg viewBox="0 0 ${w} ${hh}" aria-hidden="true"><use href="#${id === 'goblin' ? 'gob' : id}" width="${w}" height="${hh}"/></svg>`;
};

const clean = (kids) => kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false);
// replaceChildren, skipping the parts left out
export const fill = (el, ...kids) => el.replaceChildren(...clean(kids));

// A torn edge for a sheet of paper, as a clip-path, the same every time for an id.
function worn(id) {
  let s = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
  const r = () => { s = (s * 16807) % 2147483647 || 1; return s / 2147483647; };
  const pts = [];
  const c = [[0, 0], [100, 0], [100, 100], [0, 100]];
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = c[i], [x1, y1] = c[(i + 1) % 4];
    for (let k = 0; k < 12; k++) {
      const t = k / 12, j = r() * 0.8;
      pts.push([x0 + (x1 - x0) * t + (y1 !== y0 ? (x0 === 0 ? j : -j) : 0), y0 + (y1 - y0) * t + (x1 !== x0 ? (y0 === 0 ? j : -j) : 0)]);
    }
  }
  return `polygon(${pts.map(([x, y]) => `${Math.min(100, Math.max(0, x)).toFixed(2)}% ${Math.min(100, Math.max(0, y)).toFixed(2)}%`).join(', ')})`;
}

export const icon = (name, cls = '') => h(`span.ic${cls ? `.${cls}` : ''}`, { html: ICON[name] || creatureIcon(name) });
const asIcon = (i) => (i instanceof Node ? i : icon(i));

// A card: one sheet with a head, a content area and a foot. Fill each zone with
// card.set({ head, content, foot }); a zone left out is hidden.
export function card(id, { tone = '', label } = {}) {
  const head = h('div.zone.head', { hidden: true });
  const content = h('div.zone.content', { hidden: true });
  const foot = h('div.zone.foot', { hidden: true });
  const sheet = h('div.sheet', { style: { clipPath: worn(id) } }, h('div.body', {}, head, content, foot));
  const root = h(`section.card${tone ? `.${tone}` : ''}`, { 'aria-label': label || null, 'data-card': id }, sheet);
  const set = ({ head: hd, content: ct, foot: ft } = {}) => {
    fill(head, hd); fill(content, ct); fill(foot, ft);
    head.hidden = !head.childNodes.length; content.hidden = !content.childNodes.length; foot.hidden = !foot.childNodes.length;
  };
  return { root, head, content, foot, set };
}

// head: icon and title on the left, one small thing on the right
export const head = (ic, title, aside, attrs = {}) => h('div.head-row', attrs, ic ? asIcon(ic) : null, h('span.title', {}, title), aside ? h('span.aside', {}, aside) : null);

// fact: icon + number, and a small label under the number. In a `facts` grid
// they line up in two columns.
export const fact = (ic, value, title, label, cls = '') => label
  ? h(`span.fact.labelled${cls ? `.${cls}` : ''}`, { title }, asIcon(ic), h('span.v', {}, h('b', {}, value), h('span.lbl', {}, label)))
  : h(`span.fact${cls ? `.${cls}` : ''}`, { title }, asIcon(ic), h('b', {}, value));
export const facts = (...items) => h('div.facts', {}, clean(items));

// meter: icon, label, bar and number. Returns the element and a setter.
export function meter(ic, title, tone = '', label = '') {
  const bar = h('span'); const num = h('b');
  const el = h('div.meter', { title }, asIcon(ic), h('span.lbl', {}, label), h(`span.bar${tone ? `.${tone}` : ''}`, {}, bar), num);
  return { el, set: (f, value, low = false) => { bar.style.width = `${(Math.max(0, Math.min(1, f)) * 100).toFixed(1)}%`; num.textContent = value; bar.parentElement.classList.toggle('low', low); } };
}

// seal: the main action of a card
export const seal = (label, onClick, { cls = '', ...attrs } = {}) => h(`div.seal${cls ? `.${cls}` : ''}`, {}, h('button', { type: 'button', onclick: onClick, ...attrs }, h('span', {}, label)));
// slip: a lesser action
export const slip = (label, onClick, attrs = {}) => h('div.slip', {}, h('button', { type: 'button', onclick: onClick, ...attrs }, label));
// action: a seal, and the facts that go with it stacked beside it
export const action = (sealEl, ...side) => h('div.action', {}, sealEl, h('div.side', {}, clean(side)));

// tokens: small round choices, one pressed
export function tokens(items, current, onPick) {
  return h('div.tokens', {}, items.map(({ value, label, title }) => h('button.token', { type: 'button', title, 'aria-pressed': String(value === current), onclick: () => onPick(value) }, label)));
}
// toggle: an icon and a word that can be switched on
export const toggle = (ic, word, checked, onChange, title) => h('label.toggle', { title }, h('input', { type: 'checkbox', checked: checked || null, onchange: (e) => onChange(e.target.checked) }), asIcon(ic), h('span.word', {}, word));
// pieces: a row of the same thing, the first `left` of `total` still unused
export const pieces = (svg, left, total, title) => h('div.pieces', { title }, Array.from({ length: total }, (_, i) => h(`span${i < left ? '' : '.used'}`, { html: svg })));
export const chips = (words) => h('div.chips', {}, words.map((w) => h('span.chip', {}, w)));
// A short numbered list of what to do next: done steps are struck, the current one is marked.
export const steps = (items) => h('ol.steps', {}, items.filter(Boolean).map((it, i) => h(`li${it.done ? '.done' : ''}${it.now ? '.now' : ''}${it.onclick ? '.link' : ''}`, { title: it.title || null, onclick: it.onclick || null }, h('b.n', {}, it.done ? '✓' : String(i + 1)), h('span', {}, it.text))));
export const hint = (text, tone = 'soft', title) => h(`span.hint.${tone}`, { title }, text);
export const badge = (value, title) => h('span.badge', { title }, value);
export const pips = (n, of = 5, title) => h('span.pips', { title }, h('b.red', {}, '◆'.repeat(n)), h('span.dim', {}, '◆'.repeat(of - n)));

// stepper: − and + around a value, for moving villagers between posts
export const stepper = (value, onMinus, onPlus, title, { canMinus = true, canPlus = true, label = '' } = {}) => h('span.stepper', { title },
  h('button.step', { type: 'button', 'aria-label': 'One fewer', disabled: !canMinus || null, onclick: onMinus }, '−'), h('span.v', {}, h('b', {}, value), label ? h('span.lbl', {}, label) : null),
  h('button.step', { type: 'button', 'aria-label': 'One more', disabled: !canPlus || null, onclick: onPlus }, '+'));

// tabs: the leather strip of views
export function tabs(items, onPick) {
  const btns = {};
  const el = h('nav.tabs', { 'aria-label': 'Views' }, items.map(({ id, label, title }) => (btns[id] = h('button.tab', { type: 'button', 'aria-current': 'false', title, onclick: () => onPick(id) }, icon(id), h('span', {}, label)))));
  return { el, select: (id) => { for (const [k, b] of Object.entries(btns)) b.setAttribute('aria-current', String(k === id)); } };
}

// portrait: the picture slot of a trading card (villagers and creatures, later)
export const portrait = (src, alt) => h('div.portrait', {}, src ? h('img', { src, alt, loading: 'lazy' }) : icon('card'));

// The two columns are made of named slots, always in the same order, so a card
// added later lands in a known place and nothing else moves.
//   left:  village, views, goal, hand (cards and resources, later), tools (bottom)
//   right: time (the night), focus (what you selected), detail (a second card, later)
export const SLOTS = { left: ['village', 'views', 'goal', 'hand', 'tools'], right: ['time', 'focus', 'detail'] };
export function slots(colEl, names) {
  const out = {};
  for (const n of names) colEl.append(out[n] = h(`div.slot.${n}`, { 'data-slot': n }));
  return out;
}
