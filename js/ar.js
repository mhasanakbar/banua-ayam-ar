// Kamera AR: buka kamera HP → deteksi QR → model 3D menempel di atas QR.
import * as THREE from 'three';
import { STAGES, GROUPS, TOTAL, buildStage } from './models.js';
import { solvePose } from './ar-pose.js';
import { net } from './net.js';
import { openQuiz } from './quiz.js';

await net.init();

const $ = (s) => document.querySelector(s);
const video = $('#cam');
const HFOV_LONG = 64;          // perkiraan sudut pandang kamera HP (sisi panjang), derajat
const LOST_MS = 700;           // QR dianggap hilang setelah ini
const DETECT_W = 640;          // lebar frame untuk deteksi

// ---------- Status progres & koneksi ----------
let scanned = [];
let current = 0;               // tahap yang sedang tampil
const triggered = new Set();   // tahap yang sudah memicu di sesi ini
const params = new URLSearchParams(location.search);
const hintStage = Number(params.get('s')) || 0;
if (hintStage >= 1 && hintStage <= TOTAL) $('#noCamLink').href = `scan.html?s=${hintStage}`;

function renderChips() {
  $('#chips').innerHTML = STAGES.map((s) => {
    const on = scanned.includes(s.n);
    return `<span class="${on ? 'on' : ''} ${s.n === current ? 'cur' : ''}">${on ? s.emoji : s.n}</span>`;
  }).join('');
}
renderChips();

net.on((e) => {
  if (e.type === 'online') { $('#dot').className = 'dot ok'; $('#connText').textContent = net.server ? 'Laptop' : 'Online'; }
  else if (e.type === 'offline') { $('#dot').className = 'dot bad'; $('#connText').textContent = 'Terputus'; }
  else { scanned = e.scanned; if (e.type === 'reset') triggered.clear(); renderChips(); }
});

// ---------- Cek HTTPS ----------
if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
  const w = $('#secureWarn');
  w.classList.remove('hidden');
  const httpsUrl = `https://${location.hostname}:3443/ar.html${location.search}`;
  w.innerHTML = `⚠️ Kamera hanya bisa dibuka lewat <b>HTTPS</b>.<br/>Buka: <a class="link" href="${httpsUrl}">${httpsUrl}</a><br/>Jika muncul peringatan sertifikat, pilih <b>Lanjutkan / Advanced → Proceed</b>.`;
}

// ---------- Three.js ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 500);
scene.add(camera);
scene.add(new THREE.HemisphereLight('#ffffff', '#a07850', 1.7));
const sun = new THREE.DirectionalLight('#fff6e0', 2.2);
sun.position.set(1, 2, 1.5);
camera.add(sun);

// anchor = posisi QR; content = orientasi menurut mode; spin = putar/zoom pengguna
const anchor = new THREE.Group();
anchor.matrixAutoUpdate = true;
anchor.visible = false;
scene.add(anchor);
const content = new THREE.Group();
anchor.add(content);
const spin = new THREE.Group();
content.add(spin);
// alas bercahaya di bawah model
const baseRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 48), new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
baseRing.rotation.x = -Math.PI / 2;
baseRing.position.y = 0.005;
spin.add(baseRing);
const baseDisk = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ color: '#2b1608', transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
baseDisk.rotation.x = -Math.PI / 2;
spin.add(baseDisk);

// label teks 3D di atas model
const labelCanvas = document.createElement('canvas');
labelCanvas.width = 512; labelCanvas.height = 128;
const labelTex = new THREE.CanvasTexture(labelCanvas);
labelTex.colorSpace = THREE.SRGBColorSpace;
const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false }));
label.scale.set(1.1, 0.275, 1);
label.position.y = 1.25;
label.renderOrder = 10;
spin.add(label);
function setLabel(s) {
  const g = labelCanvas.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.fillStyle = 'rgba(43,22,8,0.85)';
  g.beginPath(); g.roundRect(6, 14, 500, 100, 50); g.fill();
  g.strokeStyle = s.color; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#fff4d6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 50;
  do { g.font = `bold ${size}px system-ui, sans-serif`; size -= 2; } while (g.measureText(s.name).width > 450 && size > 24);
  g.fillText(s.name, 256, 66);
  labelTex.needsUpdate = true;
}

