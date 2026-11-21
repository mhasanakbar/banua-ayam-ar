// Model 3D prosedural daur hidup ayam (dipakai di laptop & HP).
import * as THREE from 'three';
import { DISH_STAGES, DISH_BUILDERS } from './dishes.js';

const LIFE_STAGES = [
  {
    n: 1, key: 'telur', name: 'Telur', emoji: '🥚', time: 'Hari ke-0',
    color: '#d98b4a',
    desc: 'Ayam betina bertelur. Di dalam telur ada kuning telur (sumber makanan) dan putih telur (pelindung & air). Hanya telur yang dibuahi pejantan yang bisa menetas menjadi anak ayam.',
    facts: ['Cangkang telur punya ribuan pori kecil untuk bernapas.', 'Induk membalik telurnya beberapa kali sehari.', 'Telur konsumsi dari toko umumnya tidak dibuahi, jadi tidak bisa menetas.'],
    tips: ['Pilih telur tetas yang bersih, tidak retak, dan bentuknya normal.', 'Simpan di tempat sejuk, sebaiknya ditetaskan sebelum berumur 7 hari.', 'Pelihara pejantan bersama betina agar telur dibuahi (fertil).'],
  },
  {
    n: 2, key: 'embrio', name: 'Telur (Embrio)', emoji: '🔬', time: 'Hari ke-1 s/d 20',
    color: '#e8734a',
    desc: 'Embrio tumbuh di dalam telur dan makan dari kuning telur. Pembuluh darah menyebar membawa makanan, lalu terbentuk jantung, mata, sayap, kaki, dan bulu. Telur harus tetap hangat, oleh induk atau mesin tetas.',
    facts: ['Hari ke-2: jantung embrio mulai berdetak.', 'Hari ke-7: paruh dan sayap mulai terbentuk.', 'Hari ke-14: bulu halus sudah tumbuh.'],
    tips: ['Jaga suhu sekitar 37,5–38 °C (mesin tetas sederhana dari kotak + lampu juga bisa).', 'Putar telur 3 kali sehari agar embrio tidak menempel di cangkang.', 'Teropong telur dengan senter (candling) di hari ke-7; buang telur yang kosong.'],
  },
  {
    n: 3, key: 'menetas', name: 'Telur Menetas', emoji: '🐣', time: 'Hari ke-21',
    color: '#f2b233',
    desc: 'Anak ayam memecah cangkang dengan "gigi telur", tonjolan kecil di ujung paruhnya. Ia mematuk sedikit demi sedikit sampai cangkang terbuka dan bisa keluar.',
    facts: ['Proses menetas bisa memakan waktu 12–24 jam.', 'Gigi telur akan lepas sendiri beberapa hari kemudian.', 'Anak ayam baru menetas masih basah dan lelah.'],
    tips: ['Mulai hari ke-18 berhenti memutar telur dan naikkan kelembapan.', 'Jangan membantu membuka cangkang terlalu cepat; biarkan anak ayam berusaha sendiri.', 'Pindahkan anak ayam ke tempat hangat setelah bulunya kering.'],
  },
  {
    n: 4, key: 'anak', name: 'Anak Ayam', emoji: '🐥', time: 'Minggu ke-1 s/d 6',
    color: '#f5cf2a',
    desc: 'Anak ayam berbulu halus kuning, langsung bisa berjalan, minum, dan mencari makan sendiri. Masa ini paling rawan: anak ayam butuh kehangatan, makanan, dan perlindungan.',
    facts: ['Anak ayam bisa makan sejak hari pertama.', 'Umur 4–6 minggu bulu halus berganti bulu sejati.', 'Anak ayam berciap untuk memanggil induknya.'],
    tips: ['Sediakan pemanas (lampu) sekitar 32–35 °C di minggu pertama, turunkan bertahap.', 'Beri air minum bersih dan pakan khusus anak ayam (starter) setiap hari.', 'Tanyakan jadwal vaksin tetelo (ND) ke petugas peternakan setempat.'],
  },
  {
    n: 5, key: 'dewasa', name: 'Ayam Dewasa', emoji: '🐔', time: 'Bulan ke-5 s/d 6',
    color: '#c4622d',
    desc: 'Ayam tumbuh dewasa dengan jengger merah dan bulu lengkap. Ayam betina mulai bertelur di sarang. Telur bisa dimakan keluarga, dijual, atau ditetaskan lagi: daur hidup berulang.',
    facts: ['Ayam kampung betina mulai bertelur sekitar umur 5–6 bulan.', 'Jengger & pial membantu ayam membuang panas.', 'Daur hidup berulang: telur → embrio → menetas → anak → dewasa.'],
    tips: ['Buat kandang panggung seperti rumah Banjar: aman dari genangan & banjir, lantai tetap kering.', 'Sisa dapur dan maggot bisa jadi pakan tambahan yang murah.', 'Sediakan sarang berjerami agar ayam nyaman bertelur.'],
  },
];

