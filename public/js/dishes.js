// 5 masakan Banjar dari ayam (tahap 6–10): data konten + model 3D prosedural.
import * as THREE from 'three';

export const DISH_STAGES = [
  {
    n: 6, key: 'soto', name: 'Soto Banjar', emoji: '🍲', time: 'Masakan Banjar · berkuah',
    color: '#e0a43a',
    desc: 'Soto khas Banjar berkuah bening dan harum rempah. Isinya suwiran ayam kampung, ketupat atau lontong, perkedel, telur rebus, dan bihun. Menu sarapan favorit di Banjarmasin, termasuk di warung tepi sungai.',
    facts: ['Ayam kampung (direbus, lalu disuwir)', 'Rempah: kayu manis, cengkih, pala, kapulaga, bawang merah & putih', 'Pelengkap: ketupat, perkedel kentang, telur rebus, bihun, jeruk nipis'],
    tips: ['Rebus ayam kampung bersama rempah hingga empuk, angkat lalu suwir dagingnya.', 'Tumis bumbu halus sampai harum, masukkan ke kaldu, masak sebentar.', 'Tata ketupat, suwiran ayam, telur, perkedel, dan bihun di mangkuk, siram kuah panas, taburi bawang goreng & daun bawang.'],
  },
  {
    n: 7, key: 'habang', name: 'Ayam Masak Habang', emoji: '🌶️', time: 'Masakan Banjar · lauk',
    color: '#b3261e',
    desc: '"Habang" dalam bahasa Banjar berarti merah. Ayam dimasak dengan bumbu cabai merah kering sehingga kuahnya merah pekat, rasanya manis dan gurih. Wajib ada di acara selamatan dan hari raya.',
    facts: ['Ayam kampung potong (paha & dada)', 'Cabai merah kering besar yang direndam air panas', 'Bawang merah, bawang putih, gula merah, sedikit kecap & asam'],
    tips: ['Goreng ayam sebentar sampai kulitnya kering (setengah matang).', 'Haluskan cabai kering bersama bawang, lalu tumis sampai minyaknya merah.', 'Masukkan ayam, gula merah, dan sedikit air; masak dengan api kecil sampai bumbu kental dan meresap.'],
  },
  {
    n: 8, key: 'kuning', name: 'Nasi Kuning Banjar', emoji: '🍛', time: 'Masakan Banjar · sarapan',
    color: '#f2c230',
    desc: 'Nasi gurih berwarna kuning karena santan dan kunyit. Di Banjarmasin biasa disantap pagi hari dengan lauk ayam atau telur masak habang, serundeng, dan sambal. Juga hadir di acara selamatan.',
    facts: ['Beras, santan, kunyit, serai, daun salam', 'Lauk: ayam / telur masak habang', 'Pelengkap: serundeng, sambal, irisan mentimun'],
    tips: ['Cuci beras, lalu aron (masak setengah matang) dengan santan, air kunyit, serai, dan daun salam.', 'Kukus nasi aron sampai matang dan pulen.', 'Bentuk nasi di atas daun pisang, sajikan bersama ayam masak habang, telur, serundeng, dan sambal.'],
  },
  {
    n: 9, key: 'orari', name: 'Lontong Orari', emoji: '🍙', time: 'Masakan Banjar · menu sahur',
    color: '#5f9b3c',
    desc: 'Lontong khas Banjar yang terkenal sebagai menu sahur di bulan Ramadan. Potongan lontongnya besar, disiram kuah santan, lalu dilengkapi telur masak habang dan lauk ayam.',
    facts: ['Beras dibungkus daun pisang, direbus lama hingga padat', 'Kuah santan berbumbu (bisa dengan sayur nangka/kacang)', 'Lauk: telur & ayam masak habang'],
    tips: ['Isi daun pisang dengan beras, gulung rapat, lalu rebus beberapa jam sampai padat.', 'Masak kuah santan berbumbu dengan api kecil agar santan tidak pecah.', 'Potong lontong besar-besar, siram kuah, tambahkan telur dan ayam masak habang.'],
  },
  {
    n: 10, key: 'kandangan', name: 'Ketupat Kandangan', emoji: '🥥', time: 'Masakan Banjar · khas Kandangan',
    color: '#9a7a2c',
    desc: 'Ketupat khas kota Kandangan (Hulu Sungai Selatan) yang disiram kuah santan kental berempah. Lauk aslinya ikan haruan panggang, dan versi ayam kampung panggang juga banyak dijual.',
    facts: ['Ketupat dari anyaman janur (daun kelapa muda)', 'Kuah santan kental berbumbu kunyit & rempah', 'Ayam kampung panggang, sambal, perasan limau'],
    tips: ['Anyam janur menjadi ketupat, isi beras sebagian, lalu rebus 4–5 jam.', 'Panggang ayam kampung yang sudah dibumbui sampai harum.', 'Belah ketupat di piring, siram kuah santan, sajikan dengan ayam panggang, sambal, dan limau.'],
  },
].map((s, i) => ({ ...s, group: 'masak', label: `Masakan ${i + 1}`, factsTitle: '🧂 Bahan utama', tipsTitle: '👩‍🍳 Cara memasak' }));

