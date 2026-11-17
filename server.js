// Server lokal (LAN) untuk game 3D Rumah Banjar + scan QR daur hidup ayam.
// Jalankan: npm start   → buka http://localhost:3000 di laptop.
// HP cukup tersambung ke WiFi / hotspot yang sama, lalu scan QR dengan kamera bawaan.

import http from 'node:http';
import https from 'node:https';
import selfsigned from 'selfsigned';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
const CERT_DIR = path.join(__dirname, 'certs');
const PUBLIC = path.join(__dirname, 'public');
const THREE_DIR = path.join(__dirname, 'node_modules', 'three');
const STAGES = 5;

// ---------- Deteksi IP LAN ----------
function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const [name, list] of Object.entries(ifaces)) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (a.address.startsWith('169.254.')) continue; // link-local, tidak berguna
      if (/^(utun|awdl|llw|bridge|docker|veth|vmnet|vbox|virbr|zt|tailscale)/i.test(name)) continue;
      out.push({ name, address: a.address });
    }
  }
  // Prioritaskan WiFi / ethernet umum
  const rank = (n) => (/^(en0|wlan|wi-?fi|wlp)/i.test(n) ? 0 : /^(en|eth)/i.test(n) ? 1 : 2);
  out.sort((a, b) => rank(a.name) - rank(b.name));
  return out;
}

function primaryHost() {
  if (process.env.HOST_IP) return process.env.HOST_IP;
  const list = lanAddresses();
  return list.length ? list[0].address : 'localhost';
}

const safeHost = (h) => (typeof h === 'string' && /^[a-zA-Z0-9.\-:]{1,100}$/.test(h) ? h : null);

// ---------- State progres scan ----------
let scanned = []; // nomor tahap yang sudah discan (urut waktu)
const clients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

// ---------- Static files ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendFile(res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function safeJoin(root, rel) {
  const p = path.normalize(path.join(root, rel));
  return p.startsWith(root) ? p : null;
}

const notFound = (res) => { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404'); };
const json = (res, obj, code = 200) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
};

function state(req) {
  return {
    scanned,
    total: STAGES,
    port: PORT,
    httpsPort: HTTPS_PORT,
    host: primaryHost(),
    hosts: lanAddresses(),
    baseUrl: `http://${primaryHost()}:${PORT}`,
  };
}

// ---------- Router ----------
async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = decodeURIComponent(url.pathname);

  try {
    // Realtime (Server-Sent Events)
    if (p === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`event: state\ndata: ${JSON.stringify(state(req))}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); });
      return;
    }

    if (p === '/api/state') return json(res, state(req));

    let m;
    if ((m = p.match(/^\/api\/scan\/(\d)$/)) && req.method === 'POST') {
      const n = Number(m[1]);
      if (n < 1 || n > STAGES) return json(res, { error: 'tahap tidak valid' }, 400);
      const isNew = !scanned.includes(n);
      if (isNew) scanned.push(n);
      const ua = req.headers['user-agent'] || '';
      const device = /iphone|ipad/i.test(ua) ? 'iPhone' : /android/i.test(ua) ? 'Android' : 'Perangkat';
      console.log(`📱 Tahap ${n} discan oleh ${device} (${req.socket.remoteAddress})${isNew ? '' : ' [ulang]'}`);
      broadcast('scan', { stage: n, isNew, device, scanned });
      return json(res, { ok: true, isNew, scanned });
    }

    if (p === '/api/reset' && req.method === 'POST') {
      scanned = [];
      broadcast('reset', { scanned });
      console.log('↺ Progres direset');
      return json(res, { ok: true });
    }

    if ((m = p.match(/^\/api\/qr\/(\d|home)\.png$/))) {
      const host = safeHost(url.searchParams.get('host')) || primaryHost();
      // QR berisi alamat HTTPS halaman kamera AR (kamera HP butuh HTTPS)
      const target = m[1] === 'home' ? `https://${host}:${HTTPS_PORT}/ar.html` : `https://${host}:${HTTPS_PORT}/ar.html?s=${m[1]}`;
      const buf = await QRCode.toBuffer(target, {
        errorCorrectionLevel: 'M', margin: 3, width: 512,
        color: { dark: '#1b1208', light: '#ffffff' },
      });
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      return res.end(buf);
    }

    // Halaman
    if (p === '/' || p === '/index.html') return sendFile(res, path.join(PUBLIC, 'index.html'));
    if ((m = p.match(/^\/scan\/(\d)\/?$/))) { res.writeHead(302, { Location: `/scan.html?s=${m[1]}` }); return res.end(); }
    if (p === '/print') return sendFile(res, path.join(PUBLIC, 'print.html'));
    if (p === '/ar' || p === '/ar/' || p === '/ar.html') {
      // Kamera hanya boleh di HTTPS: alihkan otomatis bila dibuka lewat HTTP dari HP
      const h = (req.headers.host || '').split(':')[0];
      if (!req.socket.encrypted && !['localhost', '127.0.0.1'].includes(h)) {
        res.writeHead(302, { Location: `https://${h}:${HTTPS_PORT}/ar.html${url.search}` });
        return res.end();
      }
      return sendFile(res, path.join(PUBLIC, 'ar.html'));
    }
    if (p === '/vendor/jsQR.js') return sendFile(res, path.join(__dirname, 'node_modules', 'jsqr', 'dist', 'jsQR.js'));

    // Three.js dari node_modules (tanpa internet)
    if (p === '/vendor/three.module.js') return sendFile(res, path.join(THREE_DIR, 'build', 'three.module.js'));
    if (p.startsWith('/vendor/jsm/')) {
      const f = safeJoin(path.join(THREE_DIR, 'examples', 'jsm'), p.slice('/vendor/jsm/'.length));
      return f ? sendFile(res, f) : notFound(res);
    }

    const f = safeJoin(PUBLIC, p);
    return f ? sendFile(res, f) : notFound(res);
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('server error');
  }
}