/** 1–5: daur hidup ayam, 6–10: masakan Banjar dari ayam. */
export const STAGES = [
  ...LIFE_STAGES.map((s) => ({ ...s, group: 'daur', label: `Tahap ${s.n}`, factsTitle: '✦ Fakta', tipsTitle: '🧑‍🌾 Tips beternak' })),
  ...DISH_STAGES,
];
export const GROUPS = {
  daur: { title: 'Daur Hidup Ayam', short: 'Daur hidup', stages: [1, 2, 3, 4, 5], done: 'Daur hidup lengkap!' },
  masak: { title: 'Masakan Banjar', short: 'Masakan', stages: [6, 7, 8, 9, 10], done: 'Semua masakan Banjar terkumpul!' },
};
export const TOTAL = STAGES.length;
export const groupOf = (n) => (n <= 5 ? 'daur' : 'masak');
export const byNum = (a, b) => a - b;

// ---------- Material helper ----------
const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts });
const M = {
  shell: () => std('#d98b4a', { roughness: 0.55 }),
  shellIn: () => std('#fbf1e2', { roughness: 0.9, side: THREE.BackSide }),
  chick: () => std('#ffd23f', { roughness: 0.95 }),
  chickDark: () => std('#f2b51e', { roughness: 0.95 }),
  orange: () => std('#f28c1b', { roughness: 0.5 }),
  black: () => std('#151010', { roughness: 0.25 }),
  white: () => std('#ffffff', { roughness: 0.3 }),
  red: () => std('#d4202a', { roughness: 0.6 }),
  hen: () => std('#c4622d', { roughness: 0.85 }),
  henLight: () => std('#e8a565', { roughness: 0.9 }),
  henDark: () => std('#7a3418', { roughness: 0.85 }),
  straw: () => std('#d6b064', { roughness: 1 }),
  strawDark: () => std('#a9853d', { roughness: 1 }),
};

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------- Profil telur ----------
const EGG_H = 0.9, EGG_R = 0.33;
const eggProfile = (() => {
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI;
    const y = ((1 - Math.cos(t)) / 2) * EGG_H;
    const r = Math.max(0.0001, Math.sin(t) * EGG_R * (1 + 0.12 * Math.cos(t)));
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
})();

function eggRadiusAt(y) {
  for (let i = 1; i < eggProfile.length; i++) {
    const a = eggProfile[i - 1], b = eggProfile[i];
    if (y <= b.y) {
      const k = (y - a.y) / Math.max(1e-6, b.y - a.y);
      return a.x + (b.x - a.x) * k;
    }
  }
  return 0.0001;
}

function eggGeometry() {
  return new THREE.LatheGeometry(eggProfile, 48);
}

// Potong telur bergerigi: keep = 'bottom' atau 'top'
function crackedEggGeometry(keep, cutY = EGG_H * 0.56, teeth = 9, depth = 0.07) {
  const g = new THREE.LatheGeometry(eggProfile, 64);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const phi = Math.atan2(v.x, v.z);
    const f = ((phi / (Math.PI * 2)) * teeth) % 1;
    const tri = Math.abs((f < 0 ? f + 1 : f) - 0.5) * 2; // 0..1
    const cut = cutY + (tri - 0.5) * depth;
    if ((keep === 'bottom' && v.y > cut) || (keep === 'top' && v.y < cut)) {
      const r = eggRadiusAt(cut);
      pos.setXYZ(i, Math.sin(phi) * r, cut, Math.cos(phi) * r);
    }
  }
  g.computeVertexNormals();
  return g;
}