// ---------- helper ----------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// tekstur anyaman janur untuk ketupat
let weaveTex = null;
export function janurTexture() {
  if (weaveTex) return weaveTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c9c46a'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const up = (i + j) % 2 === 0;
    g.fillStyle = up ? '#d8d47c' : '#a9a64c';
    g.fillRect(i * 16 + 1, j * 16 + 1, 14, 14);
    g.strokeStyle = 'rgba(90,90,30,0.5)'; g.lineWidth = 1;
    if (up) { g.beginPath(); g.moveTo(i * 16 + 2, j * 16 + 8); g.lineTo(i * 16 + 14, j * 16 + 8); g.stroke(); }
    else { g.beginPath(); g.moveTo(i * 16 + 8, j * 16 + 2); g.lineTo(i * 16 + 8, j * 16 + 14); g.stroke(); }
  }
  weaveTex = new THREE.CanvasTexture(c);
  weaveTex.colorSpace = THREE.SRGBColorSpace;
  return weaveTex;
}

/** Ketupat utuh (anyaman janur) — dipakai juga sebagai dekorasi di dapur. */
export function makeKetupat(size = 0.22, tails = true) {
  const g = new THREE.Group();
  const body = mesh(g, new THREE.BoxGeometry(size, size, size * 0.8), std('#ffffff', { map: janurTexture(), roughness: 0.85 }));
  body.rotation.z = Math.PI / 4;
  if (tails) {
    const leaf = std('#b8b35a', { side: THREE.DoubleSide, roughness: 0.9 });
    for (const s of [-1, 1]) {
      const t = mesh(g, new THREE.PlaneGeometry(size * 0.12, size * 1.1), leaf, s * size * 0.06, size * 0.95, 0);
      t.rotation.z = s * 0.25;
    }
  }
  return g;
}

