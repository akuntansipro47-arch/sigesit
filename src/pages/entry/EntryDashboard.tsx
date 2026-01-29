import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Plus, BarChart2, Home, ArrowLeft, Menu, X } from 'lucide-react';
import EntryList from './EntryList';
import EntryForm from './EntryForm';
import ReportDashboard from './ReportDashboard';
import { useState, useEffect, useRef } from 'react';

export default function EntryDashboard() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      await signOut();
      navigate('/');
    }
  };

  const handleBack = () => {
    // If on a sub-page, go back to entry list
    if (location.pathname !== '/entry') {
      navigate('/entry');
    } else {
      // If on main entry page, show menu or logout
      setShowMenu(!showMenu);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Close menu when route changes
  useEffect(() => {
    setShowMenu(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path ? 'text-blue-600' : 'text-gray-600';
  const isAdmin = profile?.role?.toLowerCase().includes('admin');

  // Security check: Force check is_active on route change
  useEffect(() => {
    if (profile?.id) {
      import('@/lib/supabase').then(({ supabase }) => {
        supabase.from('user_profiles').select('is_active').eq('id', profile.id).single()
          .then(({ data }) => {
            if (data && data.is_active === false) {
              alert('AKUN DINONAKTIFKAN: Akun Anda telah dinonaktifkan oleh Admin.');
              signOut();
              navigate('/');
            }
          });
      });
    }
  }, [location.pathname, profile?.id, navigate, signOut]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             {/* Back/Menu Button */}
             <button 
               onClick={handleBack}
               className="p-2 hover:bg-white/20 rounded-full transition-colors"
               title={location.pathname !== '/entry' ? 'Kembali' : 'Menu'}
             >
               {location.pathname !== '/entry' ? <ArrowLeft size={20} /> : <Menu size={20} />}
             </button>
             <div className="bg-white p-1 rounded-full shadow-lg border-2 border-white/50 w-12 h-12 flex items-center justify-center overflow-hidden">
                <img 
                  src={(() => {
                    try {
                      const saved = localStorage.getItem('pkm_profile_v1');
                      const parsed = saved ? JSON.parse(saved) : null;
                      return parsed?.logo_url || '/logo-sigesit.png';
                    } catch { return '/logo-sigesit.png'; }
                  })()} 
                  className="h-full w-full object-contain" 
                  alt="Logo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/logo-sigesit.png';
                  }}
                />
             </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight leading-tight uppercase">SIGESIT <span className="font-light opacity-80">SADAKELING</span></h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-black bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-md shadow-sm border border-yellow-300 uppercase tracking-wider">
                  {profile?.name}
                </span>
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => navigate('/admin')}
                className="hidden sm:flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              >
                <Home size={16} />
                Panel Admin
              </button>
            )}
            <button onClick={handleLogout} className="p-2 hover:bg-white/20 rounded-full transition-colors shadow-sm" title="Keluar">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {/* Dropdown Menu */}
        {showMenu && (
          <div ref={menuRef} className="absolute top-full left-0 right-0 bg-white shadow-lg border-t border-blue-100 animate-in slide-in-from-top-2 duration-200 z-30">
            <div className="container mx-auto p-4 space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-500">Menu Navigasi</span>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>
              
              {isAdmin && (
                <Link 
                  to="/admin" 
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold border border-orange-100"
                >
                  <Home size={20} className="text-orange-600" />
                  <span>Kembali ke Panel Admin</span>
                </Link>
              )}

              <Link 
                to="/entry" 
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-slate-700 font-semibold"
              >
                <Home size={20} className="text-blue-500" />
                <span>Monitoring Entry</span>
              </Link>
              <Link 
                to="/entry/new" 
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 text-slate-700 font-semibold"
              >
                <Plus size={20} className="text-green-500" />
                <span>Entry Data Baru</span>
              </Link>
              <Link 
                to="/entry/report" 
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 text-slate-700 font-semibold"
              >
                <BarChart2 size={20} className="text-purple-500" />
                <span>Laporan & Statistik</span>
              </Link>
              <hr className="border-slate-200 my-3" />
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold w-full border border-red-100"
              >
                <LogOut size={20} />
                <span>Keluar / Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 pb-32 overflow-y-auto">
        <Routes>
          <Route path="/" element={<EntryList />} />
          <Route path="new" element={<EntryForm />} />
          <Route path="edit/:id" element={<EntryForm />} />
          <Route path="report" element={<ReportDashboard />} />
        </Routes>
        <div className="mt-8 text-center text-xs text-gray-400 pb-4">
           <p>&copy; 2026 akuntansipro.com</p>
           <p>info@akuntansipro.com</p>
        </div>
      </main>

      {/* Bottom Nav for Mobile - Simplified for Kader */}
      <nav className="bg-white border-t fixed bottom-0 left-0 right-0 flex justify-around p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[9999] safe-area-bottom lg:hidden">
        {isAdmin && (
          <Link to="/admin" className="flex flex-col items-center text-orange-600">
            <ArrowLeft size={20} />
            <span className="text-[10px] mt-1 font-bold">Ke Admin</span>
          </Link>
        )}
        <Link to="/entry" className={`flex flex-col items-center ${isActive('/entry')}`}>
          <Home size={20} />
          <span className="text-[10px] mt-1 font-bold">Monitoring Entry</span>
        </Link>
        <Link to="/entry/new" className={`flex flex-col items-center ${isActive('/entry/new')}`}>
          <div className="bg-blue-600 text-white p-3 rounded-full -mt-8 border-4 border-white shadow-lg hover:bg-blue-700 transition-colors">
            <Plus size={24} />
          </div>
          <span className="text-[10px] mt-1 font-black text-blue-600">Entry Baru</span>
        </Link>
        <Link to="/entry/report" className={`flex flex-col items-center ${isActive('/entry/report')}`}>
          <BarChart2 size={20} />
          <span className="text-[10px] mt-1 font-bold">Laporan</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center text-red-500">
          <LogOut size={20} />
          <span className="text-[10px] mt-1 font-bold">Keluar</span>
        </button>
      </nav>
      <div className="h-28 lg:hidden"></div> {/* Spacer for bottom nav increased */}
    </div>
  );
}
