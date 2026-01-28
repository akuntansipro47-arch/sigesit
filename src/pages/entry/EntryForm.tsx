import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createEntry, createFamilyMembers, getEntry, updateEntry, updateFamilyMembers, checkDuplicateKK } from '@/lib/api';
import { saveToOfflineQueue } from '@/lib/offline';
import { Plus, Save, ArrowLeft, X, Check, Home, Trash2 } from 'lucide-react';

// --- Sub Components (Moved outside to prevent re-renders) ---
// QuestionRow is kept memoized as it works fine
const QuestionRow = React.memo(({ name, label, checked, onChange, disabled }: { name: string, label: string, checked: boolean, onChange: (name: string, value: boolean) => void, disabled?: boolean }) => {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded transition-colors ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
      <span className="text-sm text-gray-700 font-medium flex-1 pr-4">{label}</span>
      <div className="flex items-center gap-4">
         {/* Option YA */}
         <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded border ${checked ? 'bg-green-50 border-green-200 text-green-700' : 'border-transparent text-gray-400'}`}>
           <input 
             type="radio" 
             name={name} 
             checked={checked} 
             onChange={() => !disabled && onChange(name, true)}
             className="hidden" 
             disabled={disabled}
           />
           <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${checked ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
              {checked && <Check size={10} className="text-white" />}
           </div>
           <span className="text-xs font-bold">YA</span>
         </label>

         {/* Option TIDAK */}
         <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded border ${!checked ? 'bg-red-50 border-red-200 text-red-700' : 'border-transparent text-gray-400'}`}>
           <input 
             type="radio" 
             name={name} 
             checked={!checked} 
             onChange={() => !disabled && onChange(name, false)}
             className="hidden" 
             disabled={disabled}
           />
           <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!checked ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
              {!checked && <X size={10} className="text-white" />}
           </div>
           <span className="text-xs font-bold">TIDAK</span>
         </label>
      </div>
    </div>
  );
});

// Removed unused components
// const TextInput = ...
// const TextAreaInput = ...