const models = {};
let model = null;
function setStage(n) {
  if (n === current) return;
  current = n;
  if (model) spin.remove(model);
  models[n] ??= buildStage(n);
  model = models[n];
  model.scale.setScalar(0.001);
  appearStart = performance.now();
  spin.add(model);
  baseRing.material.color.set(STAGES[n - 1].color);
  const s = STAGES[n - 1];
  $('#hintCard').classList.add('hidden');
  $('#stageInfo').classList.remove('hidden');
  $('#sName').textContent = `${s.emoji} ${s.label}: ${s.name}`;
  $('#sTipsTitle').textContent = s.tipsTitle;
  $('#sTime').textContent = `⏱ ${s.time}`;
  $('#sDesc').textContent = s.desc;
  $('#sFacts').innerHTML = s.facts.map((f) => `<li>${f}</li>`).join('');
  $('#sTips').innerHTML = s.tips.map((f) => `<li>${f}</li>`).join('');
  $('#bFull').href = `scan.html?s=${n}`;
  setLabel(s);
  renderChips();
}
let appearStart = 0;
const USER = { yaw: 0, scale: 1 };

// partikel kilau
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, '#fff'); r.addColorStop(0.35, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
let sparks = null;
function burst(color) {
  const N = 140, geo = new THREE.BufferGeometry(), p = new Float32Array(N * 3), v = [];
  for (let i = 0; i < N; i++) { p.set([0, 0.4, 0], i * 3); v.push(new THREE.Vector3((Math.random() - 0.5) * 2.5, Math.random() * 3, (Math.random() - 0.5) * 2.5)); }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  if (sparks) spin.remove(sparks.pts);
  sparks = { pts: new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.09, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), v, t0: performance.now() };
  spin.add(sparks.pts);
}

// ---------- Mode tampilan ----------
// 'screen': QR di layar/dinding (tegak) → model berdiri di depan QR
// 'table' : QR di meja/lantai (datar) → model berdiri di atas QR
let mode = 'screen';
try { mode = localStorage.getItem('arMode') || 'screen'; } catch {}
function applyModeButton() { $('#bMode').textContent = mode === 'screen' ? '📺 Layar' : '📄 Meja'; }
applyModeButton();
$('#bMode').onclick = () => {
  mode = mode === 'screen' ? 'table' : 'screen';
  try { localStorage.setItem('arMode', mode); } catch {}
  applyModeButton();
  toastStatus(mode === 'screen' ? '📺 Mode QR di layar/dinding' : '📄 Mode QR di meja/kertas datar', true);
};
function contentFor(m) {
  // sumbu anchor: x kanan QR, y ke BAWAH QR, z menjauhi kamera
  if (m === 'table') return { rot: new THREE.Euler(-Math.PI / 2, 0, 0), pos: new THREE.Vector3(0, 0, -0.01) };
  return { rot: new THREE.Euler(Math.PI, 0, 0), pos: new THREE.Vector3(0, 0.42, -0.35) };
}

// ---------- Kamera & ukuran ----------
let vw = 0, vh = 0, fv = 1;
function layout() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false);
  vw = video.videoWidth || W; vh = video.videoHeight || H;
  const s = Math.max(W / vw, H / vh);           // object-fit: cover
  fv = (Math.max(vw, vh) / 2) / Math.tan(THREE.MathUtils.degToRad(HFOV_LONG / 2));
  const F = fv * s;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((H / 2) / F));
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
}
addEventListener('resize', layout);
video.addEventListener('loadedmetadata', layout);

