// Keeps one tab in charge of a civilization. A second tab is told the game is
// open elsewhere and can take over; the first tab then stops simulating and
// saving, so two sessions never spend or overwrite the same progress.
const LOCK = 'asterwake.lock';
const BEAT = 1500;
const STALE = 5000;

export function createTabLock({ onLost }) {
  const id = Math.random().toString(36).slice(2);
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('asterwake') : null;
  let owner = false;
  let timer = null;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(LOCK) || 'null'); } catch { return null; }
  };
  const write = () => {
    try { localStorage.setItem(LOCK, JSON.stringify({ id, t: Date.now() })); } catch { /* storage problems are reported by saving */ }
  };

  function otherActive() {
    const l = read();
    return !!(l && l.id !== id && Date.now() - l.t < STALE);
  }

  function claim() {
    owner = true;
    write();
    chan?.postMessage({ type: 'takeover', id });
    clearInterval(timer);
    timer = setInterval(() => {
      if (!owner) return;
      const l = read();
      if (l && l.id !== id && Date.now() - l.t < STALE) return lose();
      write();
    }, BEAT);
  }

  function lose() {
    if (!owner) return;
    owner = false;
    clearInterval(timer);
    onLost?.();
  }

  chan?.addEventListener('message', (e) => {
    if (e.data?.type === 'takeover' && e.data.id !== id) lose();
  });
  window.addEventListener('storage', (e) => {
    if (e.key !== LOCK || !owner) return;
    const l = read();
    if (l && l.id !== id) lose();
  });
  window.addEventListener('pagehide', () => {
    if (owner) { const l = read(); if (l?.id === id) localStorage.removeItem(LOCK); }
  });

  return { otherActive, claim, isOwner: () => owner };
}