function shellMesh(geo) {
  const g = new THREE.Group();
  g.add(mesh(geo, M.shell()));
  const inner = mesh(geo, M.shellIn());
  inner.scale.setScalar(0.985);
  g.add(inner);
  return g;
}

// ---------- Sarang jerami ----------
export function makeNest(radius = 0.55, eggs = 0) {
  const g = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(radius, radius * 0.32, 10, 28), M.straw());
  ring.rotation.x = Math.PI / 2;
  ring.position.y = radius * 0.22;
  ring.scale.z = 0.7;
  g.add(ring);
  const base = mesh(new THREE.CylinderGeometry(radius * 0.95, radius * 0.8, radius * 0.12, 24), M.strawDark());
  base.position.y = radius * 0.06;
  g.add(base);
  // helai jerami
  const strawGeo = new THREE.CylinderGeometry(0.006, 0.006, radius * 0.7, 3);
  const count = Math.round(140 * radius);
  const inst = new THREE.InstancedMesh(strawGeo, M.straw(), count);
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = radius * (0.75 + Math.random() * 0.55);
    d.position.set(Math.cos(a) * r, radius * (0.1 + Math.random() * 0.35), Math.sin(a) * r);
    d.rotation.set(Math.random() * 3, Math.random() * 3, Math.PI / 2 + (Math.random() - 0.5));
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  }
  inst.castShadow = true;
  g.add(inst);
  for (let i = 0; i < eggs; i++) {
    const e = mesh(eggGeometry(), M.shell());
    const a = (i / eggs) * Math.PI * 2 + 0.4;
    e.scale.setScalar(0.32);
    e.position.set(Math.cos(a) * radius * 0.55, radius * 0.12, Math.sin(a) * radius * 0.55);
    e.rotation.set(1.3, a, 0.2);
    g.add(e);
  }
  return g;
}

// ---------- Anak ayam ----------
export function makeChick() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const yellow = M.chick(), dark = M.chickDark();

  const torso = mesh(new THREE.SphereGeometry(0.3, 28, 20), yellow, 0, 0.36, 0);
  torso.scale.set(1, 0.92, 1.12);
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.68, 0.14);
  body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.21, 28, 20), yellow));
  // jambul bulu
  for (let i = 0; i < 3; i++) {
    const f = mesh(new THREE.SphereGeometry(0.05, 10, 8), yellow, (i - 1) * 0.04, 0.2, -0.02 + i * 0.01);
    f.scale.set(0.6, 1.4, 0.6);
    f.rotation.z = (i - 1) * 0.5;
    head.add(f);
  }
  const beak = mesh(new THREE.ConeGeometry(0.06, 0.13, 12), M.orange(), 0, -0.02, 0.24);
  beak.rotation.x = Math.PI / 2;
  head.add(beak);
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.035, 12, 10), M.black(), s * 0.1, 0.05, 0.16);
    head.add(eye);
    head.add(mesh(new THREE.SphereGeometry(0.012, 8, 6), M.white(), s * 0.108, 0.065, 0.19));
    const cheek = mesh(new THREE.SphereGeometry(0.03, 10, 8), std('#ff9a6b', { roughness: 1 }), s * 0.14, -0.03, 0.13);
    cheek.scale.z = 0.4;
    head.add(cheek);
  }

  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.27, 0.45, -0.02);
    const w = mesh(new THREE.SphereGeometry(0.13, 16, 12), dark, s * 0.03, -0.06, 0);
    w.scale.set(0.35, 0.8, 1.2);
    pivot.add(w);
    body.add(pivot);
    wings.push(pivot);
  }
  const tail = mesh(new THREE.SphereGeometry(0.08, 12, 10), dark, 0, 0.42, -0.33);
  tail.scale.set(1, 0.7, 1.2);
  tail.rotation.x = -0.6;
  body.add(tail);

  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.1, 0.13, 0.02);
    leg.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), M.orange(), 0, -0.04, 0));
    for (const a of [-0.5, 0, 0.5]) {
      const toe = mesh(new THREE.BoxGeometry(0.02, 0.015, 0.09), M.orange(), Math.sin(a) * 0.04, -0.12, Math.cos(a) * 0.04);
      toe.rotation.y = a;
      leg.add(toe);
    }
    g.add(leg);
    legs.push(leg);
  }

  g.userData.parts = { body, head, wings, legs };
  g.userData.update = (t, walking = 0) => {
    const hop = Math.abs(Math.sin(t * 6)) * 0.04 * (1 + walking);
    body.position.y = hop;
    head.rotation.x = Math.sin(t * 2.3) * 0.15 + (Math.sin(t * 0.7) > 0.85 ? 0.6 : 0); // sesekali mematuk
    head.rotation.y = Math.sin(t * 1.3) * 0.3;
    wings[0].rotation.z = -Math.abs(Math.sin(t * 9)) * 0.35;
    wings[1].rotation.z = Math.abs(Math.sin(t * 9)) * 0.35;
    legs[0].rotation.x = Math.sin(t * 10) * 0.5 * walking;
    legs[1].rotation.x = -Math.sin(t * 10) * 0.5 * walking;
  };
  return g;
}

