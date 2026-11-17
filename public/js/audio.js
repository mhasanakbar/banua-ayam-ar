// Efek suara sintetis (WebAudio) — tanpa file audio.
let ctx = null, master = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
}

function tone(freq, start, dur, { type = 'sine', vol = 0.2, attack = 0.01, slideTo = null, filter = null } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = o;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type || 'lowpass'; f.frequency.value = filter.freq; f.Q.value = filter.q || 1;
    o.connect(f); node = f;
  }
  node.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(start, dur, { vol = 0.15, freq = 1200, type = 'bandpass', q = 1 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource();
  s.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t0);
}

export const sfx = {
  chime(stage = 1) {
    const base = [523, 587, 659, 698, 784][(stage - 1) % 5];
    [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, i * 0.09, 0.9, { vol: 0.16, type: 'triangle' }));
    tone(base * 4, 0.36, 1.2, { vol: 0.05 });
  },
  fanfare() {
    const seq = [523, 659, 784, 1047, 784, 1047, 1319];
    seq.forEach((f, i) => tone(f, i * 0.13, 0.5, { vol: 0.15, type: 'square', filter: { freq: 2500 } }));
    tone(1047, 0.95, 1.5, { vol: 0.12, type: 'triangle' });
    tone(523, 0.95, 1.5, { vol: 0.1, type: 'triangle' });
  },
  click() { tone(1800, 0, 0.05, { type: 'square', vol: 0.06, filter: { freq: 3000 } }); },
  open() { tone(660, 0, 0.12, { vol: 0.1, type: 'triangle' }); tone(990, 0.08, 0.15, { vol: 0.08, type: 'triangle' }); },
  close() { tone(520, 0, 0.12, { vol: 0.1, type: 'triangle' }); },
  door(open) {
    tone(open ? 180 : 140, 0, 0.45, { type: 'sawtooth', vol: 0.05, slideTo: open ? 260 : 100, filter: { freq: 900, q: 6 } });
    noise(open ? 0.38 : 0.35, 0.12, { vol: 0.25, freq: 180, type: 'lowpass' });
  },
  cluck(kind) {
    if (kind === 'chick') {
      for (let i = 0; i < 3; i++) tone(2600 + Math.random() * 400, i * 0.13, 0.09, { vol: 0.08, slideTo: 3800 });
    } else {
      for (let i = 0; i < 4; i++) {
        tone(420 + Math.random() * 60, i * 0.11, 0.08, { type: 'square', vol: 0.06, slideTo: 330, filter: { type: 'bandpass', freq: 900, q: 3 } });
      }
      tone(520, 0.48, 0.25, { type: 'square', vol: 0.06, slideTo: 380, filter: { type: 'bandpass', freq: 1000, q: 3 } });
    }
  },
  step(onWood) {
    if (onWood) { tone(130 + Math.random() * 30, 0, 0.08, { type: 'triangle', vol: 0.07 }); noise(0, 0.04, { vol: 0.05, freq: 600 }); }
    else noise(0, 0.07, { vol: 0.05, freq: 2500 + Math.random() * 1000, q: 0.6 });
  },
  bird() {
    const b = 2500 + Math.random() * 1500;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) tone(b, i * 0.14, 0.1, { vol: 0.025, slideTo: b * 1.3 });
  },
  snore() { noise(0, 1.0, { vol: 0.1, freq: 300, type: 'lowpass' }); },
};

// Musik radio sederhana: melodi pentatonik acak yang lembut
let musicTimer = null;
export function toggleMusic() {
  if (!ctx) return false;
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; return false; }
  const scale = [392, 440, 523, 587, 659, 784, 880];
  const bass = [196, 220, 262, 175];
  let step = 0, idx = 3;
  musicTimer = setInterval(() => {
    if (step % 8 === 0) tone(bass[(step / 8) % 4], 0, 1.6, { type: 'triangle', vol: 0.06 });
    if (Math.random() < 0.8) {
      idx = Math.max(0, Math.min(scale.length - 1, idx + Math.floor(Math.random() * 5) - 2));
      tone(scale[idx], 0, 0.45, { type: 'triangle', vol: 0.07 });
      if (step % 4 === 0) tone(scale[idx] * 2, 0.01, 0.3, { vol: 0.015 });
    }
    step++;
  }, 280);
  return true;
}
