import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, MapPin, Users, Building, ClipboardList, BarChart2 } from 'lucide-react';
import ProfileModule from './ProfileModule';
import LocationModule from './LocationModule';
import UsersModule from './UsersModule';

import EntryList from '../entry/EntryList';
import ReportDashboard from '../entry/ReportDashboard';

export default function AdminDashboard() {
  const { signOut, pkmProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/admin/profile', label: 'Profile PKM', icon: Building },
    { path: '/admin/locations', label: 'Data Wilayah', icon: MapPin },
    { path: '/admin/users', label: 'Data Kader', icon: Users },
    { path: '/admin/entry', label: 'Data Entry (Survey)', icon: ClipboardList },
    { path: '/admin/report', label: 'Laporan & Statistik', icon: BarChart2 },
  ];

  return (
    <div className="flex h-screen bg-[#f1f5f9]">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-2xl hidden md:flex flex-col border-r border-slate-200">
        <div className="p-6 border-b border-blue-50 bg-gradient-to-b from-blue-50/50 to-transparent flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full p-1 shadow-md border-2 border-blue-100 flex items-center justify-center overflow-hidden mb-3">
             <img 
               src={pkmProfile?.logo_url || '/logo-sigesit.png'} 
               className="h-full w-full object-contain" 
               alt="Logo"
               onError={(e) => {
                 const target = e.target as HTMLImageElement;
                 target.src = '/logo-sigesit.png';
               }}
             />
          </div>
          <h2 className="text-xl font-black text-blue-600 tracking-tighter leading-tight text-center">SIGESIT SADAKELING</h2>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Super Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-x-1'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <Icon size={20} />
                <span className="font-semibold text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-blue-50">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-rose-500 hover:bg-rose-50 w-full px-4 py-3 rounded-xl transition-colors font-bold text-sm"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
        <div className="p-4 text-center text-[9px] text-slate-400 border-t border-blue-50 bg-slate-50/50 font-medium">
           <p>&copy; 2026 akuntansipro.com</p>
           <p className="mt-0.5 text-blue-400/60 uppercase">Sigesit Sadakeling v4.3</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-20 md:pb-0">
        <header className="bg-white/80 backdrop-blur-md shadow-sm p-4 md:hidden flex justify-between items-center sticky top-0 z-10 border-b border-blue-100">
          <div className="flex items-center gap-3">
            {/* Logo from Context (Realtime) */}
            <div className="bg-white p-1 rounded-full shadow-md border border-blue-100 w-10 h-10 flex items-center justify-center overflow-hidden">
              <img 
                 src={pkmProfile?.logo_url || '/logo-sigesit.png'} 
                 className="h-full w-full object-contain" 
                 alt="Logo"
                 onError={(e) => {
                   const target = e.target as HTMLImageElement;
                   target.src = '/logo-sigesit.png';
                 }}
              />
            </div>
            <div>
               <h2 className="font-black text-blue-600 text-sm tracking-tight">SIGESIT SADAKELING</h2>
               <p className="text-[9px] font-bold text-slate-400 uppercase text-center">PUSKESMAS PADASUKA</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-rose-500 p-2 hover:bg-rose-50 rounded-full transition-colors">
            <LogOut size={20} />
          </button>
        </header>
        <main className="p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="profile" element={<ProfileModule />} />
              <Route path="locations" element={<LocationModule />} />
              <Route path="users" element={<UsersModule />} />
              <Route path="entry" element={<EntryList />} />
              <Route path="report" element={<ReportDashboard />} />
              <Route path="*" element={
                <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-blue-50">
                  <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building className="text-blue-500" size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Selamat Datang, Admin!</h3>
                  <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                    Silakan pilih menu di panel samping untuk mengelola data Puskesmas.
                  </p>
                </div>
              } />
            </Routes>
          </div>
          <div className="mt-12 text-center text-[10px] text-slate-400 md:hidden pb-4">
              <p>&copy; 2026 akuntansipro.com</p>
              <p className="mt-1 text-blue-400/60 font-bold tracking-widest uppercase">SIGESIT SADAKELING</p>
           </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="bg-white border-t fixed bottom-0 left-0 right-0 flex justify-around p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[9999] safe-area-bottom md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-1">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