// ---------- Ayam dewasa ----------
export function makeHen({ withLegs = true } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const base = withLegs ? 0.42 : 0.18;

  const torso = mesh(new THREE.SphereGeometry(0.42, 32, 24), M.hen(), 0, base + 0.3, 0);
  torso.scale.set(0.9, 0.82, 1.18);
  body.add(torso);
  const chest = mesh(new THREE.SphereGeometry(0.3, 24, 18), M.henLight(), 0, base + 0.3, 0.2);
  chest.scale.set(1, 1, 0.9);
  body.add(chest);

  // ekor kipas
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.22;
    const f = mesh(new THREE.SphereGeometry(0.12, 12, 10), i % 2 ? M.henDark() : M.hen(), Math.sin(a) * 0.12, base + 0.62, -0.45);
    f.scale.set(0.45, 2.2, 0.9);
    f.rotation.set(-0.55, 0, -a);
    body.add(f);
  }

  // leher + kepala
  const neck = mesh(new THREE.SphereGeometry(0.17, 18, 14), M.henLight(), 0, base + 0.62, 0.32);
  neck.scale.set(1, 1.5, 1);
  neck.rotation.x = 0.35;
  body.add(neck);
  const head = new THREE.Group();
  head.position.set(0, base + 0.88, 0.44);
  body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.15, 24, 18), M.hen()));
  for (let i = 0; i < 5; i++) {
    const c = mesh(new THREE.SphereGeometry(0.055 + (i === 2 ? 0.015 : 0), 12, 10), M.red(), 0, 0.15 + Math.sin((i / 4) * Math.PI) * 0.04, -0.09 + i * 0.045);
    c.scale.set(0.5, 1, 1);
    head.add(c);
  }
  for (const s of [-1, 1]) {
    const w = mesh(new THREE.SphereGeometry(0.04, 12, 10), M.red(), s * 0.025, -0.13, 0.11);
    w.scale.set(0.6, 1.4, 0.7);
    head.add(w);
    head.add(mesh(new THREE.SphereGeometry(0.028, 12, 10), std('#f5c518'), s * 0.09, 0.03, 0.09));
    head.add(mesh(new THREE.SphereGeometry(0.016, 8, 6), M.black(), s * 0.105, 0.035, 0.105));
  }
  const beak = mesh(new THREE.ConeGeometry(0.045, 0.12, 12), std('#f2b233', { roughness: 0.5 }), 0, -0.02, 0.19);
  beak.rotation.x = Math.PI / 2;
  head.add(beak);

  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.36, base + 0.42, 0.05);
    const w = mesh(new THREE.SphereGeometry(0.22, 18, 14), M.henDark(), s * 0.02, -0.08, -0.08);
    w.scale.set(0.3, 0.75, 1.3);
    pivot.add(w);
    body.add(pivot);
    wings.push(pivot);
  }

  const legs = [];
  if (withLegs) {
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.13, 0.3, 0.02);
      leg.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), std('#e7b52c'), 0, -0.13, 0));
      for (const a of [-0.55, 0, 0.55]) {
        const toe = mesh(new THREE.BoxGeometry(0.025, 0.02, 0.14), std('#e7b52c'), Math.sin(a) * 0.06, -0.29, Math.cos(a) * 0.06);
        toe.rotation.y = a;
        leg.add(toe);
      }
      g.add(leg);
      legs.push(leg);
    }
  }

  g.userData.update = (t, walking = 0) => {
    head.position.z = base * 0 + 0.44 + Math.max(0, Math.sin(t * 4)) * 0.05 * (0.3 + walking);
    head.rotation.y = Math.sin(t * 1.1) * 0.35;
    head.rotation.x = Math.sin(t * 0.6) > 0.9 ? 0.9 : 0; // mematuk
    const flap = Math.sin(t * 0.8) > 0.93 ? Math.abs(Math.sin(t * 25)) * 0.9 : 0.05;
    wings[0].rotation.z = -flap;
    wings[1].rotation.z = flap;
    body.position.y = Math.abs(Math.sin(t * 7)) * 0.02 * walking;
    if (legs.length) {
      legs[0].rotation.x = Math.sin(t * 7) * 0.5 * walking;
      legs[1].rotation.x = -Math.sin(t * 7) * 0.5 * walking;
    }
  };
  return g;
}

