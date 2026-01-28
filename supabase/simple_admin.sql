-- EMERGENCY SCRIPT: Buat User Admin Sederhana
-- Tujuannya untuk memastikan login berfungsi tanpa karakter aneh-aneh.

-- 1. Buat user auth baru (lewat SQL side-channel ini agak tricky di Supabase, 
--    jadi kita pakai cara manipulasi profil saja, tapi user auth harus dibuat manual).
--    TAPI, kita bisa reset profil untuk user yang sudah ada.

-- Mending kita pastikan tabel profil bersih dulu untuk email ini.
delete from public.user_profiles where username = 'admin';

-- Script ini hanya menyiapkan PROFIL untuk user 'admin@sigesit.com'
-- Anda HARUS membuat user 'admin@sigesit.com' di menu Authentication dulu.

do $$
declare
  auth_id uuid;
begin
  select id into auth_id from auth.users where email = 'admin@sigesit.com' limit 1;

  if auth_id is not null then
    insert into public.user_profiles (id, username, name, role, nik, is_active)
    values (
      auth_id,
      'admin', -- Username simpel tanpa bintang
      'Emergency Admin',
      'admin',
      'ADM001',
      true
    )
    on conflict (id) do update set role = 'admin', username = 'admin', is_active = true;
  end if;
end;
$$;
