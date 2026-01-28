# Troubleshooting Login Supabase

Jika Anda mengalami kendala "User dan Email tidak berfungsi", ikuti langkah berikut:

## 1. Pastikan Konfigurasi `.env` Benar

Buka file `.env` dan pastikan isinya:
```
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
VITE_USE_MOCK=false
```
*Dapatkan URL dan KEY dari Dashboard Supabase -> Settings -> API.*

## 2. Pastikan User Auth Ada

1. Buka Dashboard Supabase -> **Authentication** -> **Users**.
2. Cari user dengan email: `syifaza26@sigesit.com`.
3. Jika tidak ada, buat baru:
   - Email: `syifaza26@sigesit.com`
   - Password: `kesling26*`
   - Auto Confirm: Enabled

## 3. Jalankan Script Perbaikan (Fix Script)

Terkadang user berhasil dibuat di Auth, tapi gagal dibuat di tabel `user_profiles` aplikasi.

1. Buka Dashboard Supabase -> **SQL Editor**.
2. Klik **New Query**.
3. Copy isi file `supabase/fix_admin.sql` dari folder project ini.
4. Paste ke SQL Editor dan klik **Run**.
5. Lihat hasil di tab "Results" atau "Messages". Harus ada pesan "Admin profile created successfully" atau "Updated".

## 4. Coba Login di Aplikasi

1. Refresh halaman aplikasi.
2. Pastikan label di bawah judul adalah **"Mode Online (Server)"** (Hijau).
3. Masukkan Username: `syifaza26*`.
4. Perhatikan teks kecil di bawah input username, harus tertulis: `Login sebagai: syifaza26@sigesit.com`.
5. Masukkan Password: `kesling26*`.
6. Klik Login.

## 5. Mengatasi Error "Account has not been verified" (CARA PALING MUDAH)

Anda tidak perlu membuka SQL Editor jika sulit. Cukup matikan fitur verifikasi email di pengaturan Supabase:

1. Login ke **[Dashboard Supabase](https://supabase.com/dashboard)** menggunakan email pendaftaran Anda (Email asli Anda, BUKAN `syifaza26...`).
2. Masuk ke Project Anda.
3. Di menu kiri, pilih **Authentication** -> **Providers**.
4. Klik **Email**.
5. Matikan (Uncheck) opsi **Confirm email**.
6. Klik **Save**.
7. Kembali ke aplikasi dan coba login lagi.

## 6. Penjelasan Penting: Beda Akun Developer vs Akun Aplikasi

*   **Akun Developer (Supabase.com)**: Ini akun untuk Anda sebagai pembuat aplikasi. Login menggunakan email asli (Gmail/Yahoo) Anda. Di sini Anda mengatur database.
*   **Akun Aplikasi (Login Screen)**: Ini akun untuk user/kader (contoh: `syifaza26*`). Akun ini yang "fiktif" dan datanya disimpan di database yang Anda atur.

**JANGAN** mencoba login ke Supabase.com menggunakan `syifaza26*`. Itu tidak akan bisa.

## 7. Login ke Dashboard Supabase (Untuk Mengatur Database)

Jika Anda melihat layar dengan tulisan **"Continue with GitHub"** atau **"Continue with SSO"**, itu adalah halaman login website Supabase (bukan aplikasi SIGESIT).

1.  **Jika Anda mendaftar pakai GitHub**: Klik tombol **"Continue with GitHub"**.
2.  **Jika Anda mendaftar pakai Email**: Masukkan email dan password akun Supabase Anda (bukan `syifaza26...`).

Setelah berhasil masuk:
1.  Pilih Project Anda.
2.  Matikan verifikasi email di menu **Authentication -> Providers -> Email -> Confirm email (Uncheck)**.
3.  Simpan (Save).

## 8. Masalah Umum Lainnya