function plate(parent, r = 0.5, color = '#f4f1ea', rim = '#2f6f8f') {
  const p = mesh(parent, new THREE.CylinderGeometry(r, r * 0.8, 0.05, 40), std(color, { roughness: 0.25 }), 0, 0.025, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.97, 0.012, 6, 48), std(rim, { roughness: 0.3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.052; parent.add(ring);
  return p;
}
function bananaLeaf(parent, r = 0.6) {
  const leaf = mesh(parent, new THREE.CircleGeometry(r, 40), std('#3f8a2e', { side: THREE.DoubleSide, roughness: 0.7 }), 0, 0.058, 0);
  leaf.rotation.x = -Math.PI / 2; leaf.scale.set(1, 0.8, 1);
  // tulang daun
  const vein = mesh(parent, new THREE.BoxGeometry(r * 1.9, 0.004, 0.012), std('#78b85a'), 0, 0.061, 0);
  vein.scale.z = 1;
  return leaf;
}
function bowl(parent, r = 0.38, h = 0.26, color = '#f6f3ec', rim = '#2f6f8f') {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(r * (0.45 + 0.55 * Math.sin(t * Math.PI / 2)), h * t)); }
  const b = mesh(parent, new THREE.LatheGeometry(pts, 40), std(color, { roughness: 0.25, side: THREE.DoubleSide }));
  const foot = mesh(parent, new THREE.CylinderGeometry(r * 0.42, r * 0.45, 0.03, 32), std(color, { roughness: 0.3 }), 0, 0.015, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 48), std(rim)); ring.rotation.x = Math.PI / 2; ring.position.y = h; parent.add(ring);
  return b;
}
function drumstick(parent, color, x, y, z, rotY = 0, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; g.scale.setScalar(s); parent.add(g);
  const meat = mesh(g, new THREE.SphereGeometry(0.09, 18, 14), std(color, { roughness: 0.35 }));
  meat.scale.set(1.6, 0.9, 1);
  const bone = mesh(g, new THREE.CylinderGeometry(0.018, 0.022, 0.12, 8), std('#efe6d2'), 0.17, 0.01, 0);
  bone.rotation.z = Math.PI / 2;
  mesh(g, new THREE.SphereGeometry(0.03, 8, 6), std('#efe6d2'), 0.23, 0.01, 0);
  return g;
}
function eggHalf(parent, x, y, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; parent.add(g);
  const white = mesh(g, new THREE.SphereGeometry(0.07, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), std('#fbfaf5', { roughness: 0.4 }));
  white.scale.set(1, 0.7, 1.3); white.rotation.x = Math.PI;
  white.position.y = 0.05;
  const yolk = mesh(g, new THREE.CircleGeometry(0.038, 18), std('#f2a81d'), 0, 0.051, 0);
  yolk.rotation.x = -Math.PI / 2;
  return g;
}
function redEgg(parent, x, y, z) {
  const e = mesh(parent, new THREE.SphereGeometry(0.075, 18, 14), std('#9c2316', { roughness: 0.3 }), x, y, z);
  e.scale.set(1, 1.25, 1);
  return e;
}
function chiliPile(parent, x, z, n = 6) {
  const r = rand(n * 7);
  for (let i = 0; i < n; i++) {
    const c = mesh(parent, new THREE.ConeGeometry(0.018, 0.12, 8), std('#c4161c', { roughness: 0.3 }), x + (r() - 0.5) * 0.1, 0.07, z + (r() - 0.5) * 0.1);
    c.rotation.set(Math.PI / 2, r() * 3, 0);
  }
}
function sambal(parent, x, z, r = 0.06) {
  const s = mesh(parent, new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#c8321f', { roughness: 0.5 }), x, 0.055, z);
  s.scale.y = 0.6;
}
function lime(parent, x, z) {
  const l = mesh(parent, new THREE.SphereGeometry(0.045, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#7bbf3a'), x, 0.055, z);
  l.rotation.x = Math.PI / 2;
  const face = mesh(parent, new THREE.CircleGeometry(0.043, 14), std('#d6ec9b'), x, 0.055, z + 0.001);
  return l;
}
function steam(parent, y0 = 0.35, count = 6) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat.clone());
    p.userData.phase = i / count;
    parent.add(p); puffs.push(p);
  }
  return (t) => puffs.forEach((p, i) => {
    const k = (t * 0.35 + p.userData.phase) % 1;
    p.position.set(Math.sin(i * 2.1 + t) * 0.08, y0 + k * 0.5, Math.cos(i * 1.7) * 0.08);
    p.scale.setScalar(0.6 + k * 1.6);
    p.material.opacity = 0.28 * (1 - k);
  });
}

