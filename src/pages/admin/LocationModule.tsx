import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Kelurahan, RW, RT } from '@/types';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

export default function LocationModule() {
  const [kelurahans, setKelurahans] = useState<Kelurahan[]>([]);
  const [rws, setRws] = useState<RW[]>([]);
  const [rts, setRts] = useState<RT[]>([]);

  // Form States
  const [newKelurahan, setNewKelurahan] = useState('');
  const [editingKelurahanId, setEditingKelurahanId] = useState<number | null>(null);

  const [newRW, setNewRW] = useState({ name: '', kelurahan_id: '' });
  const [editingRWId, setEditingRWId] = useState<number | null>(null);

  const [newRT, setNewRT] = useState({ name: '', rw_id: '' });
  const [editingRTId, setEditingRTId] = useState<number | null>(null);


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: kData } = await supabase.from('kelurahan').select('*').order('name');
    const { data: rwData } = await supabase.from('rw').select('*, kelurahan(name)').order('name');
    const { data: rtData } = await supabase.from('rt').select('*, rw(name, kelurahan_id, kelurahan(name))').order('name');
    
    // Sort RWs: Primary by Kelurahan Name, Secondary by RW Name (Numeric)
    const sortedRWs = (rwData || []).sort((a, b) => {
      const kelA = (a as any).kelurahan?.name || '';
      const kelB = (b as any).kelurahan?.name || '';
      
      // 1. Compare Kelurahan Name
      const kelCompare = kelA.localeCompare(kelB);
      if (kelCompare !== 0) return kelCompare;
      
      // 2. Compare RW Name Numerically
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Sort RTs: Primary by Kelurahan, then RW, then RT (Numeric)
    const sortedRTs = (rtData || []).sort((a, b) => {
      const kelA = (a as any).rw?.kelurahan?.name || '';
      const kelB = (b as any).rw?.kelurahan?.name || '';
      const rwA = (a as any).rw?.name || '';
      const rwB = (b as any).rw?.name || '';
      
      // 1. Compare Kelurahan
      const kelCompare = kelA.localeCompare(kelB);
      if (kelCompare !== 0) return kelCompare;
      
      // 2. Compare RW (Numeric)
      const rwCompare = rwA.localeCompare(rwB, undefined, { numeric: true, sensitivity: 'base' });
      if (rwCompare !== 0) return rwCompare;
      
      // 3. Compare RT (Numeric)
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    setKelurahans(kData || []);
    setRws(sortedRWs);
    setRts(sortedRTs);
  };

  const addKelurahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelurahan) return;
    
    try {
        if (editingKelurahanId) {
            const { error } = await supabase.from('kelurahan').update({ name: newKelurahan }).eq('id', editingKelurahanId);
            if (error) throw error;
            alert('Kelurahan berhasil diupdate');
            setEditingKelurahanId(null);
        } else {
            const { error } = await supabase.from('kelurahan').insert({ name: newKelurahan });
            if (error) throw error;
            alert('Kelurahan berhasil ditambahkan');
        }
        
        setNewKelurahan('');
        fetchData();
    } catch (err: any) {
        console.error('Error operation kelurahan:', err);
        alert('Gagal: ' + err.message);
    }
  };

  const addRW = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRW.name || !newRW.kelurahan_id) return;

    try {
        if (editingRWId) {
            const { error } = await supabase.from('rw').update({ 
                name: newRW.name, 
                kelurahan_id: Number(newRW.kelurahan_id) 
            }).eq('id', editingRWId);
            if (error) throw error;
            alert('RW berhasil diupdate');
            setEditingRWId(null);
        } else {
            const { error } = await supabase.from('rw').insert({ 
                name: newRW.name, 
                kelurahan_id: Number(newRW.kelurahan_id) 
            });
            if (error) throw error;
            alert('RW berhasil ditambahkan');
        }
        setNewRW({ name: '', kelurahan_id: '' });
        fetchData();
    } catch (err: any) {
        console.error(err);
        alert('Gagal: ' + err.message);
    }
  };

  const addRT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRT.name || !newRT.rw_id) return;

    try {
        if (editingRTId) {
            const { error } = await supabase.from('rt').update({ 
                name: newRT.name, 
                rw_id: Number(newRT.rw_id) 
            }).eq('id', editingRTId);
            if (error) throw error;
            alert('RT berhasil diupdate');
            setEditingRTId(null);
        } else {
            const { error } = await supabase.from('rt').insert({ 
                name: newRT.name, 
                rw_id: Number(newRT.rw_id) 
            });
            if (error) throw error;
            alert('RT berhasil ditambahkan');
        }
        setNewRT({ name: '', rw_id: '' });
        fetchData();
    } catch (err: any) {
        console.error(err);
        alert('Gagal: ' + err.message);
    }
  };

  const deleteItem = async (table: string, id: number) => {
    if (confirm('Hapus data ini?')) {
      try {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
          fetchData();
      } catch (err: any) {
          console.error(err);
          if (err.code === '23503') {
              alert('TIDAK BISA DIHAPUS!\n\nData ini sedang digunakan di data Entry/Kader. Hapus data terkait terlebih dahulu jika ingin menghapus wilayah ini.');
          } else {
              alert('Gagal menghapus: ' + err.message);
          }
      }
    }
  };

  const cancelEdit = (type: 'kelurahan' | 'rw' | 'rt') => {
      if (type === 'kelurahan') {
          setEditingKelurahanId(null);
          setNewKelurahan('');
      } else if (type === 'rw') {
          setEditingRWId(null);
          setNewRW({ name: '', kelurahan_id: '' });
      } else if (type === 'rt') {
          setEditingRTId(null);
          setNewRT({ name: '', rw_id: '' });
      }
  };

  const startEdit = (type: 'kelurahan' | 'rw' | 'rt', item: any) => {
      if (type === 'kelurahan') {
          setEditingKelurahanId(item.id);
          setNewKelurahan(item.name);
      } else if (type === 'rw') {
          setEditingRWId(item.id);
          setNewRW({ name: item.name, kelurahan_id: String(item.kelurahan_id) });
      } else if (type === 'rt') {
          setEditingRTId(item.id);
          // Set Kelurahan filter first so RW list is available
          const kelId = (item as any).rw?.kelurahan_id;
          if (kelId) setSelectedKelurahanForRT(String(kelId));
          setNewRT({ name: item.name, rw_id: String(item.rw_id) });
      }
  };

  // Helper for RT filtering
  const [selectedKelurahanForRT, setSelectedKelurahanForRT] = useState('');

  const filteredRWsForRT = selectedKelurahanForRT 
    ? rws.filter(r => String(r.kelurahan_id) === selectedKelurahanForRT)
    : rws;

  // Helper for Professional Group Coloring (Distinct colors for better contrast)
  const getGroupColor = (id: number | string) => {
    const colors = [
      'bg-blue-50 border-blue-300 text-blue-900',      // 1. Blue
      'bg-rose-50 border-rose-300 text-rose-900',      // 2. Red/Rose
      'bg-emerald-50 border-emerald-300 text-emerald-900', // 3. Green
      'bg-amber-50 border-amber-300 text-amber-900',   // 4. Yellow/Amber
      'bg-purple-50 border-purple-300 text-purple-900', // 5. Purple
      'bg-orange-50 border-orange-300 text-orange-900', // 6. Orange
      'bg-cyan-50 border-cyan-300 text-cyan-900',      // 7. Sky Blue
      'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-900', // 8. Bright Pink
      'bg-lime-50 border-lime-300 text-lime-900',      // 9. Lime Green
      'bg-indigo-50 border-indigo-300 text-indigo-900', // 10. Deep Blue
      'bg-teal-50 border-teal-300 text-teal-900',      // 11. Teal
      'bg-slate-100 border-slate-300 text-slate-900',   // 12. Gray/Slate
    ];
    // Use a simple hash to ensure IDs that are close (like 1, 2, 3) get very different colors
    const idNum = Number(id);
    const index = (idNum * 7) % colors.length; // Multiply by 7 (prime) to jump across the color list
    return colors[index];
  };

  // Filtering logic for RW list
  const filteredRWs = newRW.kelurahan_id 
    ? rws.filter(r => String(r.kelurahan_id) === newRW.kelurahan_id)
    : rws;

  // Filtering logic for RT list
  const filteredRTs = rts.filter(rt => {
    const matchesKelurahan = selectedKelurahanForRT 
      ? String((rt as any).rw?.kelurahan_id) === selectedKelurahanForRT 
      : true;
    return matchesKelurahan;
  });

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-blue-200 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl"></div>
         <h2 className="text-3xl font-black tracking-tight relative z-10">Manajemen Wilayah</h2>
         <p className="text-blue-100/80 font-medium mt-1 relative z-10 italic">Kelola data Kelurahan, RW, dan RT secara terpusat.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kelurahan Section */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">1</div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Kelurahan</h3>
          </div>
          <form onSubmit={addKelurahan} className="space-y-3 mb-6">
            <input
              type="text"
              value={newKelurahan}
              onChange={(e) => setNewKelurahan(e.target.value.toUpperCase())}
              placeholder="NAMA KELURAHAN"
              className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
            />
            <div className="flex gap-2">
              <button type="submit" className={`flex-1 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 ${editingKelurahanId ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>
                {editingKelurahanId ? <Save size={18}/> : <Plus size={18}/>} 
                {editingKelurahanId ? 'Update' : 'Tambah'}
              </button>
              {editingKelurahanId && (
                  <button type="button" onClick={() => cancelEdit('kelurahan')} className="bg-slate-100 text-slate-500 px-4 py-4 rounded-2xl hover:bg-slate-200 transition-colors">
                      <X size={20} />
                  </button>
              )}
            </div>
          </form>
          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {kelurahans.length === 0 && <p className="text-slate-400 text-sm text-center py-10 italic">Belum ada data Kelurahan</p>}
            <ul className="space-y-3">
              {kelurahans.map(k => (
                <li key={k.id} className={`flex justify-between items-center border-2 p-4 rounded-2xl shadow-sm transition-transform hover:scale-[1.02] ${getGroupColor(k.id)}`}>
                  <span className="font-black tracking-tight">{k.name}</span>
                  <div className="flex gap-1.5">
                      <button onClick={() => startEdit('kelurahan', k)} className="bg-white/50 hover:bg-white p-2.5 rounded-xl transition-colors shadow-sm"><Edit size={16} className="text-orange-500"/></button>
                      <button onClick={() => deleteItem('kelurahan', k.id)} className="bg-white/50 hover:bg-white p-2.5 rounded-xl transition-colors shadow-sm"><Trash2 size={16} className="text-rose-500"/></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RW Section */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">2</div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Rukun Warga (RW)</h3>
          </div>
          <form onSubmit={addRW} className="space-y-3 mb-6">
            <select
              value={newRW.kelurahan_id}
              onChange={(e) => setNewRW({ ...newRW, kelurahan_id: e.target.value })}
              className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
              required
            >
              <option value="">PILIH KELURAHAN...</option>
              {kelurahans.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
            <input
              type="text"
              value={newRW.name}
              onChange={(e) => setNewRW({ ...newRW, name: e.target.value.toUpperCase() })}
              placeholder="NOMOR / NAMA RW"
              className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
              required
            />
            <div className="flex gap-2">
              <button type="submit" className={`flex-1 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 ${editingRWId ? 'bg-orange-500 shadow-orange-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
                {editingRWId ? <Save size={18}/> : <Plus size={18}/>} 
                {editingRWId ? 'Update' : 'Tambah'}
              </button>
              {editingRWId && (
                  <button type="button" onClick={() => cancelEdit('rw')} className="bg-slate-100 text-slate-500 px-4 py-4 rounded-2xl hover:bg-slate-200 transition-colors">
                      <X size={20} />
                  </button>
              )}
            </div>
          </form>
          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredRWs.length === 0 && <p className="text-slate-400 text-sm text-center py-10 italic">Belum ada data RW {newRW.kelurahan_id ? 'di Kelurahan ini' : ''}</p>}
            <ul className="space-y-3">
              {filteredRWs.map(r => (
                <li key={r.id} className={`flex justify-between items-center border-2 p-4 rounded-2xl shadow-sm transition-transform hover:scale-[1.02] ${getGroupColor(r.kelurahan_id)}`}>
                  <div>
                    <span className="font-black tracking-tight text-lg">RW {r.name}</span>
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-0.5">{(r as any).kelurahan?.name}</p>
                  </div>
                  <div className="flex gap-1.5">
                      <button onClick={() => startEdit('rw', r)} className="bg-white/50 hover:bg-white p-2.5 rounded-xl transition-colors shadow-sm"><Edit size={16} className="text-orange-500"/></button>
                      <button onClick={() => deleteItem('rw', r.id)} className="bg-white/50 hover:bg-white p-2.5 rounded-xl transition-colors shadow-sm"><Trash2 size={16} className="text-rose-500"/></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RT Section */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black">3</div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Rukun Tetangga (RT)</h3>
          </div>
          <form onSubmit={addRT} className="space-y-3 mb-6">
             <select
              value={selectedKelurahanForRT}
              onChange={(e) => {
                setSelectedKelurahanForRT(e.target.value);
                setNewRT({...newRT, rw_id: ''});
              }}
              className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
            >
              <option value="">FILTER KELURAHAN...</option>
              {kelurahans.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
            
            <select
              value={newRT.rw_id}
              onChange={(e) => setNewRT({ ...newRT, rw_id: e.target.value })}
              className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
              required
            >
              <option value="">PILIH RW...</option>
              {filteredRWsForRT.map(r => (
                <option key={r.id} value={r.id}>
                  RW {r.name} {selectedKelurahanForRT ? '' : `- ${(r as any).kelurahan?.name}`}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={newRT.name}
              onChange={(e) => setNewRT({ ...newRT, name: e.target.value.toUpperCase() })}
              placeholder="NOMOR / NAMA RT"
              className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
              required
            />
            
            <div className="flex gap-2">
              <button type="submit" className={`flex-1 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 ${editingRTId ? 'bg-orange-500 shadow-orange-200' : 'bg-amber-600 shadow-amber-200'}`}>
                {editingRTId ? <Save size={18}/> : <Plus size={18}/>} 
                {editingRTId ? 'Update' : 'Tambah'}
              </button>
              {editingRTId && (
                  <button type="button" onClick={() => cancelEdit('rt')} className="bg-slate-100 text-slate-500 px-4 py-4 rounded-2xl hover:bg-slate-200 transition-colors">
                      <X size={20} />
                  </button>
              )}
            </div>
          </form>

          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredRTs.length === 0 && <p className="text-slate-400 text-sm text-center py-10 italic">Belum ada data RT {selectedKelurahanForRT || newRT.rw_id ? 'di wilayah ini' : ''}</p>}
            <ul className="space-y-3">
              {filteredRTs.map(r => (
                <li key={r.id} className={`flex justify-between items-center border-2 p-4 rounded-2xl shadow-sm transition-transform hover:scale-[1.02] ${getGroupColor(r.rw_id)}`}>
                  <div>
                    <span className="font-black tracking-tight text-lg">RT {r.name}</span>
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-0.5">
                      RW {(r as any).rw?.name} • {(r as any).rw?.kelurahan?.name}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                      <button onClick={() => startEdit('rt', r)} className="bg-white/50 hover:bg-white p-2.5 rounded-xl transition-colors shadow-sm"><Edit size={16} className="text-orange-500"/></button>
                      <button onClick={() => deleteItem('rt', r.id)} className="bg-white/50 hover:bg-white p-2.5 rounded-xl transition-colors shadow-sm"><Trash2 size={16} className="text-rose-500"/></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
