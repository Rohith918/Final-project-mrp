// src/authContext.tsx
'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { Session } from '@supabase/supabase-js';
import { getUserByEmail } from './api';
import { supabase } from './supabaseClient';
import type { UserRole } from '../types';

type User = any;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultRole: UserRole = 'student';

async function ensureProfile(email: string, name?: string, role?: UserRole) {
  let profile = await getUserByEmail(email);
  if (profile) return profile;

  const profileId = uuid();
  profile = {
    id: profileId,
    name: name || email.split('@')[0],
    email,
    role: role || defaultRole,
  };

  const { error } = await supabase.from('Users').insert(profile);
  if (error) throw error;

  if (profile.role === 'student') {
    await supabase.from('Students').insert({
      id: profileId,
      name: profile.name,
      email: profile.email,
      role: 'student',
      gradeLevel: 'Unassigned',
      gpa: 0,
      attendance: 0,
    });
  }

  return profile;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserFromSession = useCallback(async (session: Session | null) => {
    if (!session?.user?.email) {
      setUser(null);
      return;
    }
    try {
      const fallbackName = session.user.user_metadata?.name as string | undefined;
      const fallbackRole = session.user.user_metadata?.role as UserRole | undefined;
      const profile = await ensureProfile(session.user.email, fallbackName, fallbackRole);
      setUser(profile);
    } catch (error) {
      console.error('Failed to sync user profile', error);
      setUser(null);
    }
  }, []);

  const bootstrapSession = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await syncUserFromSession(session);
    } finally {
      setLoading(false);
    }
  }, [syncUserFromSession]);

  useEffect(() => {
    bootstrapSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await syncUserFromSession(session);
      } finally {
        setLoading(false);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [bootstrapSession, syncUserFromSession]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await syncUserFromSession(session);
  }, [syncUserFromSession]);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshProfile();
      return true;
    } catch (e) {
      console.error('login error', e);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      });
      if (error) throw error;

      const profile = await ensureProfile(email, name, role);
      setUser(profile);
      return true;
    } catch (e) {
      console.error('register error', e);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