let starting = false;
async function startCamera() {
  if (starting || running) return;
  starting = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    video.srcObject = stream;
    await video.play().catch((e) => { if (e.name !== 'AbortError') throw e; });
    $('#intro').classList.add('hidden');
    ['#hdr', '#status', '#reticle', '#card'].forEach((s) => $(s).classList.remove('hidden'));
    layout();
    running = true;
  } catch (e) {
    console.error(e);
    $('#intro').classList.add('hidden');
    $('#camErr').classList.remove('hidden');
    let msg = 'Terjadi kesalahan: ' + (e.message || e.name);
    if (e.name === 'NotAllowedError') msg = 'Izin kamera ditolak. Buka pengaturan situs di browser, izinkan <b>Kamera</b>, lalu coba lagi.';
    else if (e.name === 'NotFoundError') msg = 'Kamera tidak ditemukan di perangkat ini.';
    else if (!window.isSecureContext) msg = 'Halaman harus dibuka lewat <b>https://</b> agar kamera bisa dipakai.';
    $('#camErrMsg').innerHTML = msg;
  } finally { starting = false; }
}
$('#startBtn').onclick = startCamera;

// ---------- Deteksi QR (worker) ----------
const worker = new Worker(new URL('./qr-worker.js', import.meta.url));
const grab = document.createElement('canvas');
const gctx = grab.getContext('2d', { willReadFrequently: true });
let busy = false, frameId = 0, k = 1;
let lastSeen = 0, lastText = '';
const targetPos = new THREE.Vector3(), targetQuat = new THREE.Quaternion();
let hasPose = false;

function requestDetect() {
  if (busy || !running || video.readyState < 2 || !video.videoWidth) return;
  k = Math.min(1, DETECT_W / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.round(video.videoWidth * k), h = Math.round(video.videoHeight * k);
  if (grab.width !== w) { grab.width = w; grab.height = h; }
  gctx.drawImage(video, 0, 0, w, h);
  const img = gctx.getImageData(0, 0, w, h);
  busy = true;
  worker.postMessage({ id: ++frameId, width: w, height: h, buffer: img.data.buffer }, [img.data.buffer]);
}

const stageFromText = (t) => {
  const m = t.match(/[?&]s=(10|[1-9])\b/) || t.match(/\/scan\/(10|[1-9])\b/);
  return m ? Number(m[1]) : 0;
};

worker.onmessage = (e) => {
  busy = false;
  const { res } = e.data;
  if (!res) return;
  const n = stageFromText(res.text);
  if (!n) {
    if (res.text !== lastText) toastStatus('❓ QR ini bukan bagian dari daur hidup ayam');
    lastText = res.text;
    return;
  }
  lastText = res.text;
  // sudut (frame deteksi) → piksel video → koordinat kamera ternormalisasi
  const norm = res.corners.map(([x, y]) => [((x / k) - vw / 2) / fv, ((y / k) - vh / 2) / fv]);
  const pose = solvePose(norm);
  if (!pose || !isFinite(pose.t[2])) return;
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...pose.x), new THREE.Vector3(...pose.y), new THREE.Vector3(...pose.z));
  m.setPosition(...pose.t);
  const sc = new THREE.Vector3();
  m.decompose(targetPos, targetQuat, sc);
  const wasLost = performance.now() - lastSeen > LOST_MS;
  lastSeen = performance.now();
  hasPose = true;
  setStage(n);
  if (wasLost) { anchor.position.copy(targetPos); anchor.quaternion.copy(targetQuat); }
  onTrigger(n);
};

