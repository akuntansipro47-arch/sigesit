import { supabase } from './supabase';
import { Kelurahan, RW, RT, UserProfile, Profile, FamilyMember } from '@/types';
import { mockApi } from './mockApi';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || localStorage.getItem('force_mock_mode') === 'true';
// const USE_MOCK = true; // FORCE ON

// Profile API
export const getPKMProfile = async (skipFallback: boolean = false) => {
  if (USE_MOCK) return mockApi.getPKMProfile();
  
  try {
    const { data, error } = await supabase.from('pkm_profile').select('*').single();
    if (error) throw error;
    return data as Profile;
  } catch (error) {
    if (skipFallback) throw error;
    
    console.warn("Supabase fetch failed, trying localStorage backup...", error);
    // Fallback to localStorage
    const backup = localStorage.getItem('pkm_profile_v1');
    if (backup) {
      return JSON.parse(backup) as Profile;
    }
    throw error;
  }
};

export const updatePKMProfile = async (profile: Partial<Profile>) => {
  if (USE_MOCK) return mockApi.updatePKMProfile(profile);

  // Helper: Ensure we update the existing singleton row if ID is missing
  if (!profile.id) {
    const { data: existing } = await supabase.from('pkm_profile').select('id').limit(1).single();
    if (existing) {
      profile.id = existing.id;
    }
  }

  // Ensure ID is present for UPSERT to work as UPDATE, otherwise it tries to INSERT
  // Since we want a SINGLETON, we must ensure ID is constant or we rely on 'ON CONFLICT'
  // But pkm_profile might not have a unique constraint on anything other than ID.
  
  // Force a constant UUID for the singleton PKM profile if missing
  // This ensures that different devices update the same record
  const SINGLETON_ID = '00000000-0000-0000-0000-000000000001';
  const profileToSave = { ...profile };
  if (!profileToSave.id || profileToSave.id === '1') {
     profileToSave.id = SINGLETON_ID; 
  }

  if (profileToSave.id) {
      // Use UPSERT instead of update to handle the case where the record doesn't exist yet
      const { error } = await supabase.from('pkm_profile').upsert(profileToSave);
      if (error) {
         console.error("Save Error:", error);
         alert(`Gagal menyimpan ke Server: ${error.message}`);
         throw error;
      }
  }
};

// Location API
export const getKelurahans = async () => {
  if (USE_MOCK) return mockApi.getKelurahans();
  const { data, error } = await supabase.from('kelurahan').select('*').order('name');
  if (error) throw error;
  return data as Kelurahan[];
};

export const createKelurahan = async (name: string) => {
  if (USE_MOCK) {
    const current = JSON.parse(localStorage.getItem('mock_kelurahan') || '[]');
    const mockNew = { id: Date.now(), name };
    current.push(mockNew);
    localStorage.setItem('mock_kelurahan', JSON.stringify(current));
    return mockNew;
  }
  const { data, error } = await supabase.from('kelurahan').insert({ name }).select().single();
  if (error) throw error;
  return data;
};

export const updateKelurahan = async (id: number, name: string) => {
  if (USE_MOCK) {
    const current = JSON.parse(localStorage.getItem('mock_kelurahan') || '[]');
    const updated = current.map((k: any) => k.id === id ? { ...k, name } : k);
    localStorage.setItem('mock_kelurahan', JSON.stringify(updated));
    return;
  }
  const { error } = await supabase.from('kelurahan').update({ name }).eq('id', id);
  if (error) throw error;
};

