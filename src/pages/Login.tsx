import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const navigate = useNavigate();
  const { profile, session, mockLogin, isMock, pkmProfile } = useAuth();

  useEffect(() => {
    if (pkmProfile?.logo_url) {
      setLogoUrl(pkmProfile.logo_url);
    } else {
      setLogoUrl('/logo-sigesit.png');
    }
  }, [pkmProfile]);

  // Redirect if already logged in
  React.useEffect(() => {
    if (session) {
      // BYPASS ADMIN CHECK
      if (session.user.id === 'admin-bypass-id') {
        navigate('/admin');
        return;
      }

      if (profile) {
        // CHECK IF USER IS ACTIVE
        if (profile.is_active === false) {
          setError('Akun Anda dinonaktifkan. Silakan hubungi Admin.');
          supabase.auth.signOut();
          return;
        }
        const role = profile.role?.toLowerCase() || '';
        if (role.includes('admin')) {
          navigate('/admin');
        } else {
          navigate('/entry');
        }
      } else if (!loading && !isMock) {
        // Session exists but no profile found (Data inconsistency)
        setError(`Login berhasil (Email: ${session?.user?.email}), tapi data profil tidak ditemukan. ID: ${session?.user?.id}`);
        supabase.auth.signOut(); // Force logout so they can try again
      }
    }
  }, [session, profile, navigate, loading, isMock]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submit
    
    setError('');
    setLoading(true);

    try {
      // EMERGENCY BYPASS MODE
      if (username === 'admin_sigesit' && password === 'sigesit2026') {
        localStorage.setItem('force_mock_mode', 'true');
        // Create a fake admin session
        const mockAdmin = {
          user: { id: 'admin-bypass-id', email: 'admin@sigesit.com' },
          profile: { 
            id: 'admin-bypass-id', 
            name: 'SUPER ADMIN (BYPASS)', 
            role: 'super_admin', 
            username: 'admin_sigesit',
            is_active: true 
          }
        };
        localStorage.setItem('mock_session', JSON.stringify(mockAdmin));
        window.location.href = '/admin';
        return;
      }

      // SPECIAL DEMO LOGIN (For Presentation)
      if (username.toLowerCase() === 'demo' && password === 'demo123') {
        const demoProfile = {
          id: 'demo-user-id',
          nik: 'DEMO123456',
          name: 'Sigesit Demo Account',
          phone: '08123456789',
          username: 'demo',
          role: 'super_admin', // Full access for demo
          is_active: true
        };
        const demoSession = {
          user: { id: 'demo-user-id', email: 'demo@sigesit.com' },
          profile: demoProfile
        };
        localStorage.setItem('mock_session', JSON.stringify(demoSession));
        localStorage.setItem('force_mock_mode', 'true');
        window.location.reload(); // Refresh to trigger mock mode in AuthProvider
        return;
      }

      if (isMock && !(username.toLowerCase() === 'demo' && password === 'demo123')) {
        // If we are in mock mode but trying a real login, clear mock mode
        localStorage.removeItem('force_mock_mode');
        localStorage.removeItem('mock_session');
        window.location.reload();
        return;
      }

      if (isMock) {
        await mockLogin(username);
        return;
      }

      setLoading(true);

      const computedEmail = username.includes('@') 
        ? username 
        : `${username.replace(/\*/g, '')}@sigesit.com`;

      console.log('Login attempt:', { username, emailToUse: computedEmail });

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: computedEmail,
        password,
      });

      if (loginError) {
        console.error('Login error:', loginError);
        
        // CUSTOM HANDLING for "Email not confirmed"
        const msg = loginError.message.toLowerCase();
        if (msg.includes('email not confirmed')) {
           throw new Error(`AKUN BELUM AKTIF: Kader ini sudah terdaftar tapi emailnya belum dikonfirmasi. 
           
SOLUSI: Admin harus mematikan fitur "Confirm Email" di Dashboard Supabase agar Kader bisa langsung login. 
           
CARA: Di Supabase -> Authentication -> Settings -> Disable "Confirm Email".`);
        }

        if (msg.includes('invalid login credentials')) {
            throw new Error(`Username atau Password salah. 
            
Detail: Gagal login untuk ${computedEmail}. Pastikan password benar.`);
        }

        throw new Error(`${loginError.message} (Username: ${username})`);
      }

      console.log('Login successful, Session:', data.session);

      if (!data.session) {
        throw new Error('Login berhasil tapi sesi tidak terbentuk. Coba refresh halaman.');
      }

      // Ambil profil
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .maybeSingle();

      if (profileError || !profileData) {
         console.warn('Profil tidak ditemukan di database untuk ID:', data.session.user.id);
         await supabase.auth.signOut();
         throw new Error(`AKUN TIDAK LENGKAP: Akun login Anda ada, tapi data profil tidak ditemukan. 
         
Hal ini biasanya terjadi jika Admin menghapus profil Anda tapi akun login belum terhapus bersih. Silakan hubungi Super Admin untuk membuat ulang akun.`);
      }

      // CHECK IF USER IS ACTIVE
      if (profileData && profileData.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('AKUN DINONAKTIFKAN: Akun Anda sedang dinonaktifkan oleh Admin. Silakan hubungi Super Admin.');
      }
      
      console.log('Login successful');
      
      if (profileData) {
        const role = profileData.role?.toLowerCase() || '';
        if (role.includes('admin') || role.includes('super_admin')) navigate('/admin');
        else navigate('/entry');
      }
    } catch (err: any) {
      // Show the actual error message for debugging
      console.error('Login detailed error:', err);
      setError(err.message || 'Gagal login. Periksa username dan password anda.');
    } finally {
      setLoading(false);
    }
  };

  const computedEmail = React.useMemo(() => {
    if (!username) return '';
    if (username.includes('@')) return username;
    return `${username.replace(/\*/g, '')}@sigesit.com`;
  }, [username]);

  // Check for forced mock mode
  useEffect(() => {
    if (localStorage.getItem('force_mock_mode') === 'true' && !isMock) {
      // Logic to switch to mock context if possible, or just warn
      console.log('User requested mock mode');
    }
  }, [isMock]);

  const handleHardReset = async () => {
    if (confirm('Aplikasi akan dipaksa update ke versi terbaru (V4.4.6). Lanjutkan?')) {
      // 1. Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Clear Cache Storage
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }

      // 3. Clear Local Storage & Session
      localStorage.clear();
      sessionStorage.clear();
      
      // 4. Clear Cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });

      // 5. Force Reload from Server (Bypass Cache)
      console.log('Reloading with cache bypass...');
      window.location.replace('/?version=' + new Date().getTime());
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-teal-100/50 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] w-full max-w-md border border-white/50 relative z-10">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-tr from-blue-600 to-teal-500 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 transform hover:scale-105 transition-transform duration-300">
             {/* Dynamic Logo from Realtime Context */}
             <img 
               src={logoUrl || '/logo-sigesit.png'} 
               alt="Logo" 
               className="w-16 h-16 object-contain brightness-0 invert drop-shadow-md"
               onError={(e) => {
                 const target = e.target as HTMLImageElement;
                 target.src = '/logo-sigesit.png';
               }} 
             />
          </div>
          <h1 className="text-3xl font-black text-blue-600 tracking-tight mb-2">SIGESIT SADAKELING</h1>
          <p className="text-slate-500 font-bold text-xs tracking-widest uppercase">PKM PADASUKA - KOTA CIMAHI</p>
          
          {/* VERSION BADGE */}
          <div className="mt-4 flex flex-col items-center gap-2">
            {isMock ? (
              <div className="inline-block bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-[11px] px-4 py-1.5 rounded-full font-black tracking-[0.2em] shadow-lg shadow-purple-200 animate-pulse border border-white/20">
                MODE DEMO AKTIF
              </div>
            ) : (
              <div className="inline-block bg-gradient-to-r from-red-600 to-rose-500 text-white text-[11px] px-4 py-1.5 rounded-full font-black tracking-[0.2em] shadow-lg shadow-red-200 animate-bounce border border-white/20">
                V4.4.6 FINAL STABLE
              </div>
            )}
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 shadow-inner flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              Update Terakhir: 31 Jan 2026 | 16:15 WIB
            </div>
            <button 
              onClick={handleHardReset}
              className="mt-2 text-[9px] font-bold text-rose-500 hover:text-rose-600 underline decoration-dotted cursor-pointer hover:bg-rose-50 px-2 py-1 rounded"
            >
              [ KLIK DISINI JIKA APLIKASI MACET / TIDAK UPDATE ]
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm group cursor-help">
            {error}
          <div className="mt-2 text-xs text-left bg-red-50 p-2 rounded border border-red-200 hidden group-hover:block">
            <strong>Detail Error:</strong> <br/>
            {error}
          </div>
        </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan username"
            />
            {!isMock && username && (
              <p className="text-xs text-gray-400 mt-1">
                Login sebagai: {computedEmail}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="Masukkan password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 text-xs"
              >
                {showPassword ? "SEMBUNYIKAN" : "LIHAT"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
      </div>
      
      <div className="text-center mt-8 text-[10px] text-gray-400 font-bold tracking-widest uppercase">
        <p>&copy; 2026 akuntansipro.com | SIGESIT V4.4.5</p>
        <p>info@akuntansipro.com</p>
      </div>
    </div>
  );
}
