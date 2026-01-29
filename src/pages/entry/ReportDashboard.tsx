import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserEntries } from '@/lib/api';
import { Activity, Users, Home, Download, Calendar, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportDashboard() {
  const { profile, isAdmin } = useAuth();
  
  // Default to Current Month (Bulan Berjalan)
  const getDefaultDateFrom = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  };
  
  const getDefaultDateTo = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [reportDateFrom, setReportDateFrom] = useState(getDefaultDateFrom());
  const [reportDateTo, setReportDateTo] = useState(getDefaultDateTo());
  const [qtyMode, setQtyMode] = useState<'ya' | 'tidak' | 'keduanya'>('ya');
  const [stats, setStats] = useState<any>({
    totalEntries: 0,
    totalHouses: 0,
    totalFamilies: 0,
    totalSouls: 0,
    totalLatrines: 0,
    jambanSehat: 0,
    ctps: 0,
    airLayak: 0,
    sampahAman: 0,
    limbahAman: 0,
    kelurahanStats: [],
    statementStats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      calculateStats();
    }
  }, [profile, isAdmin, reportDateFrom, reportDateTo]);

  const calculateStats = async () => {
    try {
      setLoading(true);
      // Fetch entries with server-side date filtering for performance optimization
      const entries = await getUserEntries(profile?.id || '', isAdmin, reportDateFrom, reportDateTo);
      
      if (!entries) return;

      const totalHouses = entries.length;
      const totalFamilies = entries.reduce((sum: number, e: any) => sum + (e.family_members?.length || 1), 0);
      const totalSouls = entries.reduce((sum: number, e: any) => sum + (e.total_souls || 0), 0);
      const totalLatrines = entries.reduce((sum: number, e: any) => sum + (e.latrine_count || 0), 0);
      
      // Calculate Quantitative Report per Statement (Multiplier: KK Count)
      const statementMap: Record<string, { label: string, qtyYa: number, qtyTidak: number, category: string }> = {
        'jamban_bab_jamban': { label: 'BAB di Jamban', qtyYa: 0, qtyTidak: 0, category: 'PILAR 1' },
        'jamban_milik_sendiri': { label: 'Jamban Milik Sendiri', qtyYa: 0, qtyTidak: 0, category: 'PILAR 1' },
        'jamban_leher_angsa': { label: 'Kloset Leher Angsa', qtyYa: 0, qtyTidak: 0, category: 'PILAR 1' },
        'jamban_septik_aman': { label: 'Septik Disedot 3-5 Thn', qtyYa: 0, qtyTidak: 0, category: 'PILAR 1' },
        'jamban_septik_tidak_sedot': { label: 'Septik Tidak Pernah Sedot', qtyYa: 0, qtyTidak: 0, category: 'PILAR 1' },
        'jamban_cubluk': { label: 'Cubluk/Lubang Tanah', qtyYa: 0, qtyTidak: 0, category: 'PILAR 1' },
        'jamban_dibuang_drainase': { label: 'Buang ke Drainase', qtyYa: 0, qtyTidak: 0, category: 'PILAR 1' },
        'ctps_sarana': { label: 'Memiliki Sarana CTPS', qtyYa: 0, qtyTidak: 0, category: 'PILAR 2' },
        'ctps_air_mengalir': { label: 'Air Mengalir', qtyYa: 0, qtyTidak: 0, category: 'PILAR 2' },
        'ctps_sabun': { label: 'Ada Sabun', qtyYa: 0, qtyTidak: 0, category: 'PILAR 2' },
        'ctps_mampu_praktek': { label: 'Mampu Praktek CTPS', qtyYa: 0, qtyTidak: 0, category: 'PILAR 2' },
        'ctps_sebelum_makan': { label: 'CTPS Sebelum Makan', qtyYa: 0, qtyTidak: 0, category: 'PILAR 2' },
        'ctps_sebelum_olah_makan': { label: 'CTPS Sebelum Olah Pangan', qtyYa: 0, qtyTidak: 0, category: 'PILAR 2' },
        'ctps_sebelum_susui': { label: 'CTPS Sebelum Menyusui', qtyYa: 0, qtyTidak: 0, category: 'PILAR 2' },
        'ctps_setelah_bab': { label: 'CTPS Setelah BAB', qtyYa: 0, qtyTidak: 0, category: 'PILAR 2' },
        'air_layak_perpipaan': { label: 'Air Perpipaan', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'air_layak_kran_umum': { label: 'Kran Umum', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'air_layak_sg_terlindung': { label: 'Sumur Gali Terlindung', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'air_layak_sgl': { label: 'SGL (Pompa)', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'air_layak_spl': { label: 'SPL (Bor)', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'air_layak_mata_air': { label: 'Mata Air Terlindung', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'air_layak_hujan': { label: 'Air Hujan', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'olah_air_proses': { label: 'Air Diolah/Dimasak', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'olah_air_simpan_tutup': { label: 'Air Disimpan Tertutup', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3' },
        'pangan_tutup': { label: 'Makanan Tertutup', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3 (PANGAN)' },
        'pangan_pisah_b3': { label: 'Pisah dari B3', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3 (PANGAN)' },
        'pangan_5_kunci': { label: 'Terapkan 5 Kunci Pangan', qtyYa: 0, qtyTidak: 0, category: 'PILAR 3 (PANGAN)' },
        'sampah_tidak_serak': { label: 'Sampah Tidak Berserakan', qtyYa: 0, qtyTidak: 0, category: 'PILAR 4' },
        'sampah_tutup_kuat': { label: 'Tempat Sampah Tertutup', qtyYa: 0, qtyTidak: 0, category: 'PILAR 4' },
        'sampah_olah_aman': { label: 'Sampah Diolah Aman', qtyYa: 0, qtyTidak: 0, category: 'PILAR 4' },
        'sampah_pilah': { label: 'Sampah Dipilah', qtyYa: 0, qtyTidak: 0, category: 'PILAR 4' },
        'limbah_tidak_genang': { label: 'Tidak Ada Genangan Limbah', qtyYa: 0, qtyTidak: 0, category: 'PILAR 5' },
        'limbah_saluran_kedap': { label: 'Saluran Limbah Kedap', qtyYa: 0, qtyTidak: 0, category: 'PILAR 5' },
        'limbah_resapan_ipal': { label: 'Ada Resapan/IPAL', qtyYa: 0, qtyTidak: 0, category: 'PILAR 5' },
        'pkurt_jendela_kamar': { label: 'Jendela Kamar Dibuka', qtyYa: 0, qtyTidak: 0, category: 'PKURT' },
        'pkurt_jendela_keluarga': { label: 'Jendela Keluarga Dibuka', qtyYa: 0, qtyTidak: 0, category: 'PKURT' },
        'pkurt_ventilasi': { label: 'Ada Ventilasi', qtyYa: 0, qtyTidak: 0, category: 'PKURT' },
        'pkurt_lubang_asap': { label: 'Ada Lubang Asap Dapur', qtyYa: 0, qtyTidak: 0, category: 'PKURT' },
        'pkurt_cahaya_alami': { label: 'Ada Cahaya Alami', qtyYa: 0, qtyTidak: 0, category: 'PKURT' },
        'pkurt_tidak_merokok': { label: 'Tidak Merokok di Rumah', qtyYa: 0, qtyTidak: 0, category: 'PKURT' },
      };

      // Calculate Grouping by Kelurahan
      const kelurahanMap = new Map();
      entries.forEach((e: any) => {
        const familyCount = (e.family_members?.length || 1);
        
        // Sum Statements based on Family Count (Multiplier)
        Object.keys(statementMap).forEach(key => {
          if (e[key] === true) {
            statementMap[key].qtyYa += familyCount;
          } else {
            statementMap[key].qtyTidak += familyCount;
          }
        });

        const kelName = e.kelurahan?.name || 'LAINNYA';
        if (!kelurahanMap.has(kelName)) {
          kelurahanMap.set(kelName, {
            name: kelName,
            totalHouses: 0,
            totalFamilies: 0,
            jambanSehat: 0,
            ctps: 0,
            airLayak: 0,
            sampahAman: 0,
            limbahAman: 0
          });
        }
        const kStats = kelurahanMap.get(kelName);
        kStats.totalHouses += 1;
        kStats.totalFamilies += (e.family_members?.length || 1);
        
        if (e.jamban_leher_angsa && (e.jamban_septik_aman || e.jamban_septik_tidak_sedot)) kStats.jambanSehat++;
        if (e.ctps_sarana && e.ctps_air_mengalir && e.ctps_sabun) kStats.ctps++;
        if (e.air_layak_perpipaan || e.air_layak_kran_umum || e.air_layak_sg_terlindung || 
            e.air_layak_mata_air || e.air_layak_sgl || e.air_layak_spl || e.air_layak_hujan) kStats.airLayak++;
        if (e.sampah_tidak_serak && e.sampah_olah_aman) kStats.sampahAman++;
        if (e.limbah_tidak_genang && e.limbah_saluran_kedap) kStats.limbahAman++;
      });

      const kelurahanStats = Array.from(kelurahanMap.values());
      
      // Calculate Global Indicators (Simple Logic)
      const jambanSehat = entries.filter((e: any) => 
        e.jamban_leher_angsa && (e.jamban_septik_aman || e.jamban_septik_tidak_sedot)
      ).length;

      const ctps = entries.filter((e: any) => 
        e.ctps_sarana && e.ctps_air_mengalir && e.ctps_sabun
      ).length;

      const airLayak = entries.filter((e: any) => 
        e.air_layak_perpipaan || e.air_layak_kran_umum || e.air_layak_sg_terlindung || 
        e.air_layak_mata_air || e.air_layak_sgl || e.air_layak_spl || e.air_layak_hujan
      ).length;

      const sampahAman = entries.filter((e: any) => 
        e.sampah_tidak_serak && e.sampah_olah_aman
      ).length;

      const limbahAman = entries.filter((e: any) => 
        e.limbah_tidak_genang && e.limbah_saluran_kedap
      ).length;

      const statementStats = Object.values(statementMap).sort((a, b) => a.category.localeCompare(b.category));

      setStats({
        totalEntries: totalHouses,
        totalHouses,
        totalFamilies,
        totalSouls,
        totalLatrines,
        jambanSehat,
        ctps,
        airLayak,
        sampahAman,
        limbahAman,
        kelurahanStats,
        statementStats
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportRekap = () => {
    if (stats.statementStats.length === 0) {
      alert('Tidak ada data untuk di-export');
      return;
    }

    const dataToExport = stats.statementStats.map((s: any, idx: number) => {
      const row: any = {
        'No': idx + 1,
        'Kategori': s.category,
        'Pernyataan/Pertanyaan': s.label,
      };
      
      if (qtyMode === 'ya' || qtyMode === 'keduanya') {
        row['Jumlah (Ya)'] = s.qtyYa;
      }
      if (qtyMode === 'tidak' || qtyMode === 'keduanya') {
        row['Jumlah (Tidak)'] = s.qtyTidak;
      }
      
      row['Total KK'] = stats.totalFamilies;
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet([]);
    
    // Add Title and Info
    XLSX.utils.sheet_add_aoa(worksheet, [
      ["LAPORAN KUANTITATIF SIGESIT (QTY PER PERNYATAAN)"],
      [`Tanggal Export: ${new Date().toLocaleString('id-ID')}`],
      [`Periode: ${reportDateFrom || 'Awal'} s.d ${reportDateTo || 'Akhir'} | Mode: Qty ${qtyMode.toUpperCase()}`],
      []
    ], { origin: 'A1' });

    // Add Data starting from A5
    XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A5' });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Qty Survey");
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Rekap_Qty_Sigesit_${dateStr}.xlsx`);
  };

  const handlePrintPDF = () => {
    window.print();
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

  if (!isAdmin) return (
    <div className="pb-24 space-y-6 px-1">
      <div className="bg-amber-50 p-10 rounded-[2.5rem] border border-amber-200 text-center">
        <h2 className="text-2xl font-black text-amber-800 mb-2">AKSES TERBATAS</h2>
        <p className="text-amber-700 font-medium">Halaman Dashboard Laporan & Statistik hanya dapat diakses oleh Super Admin.</p>
      </div>
    </div>
  );

  return (
    <div className="pb-24 space-y-6 px-1">
      <div className="flex justify-end print:hidden mb-4">
        <button 
          onClick={handlePrintPDF}
          className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-2xl hover:bg-slate-50 transition-all font-black text-xs shadow-lg shadow-slate-200 uppercase tracking-widest border border-slate-200"
        >
          <Printer size={18} />
          Cetak PDF
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-200 relative overflow-hidden print:bg-none print:text-black print:border-none print:p-0 print:shadow-none">
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
          <div className="mt-6 flex flex-wrap gap-4 items-end">
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

            {/* Date Filters */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Filter Tanggal:</span>
                {(reportDateFrom !== getDefaultDateFrom() || reportDateTo !== getDefaultDateTo()) && (
                  <button 
                    onClick={() => {
                      setReportDateFrom(getDefaultDateFrom());
                      setReportDateTo(getDefaultDateTo());
                    }}
                    className="text-[8px] font-black text-cyan-300 hover:text-white uppercase transition-colors"
                  >
                    RESET KE BULAN INI
                  </button>
                )}
              </div>
              <div className="flex gap-2 bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/10 print:hidden">
                <div className="relative">
                  <input 
                    type="date" 
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="bg-transparent text-[10px] font-black text-white px-3 py-1.5 outline-none w-28 [color-scheme:dark]"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-2 pointer-events-none opacity-50">
                    <Calendar size={10} />
                  </div>
                </div>
                <div className="text-white/30 self-center">—</div>
                <div className="relative">
                  <input 
                    type="date" 
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="bg-transparent text-[10px] font-black text-white px-3 py-1.5 outline-none w-28 [color-scheme:dark]"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-2 pointer-events-none opacity-50">
                    <Calendar size={10} />
                  </div>
                </div>
              </div>
              <div className={`mt-2 px-4 py-2 rounded-xl border flex items-center gap-2 animate-bounce-slow shadow-sm ${
                reportDateFrom === getDefaultDateFrom() && reportDateTo === getDefaultDateTo()
                  ? "bg-amber-400 border-amber-500 text-amber-950"
                  : "bg-cyan-400 border-cyan-500 text-cyan-950"
              }`}>
                <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                <p className="text-xs font-black uppercase tracking-wider print:hidden">
                  {reportDateFrom === getDefaultDateFrom() && reportDateTo === getDefaultDateTo() 
                    ? "Menampilkan Data Bulan Berjalan (Otomatis)" 
                    : "Menampilkan Data Filter Kustom"}
                </p>
                <p className="hidden print:block text-xs font-black uppercase tracking-wider">
                  Periode: {reportDateFrom} s/d {reportDateTo}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          title="Jumlah KK" 
          value={stats.totalFamilies} 
          subtext="Total Kartu Keluarga"
          icon={Home} 
          colorClass="bg-blue-600" 
          shadowClass="hover:shadow-blue-200/40"
        />
        <StatCard 
          title="Jumlah Rumah" 
          value={stats.totalHouses} 
          subtext="Total Bangunan Rumah"
          icon={Activity} 
          colorClass="bg-emerald-600" 
          shadowClass="hover:shadow-emerald-200/40"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <StatCard 
          title="Total Jiwa" 
          value={stats.totalSouls} 
          icon={Users} 
          colorClass="bg-indigo-600" 
          shadowClass="hover:shadow-indigo-200/40"
        />
      </div>

      {/* Peta Sebaran (Hidden as per request) */}
      {/* 
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
      */}

      <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-50">
        <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter text-sm">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Activity size={20} />
          </div>
          Capaian per Wilayah (Kelurahan)
        </h3>

        {/* Kelurahan Summary Table */}
        <div className="mb-8 overflow-hidden border border-slate-100 rounded-3xl shadow-inner">
           <table className="w-full text-left">
              <thead className="bg-slate-100">
                 <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Kelurahan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center">Total Rumah</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center">Total KK</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                 {stats.kelurahanStats.map((kel: any) => (
                    <tr key={kel.name} className="hover:bg-blue-50/30 transition-colors">
                       <td className="px-6 py-4 text-sm font-black text-slate-700 uppercase">{kel.name}</td>
                       <td className="px-6 py-4 text-center">
                          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-black border border-emerald-100">{kel.totalHouses}</span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-black border border-blue-100">{kel.totalFamilies}</span>
                       </td>
                    </tr>
                 ))}
                 <tr className="bg-slate-50/80 font-black border-t-2 border-slate-200">
                    <td className="px-6 py-4 text-sm uppercase">TOTAL KESELURUHAN</td>
                    <td className="px-6 py-4 text-center">
                       <span className="text-sm font-black text-emerald-700">{stats.totalHouses}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="text-sm font-black text-blue-700">{stats.totalFamilies}</span>
                    </td>
                 </tr>
              </tbody>
           </table>
        </div>
        
        <div className="space-y-8">
          {stats.kelurahanStats.map((kel: any) => (
            <div key={kel.name} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{kel.name}</h4>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rumah: {kel.totalHouses}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KK: {kel.totalFamilies}</span>
                  </div>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">DETAIL CAPAIAN</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <ProgressItem label="Jamban Sehat" value={kel.jambanSehat} total={kel.totalHouses} colorClass="bg-emerald-500" />
                <ProgressItem label="CTPS" value={kel.ctps} total={kel.totalHouses} colorClass="bg-blue-500" />
                <ProgressItem label="Air Minum Layak" value={kel.airLayak} total={kel.totalHouses} colorClass="bg-cyan-500" />
                <ProgressItem label="Sampah Aman" value={kel.sampahAman} total={kel.totalHouses} colorClass="bg-orange-500" />
                <ProgressItem label="Limbah Aman" value={kel.limbahAman} total={kel.totalHouses} colorClass="bg-indigo-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-50">
        <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter text-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Activity size={20} />
          </div>
          Total Capaian Seluruh Wilayah
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

      <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-50">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter text-sm">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Activity size={20} />
            </div>
            Laporan Kuantitatif (Qty per Pertanyaan)
          </h3>
          <button 
            onClick={handleExportRekap}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-black text-[10px] shadow-lg shadow-emerald-200 uppercase tracking-widest print:hidden"
          >
            <Download size={14} />
            Export Rekap
          </button>
        </div>

        {/* Qty Mode Filter */}
        <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200 shadow-inner print:hidden">
           <button 
             onClick={() => setQtyMode('ya')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${qtyMode === 'ya' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Qty "YA"
           </button>
           <button 
             onClick={() => setQtyMode('tidak')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${qtyMode === 'tidak' ? 'bg-white text-rose-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Qty "TIDAK"
           </button>
           <button 
             onClick={() => setQtyMode('keduanya')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${qtyMode === 'keduanya' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Keduanya
           </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                <th className="p-4 border-b border-slate-100">Kategori</th>
                <th className="p-4 border-b border-slate-100">Pernyataan Survey</th>
                {(qtyMode === 'ya' || qtyMode === 'keduanya') && <th className="p-4 border-b border-slate-100 text-center text-blue-600">Qty "YA"</th>}
                {(qtyMode === 'tidak' || qtyMode === 'keduanya') && <th className="p-4 border-b border-slate-100 text-center text-rose-600">Qty "TIDAK"</th>}
                <th className="p-4 border-b border-slate-100 text-right">Capaian (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.statementStats.map((s: any, idx: number) => {
                const percentage = stats.totalFamilies > 0 ? Math.round((s.qtyYa / stats.totalFamilies) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                        s.category.includes('PILAR 1') ? 'bg-rose-50 text-rose-600' :
                        s.category.includes('PILAR 2') ? 'bg-blue-50 text-blue-600' :
                        s.category.includes('PILAR 3') ? 'bg-cyan-50 text-cyan-600' :
                        s.category.includes('PILAR 4') ? 'bg-orange-50 text-orange-600' :
                        s.category.includes('PILAR 5') ? 'bg-indigo-50 text-indigo-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {s.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-slate-700">{s.label}</span>
                    </td>
                    {(qtyMode === 'ya' || qtyMode === 'keduanya') && (
                      <td className="p-4 text-center">
                        <span className="text-sm font-black text-blue-700">{s.qtyYa}</span>
                        <span className="text-[10px] text-slate-400 font-medium ml-1">KK</span>
                      </td>
                    )}
                    {(qtyMode === 'tidak' || qtyMode === 'keduanya') && (
                      <td className="p-4 text-center">
                        <span className="text-sm font-black text-rose-700">{s.qtyTidak}</span>
                        <span className="text-[10px] text-slate-400 font-medium ml-1">KK</span>
                      </td>
                    )}
                    <td className="p-4 text-right">
                       <div className="flex items-center justify-end gap-3">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                             <div 
                               className={`h-full rounded-full ${
                                 percentage > 80 ? 'bg-emerald-500' :
                                 percentage > 50 ? 'bg-blue-500' :
                                 'bg-amber-500'
                               }`}
                               style={{ width: `${percentage}%` }}
                             ></div>
                          </div>
                          <span className="text-[11px] font-black text-slate-800 w-8">{percentage}%</span>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
             <span>Gunakan filter wilayah untuk melihat detail per Kelurahan/RW/RT.</span>
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
