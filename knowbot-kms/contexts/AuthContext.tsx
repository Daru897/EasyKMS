'use client';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<Session | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create SSR-compatible browser client once (uses cookies, not localStorage)
  // This ensures consistency with middleware which also uses cookies
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    console.log('AuthProvider: Initializing with SSR-compatible client (cookie-based)...');
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          setSession(null);
          setUser(null);
        } else {
          console.log('Initial session found:', session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setSession(null);
        setUser(null);
      } finally {
        // Add a small delay to ensure session is fully processed
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    };

    initializeAuth();

    // SIMPLE listener - just log and update state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔔 Auth event:', event, 'User:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // NO REDIRECTS HERE - Let components handle it
      }
    );

    return () => {
      console.log('AuthProvider cleanup');
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signInWithPassword = async (email: string, password: string): Promise<Session | null> => {
    console.log('signInWithPassword called for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('Login response:', { data, error });
    
    if (error) {
      console.error('Login error:', error);
      throw error;
    }
    
    return data.session ?? null; // Return session so login page can handle redirect
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    isLoading,
    signInWithMagicLink,
    signInWithPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
