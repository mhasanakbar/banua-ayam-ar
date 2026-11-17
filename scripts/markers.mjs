// Buat file gambar marker QR (PNG) untuk dikumpulkan / dicetak.
// Pakai: node scripts/markers.mjs https://USERNAME.github.io/banua-ayam-ar/
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';

const base = (process.argv[2] || '').replace(/\/?$/, '/');
if (!/^https?:\/\//.test(base)) { console.error('Contoh: node scripts/markers.mjs https://USERNAME.github.io/banua-ayam-ar/'); process.exit(1); }
const out = path.join(process.cwd(), 'markers');
fs.mkdirSync(out, { recursive: true });
const names = ['telur', 'embrio', 'menetas', 'anak-ayam', 'ayam-dewasa'];
const opts = { errorCorrectionLevel: 'M', margin: 3, width: 1024, color: { dark: '#1b1208', light: '#ffffff' } };
await QRCode.toFile(path.join(out, '0-kamera-ar.png'), base + 'ar.html', opts);
for (let i = 0; i < 5; i++) await QRCode.toFile(path.join(out, `${i + 1}-${names[i]}.png`), `${base}ar.html?s=${i + 1}`, opts);
console.log('Marker dibuat di folder markers/ untuk', base);
