// Membangun dunia 3D: langit, halaman, sungai, Rumah Banjar (Bubungan Tinggi), furnitur, stasiun QR.
import * as THREE from 'three';
import { tex, textTexture } from './textures.js';
import { STAGES, buildStage, makeHen, makeChick } from './models.js';

export const FH = 2.0;   // tinggi lantai rumah panggung
export const WH = 3.2;   // tinggi dinding ruang utama
const WINGH = 2.8;       // tinggi dinding anjung
const T = 0.15;          // tebal dinding

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const COL = {
  woodDark: '#5a3018', wood: '#8b4f2a', woodLight: '#b9773f', post: '#7a4424',
  white: '#f4efe6', gold: '#d9a441', green: '#3f7d2c',
};

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function buildWorld(scene, { qrHost, onCluck } = {}) {
  const colliders = [];
  const interactables = [];
  const updaters = [];
  const R = rng(42);

  // ---------- helper ----------
  function box(parent, w, h, d, mat, x, y, z, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = receive;
    parent.add(m);
    return m;
  }
  function cyl(parent, rt, rb, h, mat, x, y, z, seg = 16) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function addCollider(minX, maxX, minZ, maxZ, minY = -10, maxY = 100) {
    colliders.push({ minX, maxX, minZ, maxZ, minY, maxY });
  }
  const plankMat = (rx, ry, color = '#ffffff') => std(color, { map: tex('planks', rx, ry), roughness: 0.85 });
  const darkWood = std(COL.woodDark, { roughness: 0.7 });
  const midWood = std(COL.wood, { roughness: 0.7 });
  const lightWood = std(COL.woodLight, { roughness: 0.7 });

  // ======================================================
  // LANGIT, MATAHARI, AWAN
  // ======================================================
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#4fa3e6') }, bottom: { value: new THREE.Color('#dff1fb') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = max(vP.y,0.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.55)),1.0); }',
    }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog('#dff1fb', 70, 260);

  const sunDir = new THREE.Vector3(0.45, 0.75, 0.35).normalize();
  const sun = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffe23a', fog: false }));
  sun.position.copy(sunDir).multiplyScalar(300);
  scene.add(sun);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: (() => { const t = textTexture('', { w: 128, h: 128 }); const c = t.image.getContext('2d'); const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,150,0.9)'); gr.addColorStop(1, 'rgba(255,240,150,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); t.needsUpdate = true; return t; })(),
    transparent: true, depthWrite: false, fog: false,
  }));
  halo.scale.set(70, 70, 1);
  halo.position.copy(sun.position);
  scene.add(halo);

  const hemi = new THREE.HemisphereLight('#d6ecff', '#6b8a48', 1.25);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight('#ffffff', 0.25));
  const sunLight = new THREE.DirectionalLight('#fff1d6', 2.6);
  sunLight.position.copy(sunDir).multiplyScalar(60);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera;
  sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 10; sc.far = 140;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const clouds = new THREE.Group();
  const cloudMat = std('#ffffff', { roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.35 });
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    const n = 5 + Math.floor(R() * 5);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(3 + R() * 3, 14, 10), cloudMat);
      s.position.set((k - n / 2) * 3.2 + R() * 2, R() * 2.5, R() * 3);
      s.scale.y = 0.75;
      c.add(s);
    }
    c.position.set(-160 + R() * 320, 38 + R() * 22, -150 + R() * 260);
    c.userData.speed = 0.6 + R() * 1.2;
    clouds.add(c);
  }
  scene.add(clouds);
  updaters.push((t, dt) => {
    for (const c of clouds.children) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 180) c.position.x = -180;
    }
  });

  // ======================================================
  // TANAH, JALAN, SUNGAI, DERMAGA
  // ======================================================
  const groundMat = std('#ffffff', { map: tex('grass', 40, 30), roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 160), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 55); // z dari -25 s/d 135
  ground.receiveShadow = true;
  scene.add(ground);
  const farBank = new THREE.Mesh(new THREE.PlaneGeometry(260, 120), std('#ffffff', { map: tex('grass', 40, 20), roughness: 1 }));
  farBank.rotation.x = -Math.PI / 2;
  farBank.position.set(0, 0, -100);
  farBank.receiveShadow = true;
  scene.add(farBank);
  // tebing sungai
  for (const z of [-25, -40]) box(scene, 260, 0.9, 0.6, std('#7a5a3a', { map: tex('dirt', 60, 1) }), 0, -0.4, z, { cast: false });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(260, 15, 80, 6), std('#ffffff', { map: tex('water', 30, 2), roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.35, -32.5);
  scene.add(water);
  const riverBed = new THREE.Mesh(new THREE.PlaneGeometry(260, 15), std('#3f5a46'));
  riverBed.rotation.x = -Math.PI / 2; riverBed.position.set(0, -0.8, -32.5); scene.add(riverBed);
  updaters.push((t) => { water.material.map.offset.x = t * 0.02; water.material.map.offset.y = Math.sin(t * 0.4) * 0.02; });

  // tanah di bawah rumah
  const under = new THREE.Mesh(new THREE.PlaneGeometry(19, 15), std('#ffffff', { map: tex('dirt', 6, 5) }));
  under.rotation.x = -Math.PI / 2; under.position.set(0, 0.012, -0.5); under.receiveShadow = true; scene.add(under);
  // jalan setapak
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 16), std('#ffffff', { map: tex('dirt', 1, 6) }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.015, 18); path.receiveShadow = true; scene.add(path);
  const stoneMat = std('#9a9a92', { roughness: 0.9 });
  for (let z = 10.8; z < 26; z += 1.1) {
    const s = cyl(scene, 0.45, 0.5, 0.08, stoneMat, (R() - 0.5) * 0.5, 0.04, z, 9);
    s.rotation.y = R() * 3;
  }

  // dermaga (titian) ke sungai
  const jetty = new THREE.Group();
  scene.add(jetty);
  for (let z = -24; z >= -31; z -= 0.5) box(jetty, 2.0, 0.08, 0.45, plankMat(1, 0.3, '#c58d5a'), 7, 0.18, z);
  for (const x of [6.1, 7.9]) for (let z = -24; z >= -31; z -= 2.3) cyl(jetty, 0.08, 0.08, 1.6, darkWood, x, -0.5, z, 8);
  // jukung (perahu Banjar)
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 6, 16, 1, true, 0, Math.PI), std('#6b3a1e', { side: THREE.DoubleSide }));
  hull.rotation.set(0, 0, Math.PI / 2); hull.rotation.x = Math.PI; hull.scale.set(1, 1, 0.75);
  hull.rotation.order = 'ZXY';
  boat.add(hull);
  hull.rotation.set(Math.PI, 0, Math.PI / 2);
  box(boat, 0.1, 0.06, 1.0, lightWood, -1, 0.0, 0);
  box(boat, 0.1, 0.06, 1.0, lightWood, 1, 0.0, 0);
  const paddle = box(boat, 0.06, 0.06, 1.8, lightWood, 0, 0.1, 0.2);
  paddle.rotation.y = 0.5;
  boat.position.set(10, -0.3, -33);
  scene.add(boat);
  updaters.push((t) => { boat.position.y = -0.3 + Math.sin(t * 1.3) * 0.05; boat.rotation.z = Math.sin(t * 0.9) * 0.04; });

  // ======================================================
  // RUMAH BANJAR (BUBUNGAN TINGGI)
  // ======================================================
  const house = new THREE.Group();
  scene.add(house);

  // ----- tiang (rumah panggung) -----
  const postMat = std(COL.post, { roughness: 0.8 });
  const posts = [];
  for (let x = -5; x <= 5.01; x += 2.5) for (let z = -6; z <= 7.01; z += 2.6) posts.push([x, z]);
  for (const sx of [-1, 1]) for (const x of [6.5, 8]) for (const z of [-3, -1, 1]) posts.push([sx * x, z]);
  for (const [x, z] of posts) {
    cyl(house, 0.14, 0.16, FH, postMat, x, FH / 2, z, 10);
  }

  // ----- lantai -----
  const floorMat = (w, d) => std('#ffffff', { map: tex('floor', w / 2.2, d / 2.2) });
  box(house, 10.3, 0.22, 13.3, floorMat(10.3, 13.3), 0, FH - 0.11, 0.5);
  box(house, 3.1, 0.22, 4.2, floorMat(3, 4), -6.55, FH - 0.11, -1);
  box(house, 3.1, 0.22, 4.2, floorMat(3, 4), 6.55, FH - 0.11, -1);
  // balok lis bawah lantai
  box(house, 10.5, 0.25, 0.2, darkWood, 0, FH - 0.32, 7.05);
  box(house, 10.5, 0.25, 0.2, darkWood, 0, FH - 0.32, -6.05);

  // ----- dinding dengan bukaan -----
  function wall({ axis, at, from, to, base = FH, h = WH, openings = [], out = 1 }) {
    const ops = [...openings].sort((a, b) => a.a - b.a);
    const pieces = [];
    let cur = from;
    for (const o of ops) {
      if (o.a > cur) pieces.push([cur, o.a, 0, h]);
      if (o.y0 > 0) pieces.push([o.a, o.b, 0, o.y0]);
      if (o.y1 < h) pieces.push([o.a, o.b, o.y1, h]);
      cur = o.b;
    }
    if (cur < to) pieces.push([cur, to, 0, h]);
    for (const [a, b, ya, yb] of pieces) {
      const len = b - a, hh = yb - ya;
      const mat = plankMat(len / 1.4, hh / 1.6);
      if (axis === 'x') box(house, len, hh, T, mat, (a + b) / 2, base + (ya + yb) / 2, at);
      else box(house, T, hh, len, mat, at, base + (ya + yb) / 2, (a + b) / 2);
    }
    // collider (kecuali bukaan yang bisa dilalui)
    let c = from;
    const addSeg = (a, b) => {
      if (b - a < 0.01) return;
      if (axis === 'x') addCollider(a, b, at - T / 2 - 0.02, at + T / 2 + 0.02, base - 0.5, base + h);
      else addCollider(at - T / 2 - 0.02, at + T / 2 + 0.02, a, b, base - 0.5, base + h);
    };
    for (const o of ops.filter((o) => o.pass)) { addSeg(c, o.a); c = o.b; }
    addSeg(c, to);
    // dekorasi jendela
    for (const o of ops) if (o.window) windowDecor(axis, at, o, base, out);
  }

  const frameMat = std('#4a2412', { roughness: 0.6 });
  const shutterMat = plankMat(0.5, 1, '#c27a45');
  function windowDecor(axis, at, o, base, out) {
    const g = new THREE.Group();
    const w = o.b - o.a, hh = o.y1 - o.y0;
    const c = (o.a + o.b) / 2;
    if (axis === 'x') { g.position.set(c, base + (o.y0 + o.y1) / 2, at); g.rotation.y = out > 0 ? 0 : Math.PI; }
    else { g.position.set(at, base + (o.y0 + o.y1) / 2, c); g.rotation.y = out > 0 ? Math.PI / 2 : -Math.PI / 2; }
    house.add(g);
    const fw = 0.08;
    box(g, w + fw * 2, fw, T + 0.08, frameMat, 0, hh / 2 + fw / 2, 0);
    box(g, w + fw * 2 + 0.1, fw, T + 0.2, frameMat, 0, -hh / 2 - fw / 2, 0.04);
    box(g, fw, hh, T + 0.08, frameMat, -w / 2 - fw / 2, 0, 0);
    box(g, fw, hh, T + 0.08, frameMat, w / 2 + fw / 2, 0, 0);
    // teralis kayu
    for (let i = 1; i < 5; i++) box(g, 0.035, hh, 0.035, frameMat, -w / 2 + (i * w) / 5, 0, 0);
    // daun jendela terbuka ke luar
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * (w / 2 + fw), 0, T / 2 + 0.04);
      pivot.rotation.y = s * 1.9;
      g.add(pivot);
      box(pivot, w / 2, hh, 0.05, shutterMat, s * (w / 4), 0, 0);
      box(pivot, w / 2 - 0.12, 0.05, 0.07, frameMat, s * (w / 4), hh / 4, 0);
      box(pivot, w / 2 - 0.12, 0.05, 0.07, frameMat, s * (w / 4), -hh / 4, 0);
    }
  }

  const win = (a, b) => ({ a, b, y0: 0.9, y1: 2.15, window: true });
  // ruang utama x[-5,5] z[-6,4]
  wall({ axis: 'x', at: 4, from: -5.075, to: 5.075, out: 1, openings: [{ a: -0.75, b: 0.75, y0: 0, y1: 2.35, pass: true }, win(-3.7, -2.5), win(2.5, 3.7)] });
  wall({ axis: 'x', at: -6, from: -5.075, to: 5.075, out: -1, openings: [] });
  wall({ axis: 'z', at: -5, from: -6, to: 4, out: -1, openings: [{ a: -3, b: 1, y0: 0, y1: 2.5, pass: true }] });
  wall({ axis: 'z', at: 5, from: -6, to: 4, out: 1, openings: [{ a: -3, b: 1, y0: 0, y1: 2.5, pass: true }] });
  // anjung kiri & kanan x[-8,-5] / [5,8], z[-3,1]
  for (const s of [-1, 1]) {
    wall({ axis: 'z', at: s * 8, from: -3.075, to: 1.075, h: WINGH, out: s, openings: [win(-1.7, -0.5)] });
    wall({ axis: 'x', at: 1, from: s < 0 ? -8 : 5.075, to: s < 0 ? -5.075 : 8, h: WINGH, out: 1, openings: s > 0 ? [win(6, 7)] : [win(-7, -6)] });
    wall({ axis: 'x', at: -3, from: s < 0 ? -8 : 5.075, to: s < 0 ? -5.075 : 8, h: WINGH, out: -1, openings: [] });
  }

  // plafon
  const ceilMat = std('#e9d2ad', { map: tex('floor', 4, 4), roughness: 0.9 });
  box(house, 10.15, 0.1, 10.15, ceilMat, 0, FH + WH + 0.05, -1, { cast: true });
  for (const s of [-1, 1]) box(house, 3.1, 0.1, 4.15, ceilMat, s * 6.55, FH + WINGH + 0.05, -1);

  // ----- pintu (bisa dibuka) -----
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.75, FH, 4);
  house.add(doorPivot);
  const doorMat = plankMat(0.8, 1.2, '#a8602f');
  const doorPanel = box(doorPivot, 1.5, 2.35, 0.08, doorMat, 0.75, 1.175, 0);
  for (const y of [0.6, 1.75]) {
    box(doorPivot, 1.1, 0.7, 0.04, frameMat, 0.75, y, 0.05);
    box(doorPivot, 1.1, 0.7, 0.04, frameMat, 0.75, y, -0.05);
    box(doorPivot, 0.8, 0.45, 0.05, std('#c98a4c'), 0.75, y, 0.06);
    box(doorPivot, 0.8, 0.45, 0.05, std('#c98a4c'), 0.75, y, -0.06);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), std(COL.gold, { metalness: 0.8, roughness: 0.3 }));
  knob.position.set(1.35, 1.1, 0.09);
  doorPivot.add(knob);
  const knob2 = knob.clone(); knob2.position.z = -0.09; doorPivot.add(knob2);
  // kusen pintu & ornamen di atas pintu
  box(house, 0.12, 2.45, 0.3, frameMat, -0.81, FH + 1.2, 4);
  box(house, 0.12, 2.45, 0.3, frameMat, 0.81, FH + 1.2, 4);
  box(house, 1.8, 0.14, 0.3, frameMat, 0, FH + 2.42, 4);
  const doorState = { open: false, angle: 0 };
  const doorCollider = { minX: -0.8, maxX: 0.8, minZ: 3.88, maxZ: 4.12, minY: FH - 0.5, maxY: FH + 2.4, active: true };
  colliders.push(doorCollider);
  doorPanel.userData.interact = {
    label: () => (doorState.open ? 'Tutup pintu' : 'Buka pintu'),
    action: () => { doorState.open = !doorState.open; return 'door'; },
  };
  interactables.push(doorPanel);
  updaters.push((t, dt) => {
    const target = doorState.open ? 1.65 : 0;
    doorState.angle += (target - doorState.angle) * Math.min(1, dt * 5);
    doorPivot.rotation.y = doorState.angle;
    doorCollider.active = doorState.angle < 0.9;
  });

  // ----- teras (surambi) + pagar -----
  const railMat = std('#7b3f1d', { roughness: 0.7 });
  function railing(x0, z0, x1, z1) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.Group();
    g.position.set((x0 + x1) / 2, FH, (z0 + z1) / 2);
    g.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
    house.add(g);
    box(g, len, 0.08, 0.1, railMat, 0, 0.95, 0);
    box(g, len, 0.06, 0.08, railMat, 0, 0.12, 0);
    for (let i = 0; i <= len / 0.22; i++) box(g, 0.05, 0.85, 0.05, std('#c58d5a'), -len / 2 + i * 0.22, 0.53, 0);
    const minX = Math.min(x0, x1) - 0.08, maxX = Math.max(x0, x1) + 0.08, minZ = Math.min(z0, z1) - 0.08, maxZ = Math.max(z0, z1) + 0.08;
    addCollider(minX, maxX, minZ, maxZ, FH - 0.5, FH + 1);
  }
  railing(-5, 6.95, -1, 6.95);
  railing(1, 6.95, 5, 6.95);
  railing(-5, 4.1, -5, 6.95);
  railing(5, 4.1, 5, 6.95);
  // tiang teras
  for (const x of [-5, -1, 1, 5]) cyl(house, 0.1, 0.1, 2.5, postMat, x, FH + 1.25, 6.95, 10);

  // ----- tangga -----
  const STEPS = 8, RUN = 0.4, RISE = FH / STEPS, STAIR_END = 7 + STEPS * RUN;
  for (let i = 1; i <= STEPS; i++) {
    const zTop = STAIR_END - i * RUN;
    box(house, 2.0, 0.07, RUN + 0.04, plankMat(1.2, 0.3, '#c58d5a'), 0, i * RISE - 0.035, zTop + RUN / 2);
  }
  for (const s of [-1, 1]) {
    const len = Math.hypot(STEPS * RUN, FH);
    const ang = Math.atan2(FH, STEPS * RUN);
    const stringer = box(house, 0.1, 0.3, len, darkWood, s * 1.05, FH / 2, 7 + (STEPS * RUN) / 2);
    stringer.rotation.x = ang;
    const rail = box(house, 0.08, 0.08, len + 0.2, railMat, s * 1.05, FH / 2 + 0.95, 7 + (STEPS * RUN) / 2);
    rail.rotation.x = ang;
    for (let i = 0; i <= 4; i++) {
      const z = 7 + (i / 4) * STEPS * RUN;
      const hy = FH * (1 - i / 4);
      cyl(house, 0.04, 0.04, 0.95, railMat, s * 1.05, hy + 0.47, z, 6);
    }
    addCollider(s * 1.05 - 0.07, s * 1.05 + 0.07, 7, STAIR_END, -10, 100);
  }

  // ----- atap -----
  const roofMat = (rx, ry) => std('#ffffff', { map: tex('shingles', rx, ry), roughness: 0.75, side: THREE.DoubleSide });
  const eaveY = FH + WH - 0.3, peakY = FH + WH + 5.2, hw = 5.7;
  const slopeLen = Math.hypot(hw, peakY - eaveY), slopeAng = Math.atan2(peakY - eaveY, hw);
  const roofZ0 = -6.7, roofZ1 = 4.7;
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set((s * hw) / 2, (eaveY + peakY) / 2, (roofZ0 + roofZ1) / 2);
    g.rotation.y = s * Math.PI / 2;
    house.add(g);
    const slab = box(g, roofZ1 - roofZ0, 0.18, slopeLen + 0.25, roofMat(4, 4.5), 0, 0, 0);
    slab.rotation.x = slopeAng;
    // lis tepi atap
    const edge = box(g, roofZ1 - roofZ0 + 0.1, 0.12, 0.12, darkWood, 0, -Math.sin(slopeAng) * (slopeLen / 2 + 0.1) - 0.05, Math.cos(slopeAng) * (slopeLen / 2 + 0.1));
    edge.castShadow = false;
  }
  // bubungan
  box(house, 0.3, 0.25, roofZ1 - roofZ0 + 0.2, darkWood, 0, peakY + 0.1, (roofZ0 + roofZ1) / 2);
  // segitiga gable depan & belakang
  const tri = new THREE.Shape();
  tri.moveTo(-5.05, 0); tri.lineTo(5.05, 0); tri.lineTo(0, peakY - (FH + WH) - 0.05); tri.closePath();
  const triGeo = new THREE.ExtrudeGeometry(tri, { depth: T, bevelEnabled: false });
  const gableMat = std('#ffffff', { map: tex('planks', 0.35, 0.3), roughness: 0.85 });
  for (const z of [4 - T / 2, -6 - T / 2]) {
    const m = new THREE.Mesh(triGeo, gableMat);
    m.position.set(0, FH + WH, z);
    m.castShadow = true; m.receiveShadow = true;
    house.add(m);
  }
  // ventilasi segitiga + papan "tawing halat" di gable depan
  const ventTex = textTexture([{ text: '◆ ◇ ◆', font: 'bold 90px serif', color: '#f3d08a' }], { w: 512, h: 160, bg: '#5a2a12' });
  const vent = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), std('#ffffff', { map: ventTex }));
  vent.position.set(0, FH + WH + 1.8, 4 + 0.09);
  house.add(vent);

  // ornamen jamang (ukiran melengkung di ujung bubungan)
  const ornMat = std('#6b3618', { roughness: 0.6 });
  function curlOrnament(parent, x, y, z, rotY = 0, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = rotY; g.scale.setScalar(scale);
    parent.add(g);
    for (const s of [-1, 1]) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 8, 20, Math.PI * 1.4), ornMat);
      arc.position.set(s * 0.38, 0.35, 0);
      arc.rotation.z = s > 0 ? -0.3 : Math.PI + 0.3;
      if (s < 0) arc.rotation.y = Math.PI;
      arc.castShadow = true;
      g.add(arc);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), ornMat);
      tip.position.set(s * 0.25, 0.42, 0);
      g.add(tip);
    }
    const stem = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), ornMat);
    stem.position.y = 0.2;
    g.add(stem);
    return g;
  }
  curlOrnament(house, 0, peakY + 0.15, roofZ1 - 0.05, 0, 1.4);
  curlOrnament(house, 0, peakY + 0.15, roofZ0 + 0.05, 0, 1.4);

  // atap teras (miring ke depan)
  {
    const z0 = 4, z1 = 7.6, y0 = FH + 3.05, y1 = FH + 2.45;
    const len = Math.hypot(z1 - z0, y0 - y1);
    const m = box(house, 11, 0.14, len, roofMat(4, 1.4), 0, (y0 + y1) / 2, (z0 + z1) / 2);
    m.rotation.x = Math.atan2(y0 - y1, z1 - z0);
    box(house, 11, 0.16, 0.16, darkWood, 0, FH + 2.45, 7.0);
    curlOrnament(house, -5.5, y1 + 0.02, z1 - 0.1, 0, 0.7);
    curlOrnament(house, 5.5, y1 + 0.02, z1 - 0.1, 0, 0.7);
  }
  // atap anjung (miring ke samping)
  for (const s of [-1, 1]) {
    const x0 = 5, x1 = 8.7, y0 = FH + 3.3, y1 = FH + 2.7;
    const len = Math.hypot(x1 - x0, y0 - y1);
    const g = new THREE.Group();
    g.position.set((s * (x0 + x1)) / 2, (y0 + y1) / 2, -1);
    g.rotation.y = s * Math.PI / 2;
    house.add(g);
    const m = box(g, 4.8, 0.14, len, roofMat(1.8, 1.5), 0, 0, 0);
    m.rotation.x = Math.atan2(y0 - y1, x1 - x0);
    // pengisi celah di atas dinding anjung
    const fill = new THREE.Shape();
    fill.moveTo(0, WINGH); fill.lineTo(0, 3.3); fill.lineTo(3.0, 2.82); fill.lineTo(3.0, WINGH); fill.closePath();
    const fg = new THREE.ExtrudeGeometry(fill, { depth: T, bevelEnabled: false });
    for (const z of [1 - T / 2, -3 - T / 2]) {
      const fm = new THREE.Mesh(fg, plankMat(1, 1));
      fm.position.set(s * 5, FH, z);
      fm.scale.x = s;
      fm.castShadow = true;
      house.add(fm);
    }
    curlOrnament(house, s * 8.6, y1 + 0.05, 1.3, 0, 0.6);
    curlOrnament(house, s * 8.6, y1 + 0.05, -3.3, 0, 0.6);
  }

  // ======================================================
  // INTERIOR & FURNITUR
  // ======================================================
  const interior = new THREE.Group();
  house.add(interior);
  const F = FH; // permukaan lantai

  // lampu gantung
  const lamps = [];
  function hangingLamp(x, z, ceilY, power = 22) {
    const g = new THREE.Group();
    g.position.set(x, ceilY, z);
    interior.add(g);
    cyl(g, 0.01, 0.01, 0.6, std('#222'), 0, -0.3, 0, 4);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.28, 16, 1, true), std('#c9853f', { side: THREE.DoubleSide, roughness: 0.6 }));
    shade.position.y = -0.68;
    g.add(shade);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 2 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), bulbMat);
    bulb.position.y = -0.78;
    g.add(bulb);
    const light = new THREE.PointLight('#ffd9a0', power, 12, 1.6);
    light.position.y = -0.85;
    g.add(light);
    lamps.push({ light, bulbMat, power });
  }
  hangingLamp(0, -1.2, F + WH);
  hangingLamp(0, 2.4, F + WH, 14);
  hangingLamp(-6.5, -1, F + WINGH, 10);
  hangingLamp(6.5, -1, F + WINGH, 10);
  const lampState = { on: true };

  // saklar lampu di samping pintu
  const switchPlate = box(interior, 0.14, 0.2, 0.04, std('#f2efe8'), 1.15, F + 1.3, 3.9);
  const switchKnob = box(interior, 0.05, 0.08, 0.04, std('#c9a04a'), 1.15, F + 1.33, 3.87);
  switchPlate.userData.interact = {
    label: () => (lampState.on ? 'Matikan lampu' : 'Nyalakan lampu'),
    action: () => {
      lampState.on = !lampState.on;
      for (const l of lamps) { l.light.intensity = lampState.on ? l.power : 0; l.bulbMat.emissiveIntensity = lampState.on ? 2 : 0; }
      switchKnob.position.y = F + (lampState.on ? 1.33 : 1.27);
      return 'click';
    },
  };
  interactables.push(switchPlate);

  // lemari kaca (belakang kiri)
  {
    const g = new THREE.Group(); g.position.set(-3, F, -5.6); interior.add(g);
    box(g, 1.7, 2.1, 0.6, darkWood, 0, 1.05, 0);
    for (const y of [0.55, 1.15, 1.7]) {
      box(g, 1.55, 0.04, 0.5, lightWood, 0, y, 0.03);
      for (let i = 0; i < 4; i++) {
        const p = cyl(g, 0.15, 0.13, 0.03, std('#f5f2ea', { roughness: 0.3 }), -0.55 + i * 0.37, y + 0.17, 0.0, 16);
        p.rotation.x = 1.3;
      }
    }
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.6), new THREE.MeshPhysicalMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.25, roughness: 0.05 }));
    glass.position.set(0, 1.2, 0.31); g.add(glass);
    box(g, 0.04, 1.7, 0.04, std(COL.gold, { metalness: 0.7 }), 0, 1.2, 0.32);
    for (const s of [-1, 1]) box(g, 0.08, 0.08, 0.04, std(COL.gold, { metalness: 0.7 }), s * 0.1, 1.2, 0.34);
    addCollider(-3.9, -2.1, -6, -5.25, F - 0.5, F + 2.2);
  }

  // rak buku (belakang kanan)
  {
    const g = new THREE.Group(); g.position.set(3, F, -5.7); interior.add(g);
    box(g, 1.5, 1.9, 0.08, midWood, 0, 0.95, -0.17);
    for (const s of [-1, 1]) box(g, 0.06, 1.9, 0.42, midWood, s * 0.72, 0.95, 0);
    const bookCols = ['#b33a3a', '#3a6ab3', '#3a9b5a', '#d9a441', '#7a3ab3', '#e07a2a', '#2a8b8b'];
    for (const y of [0.05, 0.5, 0.95, 1.4]) {
      box(g, 1.45, 0.04, 0.4, midWood, 0, y, 0);
      if (y > 1.3) continue;
      let x = -0.66;
      while (x < 0.62) {
        const w = 0.05 + R() * 0.05, h = 0.28 + R() * 0.12;
        const b = box(g, w, h, 0.26, std(bookCols[Math.floor(R() * bookCols.length)]), x + w / 2, y + 0.02 + h / 2, 0.02);
        b.rotation.z = R() < 0.1 ? 0.2 : 0;
        x += w + 0.008;
      }
    }
    box(g, 1.5, 0.06, 0.44, midWood, 0, 1.9, 0);
    // globe kecil di atas rak
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), std('#3a7bc8', { roughness: 0.4 }));
    gl.position.set(0.4, 2.12, 0); g.add(gl);
    updaters.push((t) => (gl.rotation.y = t * 0.5));
    addCollider(2.2, 3.8, -6, -5.45, F - 0.5, F + 2);
  }

  // kain sasirangan di dinding belakang
  {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.7), std('#ffffff', { map: tex('sasirangan', 1, 2), side: THREE.DoubleSide }));
    banner.position.set(-1.45, F + 1.65, -5.91);
    interior.add(banner);
    cyl(interior, 0.025, 0.025, 1.05, darkWood, -1.45, F + 2.52, -5.88, 6).rotation.z = Math.PI / 2;
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.18), std('#ffffff', { map: textTexture('Kain Sasirangan', { w: 512, h: 110, bg: '#3b1a0a', color: '#f3d08a', font: 'bold 52px serif' }) }));
    lbl.position.set(-1.45, F + 0.6, -5.91);
    interior.add(lbl);
  }

  // jam dinding (berjalan sesuai waktu asli)
  {
    const g = new THREE.Group(); g.position.set(0, F + 2.82, 3.9); g.rotation.y = Math.PI; interior.add(g);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 32), std('#fbf6ea'));
    face.rotation.x = Math.PI / 2; g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 32), darkWood); g.add(rim);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      box(g, 0.02, i % 3 ? 0.03 : 0.06, 0.01, std('#222'), Math.sin(a) * 0.23, Math.cos(a) * 0.23, 0.03).rotation.z = -a;
    }
    const hand = (len, w, col) => { const p = new THREE.Group(); p.position.z = 0.035; g.add(p); box(p, w, len, 0.01, std(col), 0, len / 2 - 0.02, 0); return p; };
    const hH = hand(0.13, 0.025, '#111'), hM = hand(0.2, 0.018, '#111'), hS = hand(0.22, 0.008, '#c22');
    updaters.push(() => {
      const d = new Date();
      const s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
      hS.rotation.z = -(s / 60) * Math.PI * 2; hM.rotation.z = -(m / 60) * Math.PI * 2; hH.rotation.z = -(h / 12) * Math.PI * 2;
    });
  }

  // area duduk lesehan: karpet + meja pendek + bantal + radio
  const cushions = [];
  let radioMesh;
  {
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.1), std('#ffffff', { map: tex('carpet', 1, 1), roughness: 1 }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(2.5, F + 0.012, 1.85); carpet.receiveShadow = true;
    interior.add(carpet);
    const g = new THREE.Group(); g.position.set(2.5, F, 1.85); interior.add(g);
    box(g, 1.3, 0.07, 0.7, midWood, 0, 0.36, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.07, 0.34, 0.07, darkWood, sx * 0.58, 0.17, sz * 0.28);
    // teko & cangkir
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), std('#e8e2d4', { roughness: 0.3 }));
    pot.position.set(-0.3, 0.48, 0); pot.scale.y = 0.85; g.add(pot);
    const spout = cyl(g, 0.015, 0.025, 0.14, std('#e8e2d4'), -0.19, 0.5, 0); spout.rotation.z = -0.9;
    const lid = cyl(g, 0.04, 0.05, 0.03, std('#c9a04a'), -0.3, 0.57, 0);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), std('#e8e2d4')); handle.position.set(-0.42, 0.49, 0); g.add(handle);
    for (const [cx, cz] of [[-0.05, 0.18], [0.1, -0.16], [-0.1, -0.18]]) cyl(g, 0.035, 0.03, 0.06, std('#f4f0e6', { roughness: 0.3 }), cx, 0.425, cz);
    // piring kue
    cyl(g, 0.16, 0.14, 0.02, std('#fff'), 0.3, 0.41, 0.05);
    for (let i = 0; i < 5; i++) cyl(g, 0.035, 0.035, 0.03, std(['#4a8f3a', '#e36f9b', '#f2c94c'][i % 3]), 0.3 + Math.cos(i) * 0.08, 0.435, 0.05 + Math.sin(i) * 0.08, 8);
    // bantal duduk
    const cushMat = std('#ffffff', { map: tex('sasirangan', 1, 1), roughness: 1 });
    for (const [x, z] of [[-1.0, 0], [1.0, 0], [0, 0.75], [0, -0.75]]) {
      const c = box(g, 0.55, 0.12, 0.55, cushMat, x, 0.06, z);
      cushions.push(c);
    }
    addCollider(1.8, 3.2, 1.45, 2.25, F - 0.5, F + 0.6);
    // radio
    const radio = new THREE.Group(); radio.position.set(1.95, F, 3.55); radio.rotation.y = Math.PI; interior.add(radio);
    box(radio, 0.5, 0.75, 0.45, midWood, 0, 0.375, 0);
    const rb = box(radio, 0.55, 0.32, 0.3, std('#7a2a1a', { roughness: 0.5 }), 0, 0.92, 0);
    const grill = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), std('#d9c08a'));
    grill.position.set(-0.1, 0.92, 0.155); radio.add(grill);
    for (const x of [0.12, 0.2]) { const k = cyl(radio, 0.03, 0.03, 0.03, std(COL.gold, { metalness: 0.7 }), x, 0.92, 0.16, 10); k.rotation.x = Math.PI / 2; }
    const ant = cyl(radio, 0.006, 0.006, 0.5, std('#aaa', { metalness: 0.8 }), 0.2, 1.3, 0, 4); ant.rotation.z = -0.3;
    radioMesh = rb;
    addCollider(1.65, 2.25, 3.3, 3.85, F - 0.5, F + 1.2);
  }

  // meja bundar + kursi (depan kiri)
  {
    const g = new THREE.Group(); g.position.set(-2.6, F, 2.2); interior.add(g);
    cyl(g, 0.5, 0.5, 0.05, midWood, 0, 0.75, 0, 24);
    cyl(g, 0.06, 0.08, 0.72, darkWood, 0, 0.37, 0, 10);
    cyl(g, 0.3, 0.32, 0.04, darkWood, 0, 0.02, 0, 16);
    // vas bunga
    cyl(g, 0.07, 0.05, 0.22, std('#2f6f8f', { roughness: 0.3 }), 0, 0.89, 0, 12);
    const flowerCols = ['#e8443a', '#f2c94c', '#ffffff', '#e36f9b'];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const st = cyl(g, 0.006, 0.006, 0.3, std('#3f7d2c'), Math.cos(a) * 0.04, 1.08, Math.sin(a) * 0.04, 4);
      st.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), std(flowerCols[i % 4]));
      f.position.set(Math.cos(a) * 0.09, 1.23, Math.sin(a) * 0.09); g.add(f);
    }
    function chair(x, z, rot) {
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = rot; g.add(c);
      box(c, 0.45, 0.05, 0.45, lightWood, 0, 0.45, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(c, 0.05, 0.45, 0.05, darkWood, sx * 0.19, 0.225, sz * 0.19);
      for (const sx of [-1, 1]) box(c, 0.05, 0.55, 0.05, darkWood, sx * 0.19, 0.72, -0.2);
      box(c, 0.45, 0.12, 0.04, lightWood, 0, 0.88, -0.2);
      box(c, 0.45, 0.06, 0.04, lightWood, 0, 0.66, -0.2);
    }
    chair(-0.85, 0, Math.PI / 2);
    chair(0.85, 0, -Math.PI / 2);
    chair(0, -0.85, 0);
    addCollider(-3.75, -1.45, 1.55, 2.85, F - 0.5, F + 1);
  }

  // pot tanaman di sudut
  function pottedPlant(parent, x, y, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
    cyl(g, 0.22, 0.16, 0.38, std('#a9522f', { roughness: 0.8 }), 0, 0.19, 0, 14);
    cyl(g, 0.2, 0.2, 0.02, std('#4a3220'), 0, 0.37, 0, 14);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), std(i % 2 ? '#3f8d3a' : '#2f6f2c'));
      leaf.scale.set(0.35, 0.12, 1.6);
      leaf.position.set(Math.cos(a) * 0.15, 0.55 + (i % 3) * 0.1, Math.sin(a) * 0.15);
      leaf.rotation.set(0.5, -a + Math.PI / 2, 0);
      leaf.rotation.order = 'YXZ';
      leaf.castShadow = true;
      g.add(leaf);
    }
    return g;
  }
  pottedPlant(interior, -4.45, F, -5.45);
  pottedPlant(interior, 4.45, F, -5.45);
  pottedPlant(interior, -4.4, F, 6.4, 1.1);
  pottedPlant(interior, 4.4, F, 6.4, 1.1);
  addCollider(-4.75, -4.15, -5.75, -5.15, F - 0.5, F + 1);
  addCollider(4.15, 4.75, -5.75, -5.15, F - 0.5, F + 1);

  // kursi panjang di teras
  {
    const g = new THREE.Group(); g.position.set(-3, F, 6.4); interior.add(g);
    box(g, 2.0, 0.06, 0.5, lightWood, 0, 0.45, 0);
    for (const x of [-0.9, 0.9]) for (const z of [-0.2, 0.2]) box(g, 0.06, 0.45, 0.06, darkWood, x, 0.225, z);
    box(g, 2.0, 0.3, 0.05, lightWood, 0, 0.75, -0.24);
    addCollider(-4.05, -1.95, 6.1, 6.7, F - 0.5, F + 1);
  }

  // --- anjung kiri: kamar tidur ---
  let bedMesh;
  {
    const g = new THREE.Group(); g.position.set(-7.1, F, -1.9); interior.add(g);
    box(g, 1.4, 0.35, 2.0, darkWood, 0, 0.25, 0);
    box(g, 1.3, 0.2, 1.9, std('#f6f3ec'), 0, 0.52, 0);
    const blanket = box(g, 1.32, 0.06, 1.2, std('#ffffff', { map: tex('sasirangan', 2, 2) }), 0, 0.63, 0.35);
    box(g, 0.9, 0.14, 0.35, std('#ffffff'), 0, 0.68, -0.72);
    box(g, 1.4, 0.9, 0.08, darkWood, 0, 0.75, -1.0);
    // kelambu (kelambu nyamuk)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.025, 0.025, 1.95, darkWood, sx * 0.68, 1.1, sz * 0.98, 6);
    const net = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.0), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    net.position.y = 1.45; g.add(net);
    bedMesh = blanket;
    addCollider(-7.85, -6.35, -3, -0.85, F - 0.5, F + 2);
    // meja kecil + lampu tidur
    const n = new THREE.Group(); n.position.set(-7.5, F, 0.4); interior.add(n);
    box(n, 0.5, 0.5, 0.45, midWood, 0, 0.25, 0);
    cyl(n, 0.05, 0.08, 0.25, std(COL.gold, { metalness: 0.6 }), 0, 0.62, 0, 10);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.18, 14, 1, true), std('#f4e2c0', { side: THREE.DoubleSide, emissive: '#ffcf80', emissiveIntensity: 0.5 }));
    sh.position.y = 0.82; n.add(sh);
    addCollider(-7.8, -7.2, 0.15, 0.65, F - 0.5, F + 1);
    pottedPlant(interior, -5.6, F, 0.55, 0.8);
  }

  // --- anjung kanan: ruang makan ---
  {
    const g = new THREE.Group(); g.position.set(6.6, F, -1.1); interior.add(g);
    box(g, 0.9, 0.06, 1.6, midWood, 0, 0.75, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.06, 0.72, 0.06, darkWood, sx * 0.38, 0.36, sz * 0.72);
    for (const sx of [-1, 1]) {
      box(g, 0.32, 0.05, 1.5, lightWood, sx * 0.75, 0.45, 0);
      for (const sz of [-0.6, 0.6]) box(g, 0.05, 0.45, 0.05, darkWood, sx * 0.75, 0.225, sz);
    }
    for (const z of [-0.5, 0, 0.5]) {
      cyl(g, 0.15, 0.12, 0.02, std('#fff', { roughness: 0.3 }), 0, 0.79, z, 16);
    }
    const rice = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#ffffff', { roughness: 1 }));
    cyl(g, 0.15, 0.1, 0.1, std('#8b5a2b'), 0.2, 0.83, 0.0, 14);
    rice.position.set(0.2, 0.86, 0); g.add(rice);
    addCollider(5.75, 7.45, -2, -0.2, F - 0.5, F + 1);
    // tempayan (guci air)
    const jar = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 14), std('#7a3d1a', { roughness: 0.4 }));
    jar.scale.y = 1.2; jar.position.set(7.45, F + 0.42, 0.5); jar.castShadow = true; interior.add(jar);
    cyl(interior, 0.18, 0.22, 0.12, std('#7a3d1a'), 7.45, F + 0.85, 0.5, 14);
    addCollider(7.05, 7.85, 0.1, 0.9, F - 0.5, F + 1);
    // rak piring
    const r = new THREE.Group(); r.position.set(6.5, F, -2.75); interior.add(r);
    box(r, 1.6, 1.2, 0.35, midWood, 0, 0.6, 0);
    for (let i = 0; i < 6; i++) {
      const p = cyl(r, 0.13, 0.13, 0.02, std(['#f5f2ea', '#bfe0f0', '#f2d0a8'][i % 3], { roughness: 0.3 }), -0.6 + i * 0.24, 1.35, 0, 16);
      p.rotation.x = 1.35;
    }
    addCollider(5.7, 7.3, -3, -2.5, F - 0.5, F + 1.5);
  }

  // ======================================================
  // STASIUN QR + ALAS MODEL
  // ======================================================
  const qrLoader = new THREE.TextureLoader();
  const stations = {};
  const STATION_POS = [
    // n, posisi papan, arah hadap (normal), posisi alas
    { n: 1, board: [-4.91, 2.5], rotY: Math.PI / 2, ped: [-4.35, 3.45] },
    { n: 2, board: [-4.91, -4.5], rotY: Math.PI / 2, ped: [-4.35, -3.55] },
    { n: 3, board: [0, -5.91], rotY: 0, ped: [1.05, -5.35] },
    { n: 4, board: [4.91, -4.5], rotY: -Math.PI / 2, ped: [4.35, -3.55] },
    { n: 5, board: [4.91, 2.5], rotY: -Math.PI / 2, ped: [4.35, 3.45] },
  ];

  function labelTexture(n, scanned) {
    const s = STAGES[n - 1];
    return textTexture([
      { text: `TAHAP ${n}${scanned ? '  ✓' : ''}`, font: 'bold 60px system-ui, sans-serif', color: scanned ? '#7dffa0' : '#ffd36b' },
      { text: scanned ? `${s.emoji} ${s.name}` : '📱 Scan dengan HP', font: 'bold 50px system-ui, sans-serif', color: '#ffffff' },
    ], { w: 640, h: 220, bg: '#2b1608' });
  }

  for (const sp of STATION_POS) {
    const g = new THREE.Group();
    g.position.set(sp.board[0], F + 1.6, sp.board[1]);
    g.rotation.y = sp.rotY;
    interior.add(g);
    // bingkai ukir
    box(g, 0.98, 1.3, 0.05, std('#4a2412'), 0, -0.12, 0);
    const goldM = std(COL.gold, { metalness: 0.6, roughness: 0.35 });
    box(g, 1.02, 0.05, 0.07, goldM, 0, 0.55, 0.01);
    box(g, 1.02, 0.05, 0.07, goldM, 0, -0.79, 0.01);
    box(g, 0.05, 1.38, 0.07, goldM, -0.5, -0.12, 0.01);
    box(g, 0.05, 1.38, 0.07, goldM, 0.5, -0.12, 0.01);
    const qrMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    const qr = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.84), qrMat);
    qr.position.set(0, 0.07, 0.03);
    g.add(qr);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.3), new THREE.MeshBasicMaterial({ map: labelTexture(sp.n, false) }));
    label.position.set(0, -0.55, 0.03);
    g.add(label);
    // lampu sorot kecil di atas papan
    const spot = box(g, 0.5, 0.05, 0.12, std('#333', { metalness: 0.6 }), 0, 0.68, 0.08);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.03), new THREE.MeshBasicMaterial({ color: '#fff1c0' }));
    glow.position.set(0, 0.652, 0.12); glow.rotation.x = Math.PI / 2; g.add(glow);

    // alas (pedestal)
    const ped = new THREE.Group();
    ped.position.set(sp.ped[0], F, sp.ped[1]);
    interior.add(ped);
    cyl(ped, 0.3, 0.36, 0.08, darkWood, 0, 0.04, 0, 20);
    cyl(ped, 0.22, 0.26, 0.75, plankMat(0.5, 0.5, '#c27a45'), 0, 0.45, 0, 20);
    cyl(ped, 0.36, 0.3, 0.08, darkWood, 0, 0.86, 0, 20);
    const ringMat = new THREE.MeshBasicMaterial({ color: STAGES[sp.n - 1].color, transparent: true, opacity: 0.0 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 8, 40), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.91; ped.add(ring);
    const numTex = textTexture(String(sp.n), { w: 128, h: 128, bg: '#2b1608', color: '#ffd36b', font: 'bold 90px system-ui' });
    for (let k = 0; k < 4; k++) {
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: numTex }));
      const a = (k / 4) * Math.PI * 2;
      plate.position.set(Math.sin(a) * 0.245, 0.55, Math.cos(a) * 0.245);
      plate.rotation.y = a;
      ped.add(plate);
    }
    // sinar cahaya saat muncul
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 2.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: STAGES[sp.n - 1].color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = 1.95; ped.add(beam);
    const holder = new THREE.Group(); holder.position.y = 0.9; ped.add(holder);
    const model = buildStage(sp.n);
    model.scale.setScalar(0.0001);
    model.visible = false;
    holder.add(model);
    addCollider(sp.ped[0] - 0.38, sp.ped[0] + 0.38, sp.ped[1] - 0.38, sp.ped[1] + 0.38, F - 0.5, F + 2);

    const st = {
      n: sp.n, group: g, qr, qrMat, label, ped, ring, beam, model, holder, scanned: false, appearT: -1,
      setQR(dataUrl) {
        qrLoader.load(dataUrl, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; qrMat.map = t; qrMat.needsUpdate = true; });
      },
      setScanned(on, animate) {
        st.scanned = on;
        label.material.map.dispose();
        label.material.map = labelTexture(sp.n, on);
        label.material.needsUpdate = true;
        model.visible = on;
        if (on && animate) { st.appearT = 0; spawnSparkles(new THREE.Vector3(sp.ped[0], F + 1.3, sp.ped[1]), STAGES[sp.n - 1].color); }
        else { st.appearT = on ? 999 : -1; model.scale.setScalar(on ? 0.62 : 0.0001); }
        ringMat.opacity = on ? 0.9 : 0;
      },
    };
    stations[sp.n] = st;
    qr.userData.interact = { label: () => `Perbesar QR Tahap ${sp.n} (untuk di-scan HP)`, action: () => ({ type: 'qr', n: sp.n }) };
    interactables.push(qr);
    label.userData.interact = qr.userData.interact;
    interactables.push(label);
    const pedHit = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    pedHit.position.y = 0.9; ped.add(pedHit);
    pedHit.userData.interact = {
      label: () => (st.scanned ? `Lihat info: ${STAGES[sp.n - 1].name}` : `Alas Tahap ${sp.n} — scan QR di dinding untuk memunculkan model`),
      action: () => (st.scanned ? { type: 'info', n: sp.n } : null),
    };
    interactables.push(pedHit);
  }

  updaters.push((t, dt) => {
    for (const st of Object.values(stations)) {
      if (!st.scanned) continue;
      st.model.userData.update?.(t);
      st.model.rotation.y = t * 0.4;
      if (st.appearT >= 0 && st.appearT < 2.5) {
        st.appearT += dt;
        const k = Math.min(1, st.appearT / 1.1);
        const el = k === 1 ? 1 : 1 - Math.pow(2, -10 * k) * Math.cos(k * 10); // efek pegas
        st.model.scale.setScalar(Math.max(0.0001, 0.62 * el));
        st.holder.position.y = 0.9 + (1 - k) * 0.6;
        st.beam.material.opacity = Math.max(0, 0.55 * (1 - st.appearT / 2.5));
      } else st.beam.material.opacity = 0;
      st.ring.rotation.z = t;
    }
  });

  // ======================================================
  // DISPLAY TENGAH: LINGKARAN DAUR HIDUP
  // ======================================================
  const cycle = new THREE.Group();
  cycle.position.set(0, F, -1.2);
  interior.add(cycle);
  cyl(cycle, 1.75, 1.85, 0.22, darkWood, 0, 0.11, 0, 48);
  const topDisk = cyl(cycle, 1.7, 1.7, 0.03, std('#ffffff', { map: tex('carpet', 1, 1) }), 0, 0.235, 0, 48);
  addCollider(-1.8, 1.8, -3.0, 0.6, F - 0.5, F + 0.6);
  const rotor = new THREE.Group(); rotor.position.y = 0.25; cycle.add(rotor);
  const CR = 1.22;
  const slots = [];
  const slotAngle = (i) => Math.PI / 2 + (i / 5) * Math.PI * 2; // searah jarum jam dilihat dari pintu
  for (let i = 0; i < 5; i++) {
    const a = slotAngle(i);
    const x = Math.cos(a) * CR, z = -Math.sin(a) * CR;
    const s = new THREE.Group(); s.position.set(x, 0, z); rotor.add(s);
    cyl(s, 0.26, 0.28, 0.12, std('#f3e4c4'), 0, 0.06, 0, 24);
    const mini = buildStage(i + 1);
    mini.scale.setScalar(0.38);
    mini.position.y = 0.12;
    mini.visible = false;
    s.add(mini);
    const ghost = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, emissive: '#ffffff', emissiveIntensity: 0.3 }));
    ghost.position.y = 0.3; s.add(ghost);
    const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture('?', { w: 128, h: 128, color: '#ffd36b', font: 'bold 100px system-ui' }), transparent: true }));
    q.scale.set(0.25, 0.25, 1); q.position.y = 0.3; s.add(q);
    const nameSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(`${i + 1}. ${STAGES[i].name}`, { w: 512, h: 96, bg: 'rgba(43,22,8,0.85)', color: '#fff', font: 'bold 44px system-ui' }), transparent: true }));
    nameSpr.scale.set(0.75, 0.14, 1); nameSpr.position.y = 0.88; nameSpr.visible = false; s.add(nameSpr);
    slots.push({ group: s, mini, ghost, q, nameSpr });
  }
  // panah antar tahap
  const arrows = [];
  for (let i = 0; i < 5; i++) {
    const a0 = slotAngle(i) + 0.3, a1 = slotAngle(i + 1) - 0.3;
    const arcLen = a1 - a0;
    const mat = new THREE.MeshStandardMaterial({ color: '#6b5a48', emissive: '#000000' });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(CR, 0.03, 8, 24, Math.abs(arcLen)), mat);
    arc.rotation.x = -Math.PI / 2;
    arc.rotation.z = Math.min(a0, a1);
    arc.position.y = 0.06;
    rotor.add(arc);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 12), mat);
    const ax = Math.cos(a1) * CR, az = -Math.sin(a1) * CR;
    head.position.set(ax, 0.06, az);
    // arah tangen (bertambahnya sudut)
    const tan = new THREE.Vector3(-Math.sin(a1), 0, -Math.cos(a1));
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    rotor.add(head);
    arrows.push(mat);
  }
  const titleSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture([{ text: 'Daur Hidup Ayam', font: 'bold 70px Georgia, serif', color: '#2b1608' }, { text: '0 / 5 tahap ditemukan', font: 'bold 40px system-ui', color: '#7a3418' }], { w: 768, h: 200, bg: 'rgba(255,244,214,0.92)' }), transparent: true }));
  titleSpr.scale.set(2.2, 0.57, 1);
  titleSpr.position.y = 1.9;
  cycle.add(titleSpr);
  const cycleState = { complete: false };

  function setCycle(list) {
    const set = new Set(list);
    slots.forEach((s, i) => {
      const on = set.has(i + 1);
      s.mini.visible = on; s.ghost.visible = !on; s.q.visible = !on; s.nameSpr.visible = on;
    });
    arrows.forEach((m, i) => {
      const on = set.has(i + 1) && set.has(((i + 1) % 5) + 1);
      m.color.set(on ? '#f2a03a' : '#6b5a48');
      m.emissive.set(on ? '#c25a00' : '#000000');
    });
    titleSpr.material.map.dispose();
    const done = set.size === 5;
    titleSpr.material.map = textTexture([
      { text: 'Daur Hidup Ayam', font: 'bold 70px Georgia, serif', color: '#2b1608' },
      { text: done ? '🎉 Lengkap! Daur hidup berulang' : `${set.size} / 5 tahap ditemukan`, font: 'bold 40px system-ui', color: done ? '#1d7a3a' : '#7a3418' },
    ], { w: 768, h: 200, bg: 'rgba(255,244,214,0.92)' });
    titleSpr.material.needsUpdate = true;
    cycleState.complete = done;
  }
  setCycle([]);
  topDisk.userData.interact = { label: () => 'Lihat diagram daur hidup ayam', action: () => ({ type: 'cycle' }) };
  interactables.push(topDisk);
  updaters.push((t, dt) => {
    rotor.rotation.y += dt * (cycleState.complete ? 0.35 : 0.08);
    slots.forEach((s, i) => {
      if (s.mini.visible) { s.mini.userData.update?.(t + i); s.mini.rotation.y = -rotor.rotation.y; }
      s.ghost.position.y = 0.3 + Math.sin(t * 2 + i) * 0.04;
      s.q.position.y = s.ghost.position.y;
    });
    titleSpr.position.y = 1.9 + Math.sin(t * 1.2) * 0.05;
  });

  // ======================================================
  // PARTIKEL BERKILAU
  // ======================================================
  const sparkles = [];
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, '#fff'); r.addColorStop(0.35, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  function spawnSparkles(pos, color, count = 80, spread = 1) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3), v = [];
    for (let i = 0; i < count; i++) {
      p.set([pos.x, pos.y, pos.z], i * 3);
      v.push(new THREE.Vector3((Math.random() - 0.5) * 3 * spread, Math.random() * 3.5 * spread, (Math.random() - 0.5) * 3 * spread));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.12, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    sparkles.push({ pts, v, life: 0 });
  }
  updaters.push((t, dt) => {
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.life += dt;
      const arr = s.pts.geometry.attributes.position.array;
      s.v.forEach((v, k) => {
        v.y -= 4 * dt;
        arr[k * 3] += v.x * dt; arr[k * 3 + 1] += v.y * dt; arr[k * 3 + 2] += v.z * dt;
      });
      s.pts.geometry.attributes.position.needsUpdate = true;
      s.pts.material.opacity = Math.max(0, 1 - s.life / 2);
      if (s.life > 2) { scene.remove(s.pts); s.pts.geometry.dispose(); s.pts.material.dispose(); sparkles.splice(i, 1); }
    }
  });

  // ======================================================
  // HALAMAN: POHON KELAPA, PISANG, SEMAK, BUNGA, KANDANG AYAM
  // ======================================================
  const nature = new THREE.Group();
  scene.add(nature);
  const trunkMat = std('#7d5a3a', { roughness: 1 });
  const palmLeafMat = std('#3d8a35', { roughness: 0.9, side: THREE.DoubleSide });
  function palm(x, z, h = 7 + R() * 3) {
    const g = new THREE.Group(); g.position.set(x, 0, z); nature.add(g);
    const lean = (R() - 0.5) * 0.25, dir = R() * Math.PI * 2;
    let px = 0, py = 0, pz = 0;
    const segs = 7;
    for (let i = 0; i < segs; i++) {
      const sh = h / segs;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.17 - i * 0.008, 0.2 - i * 0.008, sh, 8), trunkMat);
      const off = lean * (i / segs) * (i / segs) * 4;
      seg.position.set(px + Math.cos(dir) * off, py + sh / 2, pz + Math.sin(dir) * off);
      seg.castShadow = true;
      g.add(seg);
      py += sh;
    }
    const top = new THREE.Vector3(Math.cos(dir) * lean * 4, h, Math.sin(dir) * lean * 4);
    for (let i = 0; i < 9; i++) {
      const pivot = new THREE.Group(); pivot.position.copy(top); pivot.rotation.y = (i / 9) * Math.PI * 2 + R() * 0.3; g.add(pivot);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6), palmLeafMat);
      leaf.scale.set(0.9, 0.06, 4.5);
      leaf.position.set(0, -0.5, 2.0);
      leaf.rotation.x = 0.45;
      leaf.castShadow = true;
      pivot.add(leaf);
    }
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), std('#6b4a22'));
      c.position.set(top.x + Math.cos(i * 1.6) * 0.25, h - 0.3, top.z + Math.sin(i * 1.6) * 0.25);
      g.add(c);
    }
    addCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, -10, 50);
    updaters.push((t) => (g.rotation.z = Math.sin(t * 0.7 + x) * 0.012));
  }
  function banana(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); nature.add(g);
    cyl(g, 0.14, 0.2, 2.2, std('#7f9a46'), 0, 1.1, 0, 8);
    for (let i = 0; i < 6; i++) {
      const pivot = new THREE.Group(); pivot.position.y = 2.1; pivot.rotation.y = (i / 6) * Math.PI * 2; g.add(pivot);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6), std('#5aa83e', { side: THREE.DoubleSide }));
      leaf.scale.set(0.9, 0.05, 2.6); leaf.position.set(0, 0.3, 1.1); leaf.rotation.x = -0.3 + R() * 0.5; leaf.castShadow = true;
      pivot.add(leaf);
    }
    addCollider(x - 0.25, x + 0.25, z - 0.25, z + 0.25, -10, 50);
  }
  function bush(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); nature.add(g);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.5 + R() * 0.3, 10, 8), std(['#3f7d2c', '#4f9636', '#356b26'][i % 3], { roughness: 1 }));
      b.position.set((R() - 0.5) * 0.9, 0.4, (R() - 0.5) * 0.9); b.castShadow = true; g.add(b);
    }
  }
  const clear = (x, z) => (Math.abs(x) < 12 && z > -10 && z < 13) || (Math.abs(x) < 2.5 && z > 9 && z < 30) || (x > 9 && x < 23 && z > -9 && z < 17) || (x > 4 && x < 11 && z < -20);
  let placed = 0;
  while (placed < 26) {
    const x = (R() - 0.5) * 110, z = -22 + R() * 80;
    if (clear(x, z) || (Math.abs(x) < 4 && z > 14 && z < 26)) continue;
    palm(x, z); placed++;
  }
  for (const [x, z] of [[-11, 8], [-13, -4], [-10, -12], [12, -14], [-15, 14]]) banana(x, z);
  for (let i = 0; i < 22; i++) {
    const x = (R() - 0.5) * 90, z = -20 + R() * 70;
    if (clear(x, z)) continue;
    bush(x, z, 0.7 + R() * 0.6);
  }
  // pagar bunga di depan rumah
  const flowerColors = ['#e8443a', '#f2c94c', '#ffffff', '#e36f9b', '#ff8a2a'];
  for (const sx of [-1, 1]) {
    box(nature, 6, 0.25, 1.2, std('#6b4a2a'), sx * 5.5, 0.125, 9.2);
    for (let i = 0; i < 26; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), std(flowerColors[i % 5]));
      f.position.set(sx * 5.5 + (R() - 0.5) * 5.6, 0.45 + R() * 0.15, 9.2 + (R() - 0.5) * 1.0);
      nature.add(f);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), std('#3f7d2c'));
      leaf.position.set(f.position.x, 0.3, f.position.z); leaf.scale.y = 0.6; nature.add(leaf);
    }
    addCollider(sx * 5.5 - 3, sx * 5.5 + 3, 8.6, 9.8, -10, 0.6);
  }

  // papan nama
  {
    const g = new THREE.Group(); g.position.set(2.6, 0, 14); g.rotation.y = -0.25; nature.add(g);
    for (const x of [-0.9, 0.9]) cyl(g, 0.06, 0.06, 1.6, darkWood, x, 0.8, 0, 8);
    const signTex = textTexture([
      { text: 'Banua Ayam AR', font: 'bold 72px Georgia, serif', color: '#ffe7b0' },
      { text: 'Rumah Banjar Bubungan Tinggi', font: 'italic 40px Georgia, serif', color: '#ffd36b' },
      { text: 'Masuk & temukan 5 kode QR!', font: 'bold 38px system-ui', color: '#ffffff' },
    ], { w: 768, h: 360, bg: '#5a2a12' });
    const sign = box(g, 2.2, 1.05, 0.08, [std('#4a2412'), std('#4a2412'), std('#4a2412'), std('#4a2412'), std('#ffffff', { map: signTex }), std('#4a2412')], 0, 1.4, 0);
    addCollider(1.5, 3.7, 13.6, 14.4, -10, 3);
  }

  // kandang ayam
  {
    const g = new THREE.Group(); g.position.set(16, 0, 4); g.rotation.y = -Math.PI / 2; nature.add(g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.07, 0.07, 0.8, darkWood, sx * 0.9, 0.4, sz * 0.6, 8);
    box(g, 2.0, 0.08, 1.4, plankMat(1, 1, '#c58d5a'), 0, 0.8, 0);
    box(g, 2.0, 1.0, 0.08, plankMat(1.2, 0.6, '#c58d5a'), 0, 1.3, -0.66);
    for (const sx of [-1, 1]) box(g, 0.08, 1.0, 1.4, plankMat(0.8, 0.6, '#c58d5a'), sx * 0.96, 1.3, 0);
    for (let i = 0; i < 9; i++) box(g, 0.03, 1.0, 0.03, darkWood, -0.9 + i * 0.225, 1.3, 0.66);
    const roof = box(g, 2.4, 0.08, 1.8, roofMat(1, 1), 0, 1.95, 0); roof.rotation.x = -0.25;
    const ramp = box(g, 0.45, 0.04, 1.2, lightWood, 0.4, 0.4, 1.15); ramp.rotation.x = 0.72;
    addCollider(15.25, 16.75, 2.95, 5.05, -10, 3);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), std('#ffffff', { map: textTexture('Kandang Ayam', { w: 512, h: 128, bg: '#3b1a0a', color: '#ffe7b0', font: 'bold 60px system-ui' }) }));
    lbl.position.set(0, 2.15, 0.85); lbl.rotation.x = -0.25; g.add(lbl);
    // papan info kandang panggung
    const info = new THREE.Group(); info.position.set(13.2, 0, 1.6); info.rotation.y = -0.6; nature.add(info);
    for (const x of [-0.7, 0.7]) cyl(info, 0.05, 0.05, 1.5, darkWood, x, 0.75, 0, 8);
    const infoTex = textTexture([
      { text: '🐔 Kandang Panggung', font: 'bold 56px system-ui', color: '#ffe7b0' },
      { text: 'Seperti rumah Banjar: aman dari', font: '36px system-ui', color: '#ffffff' },
      { text: 'genangan & banjir, lantai tetap kering', font: '36px system-ui', color: '#ffffff' },
      { text: 'Pekarangan → telur & daging sendiri', font: 'bold 34px system-ui', color: '#9be37a' },
    ], { w: 768, h: 384, bg: '#3b1a0a' });
    box(info, 1.7, 0.85, 0.06, [std('#4a2412'), std('#4a2412'), std('#4a2412'), std('#4a2412'), std('#ffffff', { map: infoTex }), std('#4a2412')], 0, 1.3, 0);
    addCollider(12.5, 13.9, 1.1, 2.1, -10, 3);
    // tempat pakan
    const feeder = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.12, 16), std('#9aa0a6', { metalness: 0.5 }));
    feeder.position.set(13.8, 0.06, 6); feeder.castShadow = true; nature.add(feeder);
    for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), std('#f2b233')); s.position.set(13.8 + (Math.random() - 0.5) * 0.4, 0.13, 6 + (Math.random() - 0.5) * 0.4); nature.add(s); }
  }

  // ---------- NPC ayam berkeliaran ----------
  const npcs = [];
  const AREA = { minX: 10, maxX: 22, minZ: -7, maxZ: 15 };
  const blocked = (x, z) => x > 15 && x < 17 && z > 2.6 && z < 5.4;
  function addNPC(kind, x, z) {
    const m = kind === 'hen' ? makeHen() : makeChick();
    m.scale.setScalar(kind === 'hen' ? 0.7 : 0.35);
    m.position.set(x, 0, z);
    nature.add(m);
    const npc = { m, kind, target: new THREE.Vector3(x, 0, z), wait: R() * 3, speed: kind === 'hen' ? 0.7 : 0.9, jump: 0, leader: null, phase: R() * 10 };
    const hit = new THREE.Mesh(new THREE.SphereGeometry(kind === 'hen' ? 0.9 : 0.9, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.6; m.add(hit);
    hit.userData.interact = {
      label: () => (kind === 'hen' ? 'Elus induk ayam' : 'Elus anak ayam'),
      action: () => { npc.jump = 0.0001; onCluck?.(kind); return null; },
    };
    interactables.push(hit);
    npcs.push(npc);
    return npc;
  }
  const hens = [addNPC('hen', 12, 8), addNPC('hen', 19, -2), addNPC('hen', 14, 12)];
  for (let i = 0; i < 6; i++) { const c = addNPC('chick', 12 + R() * 6, R() * 10); c.leader = hens[i % 3]; }
  updaters.push((t, dt) => {
    for (const n of npcs) {
      const p = n.m.position;
      if (n.leader) {
        const lp = n.leader.m.position;
        const off = new THREE.Vector3(Math.sin(n.phase) * 0.9, 0, Math.cos(n.phase) * 0.9);
        n.target.set(lp.x + off.x, 0, lp.z + off.z);
        n.phase += dt * 0.1;
      } else if (n.wait > 0) {
        n.wait -= dt;
        if (n.wait <= 0) {
          let tx, tz;
          do { tx = AREA.minX + R() * (AREA.maxX - AREA.minX); tz = AREA.minZ + R() * (AREA.maxZ - AREA.minZ); } while (blocked(tx, tz));
          n.target.set(tx, 0, tz);
        }
      }
      const d = new THREE.Vector3(n.target.x - p.x, 0, n.target.z - p.z);
      const dist = d.length();
      let walking = 0;
      if (dist > 0.15 && (n.leader || n.wait <= 0)) {
        d.normalize();
        const sp = n.speed * (n.leader && dist > 2 ? 2 : 1);
        const nx = p.x + d.x * sp * dt, nz = p.z + d.z * sp * dt;
        if (!blocked(nx, nz)) { p.x = nx; p.z = nz; }
        else n.target.set(p.x - 1, 0, p.z + 2);
        const ang = Math.atan2(d.x, d.z);
        let diff = ang - n.m.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        n.m.rotation.y += diff * Math.min(1, dt * 6);
        walking = 1;
      } else if (!n.leader && n.wait <= 0) n.wait = 1 + R() * 4;
      if (n.jump > 0) {
        n.jump += dt;
        p.y = Math.max(0, Math.sin(n.jump * 7) * 0.4);
        if (n.jump > Math.PI / 7) { n.jump = 0; p.y = 0; }
      }
      n.m.userData.update(t + n.phase, walking);
    }
  });

  // ======================================================
  // KETINGGIAN PERMUKAAN (untuk lantai, tangga, dermaga)
  // ======================================================
  function groundHeight(x, z) {
    if (x >= -5.15 && x <= 5.15 && z >= -6.1 && z <= 7.05) return FH;
    if (Math.abs(x) >= 5 && Math.abs(x) <= 8.1 && z >= -3.1 && z <= 1.1) return FH;
    if (x > -1.05 && x < 1.05 && z > 7.0 && z <= STAIR_END + 0.05) {
      return Math.max(0, Math.min(FH, Math.ceil(((STAIR_END - z) / RUN) - 0.001) * RISE));
    }
    if (x > 5.9 && x < 8.1 && z < -23.8 && z > -31.3) return 0.22;
    return 0;
  }
  function clampToWorld(p) {
    p.x = Math.max(-60, Math.min(60, p.x));
    p.z = Math.min(60, p.z);
    const onJettyX = p.x > 6.2 && p.x < 7.8;
    const minZ = onJettyX ? -31 : -24.4;
    if (p.z < minZ) p.z = minZ;
    if (!onJettyX && p.z < -24.4) p.z = -24.4;
  }

  return {
    colliders, interactables, stations, groundHeight, clampToWorld,
    door: doorState, lamps: lampState, radioMesh, bedMesh, cushions,
    spawnSparkles,
    setQRTextures(urlFor) { for (const s of Object.values(stations)) s.setQR(urlFor(s.n)); },
    applyScanned(list, newStage) {
      for (const s of Object.values(stations)) {
        const on = list.includes(s.n);
        if (on !== s.scanned || (newStage === s.n)) s.setScanned(on, newStage === s.n);
      }
      setCycle(list);
      if (newStage && list.length === 5) {
        for (let i = 0; i < 6; i++) setTimeout(() => spawnSparkles(new THREE.Vector3((Math.random() - 0.5) * 3, F + 1.5, -1.2 + (Math.random() - 0.5) * 3), ['#ffd23f', '#e8443a', '#7dffa0', '#5ab0ff'][i % 4], 120, 1.3), i * 250);
      }
    },
    update(t, dt) { for (const u of updaters) u(t, dt); },
  };
}
