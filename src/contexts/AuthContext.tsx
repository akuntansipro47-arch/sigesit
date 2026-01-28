import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { mockApi } from '@/lib/mockApi';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isKader: boolean;
  mockLogin: (username: string) => Promise<void>;
  isMock: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
// const USE_MOCK = true; // FORCE ON

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
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
    if (USE_MOCK) {
      localStorage.removeItem('mock_session');
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
    loading,
    signOut,
    isAdmin: profile?.role?.toLowerCase().includes('admin') || false,
    isKader: profile?.role?.toLowerCase() === 'kader' || false,
    mockLogin,
    isMock: USE_MOCK
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
