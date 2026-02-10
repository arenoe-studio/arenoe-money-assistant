# Project Context: Arenoe Money Assistant (v1.0)

## Project Essence
Aplikasi bot Telegram untuk pencatatan keuangan pribadi dengan kemampuan memahami input natural language dari user. Bot mengekstrak informasi pengeluaran dari pesan bebas, memvalidasi kelengkapan data, dan menyimpan hasil akhir ke Google Spreadsheet milik user.

## Problem & Gap
User kesulitan mencatat pengeluaran secara konsisten karena harus mengikuti format kaku. Solusi: bot menerima pesan natural (contoh: "beli lauk ayam bakar 15k") lalu mengekstrak komponen wajib—items, harga, nama toko, metode pembayaran—secara otomatis menggunakan regex dan AI.

## Core Functional Workflow

### 1. Input & Parsing
- User mengirim pesan bebas via Telegram
- Bot mengekstrak 4 komponen: **items** (nama barang/jasa), **harga** (nominal), **nama toko**, **metode pembayaran**
- Contoh: "beli lauk ayam bakar 15k" → items: "lauk ayam bakar", harga: 15000

### 2. Validasi & Konfirmasi Cerdas
- Bot memeriksa kelengkapan data (4 komponen)
- Jika ada komponen kosong, bot menanyakan **hanya yang hilang** dalam satu pesan
- Strategi bertanya:
  - Jika hanya nama toko kosong → tanya nama toko
  - Jika hanya metode pembayaran kosong → tanya metode pembayaran
  - Jika keduanya kosong → tanya nama toko DAN metode pembayaran sekaligus
- User merespons, bot parsing ulang hingga semua komponen lengkap

### 3. Penyimpanan
- Setelah validasi sukses, bot menulis 1 baris record ke Google Spreadsheet user
- Format kolom: Items | Harga | Nama Toko | Metode Pembayaran | Timestamp
- Bot konfirmasi "Tercatat!" ke user

### 4. Konfigurasi Awal
- User menyediakan URL/ID Google Spreadsheet pribadi saat setup pertama
- Bot menyimpan konfigurasi ini untuk pencatatan selanjutnya

## Boundaries & Scope

### HARUS Dilakukan (v1.0)
- Parsing natural language untuk 4 komponen wajib
- Validasi selektif (tanya hanya yang hilang)
- Integrasi write-only ke Google Spreadsheet
- Handle format uang Indonesia (15k, 15rb, 15000)

### TIDAK Dilakukan (Out of Scope v1.0)
- Analisis/visualisasi data
- Edit/hapus transaksi lama
- Kategori otomatis atau tagging
- Multi-user atau permission management
- Reminder/notifikasi budget
- Export format lain selain spreadsheet