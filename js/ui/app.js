// Interface controller. Owns the HUD, panel routing, toasts, modals and the
// placement flow. Views render into the side panel and expose update().
import { h, clear, fmt, exact, rate, dur, resIcon, button } from './dom.js';
import { emblem, glyph } from './art.js';
import { RESOURCE_INFO, BUILDINGS } from '../data/buildings.js';
import { computeColony, available } from '../sim/economy.js';
import { getColony, plotInGrid, buildingAt } from '../sim/state.js';
import * as A from '../sim/actions.js';
import { OBJECTIVES } from '../sim/objectives.js';
import { buildingView, buildView, queueStrip } from './colonyViews.js';
import { colonistsView, colonistDetail } from './peopleViews.js';
import { researchView } from './researchView.js';
import { logView, settingsView, helpView, resourceDetail } from './otherViews.js';

const NAV = [
  { id: 'colony', label: 'Colony', key: 'Escape', icon: '⌂' },
  { id: 'build', label: 'Build', key: 'B', icon: '▦' },
  { id: 'colonists', label: 'Colonists', key: 'C', icon: '☺' },
  { id: 'research', label: 'Research', key: 'R', icon: '✦' },
  { id: 'log', label: 'Log', key: 'L', icon: '☰' },
  { id: 'settings', label: 'Settings', key: 'O', icon: '⚙' },
  { id: 'help', label: 'Help', key: '?', icon: '?' },
];

export class UI {
  constructor(game) {
    this.g = game;
    this.view = 'colony';
    this.viewArg = null;
    this.current = null;
    this.rev = -1;
    this.toastGroups = new Map();
    this.root = document.getElementById('app');
    this.buildShell();
    this.bindKeys();
  }

  get state() { return this.g.state; }
  colony() { return getColony(this.state, this.state.ui.colonyId) || this.state.colonies[0]; }
  snap() { return this._snap || (this._snap = computeColony(this.state, this.colony())); }

  // ---------- shell ----------

  buildShell() {
    const top = document.getElementById('topbar');
    this.civBtn = h('button.civ', { type: 'button', onclick: () => this.open('settings'), 'aria-label': 'Civilization and settings' });
    this.resBar = h('div.resources', { role: 'list', 'aria-label': 'Colony resources' });
    this.saveInd = h('button.save-ind', { type: 'button', onclick: () => this.g.saveNow(true), title: 'Save now' }, 'Saved');
    this.pauseBtn = h('button.pause', { type: 'button', onclick: () => this.togglePause(), 'aria-pressed': 'false' });
    this.cleanBtn = h('button.icon-btn', { type: 'button', onclick: () => this.setClean(true), 'aria-label': 'Hide interface (H)', title: 'Hide interface (H)' }, '◐');
    clear(top).append(this.civBtn, this.resBar, h('div.top-actions', {}, this.saveInd, this.cleanBtn, this.pauseBtn));

    this.nav = document.getElementById('nav');
    clear(this.nav).append(...NAV.map((n) => h('button.nav-btn', {
      type: 'button', dataset: { view: n.id }, onclick: () => this.toggle(n.id), title: `${n.label} (${n.key === 'Escape' ? 'Esc' : n.key})`,
    }, h('span.nav-icon', { 'aria-hidden': 'true' }, n.icon), h('span.nav-label', {}, n.label))));

    this.panel = document.getElementById('panel');
    this.queueEl = document.getElementById('queue');
    this.toasts = document.getElementById('toasts');
    this.modalRoot = document.getElementById('modal-root');
    this.tooltip = document.getElementById('tooltip');
    this.guideEl = document.getElementById('guide');
    this.hintEl = document.getElementById('hint');
    this.showUiBtn = document.getElementById('show-ui');
    this.showUiBtn.onclick = () => this.setClean(false);

    const cam = document.getElementById('cam');
    const D = this.g.diorama;
    const camBtn = (label, aria, fn) => h('button.cam-btn', { type: 'button', 'aria-label': aria, title: aria, onclick: fn }, label);
    clear(cam).append(
      h('div.cam-grid', {},
        camBtn('↺', 'Rotate left (Q)', () => D.rotateBy(-0.35)),
        camBtn('▲', 'Move camera forward (W)', () => D.panBy(0, 2)),
        camBtn('↻', 'Rotate right (E)', () => D.rotateBy(0.35)),
        camBtn('◀', 'Move camera left (A)', () => D.panBy(-2, 0)),
        camBtn('⌖', 'Return to default view (Home)', () => D.resetCamera()),
        camBtn('▶', 'Move camera right (D)', () => D.panBy(2, 0)),
        camBtn('＋', 'Zoom in (+)', () => D.zoomBy(0.8)),
        camBtn('▼', 'Move camera back (S)', () => D.panBy(0, -2)),
        camBtn('－', 'Zoom out (−)', () => D.zoomBy(1.25)),
      ),
    );
    const camToggle = document.getElementById('cam-toggle');
    camToggle.onclick = () => { const on = cam.classList.toggle('open'); camToggle.setAttribute('aria-expanded', on); };

    // drag colonists from the roster onto buildings in the scene
    const canvas = this.g.diorama.canvas;
    canvas.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/colonist')) e.preventDefault(); });
    canvas.addEventListener('drop', (e) => {
      const id = e.dataTransfer.getData('text/colonist');
      if (!id) return;
      e.preventDefault();
      const bid = this.g.diorama.pickAt(e);
      if (!bid) return this.toast('attention', 'Drop the colonist onto a building.');
      this.assign(id, { kind: 'building', bid });
    });
  }