export default function EntryForm() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // For Edit Mode
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Removed unused state
  // const [rws, setRws] = useState<RW[]>([]);
  // const [rts, setRts] = useState<RT[]>([]);

  // Form State
  const [formData, setFormData] = useState<any>({
    date_entry: new Date().toISOString().split('T')[0],
    address: '',
    rw_id: '',
    rt_id: '',
    latitude: '',
    longitude: '',
    
    // Jamban
    jamban_bab_jamban: false,
    jamban_milik_sendiri: false,
    jamban_septik_aman: false,
    jamban_septik_tidak_sedot: false,
    jamban_cubluk: false,
    jamban_dibuang_drainase: false,
    jamban_leher_angsa: false,

    // CTPS
    ctps_sarana: false,
    ctps_air_mengalir: false,
    ctps_sabun: false,
    ctps_mampu_praktek: false,
    ctps_tahu_waktu_kritis: false,
    ctps_sebelum_makan: false,
    ctps_sebelum_olah_makan: false,
    ctps_sebelum_susui: false,
    ctps_setelah_bab: false,

    // Air Layak
    air_layak_perpipaan: false,
    air_layak_kran_umum: false,
    air_layak_sg_terlindung: false,
    air_layak_sgl: false,
    air_layak_spl: false,
    air_layak_mata_air: false,
    air_layak_hujan: false,

    // Air Tidak Layak
    air_tidak_layak_sungai: false,
    air_tidak_layak_danau: false,
    air_tidak_layak_waduk: false,
    air_tidak_layak_kolam: false,
    air_tidak_layak_irigasi: false,

    // Olah Air
    olah_air_proses: false,
    olah_air_keruh: false,
    olah_air_simpan_tutup: false,

    // Pangan
    pangan_tutup: false,
    pangan_pisah_b3: false,
    pangan_5_kunci: false,

    // Pilar 4
    sampah_tidak_serak: false,
    sampah_tutup_kuat: false,
    sampah_olah_aman: false,
    sampah_pilah: false,

    // Pilar 5
    limbah_tidak_genang: false,
    limbah_saluran_kedap: false,
    limbah_resapan_ipal: false,

    // PKURT
    pkurt_jendela_kamar: false,
    pkurt_jendela_keluarga: false,
    pkurt_ventilasi: false,
    pkurt_lubang_asap: false,
    pkurt_cahaya_alami: false,
    pkurt_tidak_merokok: false,
  });

  const [familyMembers, setFamilyMembers] = useState<any[]>([
    { kk_number: '', head_of_family: '', total_souls: '', permanent_souls: '', latrine_count: '', no_kk_card: false }
  ]);

  // Load Data for Editing
  useEffect(() => {
    if (id) {
      setIsEditing(true);
      setLoading(true);
      getEntry(id)
        .then(data => {
          setFormData((prev: any) => ({
            ...prev,
            ...data,
            rw_id: String(data.rw_id),
            rt_id: String(data.rt_id),
          }));
          
          if (data.family_members && data.family_members.length > 0) {
            setFamilyMembers(data.family_members);
          }
          
          // Trigger fetch RTs - removed as we use manual input
          /*
          if (data.rw_id) {
            getRTs(Number(data.rw_id)).then(setRts);
          }
          */
        })
        .catch(err => {
          console.error(err);
          alert('Gagal memuat data');
          navigate('/entry');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  // Removed unused useEffects for RT/RW fetching since we use manual input now
  /*
  useEffect(() => {
    if (profile?.kelurahan_id) {
      getRWs(profile.kelurahan_id).then(setRws);
    }
  }, [profile]);
  
  useEffect(() => {
    if (profile?.rw_id && !isEditing) {
      setFormData((prev: any) => ({ ...prev, rw_id: String(profile.rw_id) }));
      getRTs(profile.rw_id).then(setRts);
    } else if (formData.rw_id && !isEditing) {
      getRTs(Number(formData.rw_id)).then(setRts);
    }
  }, [profile, formData.rw_id, isEditing]);
  */

  // No-op useEffect removed
  
  // Optimized Input Component using Refs for parent communication
  // const handleInputChange = ...

  // Optimized Input Component using Refs for parent communication
  // This bypasses React's render cycle for keystrokes
  const UncontrolledInput = ({ label, name, defaultValue, onChange, type = "text", className, autoComplete = "off", ...props }: any) => {
    return (
      <div className="w-full">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
        <input
          key={`${name}-${defaultValue}`} // Key ensures it re-renders when defaultValue (e.g. from API) changes
          type={type}
          name={name}
          defaultValue={defaultValue}
          onBlur={(e) => onChange(name, e.target.value)}
          autoComplete={autoComplete}
          className={`w-full outline-none transition-all duration-200 ${className || 'border border-slate-200 rounded-xl p-3 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
          {...props}
        />
      </div>
    );
  };

  const UncontrolledTextArea = ({ label, name, defaultValue, onChange, ...props }: any) => {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea
          name={name}
          defaultValue={defaultValue}
          onBlur={(e) => onChange(name, e.target.value)}
          className="w-full border rounded p-2"
          rows={2}
          {...props}
        />
      </div>
    );
  };
  
  // Callback for updating main state only on Blur
  const handleFieldUpdate = useCallback((name: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  }, []);
  
  const handleBooleanChange = useCallback((name: string, value: boolean) => {
    setFormData((prev: any) => {
      const newData = { ...prev, [name]: value };
      
      // Mutual Exclusion Logic for Jamban (A)
      const jambanExclusiveFields = ['jamban_septik_aman', 'jamban_septik_tidak_sedot', 'jamban_cubluk', 'jamban_dibuang_drainase'];
      if (value && jambanExclusiveFields.includes(name)) {
        jambanExclusiveFields.forEach(f => {
          if (f !== name) newData[f] = false;
        });
      }

      // Mutual Exclusion Logic for Water Source (C)
      const waterExclusiveFields = [
        'air_layak_perpipaan', 'air_layak_kran_umum', 'air_layak_sg_terlindung', 
        'air_layak_sgl', 'air_layak_spl', 'air_layak_mata_air', 'air_layak_hujan',
        'air_tidak_layak_sungai', 'air_tidak_layak_danau', 'air_tidak_layak_waduk', 
        'air_tidak_layak_kolam', 'air_tidak_layak_irigasi'
      ];
      if (value && waterExclusiveFields.includes(name)) {
        waterExclusiveFields.forEach(f => {
          if (f !== name) newData[f] = false;
        });
      }

      return newData;
    });
  }, []);

  // Handle Numeric Only for KK and Alpha only for Name
  const handleFamilyChange = useCallback((index: number, field: string, value: any) => {
    setFamilyMembers(prev => {
        const newMembers = [...prev];
        const member = { ...newMembers[index] };

        if (field === 'kk_number') {
            member.kk_number = value.replace(/\D/g, '').slice(0, 16);
        } else if (field === 'head_of_family') {
            member.head_of_family = value.replace(/[^a-zA-Z\s\.\-\']/g, '');
        } else if (field === 'no_kk_card') {
            member.no_kk_card = value;
            if (value) {
                // Generate unique 16 digit KK
                const randomPart = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
                const timestampPart = Date.now().toString().slice(-6);
                member.kk_number = randomPart + timestampPart;
            } else {
                member.kk_number = '';
            }
        } else {
            member[field] = value;
        }

        newMembers[index] = member;
        return newMembers;
    });
  }, []);

  const addFamilyMember = () => {
    if (familyMembers.length < 20) {
      setFamilyMembers([...familyMembers, { kk_number: '', head_of_family: '', total_souls: '', permanent_souls: '', latrine_count: '', no_kk_card: false }]);
    }
  };

  const removeFamilyMember = (index: number) => {
    if (familyMembers.length > 1) {
      const newMembers = [...familyMembers];
      newMembers.splice(index, 1);
      setFamilyMembers(newMembers);
    }
  };

  // Removed Geolocation Logic completely as per user request to simplify form
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      // 1. Validation: Check duplicate KK in current form
      const kkNumbers = familyMembers.map(m => m.kk_number).filter(Boolean);
      const uniqueKKs = new Set(kkNumbers);
      if (kkNumbers.length !== uniqueKKs.size) {
        throw new Error('Ada nomor KK yang sama dalam satu form input. Silakan periksa kembali.');
      }

      // 2. Validation: Check duplicate KK in Database
      for (const member of familyMembers) {
        if (member.kk_number && !member.no_kk_card) {
          const isDuplicate = await checkDuplicateKK(member.kk_number, id);
          if (isDuplicate) {
            throw new Error(`Nomor KK ${member.kk_number} sudah pernah ter-entry sebelumnya di sistem.`);
          }
        }
      }

      // 3. Calculate Totals for the house
      const totalSouls = familyMembers.reduce((acc, m) => acc + Number(m.total_souls || 0), 0);
      const permanentSouls = familyMembers.reduce((acc, m) => acc + Number(m.permanent_souls || 0), 0);
      const latrineCount = familyMembers.reduce((acc, m) => acc + Number(m.latrine_count || 0), 0);

      // Prepare Data
      const entryData: any = {
        ...formData,
        user_id: profile.id,
        kelurahan_id: profile.kelurahan_id,
        total_souls: totalSouls,
        permanent_souls: permanentSouls,
        latrine_count: latrineCount,
        // Don't cast to Number here! Let api.ts handle UUID strings or numeric name strings.
        // Casting to Number will turn UUIDs into NaN and empty strings into 0.
        rw_id: formData.rw_id,
        rt_id: formData.rt_id,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
      };

      const membersData = familyMembers.map(m => ({
        kk_number: m.kk_number,
        head_of_family: m.head_of_family,
        total_souls: Number(m.total_souls || 0),
        permanent_souls: Number(m.permanent_souls || 0),
        latrine_count: Number(m.latrine_count || 0),
        is_auto_generated: !!m.no_kk_card
      }));

      if (isEditing && id) {
        // Update Mode
         await updateEntry(id, entryData);
         await updateFamilyMembers(id, membersData);
         alert('Data berhasil diperbarui!');
      } else {
        // Create Mode
        if (!navigator.onLine) {
            await saveToOfflineQueue({ entryData, membersData });
            alert('Anda sedang offline. Data disimpan di perangkat dan akan dikirim saat online.');
        } else {
            const newEntry = await createEntry(entryData);
            if (newEntry) {
                const membersWithId = membersData.map(m => ({ ...m, entry_id: newEntry.id }));
                await createFamilyMembers(membersWithId);
            }
            alert('Data berhasil disimpan!');
        }
      }
      navigate('/entry');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  // Optimize text inputs to prevent re-render lag
  // const FastInput = ... (Removed, using direct input with better state management)
  
  return (
    <div className="pb-24 bg-gradient-to-b from-blue-50/50 to-white min-h-screen">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/80 backdrop-blur-md py-4 z-20 px-4 shadow-sm border-b border-blue-100 gap-2">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => navigate('/entry')} className="p-2.5 hover:bg-blue-50 text-blue-600 rounded-2xl bg-white shadow-sm border border-blue-100 transition-all active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 leading-tight tracking-tight">{isEditing ? 'Edit Data' : 'Input Survey'}</h2>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[9px] text-blue-700 font-black bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-widest">v4.2 Premium</span>
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/entry')} className="p-2.5 hover:bg-emerald-600 hover:text-white rounded-2xl bg-white text-emerald-600 border border-emerald-100 shadow-sm flex items-center gap-2 transition-all font-bold text-xs" title="Kembali ke Daftar">
             <Home size={18} />
             <span className="hidden sm:inline">Monitoring Entry</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 px-4 max-w-3xl mx-auto">
        
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-blue-50 mb-4 hover:shadow-md transition-all duration-300">
          <h3 className="font-black text-blue-600 pb-3 mb-5 border-b border-blue-50 uppercase tracking-widest text-xs flex items-center gap-3">
            <span className="w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xs shadow-lg shadow-blue-200">1</span>
            Data Umum
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UncontrolledInput 
                label="Tanggal Survey"
                type="date"
                name="date_entry"
                defaultValue={formData.date_entry}
                onChange={handleFieldUpdate}
                className="w-full border-blue-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl p-4 transition-all bg-slate-50/50 font-bold text-slate-700"
              />
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex flex-col justify-center">
                <label className="block text-[10px] font-black text-blue-400 uppercase tracking-wider mb-1">Petugas Lapangan</label>
                <div className="font-black text-slate-700 text-lg tracking-tight">{profile?.name || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Location & House */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-50 mb-4 hover:shadow-md transition-all duration-300">
          <h3 className="font-black text-emerald-600 pb-3 mb-5 border-b border-emerald-50 uppercase tracking-widest text-xs flex items-center gap-3">
            <span className="w-7 h-7 bg-emerald-500 text-white rounded-xl flex items-center justify-center text-xs shadow-lg shadow-emerald-200">2</span>
            Lokasi & Rumah
          </h3>
          <div className="space-y-5">
             <UncontrolledTextArea
               label="Alamat Lengkap"
               name="address"
               defaultValue={formData.address}
               onChange={handleFieldUpdate}
               required
               placeholder="Nama Jalan, No Rumah, Gang, dll"
               className="w-full border-emerald-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl p-4 transition-all bg-slate-50/50 font-bold text-slate-700"
             />
             
            <div className="grid grid-cols-2 gap-4">
              <UncontrolledInput 
                label="RW (Angka)"
                name="rw_id"
                defaultValue={formData.rw_id}
                onChange={handleFieldUpdate}
                type="text"
                inputMode="numeric"
                required
                placeholder="Contoh: 5"
                className="w-full border-2 border-emerald-200 focus:border-emerald-500 rounded-2xl p-4 text-center font-black text-2xl text-emerald-700 bg-emerald-50 shadow-inner"
              />
              <UncontrolledInput 
                label="RT (Angka)"
                name="rt_id"
                defaultValue={formData.rt_id}
                onChange={handleFieldUpdate}
                type="text"
                inputMode="numeric"
                required
                placeholder="Contoh: 5"
                className="w-full border-2 border-emerald-200 focus:border-emerald-500 rounded-2xl p-4 text-center font-black text-2xl text-emerald-700 bg-emerald-50 shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Family Members */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-amber-50 mb-4 hover:shadow-md transition-all duration-300">
          <h3 className="font-black text-amber-600 pb-3 mb-5 border-b border-amber-50 uppercase tracking-widest text-xs flex items-center gap-3">
            <span className="w-7 h-7 bg-amber-500 text-white rounded-xl flex items-center justify-center text-xs shadow-lg shadow-amber-200">3</span>
            Data Keluarga (KK) & Statistik
          </h3>
          <div className="space-y-6">
          {familyMembers.map((member, idx) => (
            <div key={idx} className="relative group animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col gap-4 p-5 bg-amber-50/30 rounded-[1.5rem] border border-amber-100/50 hover:bg-amber-50 transition-all duration-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black shadow-inner">{idx + 1}</span>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-sm">
                      <input
                        type="checkbox"
                        checked={!!member.no_kk_card}
                        onChange={(e) => handleFamilyChange(idx, 'no_kk_card', e.target.checked)}
                        className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Tidak Ada Kartu KK</span>
                    </label>
                  </div>
                  {familyMembers.length > 1 && (
                    <button type="button" onClick={() => removeFamilyMember(idx)} className="text-rose-400 p-2.5 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-all shadow-sm bg-white">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div>
                     <label className="block text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1.5">Nomor KK (16 Digit)</label>
                     <input
                       type="text"
                       value={member.kk_number}
                       onChange={(e) => handleFamilyChange(idx, 'kk_number', e.target.value)}
                       placeholder="0000 0000 0000 0000"
                       className={`w-full border-amber-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl p-4 text-sm font-mono tracking-widest bg-white shadow-inner ${member.no_kk_card ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                       required
                       maxLength={16}
                       inputMode="numeric"
                       readOnly={!!member.no_kk_card}
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1.5">Nama Kepala Keluarga</label>
                     <input
                       type="text"
                       value={member.head_of_family}
                       onChange={(e) => handleFamilyChange(idx, 'head_of_family', e.target.value)}
                       placeholder="NAMA LENGKAP"
                       className="w-full border-amber-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl p-4 text-sm font-black uppercase placeholder:normal-case bg-white shadow-inner"
                       required
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-3 gap-3 pt-2 border-t border-amber-100/50">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Jiwa</label>
                      <input 
                        type="number" 
                        value={member.total_souls} 
                        onChange={(e) => handleFamilyChange(idx, 'total_souls', e.target.value)}
                        className="w-full border-2 border-indigo-100 focus:border-indigo-500 rounded-xl p-3 text-center font-black text-lg text-indigo-700 bg-white shadow-inner"
                        required
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Menetap</label>
                      <input 
                        type="number" 
                        value={member.permanent_souls} 
                        onChange={(e) => handleFamilyChange(idx, 'permanent_souls', e.target.value)}
                        className="w-full border-2 border-indigo-100 focus:border-indigo-500 rounded-xl p-3 text-center font-black text-lg text-indigo-700 bg-white shadow-inner"
                        required
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Jamban</label>
                      <input 
                        type="number" 
                        value={member.latrine_count} 
                        onChange={(e) => handleFamilyChange(idx, 'latrine_count', e.target.value)}
                        className="w-full border-2 border-indigo-100 focus:border-indigo-500 rounded-xl p-3 text-center font-black text-lg text-indigo-700 bg-white shadow-inner"
                        required
                        placeholder="0"
                      />
                    </div>
                 </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addFamilyMember} className="w-full py-5 border-2 border-dashed border-amber-200 text-amber-600 text-sm font-black flex items-center justify-center gap-3 mt-3 rounded-2xl hover:bg-amber-50 hover:border-amber-400 transition-all group active:scale-[0.98]">
            <Plus size={22} className="group-hover:rotate-90 transition-transform" /> 
            TAMBAH KEPALA KELUARGA (KK)
          </button>
          </div>
        </div>

        {/* Survey Sections */}
        <div className="space-y-6">
          <SurveySection title="A. Akses Jamban (Stop BABS)" color="blue">
            <QuestionRow name="jamban_bab_jamban" label="Anggota keluarga buang air besar di jamban?" checked={!!formData.jamban_bab_jamban} onChange={handleBooleanChange} />
            <QuestionRow name="jamban_milik_sendiri" label="Apakah menggunakan jamban milik sendiri?" checked={!!formData.jamban_milik_sendiri} onChange={handleBooleanChange} />
            <QuestionRow name="jamban_leher_angsa" label="Apakah jenis kloset leher angsa?" checked={!!formData.jamban_leher_angsa} onChange={handleBooleanChange} />
            
            <div className="bg-blue-50/30 p-4 rounded-2xl mt-4 border border-blue-100/50">
              <p className="text-[9px] font-black text-blue-500 mb-3 uppercase tracking-widest">Detail Pembuangan Akhir (Pilih Salah Satu):</p>
              <QuestionRow 
                name="jamban_septik_aman" 
                label="Apakah tangki septik disedot setidaknya sekali dalam 3-5 tahun terakhir?" 
                checked={!!formData.jamban_septik_aman} 
                onChange={handleBooleanChange}
                disabled={formData.jamban_septik_tidak_sedot || formData.jamban_cubluk || formData.jamban_dibuang_drainase}
              />
              <QuestionRow 
                name="jamban_septik_tidak_sedot" 
                label="Apakah tangki septik tidak pernah disedot (>5 tahun)?" 
                checked={!!formData.jamban_septik_tidak_sedot} 
                onChange={handleBooleanChange}
                disabled={formData.jamban_septik_aman || formData.jamban_cubluk || formData.jamban_dibuang_drainase}
              />
              <QuestionRow 
                name="jamban_cubluk" 
                label="Apakah pembuangan akhir berupa cubluk/lubang tanah?" 
                checked={!!formData.jamban_cubluk} 
                onChange={handleBooleanChange}
                disabled={formData.jamban_septik_aman || formData.jamban_septik_tidak_sedot || formData.jamban_dibuang_drainase}
              />
              <QuestionRow 
                name="jamban_dibuang_drainase" 
                label="Apakah tinja dibuang langsung ke drainase/sungai/laut?" 
                checked={!!formData.jamban_dibuang_drainase} 
                onChange={handleBooleanChange}
                disabled={formData.jamban_septik_aman || formData.jamban_septik_tidak_sedot || formData.jamban_cubluk}
              />
            </div>
          </SurveySection>

          <SurveySection title="B. Cuci Tangan Pakai Sabun (CTPS)" color="cyan">
            <QuestionRow name="ctps_sarana" label="Apakah memiliki sarana cuci tangan (wastafel/ember kran)?" checked={!!formData.ctps_sarana} onChange={handleBooleanChange} />
            <QuestionRow name="ctps_air_mengalir" label="Apakah tersedia air mengalir pada sarana CTPS?" checked={!!formData.ctps_air_mengalir} onChange={handleBooleanChange} />
            <QuestionRow name="ctps_sabun" label="Apakah tersedia sabun cuci tangan?" checked={!!formData.ctps_sabun} onChange={handleBooleanChange} />
            <QuestionRow name="ctps_mampu_praktek" label="Apakah anggota keluarga mampu mempraktekkan cara cuci tangan yang benar?" checked={!!formData.ctps_mampu_praktek} onChange={handleBooleanChange} />
            
            <div className="bg-cyan-50/50 p-5 rounded-[1.5rem] mt-5 border border-cyan-100/50 shadow-inner">
              <p className="text-[10px] font-black text-cyan-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                 <Check size={14} /> Pengetahuan Waktu Kritis:
              </p>
              <div className="space-y-1">
                <QuestionRow name="ctps_sebelum_makan" label="Sebelum makan" checked={!!formData.ctps_sebelum_makan} onChange={handleBooleanChange} />
                <QuestionRow name="ctps_sebelum_olah_makan" label="Sebelum mengolah makanan" checked={!!formData.ctps_sebelum_olah_makan} onChange={handleBooleanChange} />
                <QuestionRow name="ctps_sebelum_susui" label="Sebelum menyusui/memberi makan bayi" checked={!!formData.ctps_sebelum_susui} onChange={handleBooleanChange} />
                <QuestionRow name="ctps_setelah_bab" label="Setelah BAB / Buang Air Kecil" checked={!!formData.ctps_setelah_bab} onChange={handleBooleanChange} />
              </div>
            </div>
          </SurveySection>

          <SurveySection title="C. Pengelolaan Air Minum & Makanan" color="teal">
            <p className="text-[10px] font-black text-teal-600 mb-3 mt-4 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full inline-block">Sumber Air Minum (Layak/Tidak Layak) - Pilih Salah Satu</p>
            
            {/* Helper function to check if any other water field is selected */}
            {(() => {
              const waterFields = [
                'air_layak_perpipaan', 'air_layak_kran_umum', 'air_layak_sg_terlindung', 
                'air_layak_sgl', 'air_layak_spl', 'air_layak_mata_air', 'air_layak_hujan',
                'air_tidak_layak_sungai', 'air_tidak_layak_danau', 'air_tidak_layak_waduk', 
                'air_tidak_layak_kolam', 'air_tidak_layak_irigasi'
              ];
              const isAnySelected = (current: string) => waterFields.some(f => f !== current && !!formData[f]);

              return (
                <>
                  <div className="space-y-1 mb-6">
                    <QuestionRow name="air_layak_perpipaan" label="Air Perpipaan (PDAM/Ledeng)" checked={!!formData.air_layak_perpipaan} onChange={handleBooleanChange} disabled={isAnySelected('air_layak_perpipaan')} />
                    <QuestionRow name="air_layak_kran_umum" label="Kran Umum" checked={!!formData.air_layak_kran_umum} onChange={handleBooleanChange} disabled={isAnySelected('air_layak_kran_umum')} />
                    <QuestionRow name="air_layak_sg_terlindung" label="Sumur Gali Terlindung" checked={!!formData.air_layak_sg_terlindung} onChange={handleBooleanChange} disabled={isAnySelected('air_layak_sg_terlindung')} />
                    <QuestionRow name="air_layak_sgl" label="Sumur Gali dengan Pompa (SGL)" checked={!!formData.air_layak_sgl} onChange={handleBooleanChange} disabled={isAnySelected('air_layak_sgl')} />
                    <QuestionRow name="air_layak_spl" label="Sumur Bor dengan Pompa (SPL)" checked={!!formData.air_layak_spl} onChange={handleBooleanChange} disabled={isAnySelected('air_layak_spl')} />
                    <QuestionRow name="air_layak_mata_air" label="Mata Air Terlindung" checked={!!formData.air_layak_mata_air} onChange={handleBooleanChange} disabled={isAnySelected('air_layak_mata_air')} />
                    <QuestionRow name="air_layak_hujan" label="Penampungan Air Hujan (PAH)" checked={!!formData.air_layak_hujan} onChange={handleBooleanChange} disabled={isAnySelected('air_layak_hujan')} />
                  </div>

                  <p className="text-[10px] font-black text-rose-500 mb-3 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full inline-block">Sumber Air Minum (Tidak Layak)</p>
                  <div className="space-y-1">
                    <QuestionRow name="air_tidak_layak_sungai" label="Sungai / Mata Air Tidak Terlindungi" checked={!!formData.air_tidak_layak_sungai} onChange={handleBooleanChange} disabled={isAnySelected('air_tidak_layak_sungai')} />
                    <QuestionRow name="air_tidak_layak_danau" label="Danau / Kolam / Sumur Gali Tidak Terlindungi" checked={!!formData.air_tidak_layak_danau} onChange={handleBooleanChange} disabled={isAnySelected('air_tidak_layak_danau')} />
                    <QuestionRow name="air_tidak_layak_waduk" label="Waduk" checked={!!formData.air_tidak_layak_waduk} onChange={handleBooleanChange} disabled={isAnySelected('air_tidak_layak_waduk')} />
                    <QuestionRow name="air_tidak_layak_irigasi" label="Saluran Irigasi" checked={!!formData.air_tidak_layak_irigasi} onChange={handleBooleanChange} disabled={isAnySelected('air_tidak_layak_irigasi')} />
                  </div>
                </>
              );
            })()}

            <p className="text-[10px] font-black text-teal-600 mb-3 mt-7 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full inline-block">Pengolahan di Rumah Tangga</p>
            <QuestionRow name="olah_air_proses" label="Apakah air minum melalui proses pengolahan?" checked={!!formData.olah_air_proses} onChange={handleBooleanChange} />
            <QuestionRow name="olah_air_keruh" label="Jika keruh, apakah dilakukan pengendapan?" checked={!!formData.olah_air_keruh} onChange={handleBooleanChange} />
            <QuestionRow name="olah_air_simpan_tutup" label="Apakah air minum disimpan wadah tertutup?" checked={!!formData.olah_air_simpan_tutup} onChange={handleBooleanChange} />
            
            <p className="text-[10px] font-black text-teal-600 mb-3 mt-7 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full inline-block">Pengelolaan Pangan</p>
            <QuestionRow name="pangan_tutup" label="Apakah makanan matang disimpan tertutup?" checked={!!formData.pangan_tutup} onChange={handleBooleanChange} />
            <QuestionRow name="pangan_pisah_b3" label="Apakah terpisah dari bahan berbahaya?" checked={!!formData.pangan_pisah_b3} onChange={handleBooleanChange} />
            <QuestionRow name="pangan_5_kunci" label="Apakah menerapkan 5 kunci keamanan pangan?" checked={!!formData.pangan_5_kunci} onChange={handleBooleanChange} />
          </SurveySection>

          <SurveySection title="D. Pengelolaan Sampah" color="orange">
            <QuestionRow name="sampah_tidak_serak" label="Apakah tidak ada sampah berserakan?" checked={!!formData.sampah_tidak_serak} onChange={handleBooleanChange} />
            <QuestionRow name="sampah_tutup_kuat" label="Apakah tempat sampah tertutup & kedap air?" checked={!!formData.sampah_tutup_kuat} onChange={handleBooleanChange} />
            <QuestionRow name="sampah_olah_aman" label="Apakah sampah diolah dengan aman?" checked={!!formData.sampah_olah_aman} onChange={handleBooleanChange} />
            <QuestionRow name="sampah_pilah" label="Apakah dilakukan pemilahan sampah?" checked={!!formData.sampah_pilah} onChange={handleBooleanChange} />
          </SurveySection>

          <SurveySection title="E. Pengelolaan Limbah Cair" color="indigo">
            <QuestionRow name="limbah_tidak_genang" label="Apakah tidak ada genangan limbah cair?" checked={!!formData.limbah_tidak_genang} onChange={handleBooleanChange} />
            <QuestionRow name="limbah_saluran_kedap" label="Apakah saluran pembuangan kedap air & tutup?" checked={!!formData.limbah_saluran_kedap} onChange={handleBooleanChange} />
            <QuestionRow name="limbah_resapan_ipal" label="Apakah terhubung resapan / IPAL?" checked={!!formData.limbah_resapan_ipal} onChange={handleBooleanChange} />
          </SurveySection>

          <SurveySection title="F. Kualitas Udara (PKURT)" color="purple">
            <QuestionRow name="pkurt_jendela_kamar" label="Jendela Kamar dibuka setiap hari?" checked={!!formData.pkurt_jendela_kamar} onChange={handleBooleanChange} />
            <QuestionRow name="pkurt_jendela_keluarga" label="Jendela Ruang Keluarga dibuka setiap hari?" checked={!!formData.pkurt_jendela_keluarga} onChange={handleBooleanChange} />
            <QuestionRow name="pkurt_ventilasi" label="Ada lubang ventilasi (jalusi/kasa nyamuk)?" checked={!!formData.pkurt_ventilasi} onChange={handleBooleanChange} />
            <QuestionRow name="pkurt_lubang_asap" label="Ada lubang asap dapur / cerobong asap?" checked={!!formData.pkurt_lubang_asap} onChange={handleBooleanChange} />
            <QuestionRow name="pkurt_cahaya_alami" label="Cahaya matahari masuk (terang siang hari)?" checked={!!formData.pkurt_cahaya_alami} onChange={handleBooleanChange} />
            <QuestionRow name="pkurt_tidak_merokok" label="Tidak ada yang merokok di dalam rumah?" checked={!!formData.pkurt_tidak_merokok} onChange={handleBooleanChange} />
          </SurveySection>
        </div>

        <div className="flex justify-center pt-10 pb-20">
          <button
            type="submit"
            disabled={loading}
            className="w-full max-w-md bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-400/40 hover:from-blue-700 hover:to-cyan-700 transition-all active:scale-95 flex items-center justify-center gap-4 border border-white/30"
          >
            {loading ? (
              <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={28} />
                {isEditing ? 'SIMPAN PERUBAHAN' : 'SIMPAN DATA SURVEY'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

// Helper Components for Cleaner Code
function SurveySection({ title, color, children }: { title: string, color: string, children: React.ReactNode }) {
  const colors: any = {
    blue: 'text-blue-600 border-blue-100 bg-white shadow-blue-100/20',
    emerald: 'text-emerald-600 border-emerald-100 bg-white shadow-emerald-100/20',
    amber: 'text-amber-600 border-amber-100 bg-white shadow-amber-100/20',
    indigo: 'text-indigo-600 border-indigo-100 bg-white shadow-indigo-100/20',
    purple: 'text-purple-600 border-purple-100 bg-white shadow-purple-100/20',
    cyan: 'text-cyan-600 border-cyan-100 bg-white shadow-cyan-100/20',
    teal: 'text-teal-600 border-teal-100 bg-white shadow-teal-100/20',
    orange: 'text-orange-600 border-orange-100 bg-white shadow-orange-100/20',
  };

  return (
    <div className={`p-6 rounded-[2rem] shadow-sm border ${colors[color].split(' ')[1]} mb-4 hover:shadow-lg transition-all duration-300 bg-white`}>
      <h3 className={`font-black ${colors[color].split(' ')[0]} pb-3 mb-5 border-b ${colors[color].split(' ')[1]} uppercase tracking-widest text-xs flex items-center gap-2`}>
        <div className={`w-2 h-2 rounded-full ${colors[color].split(' ')[0].replace('text-', 'bg-')}`}></div>
        {title}
      </h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