export const deleteLocation = async (table: string, id: number) => {
  if (USE_MOCK) {
    const key = `mock_${table}`;
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = current.filter((i: any) => i.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    return;
  }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};

export const getRWs = async (kelurahanId: number) => {
  if (USE_MOCK) return mockApi.getRWs(kelurahanId);
  const { data, error } = await supabase.from('rw').select('*').eq('kelurahan_id', kelurahanId).order('name');
  if (error) throw error;
  
  // Sort numerically (1, 2, 10 instead of 1, 10, 2)
  return (data as RW[]).sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
};

export const getAllRWs = async () => {
  if (USE_MOCK) {
    const kData = await mockApi.getKelurahans();
    const rwData = JSON.parse(localStorage.getItem('mock_rw') || '[]');
    return rwData.map((r: any) => ({ ...r, kelurahan: kData.find((k: any) => String(k.id) === String(r.kelurahan_id)) }));
  }
  const { data, error } = await supabase.from('rw').select('*, kelurahan(name)').order('name');
  if (error) throw error;
  return data;
}

export const createRW = async (name: string, kelurahan_id: number) => {
  if (USE_MOCK) {
    const current = JSON.parse(localStorage.getItem('mock_rw') || '[]');
    const mockNew = { id: Date.now(), name, kelurahan_id };
    current.push(mockNew);
    localStorage.setItem('mock_rw', JSON.stringify(current));
    return mockNew;
  }
  const { data, error } = await supabase.from('rw').insert({ name, kelurahan_id }).select().single();
  if (error) throw error;
  return data;
};

export const updateRW = async (id: number, name: string, kelurahan_id: number) => {
  if (USE_MOCK) {
    const current = JSON.parse(localStorage.getItem('mock_rw') || '[]');
    const updated = current.map((r: any) => r.id === id ? { ...r, name, kelurahan_id } : r);
    localStorage.setItem('mock_rw', JSON.stringify(updated));
    return;
  }
  const { error } = await supabase.from('rw').update({ name, kelurahan_id }).eq('id', id);
  if (error) throw error;
};

export const getRTs = async (rwId: number) => {
  if (USE_MOCK) return mockApi.getRTs(rwId);
  const { data, error } = await supabase.from('rt').select('*').eq('rw_id', rwId).order('name');
  if (error) throw error;
  
  // Sort numerically
  return (data as RT[]).sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
};

export const getAllRTs = async () => {
  if (USE_MOCK) {
    const kData = await mockApi.getKelurahans();
    const rwData = JSON.parse(localStorage.getItem('mock_rw') || '[]');
    const rtData = JSON.parse(localStorage.getItem('mock_rt') || '[]');
    const enrichedRWs = rwData.map((r: any) => ({ ...r, kelurahan: kData.find((k: any) => String(k.id) === String(r.kelurahan_id)) }));
    return rtData.map((r: any) => ({ ...r, rw: enrichedRWs.find((rw: any) => String(rw.id) === String(r.rw_id)) }));
  }
  const { data, error } = await supabase.from('rt').select('*, rw(name, kelurahan_id, kelurahan(name))').order('name');
  if (error) throw error;
  return data;
}

export const createRT = async (name: string, rw_id: number) => {
  if (USE_MOCK) {
    const current = JSON.parse(localStorage.getItem('mock_rt') || '[]');
    const mockNew = { id: Date.now(), name, rw_id };
    current.push(mockNew);
    localStorage.setItem('mock_rt', JSON.stringify(current));
    return mockNew;
  }
  const { data, error } = await supabase.from('rt').insert({ name, rw_id }).select().single();
  if (error) throw error;
  return data;
};

export const updateRT = async (id: number, name: string, rw_id: number) => {
  if (USE_MOCK) {
    const current = JSON.parse(localStorage.getItem('mock_rt') || '[]');
    const updated = current.map((r: any) => r.id === id ? { ...r, name, rw_id } : r);
    localStorage.setItem('mock_rt', JSON.stringify(updated));
    return;
  }
  const { error } = await supabase.from('rt').update({ name, rw_id }).eq('id', id);
  if (error) throw error;
};

// User API
export const getUsers = async () => {
  if (USE_MOCK) return mockApi.getUsers();
  const { data, error } = await supabase.from('user_profiles').select(`
    *,
    kelurahan:kelurahan_id(name),
    rw:rw_id(name),
    rt:rt_id(name)
  `).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createUserProfile = async (user: Partial<UserProfile>) => {
  if (USE_MOCK) return mockApi.createUserProfile(user);
  const { data, error } = await supabase.from('user_profiles').upsert(user).select().single();
  if (error) throw error;
  return data;
};

export const deleteUser = async (id: string) => {
  if (USE_MOCK) {
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const newUsers = users.filter((u: any) => u.id !== id);
    localStorage.setItem('mock_users', JSON.stringify(newUsers));
    return;
  }
  
  // Note: This only deletes the profile. Deleting the Auth user requires Service Role (backend).
  // But we can mark it deleted or try.
  const { error } = await supabase.from('user_profiles').delete().eq('id', id);
  if (error) throw error;
};

export const updateUserStatus = async (id: string, isActive: boolean) => {
  if (USE_MOCK) return mockApi.updateUserStatus(id, isActive);
  const { error } = await supabase.from('user_profiles').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
};

// New: Function to call Backend (Edge Function) for Password Update
export const adminUpdatePassword = async (userId: string, newPassword: string) => {
  if (USE_MOCK) return;
  
  console.log('Attempting to update password for user:', userId);
  
  try {
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { userId, password: newPassword }
    });

    if (error) {
      console.error('Edge Function Error:', error);
      
      let errorMessage = error.message;

      // Check if we can extract a better message from the function's response
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorData = await error.context.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If JSON parsing fails, the body might be plain text
          try {
            const text = await error.context.text();
            if (text) errorMessage = text;
          } catch (textErr) {
             console.warn('Could not parse error response body', textErr);
          }
        }
      }
      
      // Map generic "non-2xx" to something more helpful
      if (errorMessage.includes('non-2xx')) {
        errorMessage = `Gagal terhubung ke server (Status: 400/500). 
        
HAL INI BIASANYA KARENA:
1. Sesi login Anda habis (Silakan Logout lalu Login lagi).
2. Perubahan kode belum di-deploy ke Supabase.
3. Service Role Key belum diset di Supabase dashboard.

Info raw: ${errorMessage}`;
      }

      throw new Error(errorMessage);
    }
    
    console.log('Password update successful:', data);
    return data;
  } catch (err: any) {
    console.error('adminUpdatePassword error:', err);
    
    // Handle network errors
    if (err.message && (err.message.includes('fetch') || err.message.includes('network'))) {
      throw new Error('Gagal menghubungi server. Periksa koneksi internet Anda.');
    }
    
    throw err;
  }
};