  setClean(on) {
    document.body.classList.toggle('clean', on);
    if (on) this.showUiBtn.focus();
  }

  togglePause() {
    this.g.act((s) => { s.paused = !s.paused; return { ok: true }; }, { sound: 'click' });
    this.toast('info', this.state.paused ? 'Paused. Nothing progresses until you resume.' : 'Resumed.');
  }

  // ---------- navigation ----------

  toggle(view) {
    if (view === 'colony') return this.open('colony');
    if (this.view === view && !this.viewArg) return this.open('colony');
    this.open(view);
  }

  open(view, arg = null) {
    if (this.placing && view !== 'build') this.cancelPlacement();
    this.view = view;
    this.viewArg = arg;
    if (view !== 'building') { this.g.diorama.select(null); }
    this.renderPanel(true);
    this.nav.querySelectorAll('.nav-btn').forEach((b) => b.setAttribute('aria-current', b.dataset.view === (view === 'building' ? 'colony' : view === 'colonist' ? 'colonists' : view) ? 'page' : 'false'));
    this.g.audio.play('click');
  }

  close() { this.open('colony'); }

  selectBuilding(bid) {
    if (!bid) { if (this.view === 'building') this.close(); return; }
    this.state.objectives.flags.selected = true;
    this.g.diorama.select(bid);
    this.view = 'building';
    this.viewArg = bid;
    this.renderPanel(true);
    this.g.audio.play('click');
  }

  renderPanel(force = false) {
    const p = this.panel;
    const keepScroll = p.querySelector('.panel-body')?.scrollTop || 0;
    let v = null;
    const ctx = this;
    switch (this.view) {
      case 'building': v = buildingView(ctx, this.viewArg); break;
      case 'build': v = buildView(ctx); break;
      case 'colonists': v = colonistsView(ctx, this.viewArg); break;
      case 'colonist': v = colonistDetail(ctx, this.viewArg); break;
      case 'research': v = researchView(ctx); break;
      case 'log': v = logView(ctx); break;
      case 'settings': v = settingsView(ctx); break;
      case 'help': v = helpView(ctx); break;
      default: v = null;
    }
    if (!v) { this.view = 'colony'; this.current = null; p.hidden = true; clear(p); document.body.classList.remove('panel-open'); return; }
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
    if (!force) body.scrollTop = keepScroll;
    else if (window.matchMedia('(pointer: fine)').matches) head.querySelector('.close').focus({ preventScroll: true });
    v.update?.();
  }

