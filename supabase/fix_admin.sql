-- FIX SCRIPT: Run this in Supabase SQL Editor to fix missing Admin Profile

-- 1. Ensure extension exists
create extension if not exists "uuid-ossp";

-- 2. Insert the user profile manually if it doesn't exist
-- We look for the user in auth.users by email
do $$
declare
  admin_user_id uuid;
begin
  -- Find the ID of the user created in Auth
  select id into admin_user_id from auth.users where email = 'syifaza26@sigesit.com';

  if admin_user_id is not null then
    -- Insert into user_profiles if not exists
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
        raise notice 'Admin profile created successfully.';
    else
        -- Update role just in case
        update public.user_profiles set role = 'admin', username = 'syifaza26*' where id = admin_user_id;
        raise notice 'Admin profile already exists. Updated role/username.';
    end if;
  else
    raise notice 'User syifaza26@sigesit.com not found in Auth. Please create user in Authentication menu first.';
  end if;
end;
$$;

-- 3. Verify Policy
-- Ensure Admin can actually read their own profile
drop policy if exists "Users read own profile" on user_profiles;
create policy "Users read own profile" on user_profiles for select using (
  auth.uid() = id
);
