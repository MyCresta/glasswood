// Interface controller: HUD, the night card, panels, toasts, modals, keys.
import { h, clear, fmt, dur, button, progressBar } from './dom.js';
import { emblem } from './art.js';
import { BUILDINGS, ENEMIES, SPAWNS, wallStats } from '../data/village.js';
import { availableGold } from '../sim/state.js';
import { nightPreview } from '../sim/battle.js';
import { cancelUpgrade, OBJECTIVES } from '../sim/village.js';
import { callNight } from '../sim/time.js';
import { buildingView, spawnView, villageView, logView, settingsView, helpView, locationView } from './views.js';

const VIEW_TABS = [
  { id: 'village', label: 'Village', key: '1' },
  { id: 'defense', label: 'Defence', key: '2' },
  { id: 'world', label: 'World', key: '3' },
];

const NAV = [
  { id: 'village', label: 'Overview', key: 'B', icon: '⌂' },
  { id: 'log', label: 'Log', key: 'L', icon: '☰' },
  { id: 'settings', label: 'Settings', key: 'O', icon: '⚙' },
  { id: 'help', label: 'Help', key: '?', icon: '?' },
];

export class UI {
  constructor(game) {
    this.g = game;
    this.view = null;
    this.arg = null;
    this.current = null;
    this.rev = -1;
    this.toastGroups = new Map();
    this.buildShell();
    this.bindKeys();
  }

  get state() { return this.g.state; }

  // ---------- shell ----------

