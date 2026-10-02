import React, { useState } from 'react';
import { AuthBrandPanel } from '../components/auth/AuthBrandPanel';
import { LoginForm } from '../components/auth/LoginForm';
import { RequestAccessForm } from '../components/auth/RequestAccessForm';
import { AuthLogo } from '../components/auth/AuthLogo';
import { AuthFooter } from '../components/auth/AuthFooter';

export const Login: React.FC = () => {
  const [authMode, setAuthMode] = useState<'signin' | 'request-access'>('signin');

  return (
    <div className="horuscope-auth-page min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between selection:bg-amber-200 selection:text-slate-900 relative overflow-hidden">
      {/* Subtle Ambient Radial Glow */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-slate-300/30 blur-3xl"
        aria-hidden="true"
      />

      {/* Main Authentication Container */}
      <main className="auth-main flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Desktop Left Brand Panel (5 cols out of 12) */}
          <div className="hidden lg:block lg:col-span-5 h-full">
            <AuthBrandPanel />
          </div>

          {/* Mobile / Tablet Header (Visible only when left brand panel is hidden) */}
          <div className="lg:hidden col-span-1 text-center space-y-4 pt-4 pb-2">
            <div className="inline-flex justify-center">
              <AuthLogo size="lg" showWordmark={true} theme="light" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full border border-amber-300/80 bg-amber-50 text-xs font-semibold tracking-[0.2em] text-[#926C15] uppercase font-mono shadow-xs">
              FIND • ANALYZE • CONNECT • GROW
            </div>

            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Discover businesses, analyze digital presence, identify opportunities, and organize potential clients in one focused workspace.
            </p>
          </div>

          {/* Right Auth Area (7 cols out of 12) */}
          <div className="col-span-1 lg:col-span-7 flex flex-col items-center justify-center">
            {/* Segmented Mode Switcher */}
            <div className="w-full max-w-md mb-3">
              <div className="flex items-center p-1 bg-slate-200/80 border border-slate-300/60 rounded-xl shadow-inner">
                <button
                  type="button"
                  id="tab-sign-in"
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="tab-request-access"
                  onClick={() => setAuthMode('request-access')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'request-access'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Request Access
                </button>
              </div>
            </div>

            {/* Render Form based on Mode */}
            <div className="w-full">
              {authMode === 'signin' ? (
                <LoginForm onSwitchToRequestAccess={() => setAuthMode('request-access')} />
              ) : (
                <RequestAccessForm onSwitchToSignIn={() => setAuthMode('signin')} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Light Footer */}
      <AuthFooter />
    </div>
  );
};