  // ---------- periodic refresh ----------

  refresh(structural) {
    this._snap = null;
    const s = this.state;
    if (structural || s._rev !== this.rev) {
      this.rev = s._rev;
      if (this.view !== 'colony' && !this.modalOpen()) this.renderPanel(false);
      this.renderCiv();
      this.renderGuide();
    } else this.current?.update?.();
    this.renderResources();
    queueStrip(this);
    this.pauseBtn.textContent = s.paused ? '▶ Resume' : '❚❚ Pause';
    this.pauseBtn.setAttribute('aria-pressed', String(s.paused));
    this.pauseBtn.title = s.paused ? 'Resume (P)' : 'Pause (P)';
    document.body.classList.toggle('paused', s.paused);
    this.modalUpdate?.();
  }

  renderCiv() {
    const s = this.state;
    clear(this.civBtn).append(
      h('span.emblem-wrap', { html: emblem(s.civ.emblem, s.civ.color, 26) }),
      h('span.civ-text', {}, h('span.civ-name', {}, s.civ.name), h('span.colony-name', {}, this.colony().name)),
    );
  }

  renderResources() {
    const c = this.colony();
    const sn = this.snap();
    const s = this.state;
    const items = [];
    for (const r of ['metal', 'fuel', 'food']) {
      const q = c.inv[r];
      const cap = sn.cap[r];
      const net = sn.net[r];
      const res = c.reserved[r] || 0;
      const full = q >= cap - 0.01;
      let warn = '';
      if (r === 'food' && c.foodShort) warn = 'Empty';
      else if (full && sn.gross[r] > 0) warn = 'Full';
      else if (net < -0.01 && q / -net < 10) warn = 'Running low';
      items.push({ r, main: `${fmt(q, 0)}`, sub: `/ ${fmt(cap, 0)}`, net, warn, title: `${RESOURCE_INFO[r].name}: ${exact(q)} of ${exact(cap)}${res ? `, ${exact(res)} committed` : ''}. Net ${rate(net)}.` });
    }
    items.push({ r: 'research', main: fmt(s.research.bank, 0), sub: '', net: sn.research, warn: !s.research.active && sn.research > 0 ? 'No project' : '', title: `Research bank ${exact(s.research.bank)}. ${rate(sn.research)} from laboratories.` });
    const p = sn.power;
    items.push({ r: 'power', main: `${fmt(p.demand, 1)}`, sub: `/ ${fmt(p.supply, 1)}`, net: null, warn: p.shortfall > 0 ? 'Short' : '', title: `Power demand ${exact(p.demand)} of ${exact(p.supply)} supply.` });
    items.push({ r: 'housing', main: `${sn.people.length}`, sub: `/ ${sn.housing}`, net: null, warn: sn.people.length >= sn.housing ? 'Full' : '', title: `${sn.people.length} colonists, ${sn.housing} homes.` });

    if (this.resBar.childElementCount !== items.length) {
      clear(this.resBar).append(...items.map((it) => h('button.res', {
        type: 'button', role: 'listitem', dataset: { r: it.r },
        onclick: () => this.showResource(it.r),
      }, resIcon(it.r), h('span.res-main', {}), h('span.res-sub', {}), h('span.res-net', {}), h('span.res-warn', {}))));
    }
    items.forEach((it, i) => {
      const el = this.resBar.children[i];
      el.title = it.title;
      el.setAttribute('aria-label', `${RESOURCE_INFO[it.r].name}. ${it.title} ${it.warn}`);
      el.querySelector('.res-main').textContent = it.main;
      el.querySelector('.res-sub').textContent = it.sub;
      const n = el.querySelector('.res-net');
      n.textContent = it.net === null ? '' : rate(it.net);
      n.className = `res-net ${it.net > 0.005 ? 'up' : it.net < -0.005 ? 'down' : ''}`;
      const w = el.querySelector('.res-warn');
      w.textContent = it.warn;
      el.classList.toggle('warn', !!it.warn);
    });
  }

