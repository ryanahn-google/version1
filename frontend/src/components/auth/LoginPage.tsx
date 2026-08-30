import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, LogIn, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

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
  const { loginWithGoogle, devLogin, googleClientId, devLoginEnabled, error, isLoading } = useAuth();
  const { locale, toggleLocale, t } = useLanguage();
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
                setAuthError(err instanceof Error ? err.message : t.auth.googleLoginFailed);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
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
  }, [googleClientId, loginWithGoogle, t.auth.googleLoginFailed]);

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthError(null);
      await devLogin(devEmail, devEmail.split('@')[0] || 'Dev Marketer');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : t.auth.devLoginFailed);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background subtle ambient glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Language Switcher Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={toggleLocale}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur hover:bg-white shadow-sm text-slate-700 text-xs font-semibold flex items-center gap-2 transition"
          title={t.header.switchLang}
        >
          <Globe className="h-4 w-4 text-blue-600" />
          <span className="font-mono font-bold">{locale.toUpperCase()}</span>
          <span className="text-[11px] text-slate-400 font-normal">
            {locale === 'ko' ? '한국어' : 'English'}
          </span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full space-y-6 bg-white border border-[#e2e8f0] p-8 rounded-3xl shadow-xl z-10">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/25 mb-1 text-white font-bold text-lg">
            M
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              MVC
            </h2>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              {t.auth.brandTitle}
            </p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {t.auth.platformDesc}
          </p>
        </div>

        {/* Error Notification Banner */}
        {(error || authError) && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
            {authError || error}
          </div>
        )}

        {/* Authentication Options */}
        <div className="space-y-4 pt-1">
          {/* Official Google Sign-In Container */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!googleClientId && (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center">
                  {t.auth.loadingGoogleClientId}
                </div>
              )}
            </div>
          </div>

          {/* Developer Login Section (Hidden in staging/production) */}
          {devLoginEnabled && (
            <>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                  {t.auth.orDevLogin}
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Quick Dev Login */}
              {!showDevInputs ? (
                <button
                  type="button"
                  onClick={() => devLogin()}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#1a56db] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-sm disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{t.auth.devLoginBtn}</span>
                </button>
              ) : (
                <form onSubmit={handleDevSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.auth.mockMarketerEmailLabel}
                    </label>
                    <input
                      type="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>{t.auth.loginWithEmailBtn}</span>
                  </button>
                </form>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowDevInputs(!showDevInputs)}
                  className="text-[11px] text-slate-500 hover:text-blue-600 underline transition"
                >
                  {showDevInputs ? t.auth.switchToDefaultDev : t.auth.switchDirectEmail}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Security & Isolation Notice */}
        <div className="pt-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 inline" />
            <span>{t.auth.securityNotice}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
