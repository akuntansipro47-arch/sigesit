-- Script untuk menambahkan kolom latitude & longitude ke tabel entries
-- Agar bisa menampilkan peta sebaran

alter table public.entries
add column if not exists latitude double precision,
add column if not exists longitude double precision;

-- Berikan izin akses (jika perlu)
grant all on public.entries to authenticated;
grant all on public.entries to anon;