  showResource(r) {
    this.state.objectives.flags.rates = true;
    this.modal(resourceDetail(this, r));
  }

  // ---------- guide ----------

  renderGuide() {
    const s = this.state;
    const el = this.guideEl;
    if (s.ui.guideDismissed) { el.hidden = true; return; }
    const open = OBJECTIVES.filter((o) => !s.objectives.claimed.includes(o.id));
    if (!open.length) { el.hidden = true; return; }
    el.hidden = false;
    const next = open.slice(0, window.matchMedia('(max-width: 720px)').matches ? 1 : 2);
    const done = OBJECTIVES.length - open.length;
    clear(el).append(
      h('div.guide-head', {},
        h('h3', {}, 'Getting started'),
        h('span.guide-count', {}, `${done} of ${OBJECTIVES.length - 1} done`),
        h('button.icon-btn', { type: 'button', 'aria-label': 'Hide the guide. You can reopen it from Help.', title: 'Hide guide (reopen from Help)', onclick: () => { s.ui.guideDismissed = true; this.g.touch(); this.renderGuide(); } }, '✕')),
      h('ol.guide-list', { start: done + 1 }, next.map((o) => h(`li${o.future ? '.future' : ''}`, {},
        h('strong', {}, o.title),
        h('p', {}, o.guide),
        o.reward ? h('span.reward', {}, 'Reward: ', Object.entries(o.reward).map(([k, v]) => `${v} ${RESOURCE_INFO[k].name}`).join(', ')) : null))),
    );
  }

  // ---------- placement ----------

  startPlacement(type, movingId = null) {
    const c = this.colony();
    this.placing = { type, movingId, plot: null, rot: 0 };
    const moving = movingId ? c.buildings.find((b) => b.id === movingId) : null;
    this.g.diorama.startPlacement({ type, level: moving ? Math.max(1, moving.level) : 1, moving });
    document.body.classList.add('placing');
    this.view = movingId ? 'building' : 'build';
    this.showHint();
    this.g.diorama.sync(c, this.snap(), { state: this.state });
  }

  plotCheck(plot) {
    const c = this.colony();
    if (!plot || !plotInGrid(c, plot.gx, plot.gz)) return { ok: false, reason: 'Outside the usable plots.' };
    const occ = buildingAt(c, plot.gx, plot.gz);
    if (occ && occ.id !== this.placing.movingId) return { ok: false, reason: `Occupied by ${BUILDINGS[occ.type].name}.` };
    if (!this.placing.movingId) {
      const block = A.buildBlocker(this.state, c, this.placing.type);
      if (block) return { ok: false, reason: block };
    }
    return { ok: true };
  }

  hoverPlot(plot) {
    if (!this.placing) return;
    const chk = this.plotCheck(plot);
    const inGrid = plot && plotInGrid(this.colony(), plot.gx, plot.gz);
    this.g.diorama.previewPlot(inGrid ? plot : null, chk.ok);
    this.placing.plot = inGrid ? plot : null;
    this.showHint(inGrid ? chk : null);
  }

  pickPlot(plot, pointerType) {
    if (!this.placing) return;
    this.hoverPlot(plot);
    const chk = this.plotCheck(plot);
    if (!chk.ok) { this.toast('attention', chk.reason); this.g.audio.play('warn'); return; }
    if (pointerType === 'mouse') this.confirmPlacement();
    else this.showHint(chk, true);
  }