function onTrigger(n) {
  if (triggered.has(n)) return;
  triggered.add(n);
  const s = STAGES[n - 1];
  burst(s.color);
  try { navigator.vibrate?.([60, 40, 120]); } catch {}
  beep(n);
  const p = document.createElement('div');
  p.id = 'pop';
  p.innerHTML = `✨ ${s.emoji} ${s.name} muncul!<small>${s.label} · ${GROUPS[s.group].title} · tampil juga di rumah 3D 🏠</small>`;
  document.querySelectorAll('#pop').forEach((x) => x.remove());
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 2600);
  net.scan(n).then((d) => {
    scanned = d.scanned; renderChips();
    if (d.isNew && GROUPS[s.group].stages.every((k) => scanned.includes(k))) setTimeout(() => showDone(s.group), 2200);
  }).catch(() => {});
}

// bunyi kecil
let actx = null;
function beep(n) {
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    const base = [523, 587, 659, 698, 784][n - 1];
    [1, 1.25, 1.5, 2].forEach((m, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = base * m;
      const t0 = actx.currentTime + i * 0.08;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.7);
    });
  } catch {}
}

let statusTimer = 0;
function toastStatus(text, force) {
  const el = $('#status');
  el.textContent = text;
  statusTimer = performance.now() + (force ? 2000 : 1500);
}

// ---------- Gestur: geser = putar, cubit = zoom ----------
const pointers = new Map();
let pinch0 = 0, scale0 = 1;
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); scale0 = USER.scale; } });
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (pointers.size === 1) USER.yaw += (e.clientX - p.x) * 0.012;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; USER.scale = Math.max(0.4, Math.min(3, scale0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0)); }
});
const up = (e) => pointers.delete(e.pointerId);
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

// ---------- Tombol ----------
$('#bInfo').onclick = () => {
  if (!current) return toastStatus('Scan QR dulu ya 🙂', true);
  const show = $('#sDesc').classList.contains('hidden');
  $('#sDesc').classList.toggle('hidden', !show);
  $('#sFacts').classList.toggle('hidden', !show);
  $('#sTipsBox').classList.toggle('hidden', !show);
  $('#bInfo').classList.toggle('on', show);
};
$('#bFull').onclick = (e) => { if (!current) { e.preventDefault(); toastStatus('Scan QR dulu ya 🙂', true); } };
let wantPhoto = false;
$('#bPhoto').onclick = () => { wantPhoto = true; };
$('#photoClose').onclick = () => $('#photo').classList.add('hidden');
$('#doneClose').onclick = () => $('#done').classList.add('hidden');
$('#postBtn2').onclick = () => openQuiz('post');
function showDone(group) {
  const all = scanned.length === TOTAL;
  if (group === 'daur') {
    $('#doneEmoji').textContent = '🎉🐔🎉';
    $('#doneTitle').textContent = 'Daur hidup lengkap!';
    $('#doneText').innerHTML = '🥚 → 🔬 → 🐣 → 🐥 → 🐔 → 🥚<br/>Kamu sudah memunculkan kelima tahap daur hidup ayam. Daur hidup terus berulang!';
  } else {
    $('#doneEmoji').textContent = '🎉🍲🎉';
    $('#doneTitle').textContent = 'Masakan Banjar lengkap!';
    $('#doneText').innerHTML = '🍲 · 🌶️ · 🍛 · 🍙 · 🥥<br/>Dari ayam kampung di pekarangan menjadi lima masakan khas Banjar.';
  }
  if (all) $('#doneText').innerHTML += '<br/><b>Semua 10 QR sudah ditemukan! 🏆</b>';
  $('#done').classList.remove('hidden');
}
$('#postBtn').onclick = () => { $('#done').classList.add('hidden'); openQuiz('post'); };
$('#preBtn').onclick = () => openQuiz('pre');

