-- =====================================================
-- FIX: User Creation Trigger untuk Kader
-- =====================================================
-- Jalankan SQL ini di Supabase SQL Editor untuk memperbaiki
-- masalah login kader yang gagal setelah dibuat.
-- =====================================================

-- 1. PENTING: Matikan Email Confirmation di Supabase Dashboard
-- Buka: Authentication > Settings > Email Auth
-- Matikan: "Enable email confirmations"

-- 2. Drop trigger lama yang mungkin menyebabkan konflik
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Buat fungsi trigger baru yang lebih aman
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_admin boolean;
  username_val text;
  existing_profile_count integer;
BEGIN
  -- Cek apakah profile sudah ada (dibuat oleh frontend)
  SELECT COUNT(*) INTO existing_profile_count 
  FROM public.user_profiles 
  WHERE id = NEW.id;
  
  -- Jika profile sudah ada, skip pembuatan
  IF existing_profile_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Check if this is the specific super admin email
  IF NEW.email ILIKE 'syifaza26%@sigesit.com' THEN
    is_admin := true;
  ELSE
    is_admin := false;
  END IF;

  -- Extract username from email (before @)
  username_val := split_part(NEW.email, '@', 1);
  
  -- If admin, force the specific requested username with star
  IF is_admin THEN
     username_val := 'syifaza26*';
  END IF;

  -- Insert profile hanya jika belum ada
  INSERT INTO public.user_profiles (id, username, name, role, nik, is_active)
  VALUES (
    NEW.id,
    username_val,
    CASE WHEN is_admin THEN 'Super Admin' ELSE 'Kader' END,
    CASE WHEN is_admin THEN 'admin' ELSE 'kader' END,
    CASE WHEN is_admin THEN 'ADMIN123' ELSE 'NIK-' || substring(NEW.id::text, 1, 8) END,
    true
  )
  ON CONFLICT (id) DO NOTHING; -- Jangan error jika sudah ada
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Buat trigger baru
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Tambahkan kolom password_display jika belum ada
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'password_display'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN password_display TEXT;
  END IF;
END $$;

-- 6. Update RLS Policy untuk memastikan admin bisa update semua profile
DROP POLICY IF EXISTS "Admin manage profiles" ON user_profiles;
CREATE POLICY "Admin manage profiles" ON user_profiles 
FOR ALL USING (
  auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
);

-- 7. Pastikan user bisa insert profile mereka sendiri (untuk signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles 
FOR INSERT WITH CHECK (
  auth.uid() = id OR 
  auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
);

-- 8. Pastikan user bisa update profile mereka sendiri
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles 
FOR UPDATE USING (
  auth.uid() = id OR 
  auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
);

-- =====================================================
-- SELESAI! Sekarang coba buat kader baru dari aplikasi.
-- =====================================================
