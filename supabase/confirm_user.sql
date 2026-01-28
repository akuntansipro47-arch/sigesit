-- FIX SCRIPT: Manually confirm email address for Admin

-- Run this in Supabase SQL Editor if you get "Account not verified" error

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'syifaza26@sigesit.com';

-- Also ensure the profile exists (just in case)
do $$
declare
  admin_user_id uuid;
begin
  select id into admin_user_id from auth.users where email = 'syifaza26@sigesit.com';

  if admin_user_id is not null then
    if not exists (select 1 from public.user_profiles where id = admin_user_id) then
        insert into public.user_profiles (id, username, name, role, nik, is_active)
        values (
            admin_user_id,
            'syifaza26*',
            'Super Admin',
            'admin',
            'ADMIN123',
            true
        );
    end if;
  end if;
end;
$$;