export const adminDeleteUser = async (userId: string) => {
  if (USE_MOCK) return;
  
  const { data, error } = await supabase.functions.invoke('admin-update-user', {
    body: { userId, action: 'delete' }
  });

  if (error) {
    console.error('Edge Function Error:', error);
    let errorMessage = error.message;
    if (error.context && typeof error.context.json === 'function') {
      try {
        const errorData = await error.context.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        console.warn('Could not parse error response body', e);
      }
    }
    throw new Error(errorMessage);
  }
  
  return data;
};

// NOTE: Password update removed from frontend as it requires Service Role (Secret Key)
// which should NEVER be placed in a frontend app for security reasons.
// To change password, admin should delete and recreate the kader.

export const deleteEntry = async (id: string) => {
  if (USE_MOCK) {
    const entries = JSON.parse(localStorage.getItem('mock_entries') || '[]');
    const newEntries = entries.filter((e: any) => e.id !== id);
    localStorage.setItem('mock_entries', JSON.stringify(newEntries));
    
    const family = JSON.parse(localStorage.getItem('mock_family') || '[]');
    const newFamily = family.filter((f: any) => f.entry_id !== id);
    localStorage.setItem('mock_family', JSON.stringify(newFamily));
    return;
  }

  // 1. Delete family members first (Foreign Key constraint)
  await supabase.from('family_members').delete().eq('entry_id', id);
  // 2. Delete entry
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
};

export const checkDuplicateKK = async (kkNumber: string, excludeEntryId?: string) => {
  if (USE_MOCK) {
    const family = JSON.parse(localStorage.getItem('mock_family') || '[]');
    return family.some((f: any) => f.kk_number === kkNumber && f.entry_id !== excludeEntryId);
  }

  const { data, error } = await supabase
    .from('family_members')
    .select('id, entry_id')
    .eq('kk_number', kkNumber)
    .limit(1);

  if (error) return false;
  if (data && data.length > 0) {
    // If it's the same entry, it's not a duplicate for "update" purposes
    if (excludeEntryId && data[0].entry_id === excludeEntryId) return false;
    return true;
  }
  return false;
};

