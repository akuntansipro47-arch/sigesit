import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserEntries } from '@/lib/api';
import { Activity, Users, Home, Map as MapIcon } from 'lucide-react';
import DistributionMap from './DistributionMap';

export default function ReportDashboard() {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<any>({
    totalEntries: 0,
    totalSouls: 0,
    totalLatrines: 0,
    jambanSehat: 0,
    ctps: 0,
    airLayak: 0,
    sampahAman: 0,
    limbahAman: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      calculateStats();
    }
  }, [profile, isAdmin]);

  const calculateStats = async () => {
    try {
      // In real app, we should use a specific aggregation query for performance
      // But for now, we fetch entries and calculate client-side as per requirement
      // getUserEntries already filters by user_id if isAdmin is false
      
      const entries = await getUserEntries(profile?.id || '', isAdmin);
      
      if (!entries) return;

      const totalEntries = entries.length;
      const totalSouls = entries.reduce((sum: number, e: any) => sum + (e.total_souls || 0), 0);
      const totalLatrines = entries.reduce((sum: number, e: any) => sum + (e.latrine_count || 0), 0);
      
      // Calculate Indicators (Simple Logic)
      // Jamban Sehat: Leher Angsa + Septik Aman/Tidak Sedot
      const jambanSehat = entries.filter((e: any) => 
        e.jamban_leher_angsa && (e.jamban_septik_aman || e.jamban_septik_tidak_sedot)
      ).length;

      // CTPS: Sarana + Air + Sabun
      const ctps = entries.filter((e: any) => 
        e.ctps_sarana && e.ctps_air_mengalir && e.ctps_sabun
      ).length;

      // Air Layak: Perpipaan/Kran/Sumur Terlindung/Mata Air Terlindung + SGL/SPL/Hujan
      const airLayak = entries.filter((e: any) => 
        e.air_layak_perpipaan || e.air_layak_kran_umum || e.air_layak_sg_terlindung || 
        e.air_layak_mata_air || e.air_layak_sgl || e.air_layak_spl || e.air_layak_hujan
      ).length;

      // Sampah Aman: Tidak serak + Olah aman
      const sampahAman = entries.filter((e: any) => 
        e.sampah_tidak_serak && e.sampah_olah_aman
      ).length;

      // Limbah Aman: Tidak genang + Saluran kedap
      const limbahAman = entries.filter((e: any) => 
        e.limbah_tidak_genang && e.limbah_saluran_kedap
      ).length;

      setStats({
        totalEntries,
        totalSouls,
        totalLatrines,
        jambanSehat,
        ctps,
        airLayak,
        sampahAman,
        limbahAman
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtext, icon: Icon, colorClass, shadowClass }: any) => (
    <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-start justify-between group hover:shadow-xl ${shadowClass} transition-all duration-300`}>
      <div className="flex-1">
        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 group-hover:text-slate-600 transition-colors">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{value}</h3>
        {subtext && <p className="text-[10px] text-slate-400 mt-1 font-medium italic">{subtext}</p>}
      </div>
      <div className={`w-12 h-12 rounded-2xl ${colorClass} text-white flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12 group-hover:scale-110 duration-300`}>
        <Icon size={24} />
      </div>
    </div>
  );

  const ProgressItem = ({ label, value, total, colorClass }: any) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div className="mb-6 group">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${colorClass.replace('bg-', 'bg-')}`}></div>
            <span className="text-sm font-black text-slate-700 tracking-tight">{label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-800">{percentage}%</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">({value}/{total})</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 shadow-inner overflow-hidden">
          <div 
            className={`h-3 rounded-full ${colorClass} shadow-sm transition-all duration-1000 ease-out relative overflow-hidden`} 
            style={{ width: `${percentage}%` }}
          >
             <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 animate-pulse">
       <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
       <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Menyusun Laporan...</p>
    </div>
  );

  return (
    <div className="pb-24 space-y-6 px-1">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
               <Activity size={18} className="text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Monitoring Wilayah</h2>
          </div>
          <p className="text-sm text-blue-100/80 font-medium leading-relaxed max-w-xs">
            Laporan Real-time Capaian <span className="text-white font-bold">5 Pilar STBM</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-blue-200 uppercase tracking-widest ml-1">
                {isAdmin ? 'Wilayah Monitoring (Global):' : 'Wilayah Tugas:'}
              </span>
              <div className="flex gap-2">
                <span className="text-[10px] font-black bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/20 uppercase tracking-widest backdrop-blur-md">
                  RW {isAdmin ? 'SEMUA' : (profile?.rw_id || '-')}
                </span>
                <span className="text-[10px] font-black bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/20 uppercase tracking-widest backdrop-blur-md">
                  RT {isAdmin ? 'SEMUA' : (profile?.rt_id || 'SEMUA')}
                </span>
                <span className="text-[10px] font-black bg-emerald-400 text-emerald-950 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/20">AKTIF</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          title="Total KK" 
          value={stats.totalEntries} 
          icon={Home} 
          colorClass="bg-blue-600" 
          shadowClass="hover:shadow-blue-200/40"
        />
        <StatCard 
          title="Total Jiwa" 
          value={stats.totalSouls} 
          icon={Users} 
          colorClass="bg-indigo-600" 
          shadowClass="hover:shadow-indigo-200/40"
        />
      </div>

      <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-50">
        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 uppercase tracking-tighter text-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <MapIcon size={20} />
          </div>
          Peta Sebaran
        </h3>
        <div className="rounded-3xl overflow-hidden border border-slate-100 shadow-inner">
           <DistributionMap />
        </div>
      </div>

      <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-50">
        <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter text-sm">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Activity size={20} />
          </div>
          Capaian Indikator Utama
        </h3>
        
        <div className="space-y-2">
          <ProgressItem 
            label="Akses Jamban Sehat" 
            value={stats.jambanSehat} 
            total={stats.totalEntries} 
            colorClass="bg-emerald-500" 
          />
          <ProgressItem 
            label="CTPS (Cuci Tangan)" 
            value={stats.ctps} 
            total={stats.totalEntries} 
            colorClass="bg-blue-500" 
          />
          <ProgressItem 
            label="Air Minum Layak" 
            value={stats.airLayak} 
            total={stats.totalEntries} 
            colorClass="bg-cyan-500" 
          />
          <ProgressItem 
            label="Sampah Aman" 
            value={stats.sampahAman} 
            total={stats.totalEntries} 
            colorClass="bg-orange-500" 
          />
          <ProgressItem 
            label="Limbah Cair Aman" 
            value={stats.limbahAman} 
            total={stats.totalEntries} 
            colorClass="bg-indigo-500" 
          />
        </div>
      </div>

      <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 relative overflow-hidden group">
        <div className="absolute -bottom-4 -right-4 text-amber-200/50 transform rotate-12 transition-transform group-hover:scale-110 duration-500">
           <Activity size={80} />
        </div>
        <p className="font-black text-amber-800 mb-3 text-xs uppercase tracking-widest flex items-center gap-2 relative z-10">
           💡 Tips Monitoring:
        </p>
        <ul className="space-y-2 relative z-10">
          <li className="flex gap-2 text-xs text-amber-900/70 font-bold leading-relaxed">
             <span className="text-amber-400">•</span>
             <span>Pastikan seluruh KK di wilayah tugas Anda sudah terinput 100%.</span>
          </li>
          <li className="flex gap-2 text-xs text-amber-900/70 font-bold leading-relaxed">
             <span className="text-amber-400">•</span>
             <span>Gunakan Peta Sebaran untuk melihat area yang belum terjangkau.</span>
          </li>
          <li className="flex gap-2 text-xs text-amber-900/70 font-bold leading-relaxed">
             <span className="text-amber-400">•</span>
             <span>Data ini digunakan sebagai dasar perencanaan intervensi kesehatan.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
