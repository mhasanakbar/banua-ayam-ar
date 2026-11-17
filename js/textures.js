// Tekstur prosedural dari canvas (tanpa file gambar, 100% offline).
import * as THREE from 'three';

const cache = new Map();

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function baseTexture(key, w, h, draw) {
  if (!cache.has(key)) {
    const t = new THREE.CanvasTexture(canvas(w, h, draw));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    cache.set(key, t);
  }
  return cache.get(key);
}

/** Tekstur dengan repeat tertentu (berbagi gambar yang sama). */
export function tex(key, rx = 1, ry = 1) {
  const base = DRAW[key]();
  const t = base.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

const DRAW = {
  // Papan kayu vertikal (dinding rumah Banjar)
  planks: () => baseTexture('planks', 256, 256, (g, w, h) => {
    const r = rand(7);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const l = 52 + r() * 10;
      g.fillStyle = `hsl(24, 48%, ${l}%)`;
      g.fillRect((i * w) / n, 0, w / n, h);
      for (let k = 0; k < 40; k++) {
        g.strokeStyle = `rgba(90,45,20,${0.06 + r() * 0.1})`;
        g.lineWidth = 1 + r() * 1.5;
        const x = (i * w) / n + r() * (w / n);
        g.beginPath(); g.moveTo(x, 0);
        g.bezierCurveTo(x + r() * 6 - 3, h * 0.3, x + r() * 6 - 3, h * 0.6, x + r() * 4 - 2, h);
        g.stroke();
      }
      // motif zig-zag ringan seperti di gambar
      g.fillStyle = 'rgba(120,60,25,0.18)';
      for (let y = h * 0.62; y < h; y += 26) {
        g.beginPath();
        g.moveTo((i * w) / n + 6, y + 20);
        g.lineTo((i * w) / n + w / n / 2, y);
        g.lineTo(((i + 1) * w) / n - 6, y + 20);
        g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(60,25,10,0.65)';
      g.fillRect(((i + 1) * w) / n - 2, 0, 2, h);
    }
  }),

  // Lantai papan horizontal
  floor: () => baseTexture('floor', 256, 256, (g, w, h) => {
    const r = rand(11);
    const n = 6;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `hsl(26, 45%, ${34 + r() * 8}%)`;
      g.fillRect(0, (i * h) / n, w, h / n);
      for (let k = 0; k < 25; k++) {
        g.strokeStyle = `rgba(40,18,6,${0.08 + r() * 0.1})`;
        const y = (i * h) / n + r() * (h / n);
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + r() * 4 - 2); g.stroke();
      }
      g.fillStyle = 'rgba(20,8,2,0.7)';
      g.fillRect(0, ((i + 1) * h) / n - 2, w, 2);
      g.fillRect(((i * 97) % w), (i * h) / n, 2, h / n);
    }
  }),

  // Atap sirap sisik (abu-abu dengan garis lengkung oranye seperti gambar)
  shingles: () => baseTexture('shingles', 256, 256, (g, w, h) => {
    g.fillStyle = '#8d8f93';
    g.fillRect(0, 0, w, h);
    const rows = 6, cols = 5;
    for (let r = 0; r < rows; r++) {
      const y = (r * h) / rows;
      const grd = g.createLinearGradient(0, y, 0, y + h / rows);
      grd.addColorStop(0, '#6e7075'); grd.addColorStop(1, '#c9cbd0');
      g.fillStyle = grd;
      g.fillRect(0, y, w, h / rows);
      g.strokeStyle = '#b4663a';
      g.lineWidth = 4;
      const off = r % 2 ? w / cols / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const cx = c * (w / cols) + off + w / cols / 2;
        g.beginPath();
        g.arc(cx, y + h / rows - 14, w / cols / 2 - 3, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
      }
    }
  }),

  grass: () => baseTexture('grass', 512, 512, (g, w, h) => {
    g.fillStyle = '#5f9b3c';
    g.fillRect(0, 0, w, h);
    const r = rand(3);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `hsla(${88 + r() * 30}, ${40 + r() * 25}%, ${26 + r() * 26}%, 0.55)`;
      const x = r() * w, y = r() * h;
      g.fillRect(x, y, 1.5, 3 + r() * 4);
    }
  }),

  dirt: () => baseTexture('dirt', 256, 256, (g, w, h) => {
    g.fillStyle = '#9b7a52';
    g.fillRect(0, 0, w, h);
    const r = rand(5);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `hsla(30, 30%, ${30 + r() * 35}%, 0.5)`;
      g.beginPath(); g.arc(r() * w, r() * h, r() * 2.5, 0, 7); g.fill();
    }
  }),

  // Kain Sasirangan (kain khas Banjar) – motif gigi haruan / tampuk manggis
  sasirangan: () => baseTexture('sasirangan', 256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#7b1f4a'); grd.addColorStop(0.5, '#b8327a'); grd.addColorStop(1, '#3d2a7a');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd36b'; g.lineWidth = 3;
    for (let y = 16; y < h; y += 40) {
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + ((x / 16) % 2 ? 10 : -10));
      g.stroke();
    }
    g.fillStyle = '#ffffff';
    for (let y = 36; y < h; y += 40) for (let x = 16; x < w; x += 32) {
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, rr = k % 2 ? 4 : 9;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.fill();
    }
  }),

  carpet: () => baseTexture('carpet', 512, 512, (g, w, h) => {
    g.fillStyle = '#8c1d1d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8b04a'; g.lineWidth = 14; g.strokeRect(20, 20, w - 40, h - 40);
    g.strokeStyle = '#1f3d6b'; g.lineWidth = 8; g.strokeRect(46, 46, w - 92, h - 92);
    g.fillStyle = '#e8b04a';
    g.save(); g.translate(w / 2, h / 2);
    for (let k = 0; k < 8; k++) {
      g.rotate(Math.PI / 4);
      g.beginPath(); g.ellipse(0, 70, 22, 60, 0, 0, 7); g.fill();
    }
    g.fillStyle = '#1f3d6b'; g.beginPath(); g.arc(0, 0, 40, 0, 7); g.fill();
    g.restore();
    g.fillStyle = 'rgba(232,176,74,0.7)';
    for (let i = 80; i < w - 80; i += 30) {
      g.fillRect(i, 70, 10, 10); g.fillRect(i, h - 80, 10, 10);
      g.fillRect(70, i, 10, 10); g.fillRect(w - 80, i, 10, 10);
    }
  }),

  water: () => baseTexture('water', 256, 256, (g, w, h) => {
    g.fillStyle = '#4c87a8'; g.fillRect(0, 0, w, h);
    const r = rand(9);
    for (let i = 0; i < 400; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.15})`;
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 3, x + 16, y); g.stroke();
    }
  }),
};

/** Sprite/plane label teks dari canvas. */
export function textTexture(lines, { w = 512, h = 256, bg = 'rgba(0,0,0,0)', color = '#fff', font = 'bold 54px system-ui, sans-serif', stroke = null, align = 'center' } = {}) {
  const c = canvas(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = align; g.textBaseline = 'middle';
    const arr = Array.isArray(lines) ? lines : [lines];
    arr.forEach((ln, i) => {
      const L = typeof ln === 'string' ? { text: ln } : ln;
      g.font = L.font || font;
      const y = h / 2 + (i - (arr.length - 1) / 2) * (L.gap || h / (arr.length + 0.6));
      const x = align === 'center' ? w / 2 : 20;
      if (stroke || L.stroke) { g.lineWidth = 8; g.strokeStyle = L.stroke || stroke; g.strokeText(L.text, x, y); }
      g.fillStyle = L.color || color;
      g.fillText(L.text, x, y);
    });
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