// ---------- Sertifikat HTTPS lokal (self-signed) ----------
async function loadCert() {
  const ips = ['127.0.0.1', ...lanAddresses().map((a) => a.address)];
  if (process.env.HOST_IP) ips.push(process.env.HOST_IP);
  const keyFile = path.join(CERT_DIR, 'key.pem'), certFile = path.join(CERT_DIR, 'cert.pem'), metaFile = path.join(CERT_DIR, 'ips.json');
  try {
    const old = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    if (ips.every((ip) => old.includes(ip))) return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
  } catch {}
  const all = [...new Set(ips)];
  const notAfter = new Date(); notAfter.setFullYear(notAfter.getFullYear() + 2);
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'Rumah Banjar Lokal' }], {
    keySize: 2048, algorithm: 'sha256', notAfterDate: notAfter,
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
      { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, ...all.map((ip) => ({ type: 7, ip }))] },
    ],
  });
  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(keyFile, pems.private); fs.writeFileSync(certFile, pems.cert); fs.writeFileSync(metaFile, JSON.stringify(all));
  console.log('🔐 Sertifikat HTTPS lokal dibuat untuk: ' + all.join(', '));
  return { key: pems.private, cert: pems.cert };
}

const server = http.createServer(handler);
loadCert().then((opts) => {
  https.createServer(opts, handler).listen(HTTPS_PORT, '0.0.0.0');
}).catch((e) => console.error('Gagal membuat HTTPS:', e));

server.listen(PORT, '0.0.0.0', async () => {
  const host = primaryHost();
  const lanUrl = `http://${host}:${PORT}`;
  console.log('\n🏠  Banua Ayam AR — Daur Hidup Ayam Kampung');
  console.log('────────────────────────────────────────');
  console.log(`  Laptop  : http://localhost:${PORT}`);
  console.log(`  Jaringan: ${lanUrl}`);
  console.log(`  Kamera AR (HP): https://${host}:${HTTPS_PORT}/ar.html`);
  const others = lanAddresses().slice(1);
  if (others.length) console.log(`  IP lain : ${others.map((o) => `${o.address} (${o.name})`).join(', ')}`);
  console.log('  Cetak QR: ' + `http://localhost:${PORT}/print.html`);
  console.log('────────────────────────────────────────');
  console.log('  HP harus tersambung ke WiFi/hotspot yang SAMA dengan laptop.');
  console.log('  Scan QR ini dengan kamera HP untuk membuka Kamera AR');
  console.log('  (browser akan memperingatkan sertifikat → pilih Lanjutkan/Proceed):\n');
  try {
    console.log(await QRCode.toString(`https://${host}:${HTTPS_PORT}/ar.html`, { type: 'terminal', small: true }));
  } catch {}
});
