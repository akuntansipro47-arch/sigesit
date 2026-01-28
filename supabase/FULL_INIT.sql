-- SKRIP INI AKAN MEMBUAT SEMUA TABEL DARI NOL
-- Jalankan SEMUA baris di bawah ini di SQL Editor Supabase

-- 1. Extension UUID (Wajib)
create extension if not exists "uuid-ossp";

-- 2. Hapus tabel lama jika ada (Reset Total) agar bersih
drop table if exists family_members cascade;
drop table if exists entries cascade;
drop table if exists user_profiles cascade;
drop table if exists rt cascade;
drop table if exists rw cascade;
drop table if exists kelurahan cascade;
drop table if exists pkm_profile cascade;

-- 3. Buat Tabel Kelurahan
create table public.kelurahan (
  id serial primary key,
  name text not null unique
);

-- 4. Buat Tabel RW
create table public.rw (
  id serial primary key,
  kelurahan_id integer references public.kelurahan(id) on delete cascade,
  name text not null,
  unique(kelurahan_id, name)
);

-- 5. Buat Tabel RT
create table public.rt (
  id serial primary key,
  rw_id integer references public.rw(id) on delete cascade,
  name text not null,
  unique(rw_id, name)
);

-- 6. Buat Tabel User Profiles (PENTING)
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nik text unique not null,
  name text not null,
  phone text,
  kelurahan_id integer references public.kelurahan(id),
  rw_id integer references public.rw(id),
  rt_id integer references public.rt(id),
  username text unique not null,
  is_active boolean default true,
  role text default 'kader', 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Buat Tabel PKM Profile
create table public.pkm_profile (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  phone text,
  pic_name text,
  website text,
  ig text,
  fb text,
  twitter text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Buat Tabel Entries (Data Survey)
create table public.entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.user_profiles(id),
  date_entry date default current_date,
  entry_serial_no serial, 
  address text,
  kelurahan_id integer references public.kelurahan(id),
  rw_id integer references public.rw(id),
  rt_id integer references public.rt(id),
  total_souls integer default 0,
  permanent_souls integer default 0,
  latrine_count integer default 0,
  jamban_bab_jamban boolean default false,
  jamban_milik_sendiri boolean default false,
  jamban_septik_aman boolean default false,
  jamban_septik_tidak_sedot boolean default false,
  jamban_cubluk boolean default false,
  jamban_dibuang_drainase boolean default false,
  jamban_leher_angsa boolean default false,
  ctps_sarana boolean default false,
  ctps_air_mengalir boolean default false,
  ctps_sabun boolean default false,
  ctps_mampu_praktek boolean default false,
  ctps_tahu_waktu_kritis boolean default false,
  ctps_sebelum_makan boolean default false,
  ctps_sebelum_olah_makan boolean default false,
  ctps_sebelum_susui boolean default false,
  ctps_setelah_bab boolean default false,
  air_layak_perpipaan boolean default false,
  air_layak_kran_umum boolean default false,
  air_layak_sg_terlindung boolean default false,
  air_layak_sgl boolean default false,
  air_layak_spl boolean default false,
  air_layak_mata_air boolean default false,
  air_layak_hujan boolean default false,
  air_tidak_layak_sungai boolean default false,
  air_tidak_layak_danau boolean default false,
  air_tidak_layak_waduk boolean default false,
  air_tidak_layak_kolam boolean default false,
  air_tidak_layak_irigasi boolean default false,
  olah_air_proses boolean default false,
  olah_air_keruh boolean default false,
  olah_air_simpan_tutup boolean default false,
  pangan_tutup boolean default false,
  pangan_pisah_b3 boolean default false,
  pangan_5_kunci boolean default false,
  sampah_tidak_serak boolean default false,
  sampah_tutup_kuat boolean default false,
  sampah_olah_aman boolean default false,
  sampah_pilah boolean default false,
  limbah_tidak_genang boolean default false,
  limbah_saluran_kedap boolean default false,
  limbah_resapan_ipal boolean default false,
  pkurt_jendela_kamar boolean default false,
  pkurt_jendela_keluarga boolean default false,
  pkurt_ventilasi boolean default false,
  pkurt_lubang_asap boolean default false,
  pkurt_cahaya_alami boolean default false,
  pkurt_tidak_merokok boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. Buat Tabel Family Members
create table public.family_members (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid references public.entries(id) on delete cascade,
  kk_number text not null,
  head_of_family text, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 10. Aktifkan Keamanan (RLS)
alter table public.pkm_profile enable row level security;
alter table public.kelurahan enable row level security;
alter table public.rw enable row level security;
alter table public.rt enable row level security;
alter table public.user_profiles enable row level security;
alter table public.entries enable row level security;
alter table public.family_members enable row level security;

-- 11. Buat Kebijakan Akses (Policies)
create policy "Public read pkm_profile" on public.pkm_profile for select using (true);
create policy "Public read kelurahan" on public.kelurahan for select using (true);
create policy "Public read rw" on public.rw for select using (true);
create policy "Public read rt" on public.rt for select using (true);

-- Policy User Profile
create policy "Admin manage profiles" on public.user_profiles for all using (
  auth.uid() in (select id from public.user_profiles where role = 'admin')
);
create policy "Users read own profile" on public.user_profiles for select using (
  auth.uid() = id
);
-- Allow insert for self (needed for registration)
create policy "Enable insert for authenticated users only" on public.user_profiles for insert with check (auth.uid() = id);

-- Policy Entries & Family
create policy "Admin read entries" on public.entries for select using (auth.uid() in (select id from public.user_profiles where role = 'admin'));
create policy "Kader manage own entries" on public.entries for all using (auth.uid() = user_id);
create policy "Admin read family_members" on public.family_members for select using (exists (select 1 from public.entries e join public.user_profiles u on e.user_id = u.id where e.id = public.family_members.entry_id and u.role = 'admin'));
create policy "Kader manage own family_members" on public.family_members for all using (exists (select 1 from public.entries where id = public.family_members.entry_id and user_id = auth.uid()));

-- 12. Masukkan Data Awal PKM
insert into public.pkm_profile (name, address) 
select 'PKM PADASUKA', 'Kota Cimahi' 
where not exists (select 1 from public.pkm_profile);

-- 13. HUBUNGKAN ADMIN (Fix User Profile)
do $$
declare
  auth_id uuid;
begin
  -- Cari ID user dari Authentication
  select id into auth_id from auth.users where email = 'syifaza26@sigesit.com' limit 1;

  if auth_id is not null then
    -- Masukkan/Update profil
    insert into public.user_profiles (id, username, name, role, nik, is_active)
    values (
      auth_id,
      'syifaza26*',
      'Super Admin',
      'admin',
      'ADMIN123',
      true
    )
    on conflict (id) do update 
    set role = 'admin', username = 'syifaza26*', is_active = true;
    
    raise notice 'Admin profile fixed for ID: %', auth_id;
  else
    raise notice 'User email syifaza26@sigesit.com belum ada di Auth. Buat user dulu!';
  end if;
end;
$$;
