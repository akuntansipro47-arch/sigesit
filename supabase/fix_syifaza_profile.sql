-- PERBAIKAN PROFIL KHUSUS USER SYIFAZA26
-- Script ini akan mencari user auth dengan email 'syifaza26@sigesit.com'
-- Dan membuatkan profil admin untuknya.

do $$
declare
  auth_id uuid;
begin
  -- 1. Cari ID dari tabel Authentication
  select id into auth_id from auth.users where email = 'syifaza26@sigesit.com';

  if auth_id is not null then
    -- 2. Hapus profil lama (jika ada yg nyangkut/rusak)
    delete from public.user_profiles where id = auth_id;
    
    -- 3. Buat Profil Baru yang Benar
    insert into public.user_profiles (id, username, name, role, nik, is_active)
    values (
      auth_id,
      'syifaza26*',
      'Super Admin',
      'admin',
      'ADMIN123',
      true
    );
    
    raise notice 'BERHASIL! Profil untuk syifaza26 telah dibuat.';
  else
    raise notice 'GAGAL: User syifaza26@sigesit.com tidak ditemukan di Authentication. Cek ejaan email.';
  end if;
end;
$$;
