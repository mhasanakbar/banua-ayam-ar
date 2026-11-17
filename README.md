# 🐔 Banua Ayam AR

**WebAR edukasi beternak ayam kampung di pekarangan untuk ketahanan pangan keluarga Banjarmasin.**

Pindai kode QR dengan **Kamera AR** di HP. Model 3D tiap tahap **daur hidup ayam** muncul menempel di atas QR, lengkap dengan penjelasan dan tips beternak praktis. Kode QR bisa dicetak di kertas atau ditemukan di dalam dunia 3D **Rumah Banjar Bubungan Tinggi**.

> Proyek AR Kota Cerdas (UTS & UAS). Platform: WebAR (three.js + jsQR) di GitHub Pages. Jenis AR: berbasis marker (QR).

## Lima pertanyaan perancangan

| | |
|---|---|
| **Masalah** | Telur dan daging ayam keluarga di Banjarmasin umumnya dibeli di pasar, sehingga pengeluaran ikut terdampak saat harga naik. Banyak keluarga punya pekarangan tetapi belum tahu cara memulai beternak ayam kampung: masa tetas, perawatan anak ayam, dan kandang yang aman dari genangan/banjir. |
| **Pengguna** | Keluarga/ibu rumah tangga dengan pekarangan, pelajar, kelompok warga & UMKM pemula. Dipakai di rumah, sekolah, atau penyuluhan kelurahan/dinas. |
| **Pemicu** | 5 marker QR (di layar di dalam Rumah Banjar 3D, atau dicetak). |
| **Konten** | 5 model 3D berbeda + label teks 3D, penjelasan ilmiah, dan tips beternak per tahap. |
| **Ukuran keberhasilan** | Nilai tes akhir > tes awal (kuis 5 soal), 5/5 tahap berhasil dimunculkan, rating kebermanfaatan ≥ 4/5. |

## 5 objek AR

| Tahap | Objek 3D | Tips beternak (contoh) |
|---|---|---|
| 1 | 🥚 Telur di sarang | Pilih telur tetas bersih & tidak retak |
| 2 | 🔬 Telur (Embrio): cangkang transparan, jantung berdetak | Suhu 37,5–38 °C, putar telur 3×/hari |
| 3 | 🐣 Telur Menetas | Hari ke-18 berhenti memutar telur |
| 4 | 🐥 Anak Ayam | Pemanas 32–35 °C di minggu pertama |
| 5 | 🐔 Ayam Dewasa di sarang | Kandang panggung seperti rumah Banjar, aman dari banjir |

## Halaman

| Halaman | Isi |
|---|---|
| `ar.html` | **Kamera AR** (produk utama untuk HP): deteksi QR, model 3D menempel di QR, info & tips, foto AR, mode 📺 Layar / 📄 Meja, tes awal & tes akhir |
| `index.html` | Dunia 3D Rumah Banjar (laptop/HP): jelajahi, temukan 5 papan QR, tekan **E** untuk memperbesar |
| `print.html` | Lembar marker QR untuk dicetak |
| `scan.html?s=N` | Viewer 3D tanpa kamera (cadangan) |
| `tentang.html` | Tentang proyek: 5 pertanyaan perancangan, cara pakai, privasi, kredit & lisensi, keterbukaan AI |

## Menjalankan

### A. Online (GitHub Pages) untuk dosen & penguji
Folder `public/` dipublikasikan ke branch `gh-pages` (GitHub Pages). Setelah mengubah kode dan commit ke `main`, jalankan `npm run deploy` untuk memperbarui situs. Buka `https://USERNAME.github.io/banua-ayam-ar/ar.html` di HP. HTTPS asli, jadi tidak ada peringatan sertifikat. Progres & kuis tersimpan di perangkat masing-masing.

Buat file gambar marker untuk dikumpulkan:
```bash
npm run markers -- https://USERNAME.github.io/banua-ayam-ar/
```

### B. Lokal (tanpa internet) dengan sinkron HP ↔ laptop
```bash
npm install
npm start
```
- Laptop: `http://localhost:3000`
- HP (WiFi/hotspot yang sama): `https://IP-LAPTOP:3443/ar.html`. Sertifikat self-signed dibuat otomatis, jadi pilih *Lanjutkan/Advanced → Proceed* saat diperingatkan.
- Di mode ini, tahap yang dipindai HP langsung muncul juga di rumah 3D di laptop.

## Kontrol dunia 3D
`WASD` jalan · `Shift` lari · `Spasi` lompat · `E`/klik interaksi · `C` diagram daur hidup · `Esc` menu. Di HP/tablet tersedia joystick sentuh.

## Struktur
```
public/            situs statis (yang dipublikasikan)
  ar.html          Kamera AR          js/ar.js, js/ar-pose.js, js/qr-worker.js
  index.html       dunia 3D           js/game.js, js/world.js, js/audio.js
  js/models.js     5 model 3D + konten & tips
  js/net.js        mode server lokal (sinkron) / mode statis (localStorage) + pembuat QR
  js/quiz.js       tes awal / tes akhir      js/config.js  (tautan survei opsional)
  vendor/          three.js, OrbitControls, jsQR, qrcode-generator (+ lisensi)
server.js          server lokal opsional: HTTP + HTTPS + sinkron realtime (SSE)
scripts/markers.mjs  pembuat PNG marker QR
```

## Privasi
Tidak ada data pribadi yang dikumpulkan. Gambar kamera diproses di HP dan tidak dikirim ke mana pun; progres dan hasil kuis tersimpan di perangkat pengguna.

## Kredit & lisensi
- Semua model 3D, tekstur, dan suara dibuat sendiri secara prosedural dengan kode.
- [three.js](https://threejs.org) r160 (MIT), [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0, Cosmo Wolfe), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT, Kazuhiko Arase), [qrcode](https://github.com/soldair/node-qrcode) (MIT, server lokal), [selfsigned](https://github.com/jfromaniello/selfsigned) (MIT, server lokal).

## Keterbukaan penggunaan AI
Sebagian kode dan teks proyek ini dibuat dengan bantuan AI (Claude, Anthropic) sebagai asisten pemrograman, lalu diarahkan, diuji, dan disesuaikan oleh pembuat proyek. Cantumkan juga hal ini di laporan progres dan product deck.
