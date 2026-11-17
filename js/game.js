// Logika game: kontrol orang-pertama, fisika sederhana, interaksi, HUD, sinkron realtime dengan HP.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld, FH } from './world.js';
import { STAGES, buildStage } from './models.js';
import { initAudio, sfx, toggleMusic } from './audio.js';
import { net } from './net.js';

const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window && navigator.maxTouchPoints > 0;

// ---------------- Renderer & scene ----------------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 900);
camera.rotation.order = 'YXZ';

const world = buildWorld(scene, { onCluck: (k) => sfx.cluck(k) });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------------- Player ----------------
const EYE = 1.62, RADIUS = 0.3, WALK = 3.4, RUN = 6.5, GRAV = -20, JUMP = 6.2, STEP = 0.45;
const player = { pos: new THREE.Vector3(0, 0, 22), vel: new THREE.Vector3(), yaw: 0, pitch: 0.1, onGround: true, camY: EYE, sit: null };
const keys = {};
let running = false; // toggle untuk sentuh
let started = false;
let modal = null;

function blocked(x, z, y) {
  const gh = world.groundHeight(x, z);
  if (gh - y > STEP) return true;
  for (const c of world.colliders) {
    if (c.active === false) continue;
    if (y < c.minY - 0.01 || y >= c.maxY) continue;
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < RADIUS * RADIUS) return true;
  }
  return false;
}

let stepTimer = 0;
function updatePlayer(dt) {
  // input
  let fx = 0, fz = 0;
  if (keys.KeyW || keys.ArrowUp) fz += 1;
  if (keys.KeyS || keys.ArrowDown) fz -= 1;
  if (keys.KeyA || keys.ArrowLeft) fx -= 1;
  if (keys.KeyD || keys.ArrowRight) fx += 1;
  fx += touchMove.x; fz += touchMove.y;
  const len = Math.hypot(fx, fz);
  if (len > 1) { fx /= len; fz /= len; }

  if (player.sit && len > 0.1) standUp();
  if (player.sit) { player.vel.set(0, 0, 0); return; }

  const speed = (keys.ShiftLeft || keys.ShiftRight || running) ? RUN : WALK;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  const tx = (fx * cos - fz * sin) * speed;
  const tz = (-fx * sin - fz * cos) * speed;
  const acc = player.onGround ? 12 : 3;
  player.vel.x += (tx - player.vel.x) * Math.min(1, acc * dt);
  player.vel.z += (tz - player.vel.z) * Math.min(1, acc * dt);

  const p = player.pos;
  // gerak per sumbu (bisa menyusur dinding)
  const nx = p.x + player.vel.x * dt;
  if (!blocked(nx, p.z, p.y)) p.x = nx; else player.vel.x = 0;
  const nz = p.z + player.vel.z * dt;
  if (!blocked(p.x, nz, p.y)) p.z = nz; else player.vel.z = 0;
  world.clampToWorld(p);

  // vertikal
  const wasGround = player.onGround;
  player.vel.y += GRAV * dt;
  p.y += player.vel.y * dt;
  const gh = world.groundHeight(p.x, p.z);
  player.onGround = false;
  if (p.y <= gh) { p.y = gh; player.vel.y = 0; player.onGround = true; }
  else if (wasGround && player.vel.y <= 0 && p.y - gh <= STEP + 0.05) { p.y = gh; player.vel.y = 0; player.onGround = true; } // turun tangga mulus
  // batas plafon di dalam rumah
  if (p.y > FH - 0.1 && insideHouse(p) && p.y + EYE + 0.15 > FH + 3.15) { p.y = FH + 3.0 - EYE; player.vel.y = Math.min(0, player.vel.y); }

  // langkah kaki
  const moving = Math.hypot(player.vel.x, player.vel.z) > 0.8 && player.onGround;
  if (moving) {
    stepTimer -= dt * (speed === RUN ? 1.6 : 1);
    if (stepTimer <= 0) { sfx.step(p.y > 0.15); stepTimer = 0.42; }
  }
  // bobbing kamera
  const bob = moving ? Math.sin(performance.now() / (speed === RUN ? 70 : 110)) * 0.035 : 0;
  const target = p.y + EYE;
  player.camY += (target - player.camY) * Math.min(1, dt * (player.onGround ? 14 : 30));
  camera.position.set(p.x, player.camY + bob, p.z);
}

