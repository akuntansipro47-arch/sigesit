import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile, Profile } from '@/types';
import { mockApi } from '@/lib/mockApi';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  pkmProfile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isKader: boolean;
  mockLogin: (username: string) => Promise<void>;
  isMock: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pkmProfile, setPkmProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load PKM Profile & Subscribe to Realtime
  useEffect(() => {
    // 1. Load initial from local storage
    const localPkm = localStorage.getItem('pkm_profile_v1');
    if (localPkm) {
      try {
        setPkmProfile(JSON.parse(localPkm));
      } catch (e) {
        console.error('Error parsing local PKM profile', e);
      }
    }

    // 2. Fetch from server
    const fetchPkm = async () => {
      // Skip real Supabase call if we are in forced mock mode
      if (localStorage.getItem('force_mock_mode') === 'true') return;

      try {
        const { data, error } = await supabase.from('pkm_profile').select('*').maybeSingle();
        if (data) {
          setPkmProfile(data);
          localStorage.setItem('pkm_profile_v1', JSON.stringify(data));
        } else if (error) {
          console.warn('PKM Profile not found or error:', error.message);
        }
      } catch (err) {
        console.error('Failed to fetch PKM profile:', err);
      }
    };
    fetchPkm();

    // 3. Subscribe to REALTIME updates
    const channel = supabase
      .channel('pkm_profile_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pkm_profile' },
        (payload) => {
          console.log('PKM Profile Realtime Update:', payload);
          if (payload.new) {
            const newProfile = payload.new as Profile;
            setPkmProfile(newProfile);
            localStorage.setItem('pkm_profile_v1', JSON.stringify(newProfile));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // FORCE BYPASS - Cek localstorage langsung
    const forcedSession = localStorage.getItem('mock_session');
    if (forcedSession) {
      try {
        const parsed = JSON.parse(forcedSession);
        console.log('Forced Session Found:', parsed);
        setSession({ user: parsed.user } as any);
        setUser(parsed.user);
        setProfile(parsed.profile);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Error parsing forced session', e);
      }
    }

    if (USE_MOCK) {
      // Check for mocked session
      const stored = localStorage.getItem('mock_session');
      if (stored) {
        const { user, profile } = JSON.parse(stored);
        setUser(user);
        setProfile(profile);
      }
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // ALWAYS TRY TO LOAD LOCAL PROFILE BACKUP FIRST to prevent flickering
        const localBackup = localStorage.getItem(`user_profile_${session.user.id}`);
        if (localBackup) {
           setProfile(JSON.parse(localBackup));
           setLoading(false); // Show app immediately if we have local data
        }
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    // Skip real Supabase call if we are in forced mock mode
    if (localStorage.getItem('force_mock_mode') === 'true') {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
      } else if (!data) {
        console.warn('No profile found for user:', userId);
        // If no profile exists, we can't let them stay logged in
        if (!USE_MOCK && localStorage.getItem('force_mock_mode') !== 'true') {
           await supabase.auth.signOut();
           setProfile(null);
        }
      } else {
        // CHECK IF USER IS STILL ACTIVE
        if (data && data.is_active === false) {
          console.warn('User account deactivated, signing out...');
          await supabase.auth.signOut();
          setProfile(null);
          return;
        }

        setProfile(data);
        // Backup user profile to local storage
        if (data) {
           localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('force_mock_mode');
    localStorage.removeItem('mock_session');
    
    if (USE_MOCK) {
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
  };

  const mockLogin = async (username: string) => {
    const data = await mockApi.login(username);
    setUser(data.user as any);
    setProfile(data.profile);
    localStorage.setItem('mock_session', JSON.stringify(data));
  };

  const value = {
    session,
    user,
    profile,
    pkmProfile,
    loading,
    signOut,
    isAdmin: profile?.role?.toLowerCase().includes('admin') || session?.user?.id === 'admin-bypass-id' || false,
    isKader: profile?.role?.toLowerCase() === 'kader' || false,
    mockLogin,
    isMock: USE_MOCK || localStorage.getItem('force_mock_mode') === 'true' || session?.user?.id === 'admin-bypass-id'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
