# SIGESIT SANDAS - Changelog Update

## Tanggal: 28 Januari 2026

### 🔧 Perbaikan Bug

#### 1. Bug Login Kader (FIXED)
**Masalah:** User kader yang sudah dibuat tidak bisa login.

**Penyebab:** 
- Konflik antara trigger database yang membuat profile otomatis dengan frontend yang juga membuat profile
- Email confirmation mungkin masih aktif di Supabase

**Solusi:**
- Diperbarui [`UsersModule.tsx`](src/pages/admin/UsersModule.tsx) untuk menggunakan `upsert` dengan `onConflict: 'id'`
- Ditambahkan delay 1 detik setelah signup untuk menunggu trigger selesai
- Dibuat file SQL [`fix_user_creation.sql`](supabase/fix_user_creation.sql) untuk memperbaiki trigger database

**Langkah yang harus dilakukan Admin:**
1. Buka Supabase Dashboard
2. Pergi ke **Authentication > Settings**
3. Matikan **"Enable email confirmations"**
4. Jalankan SQL di file `supabase/fix_user_creation.sql` di SQL Editor Supabase

---

### ✨ Fitur Baru

#### 2. Tombol Home di Menu Data Entry Survey
**File:** [`EntryForm.tsx`](src/pages/entry/EntryForm.tsx), [`EntryDashboard.tsx`](src/pages/entry/EntryDashboard.tsx)

**Perubahan:**
- Ditambahkan tombol Home di header form entry untuk kembali ke menu utama
- Ditambahkan icon Home di bottom navigation untuk navigasi yang lebih mudah

---

#### 3. Fitur Ubah Password Kader (SUDAH ADA - DIPERBAIKI)
**File:** [`UsersModule.tsx`](src/pages/admin/UsersModule.tsx)

**Cara Menggunakan:**
1. Buka menu **Manajemen Kader** di Admin Panel
2. Klik tombol **Edit** (ikon pensil) pada kader yang ingin diubah passwordnya
3. Masukkan password baru di kolom **"Ganti Password Login"**
4. Klik **"Simpan Perubahan"**

**Catatan:** Fitur ini memerlukan Edge Function `admin-update-user` yang sudah di-deploy di Supabase.

---

#### 4. Export Data ke Excel (DITINGKATKAN)
**File:** [`EntryList.tsx`](src/pages/entry/EntryList.tsx)

**Perubahan:**
- Export sekarang mencakup **SEMUA field** survey STBM
- Ditambahkan kolom-kolom:
  - Data dasar (No, Tanggal, Serial, KK, Kepala Keluarga, Alamat, Kelurahan, RW, RT)
  - Pilar 1 - Jamban (semua indikator + status JAMBAN SEHAT)
  - Pilar 2 - CTPS (semua indikator + status CTPS MEMENUHI)
  - Pilar 3 - Air Minum (semua sumber air + status AIR LAYAK)
  - Pilar 4 - Sampah (semua indikator + status SAMPAH AMAN)
  - Pilar 5 - Limbah (semua indikator + status LIMBAH AMAN)
  - PKURT (semua indikator)
- Ditambahkan notifikasi setelah export berhasil

**Cara Menggunakan:**
1. Buka menu **Daftar Survey**
2. Filter data jika diperlukan (berdasarkan RW/RT atau pencarian)
3. Klik tombol **Download** (ikon hijau) di pojok kanan atas
4. File Excel akan otomatis terdownload

---

### 📁 File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/admin/UsersModule.tsx` | Perbaikan pembuatan user kader |
| `src/pages/entry/EntryForm.tsx` | Tambah tombol Home |
| `src/pages/entry/EntryDashboard.tsx` | Tambah icon Home di bottom nav |
| `src/pages/entry/EntryList.tsx` | Tingkatkan fitur export Excel |
| `supabase/fix_user_creation.sql` | SQL untuk fix trigger database |

---

### 🚀 Langkah Deploy

1. **Push perubahan ke repository**
   ```bash
   git add .
   git commit -m "Fix: Login kader, tambah Home button, tingkatkan export Excel"
   git push
   ```

2. **Jalankan SQL Fix di Supabase**
   - Buka Supabase Dashboard > SQL Editor
   - Copy-paste isi file `supabase/fix_user_creation.sql`
   - Klik Run

3. **Matikan Email Confirmation**
   - Supabase Dashboard > Authentication > Settings
   - Matikan "Enable email confirmations"

4. **Vercel akan auto-deploy** setelah push ke repository

---

### 📞 Support

Jika ada masalah, hubungi:
- Email: info@akuntansipro.com
- © 2026 akuntansipro.com