function insideHouse(p) {
  return (p.x > -5 && p.x < 5 && p.z > -6 && p.z < 4) || (Math.abs(p.x) > 5 && Math.abs(p.x) < 8 && p.z > -3 && p.z < 1);
}

function jump() {
  if (player.sit) return standUp();
  if (player.onGround) { player.vel.y = JUMP; player.onGround = false; }
}

function sitOn(mesh) {
  const wp = new THREE.Vector3(); mesh.getWorldPosition(wp);
  player.sit = { prev: player.pos.clone() };
  player.pos.set(wp.x, wp.y - 0.06, wp.z);
  camera.position.set(wp.x, wp.y + 0.85, wp.z);
  player.camY = wp.y + 0.85 - EYE + EYE; // langsung
  player.camY = wp.y + 0.85;
  toast('🪑 Duduk santai… (tekan tombol gerak untuk berdiri)');
}
function standUp() {
  if (!player.sit) return;
  player.pos.copy(player.sit.prev);
  player.sit = null;
}

// ---------------- Kamera (mouse / sentuh) ----------------
function look(dx, dy, sens = 0.0022) {
  player.yaw -= dx * sens;
  player.pitch -= dy * sens;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
}
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) look(e.movementX, e.movementY);
});

function lock() {
  if (isTouch) return;
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch {}
}

document.addEventListener('pointerlockchange', () => {
  if (isTouch) return;
  if (document.pointerLockElement !== canvas && started && !modal) showMenu(true);
});

canvas.addEventListener('click', () => {
  if (!started || modal) return;
  if (!isTouch && document.pointerLockElement !== canvas) { lock(); return; }
  interact();
});

addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!started) return;
  if (modal) {
    if (e.code === 'Escape' || e.code === 'KeyE' || (e.code === 'KeyC' && modal === 'cycleModal')) { closeModal(); e.preventDefault(); }
    if (modal === 'infoModal' && e.code === 'ArrowRight') navInfo(1);
    if (modal === 'infoModal' && e.code === 'ArrowLeft') navInfo(-1);
    return;
  }
  if (e.code === 'Space') { jump(); e.preventDefault(); }
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyC') openCycle();
});
addEventListener('keyup', (e) => (keys[e.code] = false));
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ---------------- Kontrol sentuh ----------------
const touchMove = { x: 0, y: 0 };
if (isTouch) {
  const stick = $('#stick'), knob = $('#knob');
  let sid = null, sc = null;
  stick.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sid = t.identifier; const r = stick.getBoundingClientRect(); sc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; e.preventDefault(); }, { passive: false });
  stick.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === sid) {
      let dx = t.clientX - sc.x, dy = t.clientY - sc.y;
      const d = Math.hypot(dx, dy), max = 50;
      if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      touchMove.x = dx / max; touchMove.y = -dy / max;
    }
    e.preventDefault();
  }, { passive: false });
  const endStick = (e) => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; touchMove.x = touchMove.y = 0; knob.style.transform = ''; } };
  stick.addEventListener('touchend', endStick); stick.addEventListener('touchcancel', endStick);

  let lid = null, last = null, moved = 0;
  canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lid = t.identifier; last = { x: t.clientX, y: t.clientY }; moved = 0; }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === lid) {
      const dx = t.clientX - last.x, dy = t.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      look(dx, dy, 0.005); last = { x: t.clientX, y: t.clientY };
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === lid) { lid = null; if (moved < 8 && started && !modal) interact(); } });
  $('#tAct').onclick = () => interact();
  $('#tJump').onclick = () => jump();
  $('#tRun').onclick = (e) => { running = !running; e.currentTarget.classList.toggle('on', running); };
  $('#tMenu').onclick = () => showMenu(true);
  $('#keys').classList.add('hidden');
}

