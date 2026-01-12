'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthTestPage() {
  useEffect(() => {
    console.log('=== AUTH TEST START ===');
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session?.user?.email);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔔 Auth event detected:', event);
        console.log('Session user:', session?.user?.email);
        
        if (event === 'SIGNED_IN') {
          console.log('✅ SIGNED_IN EVENT FIRED!');
          window.location.href = '/dashboard';
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const testLogin = async () => {
    console.log('Testing login...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'darpan9864033890@gmail.com',
      password: '123456789'
    });
    
    console.log('Login result:', { data, error });
    
    if (data?.session) {
      console.log('Login successful! Manually redirecting...');
      window.location.href = '/dashboard';
    }
  };

  const checkProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    console.log('Checking profile for user:', user.email);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log('Profile check:', { profile, error });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Auth Test Page</h1>
        
        <div className="space-y-2">
          <button
            onClick={testLogin}
            className="block w-64 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            1. Test Login & Redirect
          </button>
          
          <button
            onClick={checkProfile}
            className="block w-64 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            2. Check My Profile
          </button>
          
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="block w-64 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            3. Clear All Cache
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="block w-64 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            4. Go to Dashboard (Force)
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          Open browser console (F12) to see debug logs
        </div>
      </div>
    </div>
  );
}