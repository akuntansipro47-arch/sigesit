# Panduan Setup SIGESIT

## 1. Buat Project Baru di Supabase

1. Login ke [Supabase.com](https://supabase.com/dashboard).
2. Klik tombol **"New Project"**.
3. Pilih Organization (jika belum ada, buat baru).
4. Isi form:
   - **Name**: `Sigesit`
   - **Database Password**: Buat password kuat (dan simpan/ingat password ini!).
   - **Region**: Singapore (atau yang terdekat).
5. Klik **"Create new project"**.
6. Tunggu beberapa menit hingga proses setup selesai (status menjadi hijau/Active).

## 2. Konfigurasi Aplikasi (.env)

1. Setelah project siap, buka menu **Settings** (ikon gerigi di kiri bawah) -> **API**.
2. Salin **Project URL**.
3. Salin **anon public** Key.
4. Buka file `.env` di dalam folder `r:\Aplikasi Kesling Sigesit\Sigesit` dan isi:
   ```
   VITE_SUPABASE_URL=https://[Project-URL-Anda].supabase.co
   VITE_SUPABASE_ANON_KEY=[Anon-Key-Anda]
   VITE_USE_MOCK=false
   ```

## 3. Buat Tabel Database

1. Buka menu **SQL Editor** di dashboard Supabase (menu kiri).
2. Buka file `supabase/schema.sql` di project ini, salin semua isinya.
3. Paste ke SQL Editor Supabase dan klik **Run**.

## 3. Buat User Admin Pertama

Karena Supabase mungkin menolak karakter `*` dalam email, gunakan format email berikut:

1. Buka menu **Authentication** -> **Users** di dashboard Supabase.
2. Klik **Add User**.
3. Isi data berikut:
   - **Email**: `syifaza26@sigesit.com` (Gunakan domain .com dan hapus tanda *)
   - **Password**: `kesling26*`
   - **Auto Confirm User**: Pastikan dicentang (Enabled).
4. Klik **Create User**.

> **PENTING**: Sistem aplikasi telah disesuaikan. Saat Anda login, Anda tetap bisa memasukkan username `syifaza26*`. Sistem akan otomatis memprosesnya ke email `syifaza26@sigesit.com`.

## 4. Login ke Aplikasi

1. Kembali ke aplikasi SIGESIT.
2. Masukkan Username: `syifaza26*` (sesuai request)
3. Masukkan Password: `kesling26*`
4. Klik Login.

Jika ada error, cek Console (F12) untuk melihat detail error.
