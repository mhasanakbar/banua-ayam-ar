// Kuis singkat tes awal / tes akhir — ukuran keberhasilan produk (tanpa data pribadi, disimpan di perangkat).
import { CONFIG } from './config.js';

export const QUESTIONS = [
  { q: 'Berapa lama telur ayam dierami sampai menetas?', a: ['7 hari', '21 hari', '45 hari'], c: 1 },
  { q: 'Suhu yang tepat untuk menetaskan telur adalah…', a: ['Sekitar 30 °C', 'Sekitar 37,5–38 °C', 'Sekitar 45 °C'], c: 1 },
  { q: 'Apa gunanya "gigi telur" pada paruh anak ayam?', a: ['Untuk makan biji', 'Untuk memecah cangkang', 'Untuk minum'], c: 1 },
  { q: 'Apa yang paling dibutuhkan anak ayam di minggu pertama?', a: ['Kehangatan, air bersih, dan pakan', 'Dimandikan setiap hari', 'Dilepas bebas di halaman'], c: 0 },
  { q: 'Mengapa kandang ayam di Banjarmasin sebaiknya dibuat panggung?', a: ['Supaya terlihat mewah', 'Agar aman dari genangan/banjir dan tetap kering', 'Agar ayam bisa terbang'], c: 1 },
];

const KEY = 'banua-ayam-quiz';
export function loadResults() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function saveResults(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {} }

let styled = false;
function style() {
  if (styled) return; styled = true;
  const s = document.createElement('style');
  s.textContent = `
  .qz { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 18px; background: radial-gradient(circle at 50% 30%, #6b3418f2, #2b1608f8); overflow-y: auto; font-family: system-ui, sans-serif; color: #fff; }
  .qz .box { width: min(460px, 100%); }
  .qz h2 { font: 800 24px Georgia, serif; color: #fff4d6; margin: 4px 0 6px; }
  .qz .meta { color: #ffd36b; font-weight: 700; font-size: 13px; }
  .qz .bar { height: 6px; background: #ffffff22; border-radius: 4px; overflow: hidden; margin: 10px 0 16px; }
  .qz .bar i { display: block; height: 100%; background: #ffd36b; transition: width .3s; }
  .qz .q { font-size: 18px; font-weight: 700; line-height: 1.4; margin-bottom: 14px; }
  .qz button.opt { display: block; width: 100%; text-align: left; margin: 8px 0; padding: 14px; border-radius: 14px; border: 1px solid #ffffff44; background: #ffffff18; color: #fff; font: 600 15px system-ui; }
  .qz button.opt.ok { background: #1d7a3a; border-color: #4ade80; }
  .qz button.opt.no { background: #8b1d1d; border-color: #ef4444; }
  .qz .main { width: 100%; padding: 14px; border: 0; border-radius: 14px; background: #ffd36b; color: #3b1a0a; font: 800 16px system-ui; margin-top: 12px; }
  .qz .ghost { background: #ffffff1c; color: #fff; border: 1px solid #ffffff44; }
  .qz .score { font: 800 54px Georgia, serif; color: #ffd36b; text-align: center; }
  .qz .cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
  .qz .cmp div { background: #0003; border-radius: 12px; padding: 10px; text-align: center; }
  .qz .cmp b { display: block; font-size: 26px; color: #ffd36b; }
  .qz .stars { display: flex; justify-content: center; gap: 6px; font-size: 32px; margin: 8px 0; }
  .qz .stars span { cursor: pointer; filter: grayscale(1); opacity: .5; }
  .qz .stars span.on { filter: none; opacity: 1; }
  .qz p { color: #f2e2c4; line-height: 1.5; }
  .qz a { color: #ffd36b; }`;
  document.head.appendChild(s);
}