// ---------------- Interaksi ----------------
const ray = new THREE.Raycaster();
ray.far = 3.4;
let focused = null;
const promptEl = $('#prompt'), cross = $('#crosshair');

// interaksi tambahan yang butuh logika game
let musicOn = false;
world.radioMesh.userData.interact = { label: () => (musicOn ? 'Matikan radio' : 'Nyalakan radio 🎵'), action: () => { musicOn = toggleMusic(); toast(musicOn ? '📻 Radio menyala' : '📻 Radio dimatikan'); return null; } };
world.interactables.push(world.radioMesh);
world.bedMesh.userData.interact = { label: () => 'Rebahan sebentar 😴', action: () => { sleep(); return null; } };
world.interactables.push(world.bedMesh);
for (const c of world.cushions) { c.userData.interact = { label: () => 'Duduk di bantal', action: () => { sitOn(c); return null; } }; world.interactables.push(c); }

function updateFocus() {
  ray.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = ray.intersectObjects(world.interactables, false);
  focused = null;
  for (const h of hits) { if (h.object.userData.interact) { focused = h.object; break; } }
  if (focused && !modal) {
    const label = focused.userData.interact.label();
    promptEl.innerHTML = `${isTouch ? '👆' : '<kbd>E</kbd>'} ${label}`;
    promptEl.classList.remove('hidden');
    cross.classList.add('active');
  } else {
    promptEl.classList.add('hidden');
    cross.classList.remove('active');
  }
}

function interact() {
  if (!focused) return;
  const r = focused.userData.interact.action();
  if (r === 'door') sfx.door(world.door.open);
  else if (r === 'click') sfx.click();
  else if (r && r.type === 'qr') openQR(r.n);
  else if (r && r.type === 'info') openInfo(r.n);
  else if (r && r.type === 'cycle') openCycle();
}

function sleep() {
  const f = $('#fade');
  f.textContent = 'Zzz…';
  f.style.opacity = 1;
  sfx.snore();
  setTimeout(() => { f.style.opacity = 0; toast('☀️ Segar kembali! Ayo lanjut mencari QR.'); }, 1800);
}

// ---------------- HUD ----------------
let scanned = [];
const chips = $('#chips');
STAGES.forEach((s) => {
  const d = document.createElement('div');
  d.className = 'chip'; d.id = 'chip' + s.n; d.title = `Tahap ${s.n}`;
  d.innerHTML = `<span class="num">${s.n}</span><span class="e">?</span>`;
  d.onclick = () => scanned.includes(s.n) && openInfo(s.n);
  chips.appendChild(d);
});
function renderProgress(pop) {
  STAGES.forEach((s) => {
    const el = $('#chip' + s.n), on = scanned.includes(s.n);
    el.classList.toggle('on', on);
    el.querySelector('.e').textContent = on ? s.emoji : '?';
    el.title = on ? `Tahap ${s.n}: ${s.name}` : `Tahap ${s.n}: belum ditemukan`;
    if (pop === s.n) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  });
  $('#pcount').textContent = `${scanned.length}/5`;
  $('#pfill').style.width = (scanned.length / 5) * 100 + '%';
}

function toast(html, big = false, ms = 3800) {
  const t = document.createElement('div');
  t.className = 'toast' + (big ? ' big' : '');
  t.innerHTML = html;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
}

function locationName(p) {
  if (p.y >= FH - 0.2) {
    if (p.x < -5) return '🛏️ Anjung Kiri — Kamar Tidur';
    if (p.x > 5) return '🍚 Anjung Kanan — Ruang Makan';
    if (p.z > 4) return '🪵 Surambi (Teras)';
    return '🏠 Ruang Utama — cari 5 QR!';
  }
  if (p.z < -23.5) return '🛶 Dermaga Sungai';
  if (p.x > 9.5 && p.x < 23 && p.z > -8 && p.z < 16) return '🐔 Kandang Ayam';
  if (Math.abs(p.x) < 1.1 && p.z > 7 && p.z < 10.3) return '🪜 Tangga';
  return '🌴 Halaman Rumah Banjar';
}