// ---------- 5 masakan ----------
function dishSoto() {
  const g = new THREE.Group();
  plate(g, 0.52, '#e9dfc9', '#8b5a2b');
  const b = new THREE.Group(); b.position.y = 0.05; g.add(b);
  bowl(b, 0.38, 0.27);
  const broth = mesh(b, new THREE.CylinderGeometry(0.355, 0.33, 0.02, 40), std('#e8b54a', { transparent: true, opacity: 0.82, roughness: 0.1 }), 0, 0.22, 0);
  const r = rand(3);
  // suwiran ayam
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.24;
    const s = mesh(b, new THREE.BoxGeometry(0.08, 0.012, 0.018), std('#e6c9a0', { roughness: 0.8 }), Math.cos(a) * d, 0.235, Math.sin(a) * d);
    s.rotation.y = r() * 3;
  }
  // ketupat potong, telur, perkedel
  for (const [x, z] of [[-0.14, 0.1], [-0.05, 0.18]]) { const k = mesh(b, new THREE.BoxGeometry(0.08, 0.06, 0.08), std('#f3efe0', { roughness: 0.9 }), x, 0.235, z); k.rotation.y = r(); }
  eggHalf(b, 0.13, 0.19, 0.08, 0.4);
  const perk = mesh(b, new THREE.SphereGeometry(0.06, 14, 10), std('#a8682c', { roughness: 0.7 }), 0.08, 0.235, -0.15); perk.scale.y = 0.55;
  // bihun & daun bawang
  for (let i = 0; i < 10; i++) { const h = mesh(b, new THREE.TorusGeometry(0.03, 0.003, 4, 12), std('#f5f0e0'), -0.1 + r() * 0.08, 0.237, -0.1 + r() * 0.06); h.rotation.x = Math.PI / 2; }
  for (let i = 0; i < 14; i++) { const d = mesh(b, new THREE.TorusGeometry(0.012, 0.004, 4, 10), std('#4f9a2e'), (r() - 0.5) * 0.4, 0.24, (r() - 0.5) * 0.4); d.rotation.x = Math.PI / 2; }
  lime(g, 0.42, 0.2);
  const k = makeKetupat(0.16); k.position.set(-0.42, 0.16, -0.12); k.rotation.y = 0.5; g.add(k);
  const st = steam(b, 0.3);
  g.userData.update = (t) => st(t);
  return g;
}

function dishHabang() {
  const g = new THREE.Group();
  plate(g, 0.55);
  const sauce = mesh(g, new THREE.CircleGeometry(0.42, 40), std('#9e1f14', { roughness: 0.15 }), 0, 0.054, 0);
  sauce.rotation.x = -Math.PI / 2;
  const red = '#8c1e12';
  drumstick(g, red, -0.12, 0.12, -0.08, 0.3, 1.15);
  drumstick(g, red, 0.06, 0.12, 0.12, 2.6, 1.15);
  drumstick(g, red, 0.12, 0.16, -0.12, -0.9, 1.05);
  // potongan dada
  const breast = mesh(g, new THREE.SphereGeometry(0.11, 16, 12), std(red, { roughness: 0.3 }), -0.18, 0.11, 0.16); breast.scale.set(1.2, 0.7, 1);
  chiliPile(g, 0.32, 0.22, 5);
  for (let i = 0; i < 8; i++) { const o = mesh(g, new THREE.SphereGeometry(0.015, 8, 6), std('#e8d4a8'), (Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.5); o.scale.y = 0.5; }
  const st = steam(g, 0.3, 4);
  g.userData.update = (t) => st(t);
  return g;
}

function dishNasiKuning() {
  const g = new THREE.Group();
  plate(g, 0.56, '#f4f1ea', '#c48a2a');
  bananaLeaf(g, 0.5);
  const rice = mesh(g, new THREE.SphereGeometry(0.22, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), std('#f2c230', { roughness: 0.95 }), -0.08, 0.06, -0.02);
  rice.scale.y = 1.1;
  const r = rand(8);
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2, el = r() * 1.4;
    const gr = mesh(g, new THREE.SphereGeometry(0.012, 6, 4), std('#f7d14d'), -0.08 + Math.cos(a) * Math.cos(el) * 0.22, 0.06 + Math.sin(el) * 0.24, -0.02 + Math.sin(a) * Math.cos(el) * 0.22);
    gr.scale.set(1, 0.6, 1.6);
  }
  drumstick(g, '#8c1e12', 0.25, 0.1, 0.1, 2.2, 1);
  redEgg(g, 0.2, 0.12, -0.2);
  // serundeng
  for (let i = 0; i < 40; i++) mesh(g, new THREE.SphereGeometry(0.012, 5, 4), std('#8a5a24'), -0.25 + (r() - 0.5) * 0.12, 0.065, 0.28 + (r() - 0.5) * 0.08);
  sambal(g, 0.05, 0.3);
  for (let i = 0; i < 3; i++) { const c = mesh(g, new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16), std('#9fd06a'), 0.36, 0.07 + i * 0.002, -0.02 + i * 0.05); c.rotation.x = 0.2; }
  g.userData.update = () => {};
  return g;
}

