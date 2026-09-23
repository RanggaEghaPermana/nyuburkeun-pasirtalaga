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

Setiap halaman materi punya laboratorium 3D yang berlatar kebun yang sama:

- **Mengenal Sampah** — seret sampah dari keranjang sampah campur ke lima tong beroda berlabel (warna, nama, dan contoh isi). Setiap pilihan benar menjelaskan ke mana sampah itu pergi selanjutnya, dan di akhir semua tutup tong terbuka memperlihatkan isinya.
- **Panduan Kompos** — ember kompos berlubang udara yang digambar terpotong sehingga lapisan bahan hijau dan cokelat terlihat. Setelah campurannya pas, ember ditutup dan dirawat per dua minggu (aduk dengan sekop, siram bila kering) sampai kompos matang di minggu ke-6.
- **Eco Enzyme** — takar 1 : 3 : 10 dengan skala di dinding wadah dan garis batas isi, aduk sampai gula larut, tutup rapat, lalu buka tutup perlahan ketika wadah mengembung karena gas sampai hari ke-90.
- **Pemanfaatan** — racik tanah, kompos, dan pasir di pot terakota terpotong: akar, drainase ke tatakan, atau genangan air terlihat langsung, lalu tanaman tumbuh sampai berbunga.
- **Peluang Usaha** — rakit kemasan, label, keterangan, dan harga di lapak bazar, lalu buka lapak untuk melihat berapa dari sepuluh pembeli yang membeli beserta untung atau ruginya.

Semua tekstur (rumput, kayu, tanah, plastik, batik, dan label) dilukis secara prosedural di kanvas saat simulasi dimuat, jadi tidak ada berkas gambar atau HDRI tambahan yang diunduh. Simulasi dimuat secara lazy ketika mendekati viewport, dan pada koneksi lambat atau mode hemat data pemuatannya menunggu ketukan. Kontrol utamanya tetap berupa elemen HTML yang dapat dipakai tanpa harus berinteraksi langsung dengan kanvas 3D, dan semua animasi menghormati `prefers-reduced-motion`.

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
