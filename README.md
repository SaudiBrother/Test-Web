# Kategorisasi Data CSV

Web statis (HTML + CSS + JS, tanpa dependensi eksternal/CDN) untuk mengategorikan daftar data dari file CSV — misalnya daftar nama guru — ke dalam satu atau lebih kategori buatan sendiri, lalu mengekspor hasilnya sebagai file `.txt`.

## Alur pemakaian

1. **Buat Kategori** — beri nama dan warna untuk tiap kategori (maksimal 6).
2. **Unggah CSV** — pilih file CSV berisi daftar data.
3. **Kategorisasi** — untuk tiap baris data (ditampilkan satu per satu dengan teks lengkap), ketuk satu atau lebih kategori, lalu **Lanjut**. Tombol **Kembali** tersedia untuk mengoreksi baris sebelumnya.
4. Di baris terakhir, tombol berubah jadi **Selesai** → ketuk, lalu ketuk **Konfirmasi** pada dialog yang muncul untuk mengunduh file `.txt` hasil kategorisasi.

Semua pemrosesan (parsing CSV, pembuatan file hasil) terjadi di peramban (browser) pengguna — tidak ada data yang dikirim ke server mana pun.

## Cara hosting

Ini web statis murni, tanpa proses build sama sekali. Unggah kelima file berikut ke layanan hosting statis apa pun (GitHub Pages, Netlify, Vercel, Firebase Hosting, atau server nginx/Apache biasa):

```
├── index.html
├── styles.css
├── script.js
├── manifest.json
└── icon.svg
```

`index.html` berfungsi sebagai halaman utama — sebagian besar hosting statis otomatis menyajikannya di alamat root domain/folder. Untuk uji coba lokal, file ini juga bisa langsung dibuka dari file manager (dobel-klik) tanpa server.

## Tampilan layar penuh di Android

- `manifest.json` diset `"display": "fullscreen"` — jika pengguna membuka lewat Chrome lalu memilih **Tambahkan ke Layar Utama**, aplikasi akan terbuka tanpa bilah alamat maupun status bar sama sekali.
- Skrip juga otomatis meminta mode layar penuh browser (Fullscreen API) pada ketukan pertama pengguna, sebagai upaya terbaik meski situs dibuka langsung lewat tab biasa (tanpa perlu di-"install").
- CSS memakai satuan `100dvh`, `env(safe-area-inset-*)`, dan `overscroll-behavior: none` supaya konten mengisi penuh layar dan tidak terganggu bilah browser yang muncul/hilang atau area notch.

## Format keluaran `.txt`

```
KATEGORISASI DATA
Label item: Guru
Tanggal: 13 Juli 2026 pukul 14.32
Total data: 3
Kategori: Pria, wanita, Lainnya, Tidak ingin memberitahu
========================================

Guru A: Gerald Androne
Kategori: Pria

Guru B: Laurence Meilyn
Kategori: Pria, wanita

Guru C: Loumberg Anelia
Kategori: Tidak ingin memberitahu
```

## Catatan lain

- Kategori dibatasi maksimal **6** — jumlah kotak kategori pada layar kategorisasi otomatis menyesuaikan tata letak (1 kolom untuk 1–2 kategori, 2 kolom untuk 3–6 kategori, mengikuti contoh pada gambar referensi).
- Baris kosong pada CSV otomatis diabaikan. Centang "Baris pertama adalah header" bisa dinyalakan/dimatikan kapan saja dan akan otomatis memproses ulang file yang sudah dipilih.
- Ada konfirmasi otomatis di browser bila pengguna mencoba menutup tab di tengah proses kategorisasi (mencegah data hilang tanpa sengaja).
