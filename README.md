# Magang Mandiri Humas

Portal React untuk program Magang Mandiri Humas UNSULBAR. Aplikasi memakai Vite, Firebase Authentication (email dan kata sandi), serta Cloud Firestore.

## Menjalankan secara lokal

1. Pasang Node.js LTS.
2. Salin `.env.example` menjadi `.env.local`, lalu isi nilai konfigurasi Firebase Web App.
3. Aktifkan **Authentication → Email/Password** dan buat database **Cloud Firestore** di Firebase Console.
4. Terapkan isi `firestore.rules` ke Firestore Rules di Firebase Console.
5. Jalankan `npm install`, kemudian `npm run dev`.

Akun yang mendaftar melalui halaman portal otomatis memperoleh role `Mahasiswa`. Untuk memberi akses Admin atau pembimbing, buka Firestore Console → koleksi `users` → dokumen yang ID-nya sama dengan UID pengguna Authentication → ubah field `role` menjadi salah satu dari `Admin`, `Dosen Pembimbing`, atau `Pembimbing Lapangan`. Admin juga dapat mengubah role akun dari menu **Mahasiswa**.

## Deploy ke Vercel

Impor repository ini di Vercel dengan framework preset **Vite**. Tambahkan semua variabel `VITE_FIREBASE_*` dari `.env.example` pada **Project Settings → Environment Variables**, lalu deploy. `vercel.json` mengarahkan route aplikasi kembali ke `index.html`.

Konfigurasi Firebase Web App berada di sisi browser. Batasi akses data melalui Firestore Security Rules dan tambahkan domain Vercel ke **Authentication → Settings → Authorized domains**.

## Foto profil dan bukti logbook

Foto dikompres di browser lalu disimpan sebagai dokumen Firestore terpisah: `profilePhotos/{uid}` dan `logbookPhotos/{logId}`. Tidak perlu mengaktifkan Firebase Storage, membuat koneksi Google Drive, atau menambahkan rahasia OAuth di Vercel. Terapkan aturan pada `firestore.rules` di Firebase Console agar foto hanya dapat diakses sesuai hak akun.

Paket gratis Firestore memiliki batas penyimpanan dan kuota pemakaian. Foto sudah dikompres agar tetap kecil; untuk penggunaan besar atau banyak pengguna, periksa kuota Firebase secara berkala.

## Koleksi Firestore

- `users/{uid}`: profil akun dan role.
- `logbooks/{id}`: aktivitas mahasiswa, status persetujuan, dan catatan kegiatan.
- `evaluations/{id}`: nilai, kompetensi, evaluator, dan umpan balik.

Aturan akses awal tersedia di `firestore.rules`. Tinjau dan sesuaikan aturan dengan kebijakan pembimbing, data akademik, dan alur persetujuan kampus sebelum dipakai untuk data nyata.
