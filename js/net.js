// Lapisan jaringan: bekerja di dua mode.
//  1) Mode server lokal (npm start): progres tersinkron realtime antara HP & laptop lewat SSE.
//  2) Mode statis (GitHub Pages / hosting gratis): tanpa server; progres disimpan di perangkat (localStorage).
import qrcode from '../vendor/qrcode.mjs';

const KEY = 'banua-ayam-progress';
const listeners = new Set();
let scanned = [];
let es = null;

function readLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter((n) => n >= 1 && n <= 5); } catch { return []; }
}
function writeLocal(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} }
function emit(type, extra = {}) { for (const cb of listeners) cb({ type, scanned: [...scanned], ...extra }); }

export const net = {
  server: false,          // true jika server lokal Node tersedia
  info: null,             // /api/state dari server lokal
  host: location.hostname,

  async init() {
    try {
      const r = await fetch('api/state', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
        this.info = await r.json();
        this.server = true;
      }
    } catch {}
    if (this.server) {
      scanned = this.info.scanned || [];
      es = new EventSource('events');
      es.onopen = () => emit('online');
      es.onerror = () => emit('offline');
      es.addEventListener('state', (e) => { scanned = JSON.parse(e.data).scanned; emit('state'); });
      es.addEventListener('scan', (e) => { const d = JSON.parse(e.data); scanned = d.scanned; emit('scan', d); });
      es.addEventListener('reset', () => { scanned = []; emit('reset'); });
    } else {
      scanned = readLocal();
      // sinkron antar-tab di perangkat yang sama
      addEventListener('storage', (e) => {
        if (e.key !== KEY) return;
        const old = scanned;
        scanned = readLocal();
        const added = scanned.find((n) => !old.includes(n));
        if (added) emit('scan', { stage: added, isNew: true, device: 'Perangkat ini' });
        else if (!scanned.length) emit('reset');
        else emit('state');
      });
      setTimeout(() => emit('online'), 0);
    }
    return this;
  },

  get scanned() { return [...scanned]; },
  on(cb) { listeners.add(cb); cb({ type: 'state', scanned: [...scanned] }); return () => listeners.delete(cb); },

  async scan(n) {
    if (this.server) {
      const d = await fetch(`api/scan/${n}`, { method: 'POST' }).then((r) => r.json());
      scanned = d.scanned;
      return d;
    }
    const isNew = !scanned.includes(n);
    if (isNew) { scanned = [...scanned, n]; writeLocal(scanned); }
    emit('scan', { stage: n, isNew, device: 'Perangkat ini', scanned });
    return { ok: true, isNew, scanned: [...scanned] };
  },

  async reset() {
    if (this.server) { await fetch('api/reset', { method: 'POST' }); return; }
    scanned = []; writeLocal([]); emit('reset');
  },

  /** Daftar alamat jaringan (mode server) untuk dipilih. */
  hosts() { return this.server ? this.info.hosts.map((h) => h.address) : []; },
  defaultHost() {
    if (!this.server) return location.host;
    const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);
    return local ? this.info.host : location.hostname;
  },

  /** URL dasar yang dibuka HP. Mode statis: alamat situs ini. Mode server: HTTPS lokal. */
  baseUrl(host = this.host) {
    if (!this.server) return new URL('.', location.href).href;
    return `https://${host}:${this.info.httpsPort}/`;
  },
  arUrl(n, host) { return this.baseUrl(host) + 'ar.html' + (n ? `?s=${n}` : ''); },

  /** QR sebagai data URL (dibuat di browser, tanpa internet). */
  qrDataUrl(text, cell = 8, margin = 3) {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const count = q.getModuleCount();
    const size = (count + margin * 2) * cell;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#1b1208';
    for (let r = 0; r < count; r++) for (let col = 0; col < count; col++) {
      if (q.isDark(r, col)) g.fillRect((col + margin) * cell, (r + margin) * cell, cell, cell);
    }
    return c.toDataURL('image/png');
  },
};
