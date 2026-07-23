# Nyuburkeun Pasirtalaga

Website edukasi pengelolaan sampah organik untuk KKN Pasirtalaga UBP Karawang 2026. Implementasi ini mempertahankan identitas visual enam frame utama Figma NYUBURKEUN, lalu menyesuaikan proporsi, hierarki, gerak, dan komposisi untuk pengalaman web yang lebih nyaman. Aset ekspor Figma disimpan lokal dan halaman **Pemanfaatan** yang sebelumnya kosong sudah dilengkapi.

Live: https://nyuburkeun-pasirtalaga.vercel.app

## Stack

- React 19 + TypeScript
- Vite 8
- React Router
- React Three Fiber + Three.js untuk simulasi 3D ringan
- CSS tanpa framework UI, dengan komposisi desktop dan mobile yang dirancang terpisah
- Font lokal Space Grotesk dan Inter melalui Fontsource

## Menjalankan project

```bash
npm install
npm run dev
```

Validasi production:

```bash
npm run lint
npm run build
npm run preview
```

## Route

- `/` — Home dan FAQ
- `/mengenal-sampah`
- `/panduan-kompos`
- `/eco-enzyme`
- `/pemanfaatan`
- `/peluang-usaha`

## Interaksi edukatif

- Laboratorium pemilahan sampah 3D di halaman Mengenal Sampah
- Simulator keseimbangan bahan kompos 3D di halaman Panduan Kompos
- Animasi masuk berbasis viewport dengan dukungan `prefers-reduced-motion`
- Kartu materi dan pemanfaatan berbentuk jalur geser khusus pada layar sentuh

Kedua simulasi dimuat secara lazy ketika mendekati viewport supaya halaman awal tetap ringan. Kontrol utamanya tetap berupa elemen HTML yang dapat dipakai tanpa harus berinteraksi langsung dengan kanvas 3D.

## Deploy ke Vercel

Project sudah menyertakan `vercel.json` untuk fallback SPA. Saat mengimpor repository ke Vercel, preset **Vite** akan terdeteksi otomatis dengan build command `npm run build` dan output directory `dist`.

Alternatif via CLI:

```bash
npx vercel
```

## Catatan editorial

Konten eco-enzyme sengaja tidak memuat klaim medis, klaim disinfektan, atau anjuran konsumsi. Halaman terkait menyertakan sumber resmi dan pagar keselamatan, termasuk larangan mencampur cairan fermentasi dengan pemutih atau pembersih lain.

## Aset desain

Seluruh foto dan ilustrasi hasil ekspor Figma berada di `public/assets` agar tidak bergantung pada URL MCP Figma yang kedaluwarsa.