// minimap
const mm = $('#minimap'), mctx = mm.getContext('2d');
function drawMinimap() {
  const W = mm.width, H = mm.height, s = 7.2; // px per meter
  const p = player.pos;
  mctx.clearRect(0, 0, W, H);
  mctx.save();
  mctx.beginPath(); mctx.arc(W / 2, H / 2, W / 2 - 4, 0, Math.PI * 2); mctx.clip();
  mctx.fillStyle = '#4f8a35'; mctx.fillRect(0, 0, W, H);
  mctx.translate(W / 2, H / 2);
  mctx.rotate(player.yaw);
  mctx.translate(-p.x * s, -p.z * s);
  // sungai
  mctx.fillStyle = '#4c87a8'; mctx.fillRect(-200 * s, -40 * s, 400 * s, 15 * s);
  // jalan
  mctx.fillStyle = '#9b7a52'; mctx.fillRect(-1.2 * s, 10 * s, 2.4 * s, 16 * s);
  // rumah
  mctx.fillStyle = '#b9773f';
  mctx.fillRect(-5 * s, -6 * s, 10 * s, 13 * s);
  mctx.fillRect(-8 * s, -3 * s, 3 * s, 4 * s);
  mctx.fillRect(5 * s, -3 * s, 3 * s, 4 * s);
  mctx.fillRect(-1 * s, 7 * s, 2 * s, 3.2 * s);
  mctx.strokeStyle = '#4a2412'; mctx.lineWidth = 2;
  mctx.strokeRect(-5 * s, -6 * s, 10 * s, 10 * s);
  // display tengah
  mctx.fillStyle = '#5a3018'; mctx.beginPath(); mctx.arc(0, -1.2 * s, 1.8 * s, 0, 7); mctx.fill();
  // stasiun QR
  for (const st of Object.values(world.stations)) {
    const wp = new THREE.Vector3(); st.qr.getWorldPosition(wp);
    mctx.fillStyle = st.scanned ? '#4ade80' : '#ffd36b';
    mctx.beginPath(); mctx.arc(wp.x * s, wp.z * s, 5, 0, 7); mctx.fill();
    mctx.save(); mctx.translate(wp.x * s, wp.z * s); mctx.rotate(-player.yaw);
    mctx.fillStyle = '#2b1608'; mctx.font = 'bold 8px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
    mctx.fillText(st.n, 0, 0.5); mctx.restore();
  }
  // kandang
  mctx.fillStyle = '#8b4f2a'; mctx.fillRect(15.3 * s, 3 * s, 1.4 * s, 2 * s);
  mctx.restore();
  // pemain (selalu di tengah, menghadap ke atas)
  mctx.fillStyle = '#fff'; mctx.strokeStyle = '#000'; mctx.lineWidth = 1.5;
  mctx.beginPath(); mctx.moveTo(W / 2, H / 2 - 9); mctx.lineTo(W / 2 + 6, H / 2 + 6); mctx.lineTo(W / 2, H / 2 + 2); mctx.lineTo(W / 2 - 6, H / 2 + 6); mctx.closePath(); mctx.fill(); mctx.stroke();
  mctx.beginPath(); mctx.arc(W / 2, H / 2, W / 2 - 4, 0, 7); mctx.strokeStyle = '#ffd36b88'; mctx.lineWidth = 3; mctx.stroke();
  mctx.fillStyle = '#fff'; mctx.font = 'bold 12px system-ui'; mctx.textAlign = 'center';
  const nx = W / 2 + Math.sin(player.yaw) * (W / 2 - 14) * -1, ny = H / 2 - Math.cos(player.yaw) * (H / 2 - 14);
  mctx.fillText('U', nx, ny + 4);
}

