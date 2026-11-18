// Generative, unobtrusive audio built from WebAudio oscillators and noise.
// Starts only after the first interaction (browser autoplay rules).
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.7, music: 0.5, ambience: 0.6, ui: 0.7 };
    this.started = false;
  }

  start() {
    if (this.started) { this.ctx?.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.started = true;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.amb = ctx.createGain();
    this.ui = ctx.createGain();
    // soft echo for music
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.music.connect(this.master);
    this.music.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(this.master);
    this.amb.connect(this.master);
    this.ui.connect(this.master);
    this.applyVolumes();
    this.startPad();
    this.startWind();
    this.scheduleNotes();
  }

  setVolumes(v) {
    Object.assign(this.vol, v);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.1);
    this.music.gain.setTargetAtTime(this.vol.music * 0.5, t, 0.1);
    this.amb.gain.setTargetAtTime(this.vol.ambience * 0.35, t, 0.1);
    this.ui.gain.setTargetAtTime(this.vol.ui * 0.5, t, 0.1);
  }

  startPad() {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.06;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 600;
    g.connect(f); f.connect(this.music);
    const root = 110;
    for (const [mul, det] of [[1, -4], [1.5, 3], [2, 0], [2.5198, -2]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = root * mul;
      o.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = 0.25;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.07;
      const lg = ctx.createGain();
      lg.gain.value = 0.18;
      lfo.connect(lg); lg.connect(og.gain);
      o.connect(og); og.connect(g);
      o.start(); lfo.start();
    }
  }

  startWind() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last * 4; }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 180;
    lfo.connect(lg); lg.connect(f.frequency);
    src.connect(f); f.connect(this.amb);
    src.start(); lfo.start();
  }

  scheduleNotes() {
    const play = () => {
      if (!this.ctx) return;
      if (this.ctx.state === 'running' && this.vol.music > 0) {
        const n = SCALE[Math.floor(Math.random() * SCALE.length)];
        this.tone(440 * 2 ** ((n - 9) / 12), 2.4, this.music, 0.07, 'triangle');
        if (Math.random() < 0.35) setTimeout(() => this.tone(440 * 2 ** ((SCALE[Math.floor(Math.random() * 5)] - 21) / 12), 3, this.music, 0.05, 'sine'), 300);
      }
      setTimeout(play, 2200 + Math.random() * 4200);
    };
    setTimeout(play, 1500);
  }

  tone(freq, len, out, peak = 0.2, type = 'sine', when = 0) {
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + len + 0.05);
  }

  horn() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 700;
    f.connect(this.ui);
    for (const [freq, start] of [[147, 0], [196, 0.55]]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + start);
      g.gain.linearRampToValueAtTime(0.14, t + start + 0.12);
      g.gain.setValueAtTime(0.14, t + start + 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + 1.1);
      o.connect(g); g.connect(f);
      o.start(t + start); o.stop(t + start + 1.2);
    }
  }

  noise(len, freq, peak) {
    const ctx = this.ctx;
    if (!this.noiseBuf) {
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f); f.connect(g); g.connect(this.ui);
    src.start(t); src.stop(t + len + 0.02);
  }

  // Short, identifiable interface sounds.
  play(kind) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const u = this.ui;
    switch (kind) {
      case 'click': this.tone(660, 0.08, u, 0.12, 'sine'); break;
      case 'build': this.tone(392, 0.25, u, 0.16, 'triangle'); this.tone(523, 0.3, u, 0.14, 'triangle', 0.08); break;
      case 'done': [523, 659, 784].forEach((f, i) => this.tone(f, 0.5, u, 0.13, 'sine', i * 0.09)); break;
      case 'research': [587, 740, 880, 1175].forEach((f, i) => this.tone(f, 0.7, u, 0.1, 'sine', i * 0.11)); break;
      case 'recruit': [440, 554, 659].forEach((f, i) => this.tone(f, 0.45, u, 0.12, 'triangle', i * 0.12)); break;
      case 'warn': this.tone(330, 0.35, u, 0.16, 'square'); this.tone(262, 0.45, u, 0.14, 'square', 0.18); break;
      case 'upgrade': [392, 523, 659].forEach((f, i) => this.tone(f, 0.4, u, 0.12, 'triangle', i * 0.08)); break;
      case 'dusk': this.horn(); break;
      case 'dawn': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.9, u, 0.11, 'sine', i * 0.13)); break;
      case 'fall': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.7, u, 0.12, 'triangle', i * 0.16)); break;
      case 'hit': this.noise(0.05, 2400, 0.05); break;
      case 'death': this.tone(220 + Math.random() * 60, 0.12, u, 0.06, 'triangle'); this.noise(0.08, 900, 0.05); break;
      case 'wall': this.noise(0.12, 300, 0.12); break;
      case 'cancel': this.tone(494, 0.12, u, 0.12, 'sine'); this.tone(392, 0.16, u, 0.1, 'sine', 0.07); break;
      default: break;
    }
  }
}