  showHint(chk = null, confirm = false) {
    const el = this.hintEl;
    if (!this.placing) { el.hidden = true; return; }
    const { type, movingId } = this.placing;
    const def = BUILDINGS[type];
    el.hidden = false;
    const what = movingId ? `Moving ${def.name}` : `Placing ${def.name}`;
    const info = movingId ? 'Moving is free and keeps its level, worker and progress.'
      : `Costs ${Object.entries(def.cost).map(([k, v]) => `${v} ${RESOURCE_INFO[k].name}`).join(' and ')}, takes ${dur(def.time)}${def.powerUse ? `, uses ${def.powerUse} Power` : ''}${def.powerSupply ? `, supplies ${def.powerSupply} Power` : ''}.`;
    clear(el).append(
      h('div.hint-text', {}, h('strong', {}, what), h('span', {}, info),
        h('span.hint-status', {}, chk ? (chk.ok ? 'This plot is free.' : chk.reason) : 'Choose a highlighted plot. Esc cancels.')),
      h('div.hint-actions', {},
        chk?.ok && (confirm || (this.placing.plot && matchMedia('(pointer: coarse)').matches)) ? button(movingId ? 'Move here' : 'Build here', () => this.confirmPlacement(), { kind: 'primary' }) : null,
        button('Cancel', () => this.cancelPlacement())),
    );
  }

  confirmPlacement() {
    const pl = this.placing;
    if (!pl?.plot) return;
    const c = this.colony();
    if (pl.movingId) {
      const r = this.g.act((s) => A.moveBuilding(s, c.id, pl.movingId, pl.plot.gx, pl.plot.gz), { sound: 'click' });
      if (r.ok) { const id = pl.movingId; this.cancelPlacement(); this.selectBuilding(id); }
      return;
    }
    const r = this.g.act((s) => A.placeBuilding(s, c.id, pl.type, pl.plot.gx, pl.plot.gz), { sound: 'build' });
    if (r.ok) {
      this.toast('info', `${BUILDINGS[pl.type].name} added to the construction queue.`);
      this.cancelPlacement();
      this.selectBuilding(r.building.id);
    }
  }

  cancelPlacement() {
    this.placing = null;
    this.g.diorama.endPlacement();
    document.body.classList.remove('placing');
    this.hintEl.hidden = true;
    this.g.diorama.sync(this.colony(), this.snap(), { state: this.state });
  }

  // ---------- shared actions ----------

  assign(colonistId, target) {
    const s = this.state;
    const c = s.colonists[colonistId];
    const prev = c.assign?.kind === 'building' ? this.colony().buildings.find((b) => b.id === c.assign.bid) : null;
    const pv = A.assignPreview(s, c, target);
    const r = this.g.act((st) => A.assignColonist(st, colonistId, target), { sound: 'click' });
    if (!r.ok) return r;
    const where = !target ? 'relief work at headquarters' : target.kind === 'support' ? 'construction support' : BUILDINGS[this.colony().buildings.find((b) => b.id === target.bid).type].name;
    let msg = `${c.name} now works on ${where}.`;
    if (prev && (!target || target.bid !== prev.id)) msg += ` ${BUILDINGS[prev.type].name} is now unstaffed.`;
    if (pv.displaces) msg += ` ${pv.displaces.name} moves to relief work.`;
    this.toast('info', msg);
    return r;
  }

  // ---------- toasts ----------