// ---------- Tahap-tahap ----------
function stageEgg() {
  const g = new THREE.Group();
  g.add(makeNest(0.42, 0));
  const egg = shellMesh(eggGeometry());
  egg.position.y = 0.08;
  const pivot = new THREE.Group();
  pivot.add(egg);
  g.add(pivot);
  g.userData.update = (t) => {
    pivot.rotation.z = Math.sin(t * 1.6) * 0.05;
    pivot.rotation.x = Math.cos(t * 1.3) * 0.04;
  };
  return g;
}

function stageEmbryo() {
  const g = new THREE.Group();
  g.add(makeNest(0.42, 0));
  const holder = new THREE.Group();
  holder.position.y = 0.08;
  g.add(holder);

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: '#f0b98a', transparent: true, opacity: 0.32, roughness: 0.15,
    side: THREE.DoubleSide, depthWrite: false, clearcoat: 1,
  });
  const shell = new THREE.Mesh(eggGeometry(), shellMat);
  shell.renderOrder = 2;
  holder.add(shell);
  // garis tepi "potongan"
  const rim = new THREE.Mesh(new THREE.TorusGeometry(eggRadiusAt(0.45) * 1.01, 0.008, 6, 64), std('#c06a30'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.45;
  holder.add(rim);

  // putih telur
  const albumen = new THREE.Mesh(eggGeometry(), new THREE.MeshPhysicalMaterial({ color: '#fff6dc', transparent: true, opacity: 0.18, depthWrite: false }));
  albumen.scale.setScalar(0.94);
  albumen.position.y = 0.025;
  holder.add(albumen);
  // rongga udara
  const air = mesh(new THREE.SphereGeometry(0.16, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.35, depthWrite: false }), 0, 0.72, 0);
  holder.add(air);

  // kuning telur
  const yolk = mesh(new THREE.SphereGeometry(0.17, 28, 20), std('#f6a316', { roughness: 0.4, emissive: '#5a2a00', emissiveIntensity: 0.3 }), 0, 0.3, 0);
  holder.add(yolk);
  // pembuluh darah
  const vesselMat = std('#c41a22', { roughness: 0.5, emissive: '#400', emissiveIntensity: 0.4 });
  for (let k = 0; k < 7; k++) {
    const pts = [];
    const a0 = (k / 7) * Math.PI * 2;
    for (let i = 0; i <= 8; i++) {
      const th = 0.25 + i * 0.12;
      const ph = a0 + Math.sin(i * 1.7 + k) * 0.25;
      pts.push(new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)).multiplyScalar(0.174).add(new THREE.Vector3(0, 0.3, 0)));
    }
    holder.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.006, 5), vesselMat));
  }

  // embrio melengkung
  const embryo = new THREE.Group();
  embryo.position.set(0, 0.5, 0);
  holder.add(embryo);
  const skin = std('#f19a9a', { roughness: 0.5, emissive: '#3a0a0a', emissiveIntensity: 0.25 });
  const curl = mesh(new THREE.TorusGeometry(0.075, 0.042, 14, 24, Math.PI * 1.45), skin);
  curl.rotation.set(0, Math.PI / 2, 0.4);
  embryo.add(curl);
  const head = mesh(new THREE.SphereGeometry(0.065, 20, 16), skin, 0, 0.06, 0.07);
  embryo.add(head);
  const eye = mesh(new THREE.SphereGeometry(0.03, 14, 10), M.black(), 0.045, 0.07, 0.09);
  embryo.add(eye);
  const eye2 = eye.clone(); eye2.position.x = -0.045; embryo.add(eye2);
  const heart = mesh(new THREE.SphereGeometry(0.022, 12, 10), std('#ff1e2d', { emissive: '#ff1e2d', emissiveIntensity: 0.8 }), 0, -0.02, 0.05);
  embryo.add(heart);
  for (const s of [-1, 1]) {
    const bud = mesh(new THREE.SphereGeometry(0.022, 10, 8), skin, s * 0.05, -0.03, -0.02);
    bud.scale.set(0.6, 0.6, 1.6);
    embryo.add(bud);
  }

  g.userData.update = (t) => {
    const beat = 1 + Math.max(0, Math.sin(t * 9)) * 0.45;
    heart.scale.setScalar(beat);
    embryo.rotation.y = Math.sin(t * 0.8) * 0.2;
    embryo.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03);
    holder.rotation.y = t * 0.25;
  };
  return g;
}