// Helper to safely resolve RT/RW IDs from either UUID or Name
async function resolveLocationId(
  type: 'rw' | 'rt',
  parentId: string | number, // kelurahan_id for rw, rw_id for rt
  nameOrId: string | number
): Promise<string> {
  const input = String(nameOrId).trim();
  
  // 1. If it's already a UUID, return it
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
  if (isUUID) return input;

  // 2. Validate input name
  if (!input || input === '0' || input === 'NaN' || input.toLowerCase() === 'null') {
    throw new Error(`Nama ${type.toUpperCase()} tidak valid (${input})`);
  }

  const parentField = type === 'rw' ? 'kelurahan_id' : 'rw_id';
  
  // 3. Try lookup by name (exact)
  const { data: exactMatch } = await supabase
    .from(type)
    .select('id')
    .eq(parentField, parentId)
    .eq('name', input)
    .maybeSingle();
  if (exactMatch) return exactMatch.id;

  // 4. Try lookup by name (padded with leading zero)
  const padded = input.padStart(2, '0');
  if (padded !== input) {
    const { data: paddedMatch } = await supabase
      .from(type)
      .select('id')
      .eq(parentField, parentId)
      .eq('name', padded)
      .maybeSingle();
    if (paddedMatch) return paddedMatch.id;
  }

  // 5. If not found, create new
  const { data: created } = await supabase
    .from(type)
    .insert({ [parentField]: parentId, name: input })
    .select('id')
    .maybeSingle();

  if (created) return created.id;

  // 6. If insert failed (likely race condition), try lookup one last time
  const { data: retryMatch } = await supabase
    .from(type)
    .select('id')
    .eq(parentField, parentId)
    .eq('name', input)
    .maybeSingle();
  if (retryMatch) return retryMatch.id;

  if (padded !== input) {
    const { data: retryPaddedMatch } = await supabase
      .from(type)
      .select('id')
      .eq(parentField, parentId)
      .eq('name', padded)
      .maybeSingle();
    if (retryPaddedMatch) return retryPaddedMatch.id;
  }

  throw new Error(`Gagal memproses data ${type.toUpperCase()}: ${input}. Silakan periksa kembali data wilayah.`);
}

// Entry API
export const createEntry = async (entryData: any) => {
  if (USE_MOCK) return mockApi.createEntry(entryData);

  // Strip out joined data that aren't columns in 'entries' table
  const { family_members: _fm, kelurahan: _k, rw: _rw, rt: _rt, kader: _kd, ...cleanData } = entryData;
  
  try {
    let finalRwId = cleanData.rw_id;
    let finalRtId = cleanData.rt_id;

    // Resolve RW
    if (cleanData.rw_id && cleanData.kelurahan_id) {
      finalRwId = await resolveLocationId('rw', cleanData.kelurahan_id, cleanData.rw_id);
    }

    // Resolve RT
    if (cleanData.rt_id && finalRwId) {
      finalRtId = await resolveLocationId('rt', finalRwId, cleanData.rt_id);
    }

    const { data, error } = await supabase
      .from('entries')
      .insert([{...cleanData, rw_id: finalRwId, rt_id: finalRtId}])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error in createEntry:', error);
    throw error;
  }
};

export const createFamilyMembers = async (members: Partial<FamilyMember>[]) => {
  if (USE_MOCK) return mockApi.createFamilyMembers(members);
  
  // Strictly only send columns that exist in the DB schema
  // total_souls, permanent_souls, and latrine_count are included as they are core metrics
  const cleanMembers = members.map((m: any) => ({
    entry_id: m.entry_id,
    kk_number: m.kk_number,
    head_of_family: m.head_of_family,
    total_souls: Number(m.total_souls || 0),
    permanent_souls: Number(m.permanent_souls || 0),
    latrine_count: Number(m.latrine_count || 0)
  }));
  
  const { data, error } = await supabase.from('family_members').insert(cleanMembers).select();
  if (error) throw error;
  return data;
};

