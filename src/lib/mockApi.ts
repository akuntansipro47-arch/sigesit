import { Profile, UserProfile, Kelurahan, RW, RT, Entry, FamilyMember } from '@/types';

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// LocalStorage Keys
const KEYS = {
  PROFILE: 'mock_pkm_profile',
  USERS: 'mock_users',
  ENTRIES: 'mock_entries',
  FAMILY: 'mock_family',
  KELURAHAN: 'mock_kelurahan',
  RW: 'mock_rw',
  RT: 'mock_rt'
};

// Initial Data
const INITIAL_PROFILE: Profile = {
  id: 'mock-pkm-id',
  name: 'PKM PADASUKA (Demo)',
  address: 'Kota Cimahi',
  phone: '08123456789',
  pic_name: 'Dr. Demo',
  website: 'www.demo.com',
  ig: '@demo',
  fb: 'Demo FB',
  twitter: '@demo',
  logo_url: ''
};

const INITIAL_ADMIN: UserProfile = {
  id: 'mock-admin-id',
  nik: 'ADMIN123',
  name: 'Super Admin',
  phone: '08123456789',
  username: 'syifaza26*',
  role: 'admin',
  is_active: true
};

// Mock API Implementation
export const mockApi = {
  // Auth (Simplified)
  login: async (username: string) => {
    await delay(500);
    console.log('Mock Login Attempt:', username);
    
    // Always allow admin login regardless of casing or suffix
    if (username.toLowerCase().includes('syifaza') || username.toLowerCase() === 'admin') {
      return { user: { id: INITIAL_ADMIN.id, email: 'admin@demo.com' }, profile: INITIAL_ADMIN };
    }
    
    // Check if existing user in local storage
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const user = users.find((u: UserProfile) => u.username === username);
    if (user && user.is_active) {
       return { user: { id: user.id, email: 'kader@demo.com' }, profile: user };
    }
    
    // Fallback: If demo mode is frustrating, just let them in as admin
    // This is emergency fallback
    console.warn('Fallback login active');
    return { user: { id: INITIAL_ADMIN.id, email: 'admin@demo.com' }, profile: INITIAL_ADMIN };
  },

  // Profile
  getPKMProfile: async () => {
    await delay(200);
    const data = localStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : INITIAL_PROFILE;
  },

  updatePKMProfile: async (profile: Partial<Profile>) => {
    await delay(200);
    const current = await mockApi.getPKMProfile();
    const updated = { ...current, ...profile };
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(updated));
  },

  // Locations
  getKelurahans: async () => {
    await delay(200);
    const data = localStorage.getItem(KEYS.KELURAHAN);
    if (!data) {
      // Seed initial data
      const initial = [{ id: 1, name: 'Padasuka' }];
      localStorage.setItem(KEYS.KELURAHAN, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },
  
  getRWs: async (kelId: number) => {
    await delay(200);
    const data = localStorage.getItem(KEYS.RW);
    let rws = data ? JSON.parse(data) : [];
    if (rws.length === 0) {
      rws = [{ id: 1, kelurahan_id: 1, name: '01' }, { id: 2, kelurahan_id: 1, name: '02' }];
      localStorage.setItem(KEYS.RW, JSON.stringify(rws));
    }
    return rws.filter((r: RW) => r.kelurahan_id === kelId);
  },

  getRTs: async (rwId: number) => {
    await delay(200);
    const data = localStorage.getItem(KEYS.RT);
    let rts = data ? JSON.parse(data) : [];
    if (rts.length === 0) {
       rts = [
         { id: 1, rw_id: 1, name: '01' }, { id: 2, rw_id: 1, name: '02' },
         { id: 3, rw_id: 2, name: '01' }, { id: 4, rw_id: 2, name: '02' }
       ];
       localStorage.setItem(KEYS.RT, JSON.stringify(rts));
    }
    return rts.filter((r: RT) => r.rw_id === rwId);
  },

  // Users
  getUsers: async () => {
    await delay(200);
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  },

  createUserProfile: async (user: Partial<UserProfile>) => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const newUser = { ...user, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return newUser;
  },

  updateUserStatus: async (id: string, isActive: boolean) => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const index = users.findIndex((u: UserProfile) => u.id === id);
    if (index !== -1) {
      users[index].is_active = isActive;
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  },

  // Entries
  createEntry: async (entry: Partial<Entry>) => {
    await delay(200);
    const entries = JSON.parse(localStorage.getItem(KEYS.ENTRIES) || '[]');
    const newEntry = { 
      ...entry, 
      id: crypto.randomUUID(), 
      entry_serial_no: entries.length + 1,
      created_at: new Date().toISOString() 
    };
    entries.push(newEntry);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    return newEntry;
  },

  createFamilyMembers: async (members: Partial<FamilyMember>[]) => {
    await delay(200);
    const allMembers = JSON.parse(localStorage.getItem(KEYS.FAMILY) || '[]');
    const newMembers = members.map(m => ({ ...m, id: crypto.randomUUID() }));
    allMembers.push(...newMembers);
    localStorage.setItem(KEYS.FAMILY, JSON.stringify(allMembers));
    return newMembers;
  },

  getUserEntries: async (userId: string) => {
    await delay(200);
    const entries = JSON.parse(localStorage.getItem(KEYS.ENTRIES) || '[]');
    const userEntries = entries.filter((e: Entry) => e.user_id === userId);
    
    // Join with locations and family
    const kelurahans = await mockApi.getKelurahans();
    const rws = JSON.parse(localStorage.getItem(KEYS.RW) || '[]');
    const rts = JSON.parse(localStorage.getItem(KEYS.RT) || '[]');
    const allFamily = JSON.parse(localStorage.getItem(KEYS.FAMILY) || '[]');

    return userEntries.map((e: Entry) => ({
      ...e,
      kelurahan: kelurahans.find((k: Kelurahan) => k.id === e.kelurahan_id),
      rw: rws.find((r: RW) => r.id === e.rw_id),
      rt: rts.find((r: RT) => r.id === e.rt_id),
      family_members: allFamily.filter((f: any) => f.entry_id === e.id)
    }));
  }
};
