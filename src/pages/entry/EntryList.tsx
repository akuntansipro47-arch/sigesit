import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserEntries, deleteEntry } from '@/lib/api';
import { Plus, FileText, Search, Edit, Filter, Download, User, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function EntryList() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [kelFilter, setKelFilter] = useState('');
  const [rwFilter, setRwFilter] = useState('');
  const [rtFilter, setRtFilter] = useState('');
  const [kaderFilter, setKaderFilter] = useState('');

  useEffect(() => {
    if (profile) {
      loadEntries();
    }
  }, [profile, isAdmin]);

  const loadEntries = async () => {
    try {
      if (!profile) return;
      // Gunakan status isAdmin untuk fetch data
      const data = await getUserEntries(profile.id, isAdmin);
      setEntries(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, headName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus permanen data survey atas nama "${headName}"?\n\nData yang dihapus tidak dapat dikembalikan.`)) {
      try {
        setLoading(true);
        await deleteEntry(id);
        alert('Data berhasil dihapus');
        loadEntries();
      } catch (error) {
        console.error(error);
        alert('Gagal menghapus data');
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper to get Head of Family name safely
  const getHeadName = (entry: any) => {
    if (entry.family_members && entry.family_members.length > 0) {
      const firstMember = entry.family_members[0];
      if (firstMember.head_of_family) return firstMember.head_of_family;
    }
    return '(Data KK Kosong)';
  };

  const getKKNumber = (entry: any) => {
    if (entry.family_members && entry.family_members.length > 0) {
      const firstMember = entry.family_members[0];
      if (!firstMember.kk_number) return '(No KK Kosong)';
      return firstMember.kk_number;
    }
    return '(Data KK Kosong)';
  };

  // Filter & Sort Logic
  const filteredEntries = entries.filter(entry => {
    // Search by Head Name, KK, or Address
    const searchLower = searchTerm.toLowerCase();
    const headName = getHeadName(entry).toLowerCase();
    const address = (entry.address || '').toLowerCase();
    const kkNumber = entry.family_members?.[0]?.kk_number || '';
    
    const matchesSearch = 
      headName.includes(searchLower) || 
      address.includes(searchLower) ||
      kkNumber.includes(searchLower);

    // Filter by Kelurahan
    const matchesKel = kelFilter ? String(entry.kelurahan_id) === kelFilter : true;

    // Filter by RW
    const matchesRw = rwFilter ? String(entry.rw_id) === rwFilter : true;
    
    // Filter by RT
    const matchesRt = rtFilter ? String(entry.rt_id) === rtFilter : true;

    // Filter by Kader (Admin only)
    const matchesKader = kaderFilter ? entry.user_id === kaderFilter : true;

    return matchesSearch && matchesKel && matchesRw && matchesRt && matchesKader;
  }).sort((a, b) => {
    // 1. Nama Kader
    const kaderA = a.kader?.name || '';
    const kaderB = b.kader?.name || '';
    const kaderComp = kaderA.localeCompare(kaderB);
    if (kaderComp !== 0) return kaderComp;

    // 2. Tanggal Input (Descending - Newest first)
    const dateA = a.date_entry || '';
    const dateB = b.date_entry || '';
    const dateComp = dateB.localeCompare(dateA);
    if (dateComp !== 0) return dateComp;

    // 3. Kelurahan
    const kelA = a.kelurahan?.name || '';
    const kelB = b.kelurahan?.name || '';
    const kelComp = kelA.localeCompare(kelB);
    if (kelComp !== 0) return kelComp;

    // 4. RW (Numeric)
    const rwA = a.rw?.name || '';
    const rwB = b.rw?.name || '';
    const rwComp = rwA.localeCompare(rwB, undefined, { numeric: true });
    if (rwComp !== 0) return rwComp;

    // 5. RT (Numeric)
    const rtA = a.rt?.name || '';
    const rtB = b.rt?.name || '';
    const rtComp = rtA.localeCompare(rtB, undefined, { numeric: true });
    return rtComp;
  });

  // Extract Unique Filters
  const uniqueRWs = Array.from(new Set(entries.map(e => e.rw?.name)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const uniqueRTs = Array.from(new Set(entries.map(e => e.rt?.name)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const uniqueKaders = Array.from(new Map(entries.map(e => [e.user_id, e.kader?.name])).entries())
    .filter(([id, name]) => id && name)
    .sort((a, b) => a[1].localeCompare(b[1]));

  const uniqueKelurahans = Array.from(new Map(entries.map(e => [e.kelurahan_id, e.kelurahan?.name])).entries())
    .filter(([id, name]) => id && name)
    .sort((a, b) => a[1].localeCompare(b[1]));

  // HOUSE NUMBERING & GROUPING LOGIC (No Urut Rumah per RT)
  // Group entries by House (Kelurahan + RW + RT + Address) to handle multiple KKs per house
  const entriesWithHouseNumber = (() => {
    const houseMap = new Map(); // RTKey -> [Address1, Address2, ...]
    const houseStats = new Map(); // HouseKey -> { sequenceNo, totalKK }
    
    return filteredEntries.map((entry) => {
      const rtKey = `${entry.kelurahan_id}-${entry.rw_id}-${entry.rt_id}`;
      const addressKey = (entry.address || '').toLowerCase().trim();
      const houseKey = `${rtKey}-${addressKey}`;

      if (!houseMap.has(rtKey)) {
        houseMap.set(rtKey, []);
      }
      
      const housesInRT = houseMap.get(rtKey);
      let sequenceNo;
      
      if (!housesInRT.includes(addressKey)) {
        housesInRT.push(addressKey);
        sequenceNo = housesInRT.length;
      } else {
        sequenceNo = housesInRT.indexOf(addressKey) + 1;
      }

      // Calculate Total KK for this house (sum of family_members across all entries with same address)
       // Use the full 'entries' list to get the absolute total, not just the filtered one
       const sameHouseEntries = entries.filter(e => 
         String(e.kelurahan_id) === String(entry.kelurahan_id) && 
         String(e.rw_id) === String(entry.rw_id) &&
         String(e.rt_id) === String(entry.rt_id) &&
         (e.address || '').toLowerCase().trim() === addressKey
       );
      
      const totalKK = sameHouseEntries.reduce((sum, e) => {
        // Count family_members length, but minimum 1 if entry exists (as per user request)
        const count = e.family_members && e.family_members.length > 0 ? e.family_members.length : 1;
        return sum + count;
      }, 0);

      return { 
        ...entry, 
        house_sequence_no: sequenceNo,
        total_families_in_house: totalKK
      };
    });
  })();

  const handleExport = () => {
    if (entriesWithHouseNumber.length === 0) {
      alert('Tidak ada data untuk di-export');
      return;
    }

    // Format Data for Excel - LENGKAP dengan semua field
    const dataToExport = entriesWithHouseNumber.map((e, index) => ({
      'No': index + 1,
      'Tanggal Survey': e.date_entry,
      'Input Oleh': e.kader?.name || 'Unknown',
      'No. Rumah': e.house_sequence_no,
      'No. KK': getKKNumber(e),
      'Kepala Keluarga': getHeadName(e),
      'Jumlah Keluarga': e.total_families_in_house || 0,
      'Alamat': e.address,
      'Kelurahan': e.kelurahan?.name || '',
      'RW': e.rw?.name || '',
      'RT': e.rt?.name || '',
      'Total Jiwa': e.total_souls || 0,
      'Jiwa Menetap': e.permanent_souls || 0,
      'Jumlah Jamban': e.latrine_count || 0,
      
      // Pilar 1 - Jamban
      'BAB di Jamban': e.jamban_bab_jamban ? 'Ya' : 'Tidak',
      'Jamban Milik Sendiri': e.jamban_milik_sendiri ? 'Ya' : 'Tidak',
      'Kloset Leher Angsa': e.jamban_leher_angsa ? 'Ya' : 'Tidak',
      'Septik Disedot 3-5 Thn': e.jamban_septik_aman ? 'Ya' : 'Tidak',
      'Septik Tidak Disedot': e.jamban_septik_tidak_sedot ? 'Ya' : 'Tidak',
      'Cubluk/Lubang Tanah': e.jamban_cubluk ? 'Ya' : 'Tidak',
      'Buang ke Drainase': e.jamban_dibuang_drainase ? 'Ya' : 'Tidak',
      'JAMBAN SEHAT': (e.jamban_leher_angsa && (e.jamban_septik_aman || e.jamban_septik_tidak_sedot)) ? 'Ya' : 'Tidak',
      
      // Pilar 2 - CTPS
      'Sarana CTPS': e.ctps_sarana ? 'Ya' : 'Tidak',
      'Air Mengalir': e.ctps_air_mengalir ? 'Ya' : 'Tidak',
      'Sabun Tersedia': e.ctps_sabun ? 'Ya' : 'Tidak',
      'Mampu Praktek CTPS': e.ctps_mampu_praktek ? 'Ya' : 'Tidak',
      'CTPS Sebelum Makan': e.ctps_sebelum_makan ? 'Ya' : 'Tidak',
      'CTPS Sebelum Olah Makan': e.ctps_sebelum_olah_makan ? 'Ya' : 'Tidak',
      'CTPS Sebelum Susui': e.ctps_sebelum_susui ? 'Ya' : 'Tidak',
      'CTPS Setelah BAB': e.ctps_setelah_bab ? 'Ya' : 'Tidak',
      'CTPS MEMENUHI': (e.ctps_sarana && e.ctps_air_mengalir && e.ctps_sabun) ? 'Ya' : 'Tidak',
      
      // Pilar 3 - Air Minum
      'Air Perpipaan': e.air_layak_perpipaan ? 'Ya' : 'Tidak',
      'Kran Umum': e.air_layak_kran_umum ? 'Ya' : 'Tidak',
      'Sumur Gali Terlindung': e.air_layak_sg_terlindung ? 'Ya' : 'Tidak',
      'SGL (Pompa)': e.air_layak_sgl ? 'Ya' : 'Tidak',
      'SPL (Bor)': e.air_layak_spl ? 'Ya' : 'Tidak',
      'Mata Air Terlindung': e.air_layak_mata_air ? 'Ya' : 'Tidak',
      'Air Hujan': e.air_layak_hujan ? 'Ya' : 'Tidak',
      'Air Tidak Layak Sungai': e.air_tidak_layak_sungai ? 'Ya' : 'Tidak',
      'Air Tidak Layak Danau': e.air_tidak_layak_danau ? 'Ya' : 'Tidak',
      'Air Diolah': e.olah_air_proses ? 'Ya' : 'Tidak',
      'Air Disimpan Tertutup': e.olah_air_simpan_tutup ? 'Ya' : 'Tidak',
      'AIR LAYAK': (e.air_layak_perpipaan || e.air_layak_kran_umum || e.air_layak_sg_terlindung || e.air_layak_mata_air) ? 'Ya' : 'Tidak',
      
      // Pangan
      'Makanan Tertutup': e.pangan_tutup ? 'Ya' : 'Tidak',
      'Pisah dari B3': e.pangan_pisah_b3 ? 'Ya' : 'Tidak',
      '5 Kunci Pangan': e.pangan_5_kunci ? 'Ya' : 'Tidak',
      
      // Pilar 4 - Sampah
      'Sampah Tidak Serak': e.sampah_tidak_serak ? 'Ya' : 'Tidak',
      'Tempat Sampah Tertutup': e.sampah_tutup_kuat ? 'Ya' : 'Tidak',
      'Sampah Diolah Aman': e.sampah_olah_aman ? 'Ya' : 'Tidak',
      'Sampah Dipilah': e.sampah_pilah ? 'Ya' : 'Tidak',
      'SAMPAH AMAN': (e.sampah_tidak_serak && e.sampah_olah_aman) ? 'Ya' : 'Tidak',
      
      // Pilar 5 - Limbah
      'Tidak Ada Genangan': e.limbah_tidak_genang ? 'Ya' : 'Tidak',
      'Saluran Kedap': e.limbah_saluran_kedap ? 'Ya' : 'Tidak',
      'Resapan/IPAL': e.limbah_resapan_ipal ? 'Ya' : 'Tidak',
      'LIMBAH AMAN': (e.limbah_tidak_genang && e.limbah_saluran_kedap) ? 'Ya' : 'Tidak',
      
      // PKURT
      'Jendela Kamar Dibuka': e.pkurt_jendela_kamar ? 'Ya' : 'Tidak',
      'Jendela Keluarga Dibuka': e.pkurt_jendela_keluarga ? 'Ya' : 'Tidak',
      'Ventilasi Ada': e.pkurt_ventilasi ? 'Ya' : 'Tidak',
      'Lubang Asap Dapur': e.pkurt_lubang_asap ? 'Ya' : 'Tidak',
      'Cahaya Alami': e.pkurt_cahaya_alami ? 'Ya' : 'Tidak',
      'Tidak Merokok di Rumah': e.pkurt_tidak_merokok ? 'Ya' : 'Tidak',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Set column widths
    const colWidths = [
      { wch: 5 },   // No
      { wch: 12 },  // Tanggal
      { wch: 20 },  // Kader
      { wch: 10 },  // Serial
      { wch: 18 },  // No KK
      { wch: 25 },  // Kepala Keluarga
      { wch: 30 },  // Alamat
      { wch: 15 },  // Kelurahan
      { wch: 8 },   // RW
      { wch: 8 },   // RT
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Survey STBM");
    
    const fileName = `Sigesit_Export_${new Date().toISOString().split('T')[0]}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    alert(`Data berhasil di-export!\n\nFile: ${fileName}\nTotal: ${dataToExport.length} data`);
  };

  return (
    <div className="space-y-6 pb-24 px-1">
      {/* Header & Stats Card */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-blue-50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Monitoring Entry</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                 {entries.length} Data {isAdmin ? 'Total' : 'Tersimpan'}
               </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setLoading(true);
                loadEntries();
              }}
              className="flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all font-black text-xs shadow-sm border border-blue-100 group"
              title="Refresh & Sort Data"
            >
              <RefreshCw size={18} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
              <span className="hidden sm:inline">REFRESH</span>
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black text-xs shadow-sm border border-emerald-100 group"
              title="Export Excel"
            >
              <Download size={18} />
              <span className="hidden sm:inline">EXPORT</span>
            </button>
            <Link to="/entry/new" className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-cyan-600 transition-all active:scale-95">
              <Plus size={20} strokeWidth={3} />
              <span className="font-black text-sm uppercase tracking-wide">Baru</span>
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-4 relative z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
            <input 
              type="text" 
              placeholder="Cari Nama Kepala Keluarga / Alamat..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium shadow-inner bg-slate-50/30"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative group">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center pointer-events-none group-focus-within:bg-purple-600 group-focus-within:text-white transition-colors">
                  <Filter size={14} className="text-purple-500 group-focus-within:text-white" />
               </div>
               <select 
                 value={kelFilter}
                 onChange={(e) => setKelFilter(e.target.value)}
                 className="w-full pl-14 pr-4 py-3 border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-700 appearance-none bg-white focus:border-purple-500 transition-all shadow-sm"
               >
                 <option value="">SEMUA KELURAHAN</option>
                 {uniqueKelurahans.map(([id, name]) => (
                   <option key={id} value={String(id)}>{name}</option>
                 ))}
               </select>
            </div>
            <div className="relative group">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center pointer-events-none group-focus-within:bg-blue-600 group-focus-within:text-white transition-colors">
                  <Filter size={14} className="text-blue-500 group-focus-within:text-white" />
               </div>
               <select 
                 value={rwFilter}
                 onChange={(e) => setRwFilter(e.target.value)}
                 className="w-full pl-14 pr-4 py-3 border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-700 appearance-none bg-white focus:border-blue-500 transition-all shadow-sm"
               >
                 <option value="">SEMUA RW</option>
                 {uniqueRWs.map(rw => {
                   const id = entries.find(e => e.rw?.name === rw)?.rw_id;
                   return <option key={rw} value={String(id)}>RW {rw}</option>
                 })}
               </select>
            </div>
            <div className="relative group">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center pointer-events-none group-focus-within:bg-emerald-600 group-focus-within:text-white transition-colors">
                  <Filter size={14} className="text-emerald-500 group-focus-within:text-white" />
               </div>
               <select 
                 value={rtFilter}
                 onChange={(e) => setRtFilter(e.target.value)}
                 className="w-full pl-14 pr-4 py-3 border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-700 appearance-none bg-white focus:border-emerald-500 transition-all shadow-sm"
               >
                 <option value="">SEMUA RT</option>
                 {uniqueRTs.map(rt => {
                   const id = entries.find(e => e.rt?.name === rt)?.rt_id;
                   return <option key={rt} value={String(id)}>RT {rt}</option>
                 })}
               </select>
            </div>
            {isAdmin && (
              <div className="relative group">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center pointer-events-none group-focus-within:bg-orange-600 group-focus-within:text-white transition-colors">
                    <User size={14} className="text-orange-500 group-focus-within:text-white" />
                 </div>
                 <select 
                   value={kaderFilter}
                   onChange={(e) => setKaderFilter(e.target.value)}
                   className="w-full pl-14 pr-4 py-3 border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-700 appearance-none bg-white focus:border-orange-500 transition-all shadow-sm"
                 >
                   <option value="">SEMUA KADER</option>
                   {uniqueKaders.map(([id, name]) => (
                     <option key={id} value={id}>{name}</option>
                   ))}
                 </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="bg-blue-50/50 p-4 rounded-2xl mb-4 border border-blue-100 flex items-start gap-3">
         <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Edit size={16} />
         </div>
         <p className="text-[11px] font-medium text-blue-800 leading-relaxed">
            <span className="font-black">TIPS:</span> Untuk mengubah atau mengupdate data yang sudah di-entry, silakan cari data di bawah ini lalu klik tombol <span className="font-black uppercase text-blue-600">Edit</span> yang ada di sebelah kanan kartu data.
         </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
           <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Memuat Data...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
            <FileText size={48} className="text-slate-300" />
          </div>
          <h3 className="text-slate-800 font-black text-lg mb-2 uppercase">Data Tidak Ditemukan</h3>
          <p className="text-slate-400 text-sm max-w-[200px] mx-auto leading-relaxed">
            {searchTerm || rwFilter || rtFilter ? 'Coba ubah kata kunci atau filter Anda.' : 'Ayo mulai survey pertama Anda hari ini!'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 pb-10">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="p-4 border-b border-slate-200">Kader / Tgl</th>
                <th className="p-4 border-b border-slate-200">Kelurahan</th>
                <th className="p-4 border-b border-slate-200">No. Rumah / KK</th>
                <th className="p-4 border-b border-slate-200">Kepala Keluarga</th>
                <th className="p-4 border-b border-slate-200 text-center">Jml Keluarga</th>
                <th className="p-4 border-b border-slate-200">RT/RW</th>
                <th className="p-4 border-b border-slate-200 text-center">Jiwa / Menetap</th>
                <th className="p-4 border-b border-slate-200 text-center">Jamban</th>
                <th className="p-4 border-b border-slate-200 text-center">Status STBM</th>
                <th className="p-4 border-b border-slate-200 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {entriesWithHouseNumber.map((entry) => {
                const isJambanSehat = entry.jamban_leher_angsa && (entry.jamban_septik_aman || entry.jamban_septik_tidak_sedot);
                const isAirLayak = entry.air_layak_perpipaan || entry.air_layak_kran_umum || entry.air_layak_sg_terlindung || 
                                 entry.air_layak_sgl || entry.air_layak_spl || entry.air_layak_mata_air || entry.air_layak_hujan;
                
                return (
                  <tr key={entry.id} className="bg-white hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 border-b border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800 uppercase">{entry.kader?.name || 'Unknown'}</span>
                        <span className="text-[9px] font-bold text-slate-400">{entry.date_entry}</span>
                      </div>
                    </td>
                    <td className="p-4 border-b border-slate-100">
                      <span className="text-[10px] font-black text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {entry.kelurahan?.name || '-'}
                      </span>
                    </td>
                    <td className="p-4 border-b border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 inline-block w-fit mb-1">
                          No. Rumah: {entry.house_sequence_no}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {getKKNumber(entry)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 border-b border-slate-100">
                      <div className="flex flex-col max-w-[150px]">
                        <span className="text-sm font-black text-slate-800 truncate uppercase">{getHeadName(entry)}</span>
                        <span className="text-[10px] text-slate-400 truncate font-medium italic">{entry.address || 'Tanpa Alamat'}</span>
                      </div>
                    </td>
                    <td className="p-4 border-b border-slate-100 text-center">
                       <span className="text-sm font-black text-blue-600">{entry.total_families_in_house || 0}</span>
                    </td>
                    <td className="p-4 border-b border-slate-100">
                       <div className="flex gap-1">
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">RT {entry.rt?.name}</span>
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">RW {entry.rw?.name}</span>
                       </div>
                    </td>
                    <td className="p-4 border-b border-slate-100 text-center">
                       <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-indigo-600">{entry.total_souls || 0}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">({entry.permanent_souls || 0} Menetap)</span>
                       </div>
                    </td>
                    <td className="p-4 border-b border-slate-100 text-center">
                       <span className="text-sm font-black text-emerald-600">{entry.latrine_count || 0}</span>
                    </td>
                    <td className="p-4 border-b border-slate-100 text-center">
                       <div className="flex flex-col items-center gap-1">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase border ${isJambanSehat ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                             {isJambanSehat ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                             Jamban
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase border ${isAirLayak ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                             {isAirLayak ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                             Air Layak
                          </div>
                       </div>
                    </td>
                    <td className="p-4 border-b border-slate-100 text-right">
                       <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => navigate(`/entry/edit/${entry.id}`)}
                            className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-90"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(entry.id, getHeadName(entry))}
                            className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-[10px] text-slate-400 font-bold italic text-center uppercase tracking-widest">* Geser tabel ke samping untuk melihat detail lengkap</p>
        </div>
      )}
    </div>
  );
}
