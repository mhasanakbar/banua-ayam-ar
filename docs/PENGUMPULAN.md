# Checklist pengumpulan — Proyek AR Kota Cerdas

## Wajib (4 hal)
- [x] **Masalah nyata kota**: ketahanan pangan keluarga di Banjarmasin lewat beternak ayam kampung di pekarangan (lihat `public/tentang.html`).
- [x] **Minimal 5 objek berbeda**: telur, embrio, telur menetas, anak ayam, ayam dewasa di sarang (+ label teks 3D).
- [x] **Platform gratis, dibuka lewat tautan/QR**: GitHub Pages (branch `gh-pages`, perbarui dengan `npm run deploy`).
- [ ] **Individu**: isi nama di laporan & deck.

## Luaran 1 — Produk AR (UAS 75%)
- Tautan produk: `https://USERNAME.github.io/banua-ayam-ar/ar.html`
- QR/marker: `npm run markers -- https://USERNAME.github.io/banua-ayam-ar/`, lalu kumpulkan folder `markers/` (atau cetak `print.html`).
- Platform & jenis AR: WebAR (three.js + jsQR), AR berbasis marker QR.
- Rubrik: relevansi masalah · fungsi teknis (tautan/QR, stabil, 5 objek) · desain & petunjuk (ada di layar awal, kartu info, `tentang.html`) · kreativitas (Rumah Banjar 3D + kandang panggung tahan banjir).

## Luaran 2 — Product deck (UTS 80%), 8–12 slide, 5–7 menit
1 Masalah · 2 Produk · 3 Pengguna · 4 Cara kerja · 5 Fitur utama · 6 Demo · 7 Mengapa produk ini? · 8 Bukti (UAS: hasil tes awal vs tes akhir & rating) · 9 Ajakan "Pindai QR dan coba sekarang".
Sebutkan penggunaan AI di deck.

## Luaran 3 — Video demo (UAS 25%), 1–3 menit
Narasi masalah → buka tautan/QR di HP → pindai marker → model muncul → coba interaksi (putar, zoom, Info & tips, Foto, mode Meja) → 5/5 → tes akhir. Unggah YouTube (Unlisted) / Google Drive.

## Bukti uji coba (untuk slide "Bukti")
Minta beberapa orang mencoba: Tes awal → jelajahi 5 tahap → Tes akhir → rating. Tangkap layar hasilnya (tersimpan di HP masing-masing), atau isi `SURVEY_URL` di `public/js/config.js` dengan tautan Google Form agar hasil terkumpul.

## Laporan progres (pekan 10, 12, 14)
```
LAPORAN PROGRES PROYEK AR · PEKAN [10 / 12 / 14]
Nama / Kelompok :
Judul proyek    : Banua Ayam AR
Platform        : WebAR (three.js + jsQR) di GitHub Pages
1. Yang dikerjakan dua pekan terakhir:
2. Bukti (tautan / tangkapan layar):
3. Kendala:
4. Rencana dua pekan ke depan:
```

## Aturan main
- Aset berlisensi: semua aset dibuat sendiri, pustaka open-source dicantumkan (README & `tentang.html`).
- Tanpa data pribadi: tidak ada data/foto pribadi; kamera diproses di HP.
- Jujur soal AI: disebutkan di `tentang.html`, README, dan wajib di laporan & deck.
- Siap diuji: jangan hapus repo/Pages sampai nilai akhir keluar.