function dishOrari() {
  const g = new THREE.Group();
  plate(g, 0.56, '#f4f1ea', '#5f9b3c');
  const kuah = mesh(g, new THREE.CircleGeometry(0.46, 40), std('#f0c768', { roughness: 0.15 }), 0, 0.055, 0);
  kuah.rotation.x = -Math.PI / 2;
  // lontong segitiga besar
  for (const [x, z, ry] of [[-0.14, -0.05, 0.3], [0.02, -0.18, 1.4], [-0.02, 0.08, 2.6]]) {
    const l = new THREE.Group(); l.position.set(x, 0.12, z); l.rotation.set(0, ry, 0); g.add(l);
    mesh(l, new THREE.CylinderGeometry(0.13, 0.13, 0.12, 3), std('#f2f0e4', { roughness: 0.95 }));
    const skin = mesh(l, new THREE.CylinderGeometry(0.133, 0.133, 0.122, 3, 1, true), std('#9cc27a', { side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.55 }));
  }
  redEgg(g, 0.24, 0.11, 0.12);
  drumstick(g, '#8c1e12', 0.2, 0.11, -0.22, -2.4, 0.95);
  // potongan nangka
  for (let i = 0; i < 5; i++) { const n = mesh(g, new THREE.BoxGeometry(0.05, 0.03, 0.04), std('#e2b75a'), -0.3 + i * 0.04, 0.07, 0.25); n.rotation.y = i; }
  const st = steam(g, 0.3, 4);
  g.userData.update = (t) => st(t);
  return g;
}

function dishKandangan() {
  const g = new THREE.Group();
  plate(g, 0.58, '#f4f1ea', '#9a7a2c');
  const kuah = mesh(g, new THREE.CircleGeometry(0.47, 40), std('#f3e2b8', { roughness: 0.15 }), 0, 0.055, 0);
  kuah.rotation.x = -Math.PI / 2;
  // ketupat dibelah (isi nasi putih padat)
  for (const [x, z, ry] of [[-0.12, 0.02, 0.4], [0.04, -0.14, -0.6]]) {
    const half = new THREE.Group(); half.position.set(x, 0.1, z); half.rotation.y = ry; g.add(half);
    const box = mesh(half, new THREE.BoxGeometry(0.15, 0.1, 0.15), std('#ffffff', { map: janurTexture(), roughness: 0.85 }));
    const cut = mesh(half, new THREE.PlaneGeometry(0.14, 0.14), std('#f6f3e6', { roughness: 0.95 }), 0, 0.051, 0);
    cut.rotation.x = -Math.PI / 2;
  }
  // ayam panggang
  const grill = '#7a3a18';
  drumstick(g, grill, 0.22, 0.12, 0.14, 2.4, 1.15);
  const leg = mesh(g, new THREE.SphereGeometry(0.1, 16, 12), std('#8a4520', { roughness: 0.5 }), -0.06, 0.12, 0.24); leg.scale.set(1.3, 0.7, 1);
  for (let i = 0; i < 4; i++) mesh(g, new THREE.BoxGeometry(0.2, 0.006, 0.01), std('#3a1a08'), -0.06, 0.16, 0.2 + i * 0.03);
  sambal(g, 0.3, -0.15);
  lime(g, -0.32, -0.22);
  const k = makeKetupat(0.18); k.position.set(-0.36, 0.18, 0.28); k.rotation.y = -0.4; g.add(k);
  g.userData.update = () => {};
  return g;
}

export const DISH_BUILDERS = [dishSoto, dishHabang, dishNasiKuning, dishOrari, dishKandangan];