function takePhoto() {
  const W = innerWidth, H = innerHeight, dpr = renderer.getPixelRatio();
  const c = document.createElement('canvas');
  c.width = W * dpr; c.height = H * dpr;
  const g = c.getContext('2d');
  const s = Math.max(W / vw, H / vh);
  g.drawImage(video, (W - vw * s) / 2 * dpr, (H - vh * s) / 2 * dpr, vw * s * dpr, vh * s * dpr);
  g.drawImage(canvas, 0, 0, c.width, c.height);
  g.fillStyle = 'rgba(43,22,8,.75)'; g.fillRect(0, c.height - 46 * dpr, c.width, 46 * dpr);
  g.fillStyle = '#ffd36b'; g.font = `bold ${18 * dpr}px system-ui`; g.textAlign = 'center';
  g.fillText(current ? `${STAGES[current - 1].emoji} ${STAGES[current - 1].label}: ${STAGES[current - 1].name} — Banua Ayam AR` : 'Banua Ayam AR', c.width / 2, c.height - 17 * dpr);
  const url = c.toDataURL('image/jpeg', 0.9);
  $('#photoImg').src = url; $('#photoSave').href = url;
  $('#photo').classList.remove('hidden');
  const f = $('#flash'); f.style.opacity = 0.9; setTimeout(() => (f.style.opacity = 0), 120);
}

// ---------- Loop ----------
let running = false;
const floatPos = new THREE.Vector3(0, 0.1, -3.4);
const floatQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)); // seperti QR tegak menghadap kamera
const clock = new THREE.Clock();
let t = 0;
function loop() {
  const dt = Math.min(0.05, clock.getDelta()); t += dt;
  requestDetect();
  const now = performance.now();
  const tracked = hasPose && now - lastSeen < LOST_MS;

  if (current) {
    anchor.visible = true;
    const cf = contentFor(tracked ? mode : 'screen');
    content.position.lerp(cf.pos, 0.25);
    content.quaternion.slerp(new THREE.Quaternion().setFromEuler(cf.rot), 0.25);
    if (tracked) {
      anchor.position.lerp(targetPos, 0.45);
      anchor.quaternion.slerp(targetQuat, 0.45);
    } else {
      // QR tidak terlihat: model tetap melayang di depan kamera
      anchor.position.lerp(floatPos, 0.08);
      anchor.quaternion.slerp(floatQuat, 0.08);
      USER.yaw += dt * 0.6;
    }
    spin.rotation.y = USER.yaw;
    const a = Math.min(1, (now - appearStart) / 900);
    const el = a === 1 ? 1 : 1 - Math.pow(2, -10 * a) * Math.cos(a * 10);
    if (model) { model.scale.setScalar(Math.max(0.001, 0.85 * el)); model.userData.update?.(t); }
    spin.scale.setScalar(USER.scale);
    baseRing.material.opacity = 0.5 + Math.sin(t * 4) * 0.3;
  }
  if (sparks) {
    const life = (now - sparks.t0) / 1000;
    const arr = sparks.pts.geometry.attributes.position.array;
    sparks.v.forEach((v, i) => { v.y -= 4 * dt; arr[i * 3] += v.x * dt; arr[i * 3 + 1] += v.y * dt; arr[i * 3 + 2] += v.z * dt; });
    sparks.pts.geometry.attributes.position.needsUpdate = true;
    sparks.pts.material.opacity = Math.max(0, 1 - life / 2);
    if (life > 2) { spin.remove(sparks.pts); sparks = null; }
  }

  // status & bingkai
  if (running && now > statusTimer) {
    const st = $('#status');
    if (tracked) { st.textContent = `✅ QR ${STAGES[current - 1].label} terdeteksi`; st.className = 'ok'; }
    else if (current) { st.textContent = '🔍 QR tidak terlihat — model melayang'; st.className = ''; }
    else { st.textContent = '🔍 Arahkan kamera ke kode QR'; st.className = ''; }
  }
  $('#reticle').classList.toggle('faded', tracked);

  renderer.render(scene, camera);
  if (wantPhoto) { wantPhoto = false; takePhoto(); }
  requestAnimationFrame(loop);
}
loop();

// debug untuk pengujian
window.__ar = { solvePose, stageFromText, anchor, camera, get state() { return { current, mode, fv, vw, vh, scanned, triggered: [...triggered] }; } };
