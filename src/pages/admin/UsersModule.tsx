import React, { useState, useEffect } from 'react';
import { getUsers, getKelurahans, getRWs, getRTs, updateUserStatus, deleteUser, adminUpdatePassword, adminDeleteUser } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { Kelurahan, RW, RT } from '@/types';
import { Plus, UserX, UserCheck, Trash2, Info, Edit } from 'lucide-react';

export default function UsersModule() {
  const { isMock } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    nik: '',
    name: '',
    phone: '',
    kelurahan_id: '',
    rw_id: '',
    rt_id: '',
    role: 'kader' as 'kader' | 'super_admin'
  });
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Location Data
  const [kelurahans, setKelurahans] = useState<Kelurahan[]>([]);
  const [rws, setRws] = useState<RW[]>([]);
  const [rts, setRts] = useState<RT[]>([]);
  
  useEffect(() => {
    loadUsers();
    loadKelurahans();
  }, []);

  useEffect(() => {
    if (formData.kelurahan_id) {
      getRWs(Number(formData.kelurahan_id)).then(setRws);
    } else {
      setRws([]);
    }
  }, [formData.kelurahan_id]);

  useEffect(() => {
    if (formData.rw_id) {
      getRTs(Number(formData.rw_id)).then(setRts);
    } else {
      setRts([]);
    }
  }, [formData.rw_id]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      
      // Sort users by Kelurahan, RW, RT, then Name
      const sortedUsers = (data || []).sort((a: any, b: any) => {
        const kelA = a.kelurahan?.name || '';
        const kelB = b.kelurahan?.name || '';
        const rwA = a.rw?.name || '';
        const rwB = b.rw?.name || '';
        const rtA = a.rt?.name || '';
        const rtB = b.rt?.name || '';
        
        // 1. Kelurahan
        const kelComp = kelA.localeCompare(kelB);
        if (kelComp !== 0) return kelComp;
        
        // 2. RW (Numeric)
        const rwComp = rwA.localeCompare(rwB, undefined, { numeric: true });
        if (rwComp !== 0) return rwComp;
        
        // 3. RT (Numeric)
        const rtComp = rtA.localeCompare(rtB, undefined, { numeric: true });
        if (rtComp !== 0) return rtComp;
        
        // 4. Name
        return (a.name || '').localeCompare(b.name || '');
      });

      setUsers(sortedUsers);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = () => {
    alert('FITUR DINAMIS AKTIF:\n\nSekarang Anda bisa langsung mengganti password kader dengan cara:\n1. Klik tombol Edit (ikon pensil) pada kader yang diinginkan.\n2. Masukkan password baru pada kolom "Ganti Password Login".\n3. Klik "Simpan Perubahan".\n\nSistem akan otomatis mengupdate password login kader tersebut tanpa perlu buka Dashboard Supabase lagi.');
  };

  const handleEdit = (user: any) => {
    setEditingUserId(user.id);
    setFormData({
      nik: user.nik,
      name: user.name,
      phone: user.phone || '',
      kelurahan_id: String(user.kelurahan_id || ''),
      rw_id: String(user.rw_id || ''),
      rt_id: String(user.rt_id || ''),
      role: user.role || 'kader'
    });
    setPasswordInput('');
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setShowForm(false);
    setFormData({
      nik: '',
      name: '',
      phone: '',
      kelurahan_id: '',
      rw_id: '',
      rt_id: '',
      role: 'kader'
    });
    setPasswordInput('');
  };

  const loadKelurahans = async () => {
    const data = await getKelurahans();
    setKelurahans(data || []);
  };

  const generateRandomString = (length: number) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nik || formData.nik.length < 5) {
      alert('NIK minimal 5 digit');
      return;
    }

    if (isMock) {
      alert('[DEMO MODE] Operasi Simpan/Update Kader berhasil (Lokal)');
      cancelEdit();
      return;
    }

    try {
      setLoading(true);

      if (editingUserId) {
        // UPDATE MODE (Profile & Password via Backend)
        
        // 1. Update Profile first
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            nik: formData.nik,
            name: formData.name,
            phone: formData.phone,
            kelurahan_id: formData.kelurahan_id ? Number(formData.kelurahan_id) : null,
            rw_id: formData.rw_id ? Number(formData.rw_id) : null,
            rt_id: formData.rt_id ? Number(formData.rt_id) : null,
            role: formData.role,
            ...(passwordInput ? { password_display: passwordInput } : {})
          })
          .eq('id', editingUserId);

        if (updateError) throw updateError;
        
        // 2. Update Auth Password via Backend if provided
        if (passwordInput) {
          try {
            console.log('Updating password for user:', editingUserId);
            await adminUpdatePassword(editingUserId, passwordInput);
            alert('✅ AKSES BERHASIL DIUPDATE!\n\nUser sekarang bisa login dengan password baru:\nPassword: ' + passwordInput);
          } catch (backendError: any) {
            console.error('Backend Error:', backendError);
            
            // Show detailed error message
            const errorMsg = backendError.message || 'Unknown error';
            alert(`⚠️ PERHATIAN!\n\nProfil berhasil diupdate di database, tapi GAGAL mengubah password login di sistem Auth.\n\n📋 Detail Error:\n${errorMsg}\n\n💡 Solusi:\nIni biasanya karena masalah izin akses di Supabase. Silakan gunakan SQL Editor untuk reset password jika mendesak.`);
          }
        } else {
            alert('✅ Pengaturan Akses Berhasil Diperbarui!');
        }
        
        cancelEdit();
        loadUsers();
        return;
      }
      
      // CREATE MODE (Original logic)
      // Generate Credentials if not provided
      const suffix = generateRandomString(3);
      const username = formData.nik.slice(-5) + suffix;
      // Use user provided password or generate one
      const finalPassword = passwordInput || generateRandomString(8);
      
      // Email fake for auth
      const email = `${username}@sigesit.com`;

      // 1. Create Auth User using a temporary client
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: email,
        password: finalPassword,
        options: {
          data: {
            full_name: formData.name,
            nik: formData.nik,
            role: formData.role
          }
        }
      });

      if (authError) {
        throw new Error(`Gagal membuat akun Auth: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Gagal mendapatkan ID user baru.');
      }

      // 1.5 FORCE UPDATE PASSWORD via Backend to ensure it matches what admin typed
      try {
        await adminUpdatePassword(authData.user.id, finalPassword);
      } catch (pwError) {
        console.warn('Backend password update failed during creation, but continuing...', pwError);
      }

      // 2. Update Profile yang sudah dibuat oleh trigger dengan data lengkap
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          nik: formData.nik,
          name: formData.name,
          phone: formData.phone,
          kelurahan_id: formData.kelurahan_id ? Number(formData.kelurahan_id) : null,
          rw_id: formData.rw_id ? Number(formData.rw_id) : null,
          rt_id: formData.rt_id ? Number(formData.rt_id) : null,
          username: username,
          password_display: finalPassword,
          role: formData.role,
          is_active: true
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        throw new Error(`Akun Auth berhasil dibuat, tapi gagal menyimpan profil: ${profileError.message}`);
      }

      setShowForm(false);
      loadUsers();
      setFormData({
        nik: '',
        name: '',
        phone: '',
        kelurahan_id: '',
        rw_id: '',
        rt_id: '',
        role: 'kader'
      });
      setPasswordInput('');
      alert(`User Berhasil Dibuat!\n\nUsername: ${username}\nPassword: ${finalPassword}\nRole: ${formData.role === 'super_admin' ? 'FULL ACCESS' : 'KADER'}`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Gagal menyimpan user. Pastikan NIK unik.');
    } finally {
      setLoading(false);
    }
  };
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Gagal menyimpan user. Pastikan NIK unik.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (confirm(`Apakah anda yakin ingin ${currentStatus ? 'menonaktifkan' : 'mengaktifkan'} user ini?`)) {
      if (isMock) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
        alert('[DEMO MODE] Status user berhasil diubah (Lokal)');
        return;
      }
      await updateUserStatus(id, !currentStatus);
      loadUsers();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`PERINGATAN KERAS:\n\nApakah anda yakin ingin MENGHAPUS PERMANEN user "${name}"?\n\nData yang sudah dihapus tidak bisa dikembalikan. User ini tidak akan bisa login lagi.`)) {
      if (isMock) {
        setUsers(prev => prev.filter(u => u.id !== id));
        alert('[DEMO MODE] User berhasil dihapus (Lokal)');
        return;
      }
      try {
        setLoading(true);
        // 1. Delete Auth User via Backend (Edge Function)
        try {
          await adminDeleteUser(id);
        } catch (authError: any) {
          console.error('Failed to delete Auth account, might already be gone:', authError);
          // Continue anyway, maybe profile still exists
        }

        // 2. Delete Profile in Database
        await deleteUser(id);
        
        alert('User berhasil dihapus sepenuhnya (Auth & Profil)');
        loadUsers();
      } catch (error: any) {
        alert('Gagal menghapus user: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };



  return (
    <div className="space-y-8 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-blue-200 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl"></div>
         <div className="flex justify-between items-center relative z-10">
           <div>
             <h2 className="text-3xl font-black tracking-tight">Pengaturan Akses</h2>
             <p className="text-blue-100/80 font-medium mt-1 italic">Kelola hak akses pengguna (Super Admin & Kader).</p>
           </div>
           <button
             onClick={() => {
               if (showForm) cancelEdit();
               else setShowForm(true);
             }}
             className={`px-6 py-4 rounded-2xl flex items-center space-x-2 font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg ${
               showForm ? 'bg-rose-500 shadow-rose-200 text-white' : 'bg-white text-blue-600 shadow-white/20'
             }`}
           >
             {showForm ? 'Batal' : <><Plus size={20} strokeWidth={3} /><span>Tambah User</span></>}
           </button>
         </div>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
                {editingUserId ? <Info size={20} /> : <Plus size={20} />}
             </div>
             {editingUserId ? 'Edit Pengaturan Akses' : 'Tambah User Baru'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Pilih Level Akses</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, role: 'super_admin'})}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.role === 'super_admin' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' 
                      : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="font-black text-sm uppercase tracking-tighter">FULL ACCESS</span>
                  <span className="text-[9px] font-bold text-center leading-tight">Bisa mengelola semua menu & data PKM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, role: 'kader'})}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.role === 'kader' 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md' 
                      : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="font-black text-sm uppercase tracking-tighter">AKSES KADER</span>
                  <span className="text-[9px] font-bold text-center leading-tight">Hanya bisa input & monitor data survey sendiri</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor NIK</label>
              <input
                type="text"
                required
                value={formData.nik}
                onChange={e => setFormData({...formData, nik: e.target.value})}
                className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
                placeholder="Nomor Induk Kependudukan"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
                placeholder="Nama Pengguna"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. HP Aktif</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-slate-50 shadow-inner"
                placeholder="08..."
              />
            </div>
            
            <div className="space-y-1.5">
               <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">
                  {editingUserId ? 'Ganti Password Login (Opsional)' : 'Password (Opsional)'}
               </label>
               <input
                 type="text"
                 value={passwordInput}
                 onChange={e => setPasswordInput(e.target.value)}
                 className="w-full border-2 border-amber-100 p-4 rounded-2xl focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-amber-50/30 shadow-inner"
                 placeholder={editingUserId ? "Masukkan password baru jika ingin ganti" : "Kosongkan = Auto Generate"}
               />
               {editingUserId ? (
                 <p className="text-[9px] text-emerald-500 font-bold mt-1 px-1">
                    *INFO: Password ini akan mengganti password login user secara otomatis.
                 </p>
               ) : (
                 <p className="text-[9px] text-amber-400 font-bold mt-1 px-1">*Sistem akan membuat password acak jika dikosongkan.</p>
               )}
            </div>
            
            {/* Location Selects - Only show for Kader or let them be optional for Admin */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Wilayah Tugas {formData.role === 'super_admin' ? '(Opsional)' : '(Wajib)'}</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelurahan</label>
                    <select
                      required={formData.role === 'kader'}
                      value={formData.kelurahan_id}
                      onChange={e => setFormData({...formData, kelurahan_id: e.target.value, rw_id: '', rt_id: ''})}
                      className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-slate-700 bg-slate-50 shadow-inner appearance-none"
                    >
                      <option value="">Pilih Kelurahan</option>
                      {kelurahans.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RW</label>
                    <select
                      required={formData.role === 'kader'}
                      disabled={!formData.kelurahan_id}
                      value={formData.rw_id}
                      onChange={e => setFormData({...formData, rw_id: e.target.value, rt_id: ''})}
                      className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-slate-700 bg-slate-50 shadow-inner disabled:opacity-50 appearance-none"
                    >
                      <option value="">Pilih RW</option>
                      {rws.map(r => <option key={r.id} value={r.id}>RW {r.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RT</label>
                    <select
                      required={formData.role === 'kader'}
                      disabled={!formData.rw_id}
                      value={formData.rt_id}
                      onChange={e => setFormData({...formData, rt_id: e.target.value})}
                      className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-slate-700 bg-slate-50 shadow-inner disabled:opacity-50 appearance-none"
                    >
                      <option value="">Pilih RT</option>
                      {rts.map(r => <option key={r.id} value={r.id}>RT {r.name}</option>)}
                    </select>
                  </div>
               </div>
            </div>

            <div className="md:col-span-2 pt-4 flex gap-3">
              <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-200 hover:from-emerald-700 hover:to-teal-600 transition-all active:scale-95 uppercase tracking-widest">
                {editingUserId ? 'Simpan Perubahan' : 'Simpan & Create Akun'}
              </button>
              {editingUserId && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="bg-slate-100 text-slate-500 px-8 py-5 rounded-[2rem] font-black hover:bg-slate-200 transition-all uppercase tracking-widest"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama / NIK</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Level Akses</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Wilayah Tugas</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Login (User/Pass)</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 animate-pulse text-slate-400 font-bold">Memuat Data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 italic font-medium">Belum ada data user terdaftar.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">{user.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 tracking-tighter mt-0.5">{user.nik}</div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-3 py-1 text-[9px] font-black rounded-full border shadow-sm ${
                         user.role === 'super_admin' 
                           ? 'bg-blue-600 text-white border-blue-400' 
                           : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                       }`}>
                         {user.role === 'super_admin' ? 'FULL ACCESS' : 'KADER'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.kelurahan?.name ? (
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{user.kelurahan?.name}</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">RW {user.rw?.name} / RT {user.rt?.name}</span>
                           </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 italic">Semua Wilayah</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-inner group-hover:bg-white transition-colors min-w-[120px]">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">User</span>
                            <span className="text-xs font-black text-blue-600 tracking-tight">{user.username}</span>
                         </div>
                         <div className="flex flex-col mt-1.5 pt-1.5 border-t border-dashed border-slate-200">
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Password</span>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-700 tracking-tight font-mono">{user.password_display || '********'}</span>
                            </div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Edit Akses"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => toggleStatus(user.id, user.is_active)}
                          className={`p-2.5 rounded-xl transition-all shadow-sm ${
                            user.is_active 
                              ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white' 
                              : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                          }`}
                          title={user.is_active ? "Nonaktifkan" : "Aktifkan"}
                        >
                          {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-2.5 bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Hapus User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