  toast(level, text, meta = {}) {
    const s = this.state;
    if (level === 'info' && s.settings.mute?.info && !meta.force) return;
    if (level === 'done' && s.settings.mute?.done) return;
    const key = meta.cat && level !== 'attention' ? `${level}:${meta.cat}` : null;
    if (key && this.toastGroups.has(key)) {
      const g = this.toastGroups.get(key);
      g.count++;
      g.el.querySelector('.toast-text').textContent = text;
      g.el.querySelector('.toast-count').textContent = `+${g.count - 1} more`;
      clearTimeout(g.timer);
      g.timer = setTimeout(() => this.dismissToast(g.el, key), 6000);
      return;
    }
    const el = h(`div.toast.${level}`, { role: level === 'attention' ? 'alert' : 'status' },
      h('span.toast-mark', { 'aria-hidden': 'true' }, level === 'attention' ? '!' : level === 'done' ? '✓' : 'i'),
      h('span.toast-text', {}, text),
      h('span.toast-count', {}),
      h('button.icon-btn', { type: 'button', 'aria-label': 'Dismiss', onclick: () => this.dismissToast(el, key) }, '✕'));
    if (meta.colonist || meta.building || meta.tech) {
      el.classList.add('linkable');
      el.querySelector('.toast-text').addEventListener('click', () => {
        if (meta.building && this.colony().buildings.some((b) => b.id === meta.building)) { this.selectBuilding(meta.building); this.g.diorama.focusBuilding(meta.building); }
        else if (meta.colonist && s.colonists[meta.colonist]) this.open('colonist', meta.colonist);
        else if (meta.tech) this.open('research');
      });
    }
    this.toasts.append(el);
    while (this.toasts.children.length > 5) this.toasts.firstChild.remove();
    const timer = setTimeout(() => this.dismissToast(el, key), level === 'attention' ? 12000 : 6000);
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
    const f = box.querySelector('[autofocus]') || box.querySelector('input, button.primary, button:not(.icon-btn), select, button');
    f?.focus();
    return box;
  }

  closeModal() {
    if (!this.modalOpen()) return;
    clear(this.modalRoot);
    this.modalUpdate = null;
    this.lastFocus?.focus?.();
  }

  confirm({ title, body, ok = 'Confirm', danger = false, onOk }) {
    this.modal({
      title,
      el: h('div', {}, typeof body === 'string' ? h('p', {}, body) : body,
        h('div.row.end', {}, button('Keep things as they are', () => this.closeModal()),
          button(ok, () => { this.closeModal(); onOk(); }, { kind: danger ? 'danger' : 'primary' }))),
    });
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
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      if (e.key === 'Escape') {
        if (this.modalOpen()) { if (this.modalRoot.firstChild.dataset.dismissable) this.closeModal(); return; }
        if (document.body.classList.contains('clean')) return this.setClean(false);
        if (this.placing) return this.cancelPlacement();
        if (this.g.diorama.followId) { this.g.diorama.follow(null); return; }
        if (this.view !== 'colony') return this.close();
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || this.modalOpen()) return;
      const D = this.g.diorama;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const map = {
        ArrowUp: () => D.panBy(0, 1.5), w: () => D.panBy(0, 1.5),
        ArrowDown: () => D.panBy(0, -1.5), s: () => D.panBy(0, -1.5),
        ArrowLeft: () => D.panBy(-1.5, 0), a: () => D.panBy(-1.5, 0),
        ArrowRight: () => D.panBy(1.5, 0), d: () => D.panBy(1.5, 0),
        q: () => D.rotateBy(-0.25), e: () => D.rotateBy(0.25),
        '+': () => D.zoomBy(0.85), '=': () => D.zoomBy(0.85), '-': () => D.zoomBy(1.18),
        Home: () => D.resetCamera(), 0: () => D.resetCamera(),
        b: () => this.toggle('build'), c: () => this.toggle('colonists'), r: () => this.toggle('research'),
        l: () => this.toggle('log'), o: () => this.toggle('settings'), '?': () => this.toggle('help'),
        p: () => this.togglePause(), h: () => this.setClean(!document.body.classList.contains('clean')),
        f: () => this.g.fullscreen(),
        Enter: () => { if (this.placing?.plot) this.confirmPlacement(); },
      };
      const fn = map[k];
      if (fn) {
        if (k.startsWith('Arrow') && document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('#stage')) return;
        e.preventDefault();
        fn();
      }
    });
  }
}

export { glyph, available };
