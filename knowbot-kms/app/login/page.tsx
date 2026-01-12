'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('darpan9864033890@gmail.com');
  const [password, setPassword] = useState('123456789');
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasRedirectedRef = useRef(false); // Use ref to persist across renders and prevent loops

  const { signInWithMagicLink, signInWithPassword, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // NEW APPROACH: Only redirect if user is authenticated AND we're on login page
  // Use a simple check without complex timing logic
  useEffect(() => {
    if (user && !authLoading && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      // Only redirect from login page, not if already on dashboard
      if ((currentPath === '/login' || currentPath === '/') && !hasRedirectedRef.current) {
        console.log('[Login] User authenticated, redirecting to dashboard...');
        hasRedirectedRef.current = true;
        // Small delay to ensure session is fully set
        setTimeout(() => {
          router.replace('/dashboard');
        }, 200);
      }
    }
  }, [user, authLoading, router]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // If user exists and auth check is done
  if (user && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-4">✅ Already logged in</div>
          <div className="text-gray-600 mb-6">Redirecting to dashboard...</div>
          <div className="text-sm text-gray-500">If stuck, click:</div>
          <div className="space-x-4 mt-2">
            <button
              onClick={() => {
                // Use router.push for client-side navigation
                router.push('/dashboard');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Logout & Clear
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      if (isMagicLink) {
        await signInWithMagicLink(email);
        setMessage({
          text: 'Check your email for the magic link!',
          type: 'success',
        });
      } else {
        await signInWithPassword(email, password);
        setMessage({ text: 'Login successful!', type: 'success' });
        // AuthContext will handle the redirect
      }
    } catch (error: any) {
      setMessage({
        text: `Error: ${error.message}`,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ MAIN LOGIN PAGE (only shown if NOT logged in)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to EasyKMS
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            
            {!isMagicLink && (
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="magic-link-mode"
              name="magic-link-mode"
              type="checkbox"
              checked={isMagicLink}
              onChange={(e) => setIsMagicLink(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="magic-link-mode" className="ml-2 block text-sm text-gray-900">
              Send magic link instead
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : isMagicLink ? 'Send Magic Link' : 'Sign in'}
            </button>
          </div>
        </form>

        {message && (
          <div
            className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
          >
            <div className="text-sm">{message.text}</div>
          </div>
        )}

        {/* Debug buttons */}
        <div className="text-center space-y-2">
          <button
            onClick={() => {
              console.log('Current auth state:', { user, authLoading });
              console.log('Local storage:', localStorage.getItem('supabase.auth.token'));
            }}
            className="text-sm text-gray-500 underline"
          >
            Debug Auth State
          </button>
          <br />
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="text-sm text-red-500 underline"
          >
            Clear All Sessions
          </button>
        </div>
      </div>
    </div>
  );
}