  buildShell() {
    const top = document.getElementById('topbar');
    this.civBtn = h('button.civ', { type: 'button', onclick: () => this.open('settings'), 'aria-label': 'Village banner and settings' });
    this.goldEl = h('button.res', { type: 'button', onclick: () => this.open('village'), 'aria-label': 'Gold' },
      h('span.res-icon', { style: { color: '#f2c94c' }, 'aria-hidden': 'true' }, '●'), h('span.res-main', {}), h('span.res-sub', {}), h('span.res-net', {}));
    this.nightEl = h('button.res.night-chip', { type: 'button', onclick: () => this.open('village') },
      h('span.res-icon', { 'aria-hidden': 'true' }, '☾'), h('span.res-main', {}), h('span.res-sub', {}), h('span.res-net', {}));
    this.saveInd = h('button.save-ind', { type: 'button', onclick: () => this.g.saveNow(true), title: 'Save now' }, 'Saved');
    this.pauseBtn = h('button.pause', { type: 'button', onclick: () => this.togglePause(), 'aria-pressed': 'false' });
    this.cleanBtn = h('button.icon-btn', { type: 'button', onclick: () => this.setClean(true), 'aria-label': 'Hide interface (H)', title: 'Hide interface (H)', html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>' });
    this.viewTabs = h('div.view-tabs', { role: 'tablist', 'aria-label': 'Views' }, VIEW_TABS.map((t) => h('button.view-tab', { type: 'button', role: 'tab', dataset: { v: t.id }, title: `${t.label} view (${t.key})`, onclick: () => this.g.setView(t.id) }, h('span.vt-key', { 'aria-hidden': 'true' }, t.key), t.label)));
    clear(top).append(this.civBtn, h('div.resources', { role: 'group', 'aria-label': 'Village status' }, this.goldEl, this.nightEl), this.viewTabs, h('div.top-actions', {}, this.saveInd, this.cleanBtn, this.pauseBtn));

    this.nav = document.getElementById('nav');
    clear(this.nav).append(...NAV.map((n) => h('button.nav-btn', {
      type: 'button', dataset: { view: n.id }, onclick: () => this.toggle(n.id), title: `${n.label} (${n.key})`,
    }, h('span.nav-icon', { 'aria-hidden': 'true' }, n.icon), h('span.nav-label', {}, n.label))));

    this.panel = document.getElementById('panel');
    this.queueEl = document.getElementById('queue');
    this.nightCard = document.getElementById('night-card');
    this.toasts = document.getElementById('toasts');
    this.modalRoot = document.getElementById('modal-root');
    this.guideEl = document.getElementById('guide');
    this.showUiBtn = document.getElementById('show-ui');
    this.showUiBtn.onclick = () => this.setClean(false);

    const cam = document.getElementById('cam');
    const D = this.g.diorama;
    const cb = (label, aria, fn) => h('button.cam-btn', { type: 'button', 'aria-label': aria, title: aria, onclick: fn }, label);
    clear(cam).append(h('div.cam-grid', {},
      cb('↺', 'Rotate left (Q)', () => D.rotateBy(-0.35)), cb('▲', 'Move camera forward (W)', () => D.panBy(0, 2)), cb('↻', 'Rotate right (E)', () => D.rotateBy(0.35)),
      cb('◀', 'Move camera left (A)', () => D.panBy(-2, 0)), cb('⌖', 'Return to the default view (Home)', () => D.resetCamera()), cb('▶', 'Move camera right (D)', () => D.panBy(2, 0)),
      cb('＋', 'Zoom in (+)', () => D.zoomBy(0.8)), cb('▼', 'Move camera back (S)', () => D.panBy(0, -2)), cb('－', 'Zoom out (−)', () => D.zoomBy(1.25))));
    const camToggle = document.getElementById('cam-toggle');
    camToggle.onclick = () => { const on = cam.classList.toggle('open'); camToggle.setAttribute('aria-expanded', on); };
  }

  markView(name) {
    this.viewTabs.querySelectorAll('.view-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.v === name)));
    document.body.dataset.view = name;
  }

  setClean(on) {
    document.body.classList.toggle('clean', on);
    if (on) this.showUiBtn.focus();
  }

  togglePause() {
    this.g.act((s) => { s.paused = !s.paused; return { ok: true }; }, { sound: 'click' });
    this.toast('info', this.state.paused ? 'Paused. Nothing moves until you resume.' : 'Resumed.', { force: true });
  }

  // ---------- panels ----------

  toggle(view) {
    if (this.view === view && !this.arg) return this.close();
    this.open(view);
  }

  open(view, arg = null) {
    this.view = view;
    this.arg = arg;
    if (!['building', 'spawn', 'location'].includes(view)) this.g.diorama.select(null);
    this.renderPanel(true);
    this.nav.querySelectorAll('.nav-btn').forEach((b) => b.setAttribute('aria-current', String(b.dataset.view === view)));
    this.g.audio.play('click');
  }

  close() {
    this.view = null;
    this.arg = null;
    this.g.diorama.select(null);
    this.renderPanel(true);
    this.nav.querySelectorAll('.nav-btn').forEach((b) => b.setAttribute('aria-current', 'false'));
  }

  select(id) {
    if (!id) { if (['building', 'spawn', 'location'].includes(this.view)) this.close(); return; }
    this.state.objectives.flags.selected = true;
    if (id.startsWith('spawn:') && this.g.diorama.active !== 'defense') this.g.setView('defense');
    if (id.startsWith('loc:') && this.g.diorama.active !== 'world') this.g.setView('world');
    this.g.diorama.select(id);
    if (id.startsWith('spawn:')) { this.view = 'spawn'; this.arg = id.slice(6); } else if (id.startsWith('loc:')) { this.view = 'location'; this.arg = id.slice(4); } else { this.view = 'building'; this.arg = id; }
    this.renderPanel(true);
    this.g.audio.play('click');
  }

  renderPanel(force = false) {
    const p = this.panel;
    const keep = p.querySelector('.panel-body')?.scrollTop || 0;
    let v = null;
    switch (this.view) {
      case 'building': v = buildingView(this, this.arg); break;
      case 'spawn': v = spawnView(this, this.arg); break;
      case 'location': v = locationView(this, this.arg); break;
      case 'village': v = villageView(this); break;
      case 'log': v = logView(this); break;
      case 'settings': v = settingsView(this); break;
      case 'help': v = helpView(this); break;
      default: v = null;
    }
    if (!v) { this.current = null; p.hidden = true; clear(p); document.body.classList.remove('panel-open'); return; }
    this.current = v;
    p.hidden = false;
    document.body.classList.add('panel-open');
    const body = h('div.panel-body', {}, v.el);
    const head = h('div.panel-head', {},
      h('h2.panel-title', { id: 'panel-title' }, v.title),
      v.sub ? h('p.panel-sub', {}, v.sub) : null,
      h('button.icon-btn.close', { type: 'button', 'aria-label': 'Close panel (Esc)', onclick: () => this.close() }, '✕'));
    clear(p).append(head, body);
    p.setAttribute('aria-labelledby', 'panel-title');
    if (!force) body.scrollTop = keep;
    v.update?.();
  }

  // ---------- periodic refresh ----------

  refresh(structural) {
    const s = this.state;
    if (structural || s._rev !== this.rev) {
      this.rev = s._rev;
      if (this.view && !this.modalOpen()) this.renderPanel(false);
      this.renderCiv();
      this.renderGuide();
    } else this.current?.update?.();
    this.renderHud();
    this.renderQueue();
    this.renderNightCard();
    this.modalUpdate?.();
  }

  renderCiv() {
    const s = this.state;
    clear(this.civBtn).append(h('span.emblem-wrap', { html: emblem(s.village.emblem, s.village.color, 26) }),
      h('span.civ-text', {}, h('span.civ-name', {}, s.village.name), h('span.colony-name', {}, `Town Hall level ${s.buildings.townhall.level}`)));
  }

  renderHud() {
    const s = this.state;
    const g = this.goldEl;
    g.querySelector('.res-main').textContent = fmt(Math.floor(s.gold), 0);
    g.querySelector('.res-sub').textContent = 'gold';
    g.querySelector('.res-net').textContent = s.reserved ? `${fmt(s.reserved, 0)} committed` : '';
    g.title = `${Math.floor(s.gold)} gold, ${Math.floor(availableGold(s))} free to spend.`;
    const n = this.nightEl;
    const inNight = s.phase === 'night';
    n.querySelector('.res-main').textContent = `Night ${inNight ? s.battle?.n : s.night}`;
    n.querySelector('.res-sub').textContent = s.hold ? 'holding' : '';
    n.querySelector('.res-net').textContent = s.best ? `best ${s.best}` : 'no nights yet';
    n.classList.toggle('active', inNight);
    n.title = inNight ? 'A night is under way.' : `Night ${s.night} is next. Best night held: ${s.best || 'none yet'}.`;
    this.pauseBtn.textContent = s.paused ? '▶ Resume' : '❚❚ Pause';
    this.pauseBtn.setAttribute('aria-pressed', String(s.paused));
    document.body.classList.toggle('paused', s.paused);
    document.body.classList.toggle('is-night', inNight);
  }

  renderNightCard() {
    const s = this.state;
    const el = this.nightCard;
    const mode = s.phase === 'night' && s.battle ? 'night' : 'day';
    if (el._mode !== mode || el._night !== (s.battle?.n ?? s.night) || el._hold !== s.hold || el._speed !== s.speed) {
      el._mode = mode; el._night = s.battle?.n ?? s.night; el._hold = s.hold; el._speed = s.speed;
      if (mode === 'day') {
        const pv = nightPreview(s, s.night);
        const parts = Object.entries(pv.comp).filter(([, k]) => k).map(([t, k]) => `${k} ${k === 1 ? ENEMIES[t].name : ENEMIES[t].plural}`);
        this.dayBar = progressBar(0, 'Time until night');
        clear(el).append(
          h('div.nc-row', {},
            h('div.nc-text', {},
              h('strong.nc-title', {}, `Night ${s.night} approaches`),
              h('span.nc-timer', {}),
              h('span.nc-detail', {}, `${parts.join(' and ')} from ${pv.spawns.map((x) => x.name).join(' and ')}.`),
              pv.newSpawn ? h('span.nc-warn', {}, `New tonight: ${pv.newSpawn.name} opens.`) : null,
              pv.newEnemy ? h('span.nc-warn', {}, `New enemy: ${ENEMIES[pv.newEnemy].plural}.`) : null),
            h('div.nc-actions', {},
              button('Call the night', () => this.g.act((st) => callNight(st, this.g.events()), { sound: 'click' }), { kind: 'primary', title: 'Start the night now (N)' }),
              h('label.switch.compact', { title: 'Repeat this night instead of advancing after a win' },
                h('input', { type: 'checkbox', checked: s.hold, onchange: (e) => this.g.act((st) => { st.hold = e.target.checked; return { ok: true }; }) }),
                h('span.switch-ui', { 'aria-hidden': 'true' }), h('span', {}, 'Hold')))),
          this.dayBar);
      } else {
        this.intBar = progressBar(1, 'Wall integrity');
        this.intBar.classList.add('integrity');
        clear(el).append(
          h('div.nc-row', {},
            h('div.nc-text', {},
              h('strong.nc-title', {}, `Night ${s.battle.n}`),
              h('span.nc-detail.nc-enemies', {})),
            h('div.nc-actions', {},
              h('div.seg-buttons', { role: 'group', 'aria-label': 'Night speed' },
                [1, 2].map((sp) => h('button.chip-btn', { type: 'button', 'aria-pressed': String(s.speed === sp), onclick: () => this.g.act((st) => { st.speed = sp; return { ok: true }; }) }, `×${sp}`))))),
          h('div.int-row', {}, h('span.int-label', {}, 'Walls'), this.intBar, h('span.int-num', {})));
      }
    }
    if (mode === 'day') {
      const left = Math.max(0, s.dayLength - s.phaseT);
      el.querySelector('.nc-timer').textContent = s.paused ? 'Paused' : `Night falls in ${dur(left)}`;
      this.dayBar.set(s.phaseT / s.dayLength);
    } else {
      const b = s.battle;
      const max = wallStats(s.buildings.walls.level).integrity;
      this.intBar.set(s.integrity / max);
      this.intBar.classList.toggle('low', s.integrity / max < 0.3);
      el.querySelector('.int-num').textContent = `${Math.ceil(s.integrity)} / ${max}`;
      const left = b.total - b.kills;
      el.querySelector('.nc-enemies').textContent = `${left} of ${b.total} enemies left, ${b.kills} defeated, +${b.gold} gold`;
    }
  }

  renderQueue() {
    const s = this.state;
    const el = this.queueEl;
    if (!s.queue.length) { el.hidden = true; el._key = ''; return; }
    el.hidden = false;
    const key = s.queue.map((q) => q.id).join('|');
    if (el._key !== key) {
      el._key = key;
      clear(el).append(h('span.queue-label', {}, 'Builders'), ...s.queue.map((q, i) => h(`div.q-item${i === 0 ? '.active' : ''}`, { dataset: { q: q.id } },
        h('button.q-main', { type: 'button', onclick: () => { this.select(q.bid); this.g.diorama.focus(q.bid); } },
          h('span.q-name', {}, `${BUILDINGS[q.bid].name} → ${q.toLevel}`), h('span.q-time', {})),
        progressBar(0, `${BUILDINGS[q.bid].name} upgrade progress`),
        h('button.icon-btn.q-x', { type: 'button', 'aria-label': `Cancel ${BUILDINGS[q.bid].name} upgrade and refund ${q.cost} gold`, title: 'Cancel (full refund)', onclick: () => this.g.act((st) => cancelUpgrade(st, q.id), { sound: 'cancel' }) }, '✕'))));
    }
    s.queue.forEach((q, i) => {
      const node = el.querySelector(`[data-q="${q.id}"]`);
      if (!node) return;
      node.querySelector('.bar').set(q.progress / q.duration);
      node.querySelector('.q-time').textContent = i === 0 ? dur(q.duration - q.progress) : 'waiting';
    });
  }

  renderGuide() {
    const s = this.state;
    const el = this.guideEl;
    const open = OBJECTIVES.filter((o) => !s.objectives.claimed.includes(o.id));
    if (s.ui.guideDismissed || !open.length) { el.hidden = true; return; }
    el.hidden = false;
    const done = OBJECTIVES.length - open.length;
    const next = open.slice(0, window.matchMedia('(max-width: 720px)').matches ? 1 : 2);
    clear(el).append(
      h('div.guide-head', {}, h('h3', {}, 'Getting started'), h('span.guide-count', {}, `${done} of ${OBJECTIVES.length - 1} done`),
        h('button.icon-btn', { type: 'button', 'aria-label': 'Hide the guide. You can show it again from Help.', title: 'Hide guide (show again from Help)', onclick: () => { s.ui.guideDismissed = true; this.g.touch(); this.renderGuide(); } }, '✕')),
      h('ul.guide-list', {}, next.map((o) => h(`li${o.future ? '.future' : ''}`, {}, h('strong', {}, o.title), h('p', {}, o.guide), o.reward ? h('span.reward', {}, `Reward: ${o.reward} gold`) : null))));
  }

  // ---------- toasts ----------

  toast(level, text, meta = {}) {
    const s = this.state;
    if (level === 'info' && s.settings.mute?.info && !meta.force) return;
    if (level === 'done' && s.settings.mute?.done && !meta.force) return;
    const key = meta.cat && level !== 'attention' ? `${level}:${meta.cat}` : null;
    if (key && this.toastGroups.has(key)) {
      const grp = this.toastGroups.get(key);
      grp.count++;
      grp.el.querySelector('.toast-text').textContent = text;
      grp.el.querySelector('.toast-count').textContent = `+${grp.count - 1} more`;
      clearTimeout(grp.timer);
      grp.timer = setTimeout(() => this.dismissToast(grp.el, key), 6000);
      return;
    }
    const el = h(`div.toast.${level}`, { role: level === 'attention' ? 'alert' : 'status' },
      h('span.toast-mark', { 'aria-hidden': 'true' }, level === 'attention' ? '!' : level === 'done' ? '✓' : 'i'),
      h('span.toast-text', {}, text), h('span.toast-count', {}),
      h('button.icon-btn', { type: 'button', 'aria-label': 'Dismiss', onclick: () => this.dismissToast(el, key) }, '✕'));
    if (meta.building || meta.spawn) {
      el.classList.add('linkable');
      el.querySelector('.toast-text').addEventListener('click', () => {
        const id = meta.building || `spawn:${meta.spawn}`;
        this.select(id);
        this.g.diorama.focus(id);
      });
    }
    this.toasts.append(el);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
    const timer = setTimeout(() => this.dismissToast(el, key), level === 'attention' ? 10000 : 6000);
    if (key) this.toastGroups.set(key, { el, count: 1, timer });
  }

  dismissToast(el, key) {
    el.remove();
    if (key) this.toastGroups.delete(key);
  }

  // ---------- modals ----------

  modalOpen() { return !!this.modalRoot.firstChild; }

  modal(v, { dismissable = true } = {}) {
    this.closeModal();
    this.lastFocus = document.activeElement;
    const box = h('div.modal', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' },
      h('div.modal-head', {}, h('h2', { id: 'modal-title' }, v.title),
        dismissable ? h('button.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: () => this.closeModal() }, '✕') : null),
      h('div.modal-body', {}, v.el));
    const wrap = h('div.modal-wrap', { onclick: (e) => { if (e.target === wrap && dismissable) this.closeModal(); } }, box);
    wrap.dataset.dismissable = dismissable ? '1' : '';
    this.modalRoot.append(wrap);
    this.modalUpdate = v.update || null;
    const first = ['[autofocus]', 'input', 'button.primary', 'button:not(.icon-btn)', 'button'].map((q) => box.querySelector(q)).find(Boolean);
    first?.focus();
  }

  closeModal() {
    if (!this.modalOpen()) return;
    clear(this.modalRoot);
    this.modalUpdate = null;
    this.lastFocus?.focus?.();
  }

  confirm({ title, body, ok = 'Confirm', danger = false, onOk }) {
    this.modal({ title, el: h('div', {}, typeof body === 'string' ? h('p', {}, body) : body,
      h('div.row.end', {}, button('Keep things as they are', () => this.closeModal()), button(ok, () => { this.closeModal(); onOk(); }, { kind: danger ? 'danger' : 'primary' }))) });
  }

  prompt({ title, label, value, onOk }) {
    const input = h('input.text', { type: 'text', value, maxlength: 40, autofocus: true, 'aria-label': label });
    const submit = () => { onOk(input.value); this.closeModal(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    this.modal({ title, el: h('div', {}, h('label.field', {}, h('span', {}, label), input), h('div.row.end', {}, button('Cancel', () => this.closeModal()), button('Save name', submit, { kind: 'primary' }))) });
    input.select();
  }

  // ---------- keyboard ----------

  bindKeys() {
    window.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (this.modalOpen()) { if (this.modalRoot.firstChild.dataset.dismissable) this.closeModal(); return; }
        if (document.body.classList.contains('clean')) return this.setClean(false);
        if (this.view) return this.close();
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || this.modalOpen()) return;
      const D = this.g.diorama;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const map = {
        ArrowUp: () => D.panBy(0, 1.5), w: () => D.panBy(0, 1.5), ArrowDown: () => D.panBy(0, -1.5), s: () => D.panBy(0, -1.5),
        ArrowLeft: () => D.panBy(-1.5, 0), a: () => D.panBy(-1.5, 0), ArrowRight: () => D.panBy(1.5, 0), d: () => D.panBy(1.5, 0),
        q: () => D.rotateBy(-0.25), e: () => D.rotateBy(0.25), '+': () => D.zoomBy(0.85), '=': () => D.zoomBy(0.85), '-': () => D.zoomBy(1.18),
        Home: () => D.resetCamera(), 0: () => D.resetCamera(),
        b: () => this.toggle('village'), l: () => this.toggle('log'), o: () => this.toggle('settings'), '?': () => this.toggle('help'),
        p: () => this.togglePause(), h: () => this.setClean(!document.body.classList.contains('clean')), f: () => this.g.fullscreen(),
        n: () => { if (this.state.phase === 'day') this.g.act((st) => callNight(st, this.g.events())); },
        1: () => this.g.setView('village'), 2: () => this.g.setView('defense'), 3: () => this.g.setView('world'),
        x: () => this.g.act((st) => { st.speed = st.speed === 2 ? 1 : 2; return { ok: true }; }),
        t: () => this.select('townhall'), r: () => this.select('archery'), g: () => this.select('walls'),
      };
      const fn = map[k];
      if (!fn) return;
      if (k.startsWith('Arrow') && document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('#stage')) return;
      e.preventDefault();
      fn();
    });
  }
}

export { SPAWNS };
