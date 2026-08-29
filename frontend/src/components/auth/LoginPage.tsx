import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, devLogin, googleClientId, error, isLoading } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState<string>('dev-marketer@gmail.com');
  const [showDevInputs, setShowDevInputs] = useState<boolean>(false);

  useEffect(() => {
    if (!googleClientId) return;

    // Load Google Identity Services script
    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const setupGsi = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: { credential: string }) => {
              try {
                setAuthError(null);
                await loginWithGoogle(response.credential);
              } catch (err: unknown) {
                setAuthError(err instanceof Error ? err.message : 'Google login failed.');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 280,
          });
        } catch (e) {
          console.error('Failed to initialize Google Sign-In button:', e);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = setupGsi;
      document.body.appendChild(script);
    } else {
      setupGsi();
    }
  }, [googleClientId, loginWithGoogle]);

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthError(null);
      await devLogin(devEmail, devEmail.split('@')[0] || 'Dev Marketer');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Dev login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/25 mb-1">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Nova Electronics Corp
          </h2>
          <p className="text-xs uppercase tracking-widest font-semibold text-blue-400">
            Marketing Value Creator (MVC)
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Autonomous 4-Agent Campaign DAG with Human-in-the-Loop review gates.
          </p>
        </div>

        {/* Subagent DAG Pills */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-400 py-1">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>P1: Market Sensing</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>P2: Strategy & Brief</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>P3: Creative Content</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>P4: Insights & ROAS</span>
          </div>
        </div>

        {/* Error Notification */}
        {(error || authError) && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300">
            {authError || error}
          </div>
        )}

        {/* Authentication Actions */}
        <div className="space-y-4 pt-2">
          {/* Official Google Sign-In Container */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!googleClientId && (
                <div className="text-xs text-slate-500 bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-2.5 text-center">
                  Google OAuth Client ID not yet detected in environment.
                </div>
              )}
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500">
              or local development
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Local Dev Mock Login */}
          {!showDevInputs ? (
            <button
              type="button"
              onClick={() => devLogin()}
              disabled={isLoading}
              className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Quick Dev Login (dev-marketer@gmail.com)
            </button>
          ) : (
            <form onSubmit={handleDevSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Mock Marketer Email:
                </label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors"
              >
                Sign In with Custom Mock Email
              </button>
            </form>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowDevInputs(!showDevInputs)}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
            >
              {showDevInputs ? 'Use default mock account' : 'Customize mock dev email'}
            </button>
          </div>
        </div>

        {/* Security & Isolation Notice */}
        <div className="pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400">
            🔒 Session cookies backed by Cloud SQL with strict UUID-based GCS artifact isolation.
          </p>
        </div>
      </div>
    </div>
  );
};
