# ScanCraft PDF

Aplikasi web lokal untuk mengubah file PDF hasil convert / *Save As PDF* dari Microsoft Word menjadi PDF yang tampak seperti hasil scan fisik (berbasis gambar/raster, sedikit miring, bertekstur kertas, noise, blur tinta, hingga bayangan scanner).

## Fitur Utama

- **100% Lokal di Browser**: Dokumen tidak pernah diunggah ke server mana pun.
- **Drag & Drop & Multi-File**: Mendukung upload 1 file PDF maupun banyak file sekaligus (dengan opsi download `.zip`).
- **Live Preview Interaktif**:
  - **Split Geser**: Tarik garis pemisah langsung di atas dokumen untuk membandingkan versi Asli (Word) vs Hasil Scan.
  - **Berdampingan (Side-by-Side)**, **Hasil Scan**, dan **Asli**.
- **Preset Cepat**:
  - *Scan Kantor Rapi*, *Scan Natural*, *Scan Lama / Kusam*, dan *Fotokopi Hitam-Putih*.
- **Pengaturan Lengkap**:
  - Mode Warna (*Berwarna*, *Grayscale*, *Hitam-Putih/Threshold*)
  - Warna Kertas (*Putih Bersih*, *Kertas HVS*, *Krem Hangat*, *Agak Kusam*)
  - Kontras, Kecerahan, Penebalan Tinta (*Ink Bleed*)
  - Kemiringan (*Skew* acak per halaman atau seragam), Offset, Tepi Tutup Scanner (*Border*)
  - Noise/Bintik Kertas, Debu & Garis Halus Scanner, Blur Tinta, Bayangan Pinggir (*Vignette*), Bayangan Sisi Jilid
  - Resolusi (`100` / `150` / `200` / `300` DPI) dan Kualitas Kompresi JPEG.

## Cara Menjalankan

1. Klik dua kali file **`start.bat`** (atau **`Buka_ScanCraft.bat`**) di folder ini.
2. Browser akan terbuka otomatis ke `http://127.0.0.1:4173`.
3. Atau jalankan manual lewat terminal:
   ```bash
   npm run preview -- --port 4173 --open
   ```
   (atau `npm run dev` untuk mode development).

