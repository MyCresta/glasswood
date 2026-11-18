// Tiny DOM + formatting helpers.

export function h(tag, props = {}, ...children) {
  const [name, ...cls] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export function fmt(n, digits = 1) {
  if (!isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(digits)}k`;
  if (a >= 100) return `${Math.floor(n)}`;
  if (a >= 10) return n.toFixed(Math.min(digits, 1)).replace(/\.0$/, '');
  return n.toFixed(digits).replace(/\.0$/, '');
}

export function exact(n) {
  return (Math.round(n * 100) / 100).toLocaleString('en', { maximumFractionDigits: 2 });
}

export function rate(n) {
  const s = n > 0.005 ? '+' : n < -0.005 ? '−' : '±';
  return `${s}${fmt(Math.abs(n), 1)}/min`;
}

export function dur(sec) {
  if (!isFinite(sec)) return '—';
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${String(sec % 60).padStart(2, '0')}s`;
  const hh = Math.floor(m / 60);
  if (hh < 48) return `${hh}h ${String(m % 60).padStart(2, '0')}m`;
  return `${Math.floor(hh / 24)}d ${hh % 24}h`;
}

export function clockAt(secFromNow) {
  const d = new Date(Date.now() + secFromNow * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function progressBar(frac, label) {
  const bar = h('div.bar', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(frac * 100), 'aria-label': label || 'Progress' },
    h('div.bar-fill', { style: { width: `${Math.round(Math.min(1, frac) * 1000) / 10}%` } }));
  bar.set = (f) => {
    bar.firstChild.style.width = `${Math.round(Math.min(1, f) * 1000) / 10}%`;
    bar.setAttribute('aria-valuenow', Math.round(f * 100));
  };
  return bar;
}

export function button(label, onClick, opts = {}) {
  const b = h(`button.btn${opts.kind ? `.${opts.kind}` : ''}`, { type: 'button', onclick: onClick, title: opts.title, 'aria-label': opts.aria }, label);
  if (opts.disabled) { b.setAttribute('aria-disabled', 'true'); b.classList.add('is-disabled'); }
  return b;
}

// A button that stays focusable and explains its blocker instead of greying out silently.
export function actionButton(label, blocker, onClick, opts = {}) {
  const b = button(label, () => { if (!blocker) onClick(); }, { ...opts, disabled: !!blocker });
  if (!blocker) return b;
  return h('div.action-wrap', {}, b, h('p.blocker', {}, blocker));
}

export function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstChild;
}