// ---------------- Menu & modal ----------------
function showMenu(on) {
  $('#menu').classList.toggle('hidden', !on);
  $('#hud').classList.toggle('hidden', on);
  $('#touch').classList.toggle('hidden', on || !isTouch);
  if (on) { $('#startBtn').textContent = started ? '▶ Lanjutkan' : '▶ Mulai Jelajah'; if (document.pointerLockElement) document.exitPointerLock(); }
}
$('#startBtn').onclick = () => {
  initAudio();
  const first = !started;
  started = true;
  showMenu(false);
  lock();
  if (first) setTimeout(() => toast('Selamat datang di <b>Rumah Banjar</b>! Naik tangga & buka pintu untuk masuk 🏠', true, 5000), 300);
};

function openModal(id) {
  modal = id;
  $('#' + id).classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
  $('#touch').classList.add('hidden');
  promptEl.classList.add('hidden');
  sfx.open();
}
function closeModal() {
  if (!modal) return;
  $('#' + modal).classList.add('hidden');
  if (modal === 'infoModal') viewer.active = false;
  modal = null;
  sfx.close();
  if (isTouch) $('#touch').classList.remove('hidden');
  lock();
}
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModal));
document.querySelectorAll('.overlay').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o && o.id !== 'menu') closeModal(); }));

// --- QR diperbesar ---
let qrOpenN = 0;
function openQR(n) {
  qrOpenN = n;
  $('#qrTitle').textContent = `📱 Scan QR Tahap ${n}`;
  $('#qrBig').src = net.qrDataUrl(net.arUrl(n), 10, 3);
  $('#qrUrl').textContent = net.arUrl(n);
  $('#qrDone').classList.toggle('hidden', net.server);
  updateQRStatus();
  openModal('qrModal');
}
function updateQRStatus() {
  const el = $('#qrStatus');
  const done = scanned.includes(qrOpenN);
  el.className = 'status' + (done ? ' ok' : '');
  el.textContent = done ? `✅ Sudah discan — ${STAGES[qrOpenN - 1].emoji} ${STAGES[qrOpenN - 1].name}` : '📷 Arahkan Kamera AR di HP ke kode ini…';
}