/** kind: 'pre' (tes awal) atau 'post' (tes akhir) */
export function openQuiz(kind, onClose) {
  style();
  const el = document.createElement('div');
  el.className = 'qz';
  document.body.appendChild(el);
  let i = 0, score = 0;
  const title = kind === 'pre' ? '📝 Tes Awal' : '📝 Tes Akhir';
  const close = () => { el.remove(); onClose?.(); };

  function question() {
    const Q = QUESTIONS[i];
    el.innerHTML = `<div class="box"><div class="meta">${title} · Soal ${i + 1} dari ${QUESTIONS.length}</div>
      <div class="bar"><i style="width:${(i / QUESTIONS.length) * 100}%"></i></div>
      <div class="q">${Q.q}</div>
      ${Q.a.map((a, k) => `<button class="opt" data-k="${k}">${String.fromCharCode(65 + k)}. ${a}</button>`).join('')}
      <button class="main ghost" data-x>Batal</button></div>`;
    el.querySelector('[data-x]').onclick = close;
    el.querySelectorAll('.opt').forEach((b) => (b.onclick = () => {
      const k = Number(b.dataset.k);
      el.querySelectorAll('.opt').forEach((o) => (o.disabled = true));
      if (k === Q.c) { score++; b.classList.add('ok'); }
      else { b.classList.add('no'); el.querySelector(`.opt[data-k="${Q.c}"]`).classList.add('ok'); }
      setTimeout(() => { i++; i < QUESTIONS.length ? question() : result(); }, kind === 'pre' ? 500 : 900);
    }));
  }

  function result() {
    const R = loadResults();
    R[kind] = { score, total: QUESTIONS.length, at: new Date().toISOString() };
    saveResults(R);
    const pre = R.pre?.score, post = R.post?.score;
    el.innerHTML = `<div class="box"><div class="meta">${title} selesai</div>
      <div class="score">${score}/${QUESTIONS.length}</div>
      ${kind === 'pre'
        ? '<p>Terima kasih! Sekarang jelajahi kelima tahap dengan Kamera AR, lalu kerjakan <b>Tes Akhir</b> untuk melihat peningkatanmu.</p>'
        : `<div class="cmp"><div>Tes awal<b>${pre ?? '–'}/5</b></div><div>Tes akhir<b>${post}/5</b></div></div>
           <p>${pre != null ? (post > pre ? `🎉 Naik ${post - pre} poin setelah memakai Banua Ayam AR!` : post === pre ? 'Nilaimu sama — coba lihat lagi tips tiap tahap.' : 'Coba lihat lagi tips di tiap tahap 🙂') : 'Kerjakan tes awal di perangkat ini untuk melihat perbandingan.'}</p>
           <div class="meta" style="text-align:center">Seberapa membantu aplikasi ini?</div>
           <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<span data-n="${n}">⭐</span>`).join('')}</div>`}
      ${CONFIG.SURVEY_URL ? `<a class="main" style="display:block;text-align:center;text-decoration:none" href="${CONFIG.SURVEY_URL}" target="_blank" rel="noopener">📋 Isi survei singkat</a>` : ''}
      <button class="main" data-x>Selesai</button></div>`;
    el.querySelector('[data-x]').onclick = close;
    el.querySelectorAll('.stars span').forEach((st) => (st.onclick = () => {
      const n = Number(st.dataset.n);
      el.querySelectorAll('.stars span').forEach((x) => x.classList.toggle('on', Number(x.dataset.n) <= n));
      const R2 = loadResults(); R2.rating = n; saveResults(R2);
    }));
  }

  if (kind === 'pre') {
    el.innerHTML = `<div class="box"><h2>${title}</h2><p>5 soal pilihan ganda, ±1 menit. Tidak ada data pribadi yang dikumpulkan — hasil hanya tersimpan di HP ini.</p>
      <button class="main" data-go>Mulai</button><button class="main ghost" data-x>Nanti saja</button></div>`;
    el.querySelector('[data-go]').onclick = question;
    el.querySelector('[data-x]').onclick = close;
  } else question();
}