export const getUserEntries = async (userId: string, isAdmin: boolean = false, dateFrom?: string, dateTo?: string) => {
  if (USE_MOCK) return mockApi.getUserEntries(userId);
  
  let query = supabase.from('entries')
    .select(`
      *,
      kelurahan:kelurahan_id(name),
      rw:rw_id(name),
      rt:rt_id(name),
      family_members(*),
      kader:user_profiles!user_id(name)
    `);

  // Jika bukan admin, filter berdasarkan userId
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  // Filter Tanggal di Server (Supabase) untuk optimasi loading
  if (dateFrom) {
    query = query.gte('date_entry', dateFrom);
  }
  if (dateTo) {
    query = query.lte('date_entry', dateTo);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getEntry = async (id: string) => {
  if (USE_MOCK) {
    const entries = JSON.parse(localStorage.getItem('mock_entries') || '[]');
    const entry = entries.find((e: any) => e.id === id);
    if (!entry) throw new Error('Entry not found');
    
    // Join family members
    const family = JSON.parse(localStorage.getItem('mock_family') || '[]');
    const members = family.filter((f: any) => f.entry_id === id);
    
    return { ...entry, family_members: members };
  }

  const { data, error } = await supabase.from('entries')
    .select(`
      *,
      rw:rw_id(name),
      rt:rt_id(name),
      family_members (*)
    `)
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
};

export const updateEntry = async (id: string, entryData: any) => {
  if (USE_MOCK) {
    const entries = JSON.parse(localStorage.getItem('mock_entries') || '[]');
    const index = entries.findIndex((e: any) => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...entryData };
      localStorage.setItem('mock_entries', JSON.stringify(entries));
      return entries[index];
    }
    return null;
  }

  // Strip out joined data that aren't columns in 'entries' table
  const { family_members: _fm, kelurahan: _k, rw: _rw, rt: _rt, kader: _kd, ...cleanData } = entryData;

  try {
    let finalRwId = cleanData.rw_id;
    let finalRtId = cleanData.rt_id;
    
    // Resolve RW
    if (cleanData.rw_id && cleanData.kelurahan_id) {
      finalRwId = await resolveLocationId('rw', cleanData.kelurahan_id, cleanData.rw_id);
    }

    // Resolve RT
    if (cleanData.rt_id && finalRwId) {
      finalRtId = await resolveLocationId('rt', finalRwId, cleanData.rt_id);
    }

    const { data, error } = await supabase
      .from('entries')
      .update({...cleanData, rw_id: finalRwId, rt_id: finalRtId})
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error in updateEntry:', error);
    throw error;
  }
};

export const updateFamilyMembers = async (entryId: string, members: Partial<FamilyMember>[]) => {
  if (USE_MOCK) {
    // Replace logic for mock
    let allFamily = JSON.parse(localStorage.getItem('mock_family') || '[]');
    // Remove old
    allFamily = allFamily.filter((f: any) => f.entry_id !== entryId);
    // Add new
    const newMembers = members.map(m => ({ ...m, id: crypto.randomUUID(), entry_id: entryId }));
    allFamily.push(...newMembers);
    localStorage.setItem('mock_family', JSON.stringify(allFamily));
    return;
  }

  // Delete old members (Simple strategy: delete all and recreate)
  const { error: deleteError } = await supabase.from('family_members').delete().eq('entry_id', entryId);
  if (deleteError) throw deleteError;

  // Insert new - Strictly only send columns that exist in the DB schema
  const cleanMembers = members.map((m: any) => ({
    entry_id: entryId,
    kk_number: m.kk_number,
    head_of_family: m.head_of_family,
    total_souls: Number(m.total_souls || 0),
    permanent_souls: Number(m.permanent_souls || 0),
    latrine_count: Number(m.latrine_count || 0)
  }));

  const { error: insertError } = await supabase.from('family_members').insert(cleanMembers);
  if (insertError) {
    if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
       throw new Error(`DATABASE ERROR: Kolom data jiwa/jamban belum ada di tabel family_members. 
       
SOLUSI: Harap jalankan perintah SQL ALTER TABLE di Supabase Editor.`);
    }
    throw insertError;
  }
};
