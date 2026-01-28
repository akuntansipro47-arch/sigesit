-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: pkm_profile
create table if not exists pkm_profile (
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

-- Table: kelurahan
create table if not exists kelurahan (
  id serial primary key,
  name text not null unique
);

-- Table: rw
create table if not exists rw (
  id serial primary key,
  kelurahan_id integer references kelurahan(id) on delete cascade,
  name text not null,
  unique(kelurahan_id, name)
);

-- Table: rt
create table if not exists rt (
  id serial primary key,
  rw_id integer references rw(id) on delete cascade,
  name text not null,
  unique(rw_id, name)
);

-- Table: user_profiles (kader & admin)
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nik text unique not null,
  name text not null,
  phone text,
  kelurahan_id integer references kelurahan(id),
  rw_id integer references rw(id),
  rt_id integer references rt(id),
  username text unique not null,
  is_active boolean default true,
  role text default 'kader', -- 'admin' or 'kader'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Table: entries (Data Rumah)
create table if not exists entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id),
  date_entry date default current_date,
  entry_serial_no serial, 
  address text,
  kelurahan_id integer references kelurahan(id),
  rw_id integer references rw(id),
  rt_id integer references rt(id),
  
  -- Metrics
  total_souls integer default 0,
  permanent_souls integer default 0,
  latrine_count integer default 0,
  
  -- Jamban
  jamban_bab_jamban boolean default false,
  jamban_milik_sendiri boolean default false,
  jamban_septik_aman boolean default false,
  jamban_septik_tidak_sedot boolean default false,
  jamban_cubluk boolean default false,
  jamban_dibuang_drainase boolean default false,
  jamban_leher_angsa boolean default false,
  
  -- CTPS
  ctps_sarana boolean default false,
  ctps_air_mengalir boolean default false,
  ctps_sabun boolean default false,
  ctps_mampu_praktek boolean default false,
  ctps_tahu_waktu_kritis boolean default false,
  ctps_sebelum_makan boolean default false,
  ctps_sebelum_olah_makan boolean default false,
  ctps_sebelum_susui boolean default false,
  ctps_setelah_bab boolean default false,
  
  -- Sumber Air Layak
  air_layak_perpipaan boolean default false,
  air_layak_kran_umum boolean default false,
  air_layak_sg_terlindung boolean default false,
  air_layak_sgl boolean default false,
  air_layak_spl boolean default false,
  air_layak_mata_air boolean default false,
  air_layak_hujan boolean default false,
  
  -- Sumber Air Tidak Layak
  air_tidak_layak_sungai boolean default false,
  air_tidak_layak_danau boolean default false,
  air_tidak_layak_waduk boolean default false,
  air_tidak_layak_kolam boolean default false,
  air_tidak_layak_irigasi boolean default false,
  
  -- Pengelolaan Air
  olah_air_proses boolean default false,
  olah_air_keruh boolean default false,
  olah_air_simpan_tutup boolean default false,
  
  -- Pengelolaan Pangan
  pangan_tutup boolean default false,
  pangan_pisah_b3 boolean default false,
  pangan_5_kunci boolean default false,
  
  -- Pilar 4 (Sampah)
  sampah_tidak_serak boolean default false,
  sampah_tutup_kuat boolean default false,
  sampah_olah_aman boolean default false,
  sampah_pilah boolean default false,
  
  -- Pilar 5 (Limbah Cair)
  limbah_tidak_genang boolean default false,
  limbah_saluran_kedap boolean default false,
  limbah_resapan_ipal boolean default false,
  
  -- PKURT
  pkurt_jendela_kamar boolean default false,
  pkurt_jendela_keluarga boolean default false,
  pkurt_ventilasi boolean default false,
  pkurt_lubang_asap boolean default false,
  pkurt_cahaya_alami boolean default false,
  pkurt_tidak_merokok boolean default false,

  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Table: family_members (KK)
create table if not exists family_members (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid references entries(id) on delete cascade,
  kk_number text not null,
  head_of_family text, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies
alter table pkm_profile enable row level security;
alter table kelurahan enable row level security;
alter table rw enable row level security;
alter table rt enable row level security;
alter table user_profiles enable row level security;
alter table entries enable row level security;
alter table family_members enable row level security;

-- Policies
create policy "Public read pkm_profile" on pkm_profile for select using (true);
create policy "Public read kelurahan" on kelurahan for select using (true);
create policy "Public read rw" on rw for select using (true);
create policy "Public read rt" on rt for select using (true);

-- User Profiles: Admin can manage all, Users can read own
create policy "Admin manage profiles" on user_profiles for all using (
  auth.uid() in (select id from user_profiles where role = 'admin')
);
create policy "Users read own profile" on user_profiles for select using (
  auth.uid() = id
);
-- Allow system/triggers to insert (Handled by service role usually, but for client side insert hacks if needed)
-- We'll rely on trigger for creation mostly.

-- Entries: Admin read all, Kader manage own
create policy "Admin read entries" on entries for select using (
  auth.uid() in (select id from user_profiles where role = 'admin')
);
create policy "Kader manage own entries" on entries for all using (
  auth.uid() = user_id
);

-- Family Members
create policy "Admin read family_members" on family_members for select using (
  exists (select 1 from entries e join user_profiles u on e.user_id = u.id where e.id = family_members.entry_id and u.role = 'admin')
);
create policy "Kader manage own family_members" on family_members for all using (
  exists (select 1 from entries where id = family_members.entry_id and user_id = auth.uid())
);


-- TRIGGER: Auto-create user profile on signup
-- This handles the creation of the Super Admin automatically when they sign up in Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_admin boolean;
  username_val text;
begin
  -- Check if this is the specific super admin email
  -- Note: We match the username part or exact email
  -- We allow both 'syifaza26' (clean) and 'syifaza26*' (if system allowed it)
  if new.email ilike 'syifaza26%@sigesit.com' then
    is_admin := true;
  else
    is_admin := false;
  end if;

  -- Extract username from email (before @)
  username_val := split_part(new.email, '@', 1);
  
  -- If admin, force the specific requested username with star
  if is_admin then
     username_val := 'syifaza26*';
  end if;

  insert into public.user_profiles (id, username, name, role, nik, is_active)
  values (
    new.id,
    username_val,
    case when is_admin then 'Super Admin' else 'Kader' end,
    case when is_admin then 'admin' else 'kader' end,
    case when is_admin then 'ADMIN123' else 'NIK-' || substring(new.id::text, 1, 8) end, -- Dummy NIK for initial user
    true
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to allow update
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Insert initial PKM Profile if empty
insert into pkm_profile (name, address)
select 'PKM PADASUKA', 'Kota Cimahi'
where not exists (select 1 from pkm_profile);