// --- Info + viewer 3D ---
const viewer = (() => {
  const c = $('#viewer');
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.shadowMap.enabled = true;
  const s = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
  cam.position.set(1.6, 1.3, 2.2);
  s.add(new THREE.HemisphereLight('#ffffff', '#c9a070', 1.6));
  const d = new THREE.DirectionalLight('#ffffff', 2.2); d.position.set(2, 4, 3); d.castShadow = true; s.add(d);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.ShadowMaterial({ opacity: 0.25 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
  const ctrl = new OrbitControls(cam, c);
  ctrl.target.set(0, 0.45, 0); ctrl.enableDamping = true; ctrl.enablePan = false; ctrl.minDistance = 1.2; ctrl.maxDistance = 5; ctrl.autoRotate = true; ctrl.autoRotateSpeed = 2;
  const v = { active: false, model: null, n: 0 };
  v.show = (n) => {
    if (v.model) s.remove(v.model);
    v.model = buildStage(n); v.n = n;
    s.add(v.model);
    v.active = true;
  };
  v.render = (t) => {
    if (!v.active) return;
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.floor(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    v.model?.userData.update?.(t);
    ctrl.update();
    r.render(s, cam);
  };
  return v;
})();

function openInfo(n) {
  const s = STAGES[n - 1];
  $('#infoBadge').textContent = `TAHAP ${n} DARI 5`;
  $('#infoName').textContent = `${s.emoji} ${s.name}`;
  $('#infoTime').textContent = `⏱ ${s.time}`;
  $('#infoDesc').textContent = s.desc;
  $('#infoFacts').innerHTML = s.facts.map((f) => `<li>${f}</li>`).join('');
  $('#infoTips').innerHTML = s.tips.map((f) => `<li>${f}</li>`).join('');
  const sorted = [...scanned].sort();
  const i = sorted.indexOf(n);
  $('#infoPrev').disabled = i <= 0;
  $('#infoNext').disabled = i < 0 || i >= sorted.length - 1;
  if (modal !== 'infoModal') { if (modal) $('#' + modal).classList.add('hidden'); openModal('infoModal'); }
  viewer.show(n);
}
function navInfo(d) {
  const sorted = [...scanned].sort();
  const i = sorted.indexOf(viewer.n) + d;
  if (i >= 0 && i < sorted.length) openInfo(sorted[i]);
}
$('#infoPrev').onclick = () => navInfo(-1);
$('#infoNext').onclick = () => navInfo(1);

// --- Diagram daur hidup ---
function openCycle() {
  const ring = $('#cycleRing');
  const W = ring.clientWidth || 460;
  let html = `<svg viewBox="0 0 100 100"><defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffd36b"/></marker></defs>`;
  const pos = (i) => { const a = -Math.PI / 2 + (i / 5) * Math.PI * 2; return [50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36, a]; };
  for (let i = 0; i < 5; i++) {
    const a0 = -Math.PI / 2 + (i / 5) * Math.PI * 2 + 0.38, a1 = -Math.PI / 2 + ((i + 1) / 5) * Math.PI * 2 - 0.38;
    const on = scanned.includes(i + 1) && scanned.includes(((i + 1) % 5) + 1);
    const x0 = 50 + Math.cos(a0) * 36, y0 = 50 + Math.sin(a0) * 36, x1 = 50 + Math.cos(a1) * 36, y1 = 50 + Math.sin(a1) * 36;
    html += `<path d="M${x0} ${y0} A36 36 0 0 1 ${x1} ${y1}" fill="none" stroke="${on ? '#ffd36b' : '#ffffff40'}" stroke-width="1.2" ${on ? '' : 'stroke-dasharray="2 2"'} marker-end="url(#ah)"/>`;
  }
  html += '</svg><div class="cycleCenter">🔁<br/>Daur<br/>Hidup</div>';
  STAGES.forEach((s, i) => {
    const [x, y] = pos(i);
    const on = scanned.includes(s.n);
    html += `<div class="cnode ${on ? 'on' : ''}" data-n="${s.n}" style="left:${x}%;top:${y}%"><div class="circle">${on ? s.emoji : '?'}</div><div class="lbl">${s.n}. ${on ? s.name : '???'}<small>${on ? s.time : 'belum ditemukan'}</small></div></div>`;
  });
  ring.innerHTML = html;
  ring.querySelectorAll('.cnode.on').forEach((el) => (el.onclick = () => { $('#cycleModal').classList.add('hidden'); modal = null; openInfo(Number(el.dataset.n)); }));
  if (modal !== 'cycleModal') openModal('cycleModal');
}

// ---------------- Jaringan: host, QR, progres ----------------
function setHost(h) {
  net.host = h;
  try { localStorage.setItem('qrHost', h); } catch {}
  world.setQRTextures((n) => net.qrDataUrl(net.arUrl(n), 8, 3));
  $('#homeQR').src = net.qrDataUrl(net.arUrl(0), 6, 2);
  $('#lanUrl').textContent = net.arUrl(0);
  $('#netText').innerHTML = `Kamera AR HP: <b>${net.arUrl(0).replace(/^https?:\/\//, '')}</b>`;
}

async function initNetwork() {
  await net.init();
  document.body.classList.toggle('static-mode', !net.server);
  const sel = $('#hostSel');
  if (net.server) {
    sel.innerHTML = '';
    let saved = null;
    try { saved = localStorage.getItem('qrHost'); } catch {}
    const list = net.hosts();
    let chosen = net.defaultHost();
    if (saved && list.includes(saved) && ['localhost', '127.0.0.1'].includes(location.hostname)) chosen = saved;
    for (const h of net.info.hosts) sel.add(new Option(`${h.address} (${h.name})`, h.address));
    if (![...sel.options].some((o) => o.value === chosen)) sel.add(new Option(chosen, chosen));
    sel.value = chosen;
    sel.onchange = () => setHost(sel.value);
    if (!list.length) {
      const w = $('#netWarn');
      w.classList.remove('hidden');
      w.innerHTML = '⚠️ Laptop belum tersambung ke jaringan WiFi/hotspot. Sambungkan laptop & HP ke WiFi/hotspot yang sama, lalu muat ulang halaman.';
    }
    setHost(chosen);
  } else {
    setHost(location.host);
  }
  // tombol demo (tanpa HP)
  const demo = $('#demoBtns');
  STAGES.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'btn ghost'; b.textContent = `${s.emoji} Tahap ${s.n}`;
    b.onclick = () => net.scan(s.n);
    demo.appendChild(b);
  });
  const dot = $('#dot');
  net.on((e) => {
    if (e.type === 'online') dot.className = 'ok';
    else if (e.type === 'offline') dot.className = 'bad';
    else if (e.type === 'state') applyScanned(e.scanned, null);
    else if (e.type === 'reset') { applyScanned([], null); toast('↺ Progres direset'); }
    else if (e.type === 'scan') onScan(e);
  });
}

function onScan(d) {
  const s = STAGES[d.stage - 1];
  if (d.isNew) {
    applyScanned(d.scanned, d.stage);
    sfx.chime(d.stage);
    toast(`📱 ${d.device} memindai <b>Tahap ${d.stage}</b>: ${s.emoji} ${s.name}!<br/><span style="font-weight:400">Model 3D muncul di alas samping papan QR ✨</span>`, true, 5200);
    if (d.scanned.length === 5) setTimeout(() => { sfx.fanfare(); if (modal) closeModal(); openModal('celebrate'); }, 1600);
    else if (modal === 'qrModal' && qrOpenN === d.stage) setTimeout(() => { if (modal === 'qrModal') closeModal(); }, 1500);
  } else {
    applyScanned(d.scanned, null);
    toast(`📱 Tahap ${d.stage} (${s.name}) discan ulang`);
  }
}

function applyScanned(list, newStage) {
  scanned = [...list];
  world.applyScanned(scanned, newStage);
  renderProgress(newStage);
  if (modal === 'qrModal') updateQRStatus();
}

$('#qrDone').onclick = () => net.scan(qrOpenN);
$('#resetBtn').onclick = async () => {
  if (!confirm('Reset semua progres scan?')) return;
  await net.reset();
};

// ---------------- Loop utama ----------------
const clock = new THREE.Clock();
let t = 0, frame = 0, birdT = 5;
function loop() {
  step(Math.min(0.05, clock.getDelta()));
  requestAnimationFrame(loop);
}
function step(dt) {
  t += dt; frame++;
  if (started && !modal && $('#menu').classList.contains('hidden')) updatePlayer(dt);
  else camera.position.set(player.pos.x, player.camY, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  world.update(t, dt);
  if (frame % 3 === 0 && started) updateFocus();
  if (frame % 2 === 0 && started) drawMinimap();
  if (frame % 15 === 0) $('#loc').textContent = locationName(player.pos);
  // kicau burung saat di luar rumah
  birdT -= dt;
  if (birdT < 0) { if (started && !insideHouse(player.pos)) sfx.bird(); birdT = 4 + Math.random() * 8; }
  renderer.render(scene, camera);
  viewer.render(t);
}

// mulai
player.camY = EYE;
camera.position.set(player.pos.x, EYE, player.pos.z);
renderProgress();
initNetwork().catch((e) => { console.error(e); $('#netText').textContent = 'Server tidak terhubung'; $('#dot').className = 'bad'; });
loop();
setTimeout(() => $('#loading').remove(), 300);
if (isTouch) $('#keys').classList.add('hidden');

// debug helper (konsol)
window.__game = { player, world, camera, scene, renderer, step, keys, interact: () => interact(), focus: () => { updateFocus(); return focused?.userData.interact.label(); } };