function stageHatching() {
  const g = new THREE.Group();
  g.add(makeNest(0.42, 0));
  const holder = new THREE.Group();
  holder.position.y = 0.08;
  g.add(holder);

  const bottom = shellMesh(crackedEggGeometry('bottom'));
  holder.add(bottom);

  const chick = makeChick();
  chick.scale.setScalar(0.72);
  chick.position.set(0, 0.16, 0);
  chick.userData.parts.legs.forEach((l) => (l.visible = false));
  holder.add(chick);

  const capPivot = new THREE.Group();
  capPivot.position.set(0, 0.75, -0.02);
  holder.add(capPivot);
  const cap = shellMesh(crackedEggGeometry('top'));
  cap.position.y = -EGG_H * 0.56 - 0.0;
  capPivot.add(cap);
  capPivot.rotation.z = 0.35;
  capPivot.scale.setScalar(0.9);

  // pecahan cangkang
  const frag = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const p = mesh(new THREE.CircleGeometry(0.05 + Math.random() * 0.03, 3), new THREE.MeshStandardMaterial({ color: '#d98b4a', side: THREE.DoubleSide }));
    const a = Math.random() * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.42, 0.04, Math.sin(a) * 0.42);
    p.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.5, 0, Math.random() * 6);
    frag.add(p);
  }
  g.add(frag);

  g.userData.update = (t) => {
    chick.userData.update(t);
    chick.position.y = 0.16 + Math.max(0, Math.sin(t * 3)) * 0.06;
    const push = Math.sin(t * 3);
    capPivot.position.y = 0.75 + Math.max(0, push) * 0.08;
    capPivot.rotation.z = 0.35 + Math.max(0, push) * 0.25;
    holder.rotation.z = Math.sin(t * 7) * (Math.sin(t * 0.9) > 0.5 ? 0.06 : 0.01);
  };
  return g;
}

function stageChick() {
  const g = new THREE.Group();
  const grass = mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.06, 32), std('#6fb04a', { roughness: 1 }), 0, 0.03, 0);
  g.add(grass);
  // biji jagung
  for (let i = 0; i < 10; i++) {
    const s = mesh(new THREE.SphereGeometry(0.018, 8, 6), std('#f2b233'), (Math.random() - 0.5) * 0.6, 0.065, 0.15 + Math.random() * 0.25);
    g.add(s);
  }
  const chick = makeChick();
  chick.scale.setScalar(1.05);
  chick.position.y = 0.06;
  g.add(chick);
  g.userData.update = (t) => {
    chick.userData.update(t, 0.3);
    chick.rotation.y = Math.sin(t * 0.5) * 0.5;
  };
  return g;
}

function stageHen() {
  const g = new THREE.Group();
  g.add(makeNest(0.62, 5));
  const hen = makeHen({ withLegs: false });
  hen.position.y = 0.05;
  hen.scale.setScalar(0.95);
  g.add(hen);
  g.userData.update = (t) => hen.userData.update(t, 0);
  return g;
}

const BUILDERS = [stageEgg, stageEmbryo, stageHatching, stageChick, stageHen, ...DISH_BUILDERS];

/** Bangun model tahap n (1..10). Tinggi ±1 unit, dasar di y=0. Panggil group.userData.update(t) tiap frame. */
export function buildStage(n) {
  const g = BUILDERS[n - 1]();
  g.userData.stage = STAGES[n - 1];
  return g;
}
