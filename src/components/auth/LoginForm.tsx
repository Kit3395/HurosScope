import React, { useState, useEffect } from 'react';
import { PasswordField } from './PasswordField';
import { AuthStatus } from './AuthStatus';
import { validateLoginForm } from '../../utils/authValidation';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Lock, HelpCircle, X } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRequestAccess?: () => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRequestAccess,
  className = '',
}) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Load remembered email on mount if previously enabled
  useEffect(() => {
    const savedEmail = authService.getRememberedEmail();
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate simultaneous execution
    if (isLoading || authService.isBusy()) return;

    setErrorMessage(null);
    setFieldErrors({});

    // Client-side validation
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      if (validation.error?.includes('Email') || validation.error?.includes('email')) {
        setFieldErrors({ email: validation.error });
      } else if (validation.error?.includes('Password') || validation.error?.includes('password')) {
        setFieldErrors({ password: validation.error });
      } else {
        setErrorMessage(validation.error || 'Please fill in all required fields.');
      }
      return;
    }

    setIsLoading(true);

    try {
      // Authenticate through the centralized AuthContext / authService
      const res = await login(email.trim(), password);

      if (res.success) {
        // Save or clear remembered email
        authService.setRememberedEmail(email, rememberMe);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Display concise, safe error message without technical details
        const safeError = res.error?.includes('lock') || res.error?.includes('Lock')
          ? res.error
          : res.error?.includes('attempt')
          ? res.error
          : 'Invalid email or password.';
        setErrorMessage(safeError);
      }
    } catch {
      setErrorMessage('Unable to sign in right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = isLoading || !email.trim() || !password.trim();

  return (
    <div
      className={`w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-7 sm:p-9 shadow-xl text-slate-900 ${className}`}
    >
      {/* Header */}
      <div className="space-y-1.5 mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome Back
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Sign in to access your intelligence workspace.
        </p>
      </div>

      {/* Status Notice */}
      {errorMessage && (
        <div className="mb-5">
          <AuthStatus type="error" message={errorMessage} />
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email Address Field */}
        <div className="space-y-1">
          <label
            htmlFor="auth-email"
            className="block text-xs font-semibold uppercase text-slate-700 font-mono tracking-wider"
          >
            Email Address
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            disabled={isLoading}
            required
            autoComplete="email"
            placeholder="name@company.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-300 focus:border-[#B48C36] focus:ring-[#B48C36]/20'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {fieldErrors.email && (
            <p id="auth-email-error" className="text-[11px] text-rose-600 font-medium pt-0.5">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <PasswordField
            id="auth-password"
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            disabled={isLoading}
            error={fieldErrors.password}
            placeholder="••••••••••••"
          />
        </div>

        {/* Options Row: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center space-x-2.5 cursor-pointer select-none text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 rounded border-slate-300 bg-white text-[#B48C36] focus:ring-[#B48C36] focus:ring-offset-0 focus:ring-1 accent-[#B48C36] cursor-pointer"
            />
            <span className="font-medium text-xs">Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setIsForgotModalOpen(true)}
            className="text-xs text-[#B48C36] hover:text-[#926C15] transition-colors font-medium focus:outline-none focus:underline cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full py-3.5 px-5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-2 font-mono ${
              isLoading
                ? 'bg-[#A38030] text-white cursor-wait opacity-90'
                : isButtonDisabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-[#B48C36] hover:bg-[#9B762A] active:bg-[#856404] text-white cursor-pointer shadow-sm hover:shadow'
            }`}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>SIGNING IN...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>SIGN IN</span>
              </>
            )}
          </button>
        </div>

        {/* Request Access Switch */}
        {onSwitchToRequestAccess && (
          <div className="text-center pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Need authorized access?{' '}
              <button
                type="button"
                onClick={onSwitchToRequestAccess}
                className="font-semibold text-slate-900 hover:text-[#B48C36] transition-colors underline cursor-pointer"
              >
                Request Access
              </button>
            </p>
          </div>
        )}
      </form>

      {/* Clean Forgot Password Dialogue (Light Mode) */}
      {isForgotModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-pwd-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-[#B48C36]">
                <HelpCircle className="w-5 h-5" />
                <h3 id="forgot-pwd-title" className="text-sm font-bold text-slate-900">
                  Password Assistance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              HoruScope is an enterprise intelligence workspace. To reset your credentials or verify account status, please contact your workspace administrator directly.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-700">
              SECURITY DOMAIN: HORUSCOPE-AUTH-GATE
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
