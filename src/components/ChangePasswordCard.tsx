import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userAccessService } from '../services/userAccessService';

export const ChangePasswordCard: React.FC = () => {
  const { currentUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real-time password requirement checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasUppercase && hasNumber && hasSpecial && passwordsMatch && currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    if (!isFormValid) {
      setStatusMessage({
        type: 'error',
        text: 'Please satisfy all password security requirements and confirm your passwords match.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await userAccessService.changePassword(
        currentUser.email,
        currentPassword,
        newPassword,
        currentUser.userId
      );

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Password updated successfully. Cryptographic salt and SHA-256 hash have been refreshed.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to update password. Please verify your current password.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred while updating your password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Account Password & Cryptographic Credentials</h2>
            <span className="text-xs text-slate-500">
              Update your password. Encrypted and salted with PBKDF2/SHA-256 in the secure local vault.
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-semibold">
            {currentUser?.email || 'Active User'}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-start space-x-2.5 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        {/* Current Password */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showCurrent ? 'text' : 'password'}
              id="input-current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showNew ? 'text' : 'password'}
              id="input-new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter strong new password"
              className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Requirements Checklist */}
          <div className="grid grid-cols-2 gap-2 mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
            <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span>At least 8 characters</span>
            </div>
            <div className={`flex items-center space-x-1.5 ${hasUppercase ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasUppercase ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span>At least 1 uppercase letter</span>
            </div>
            <div className={`flex items-center space-x-1.5 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span>At least 1 number (0-9)</span>
            </div>
            <div className={`flex items-center space-x-1.5 ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span>At least 1 symbol (!@#$%)</span>
            </div>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <input
              type={showConfirm ? 'text' : 'password'}
              id="input-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="text-[11px] text-rose-600 font-medium mt-1">
              Passwords do not match.
            </p>
          )}
          {passwordsMatch && (
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 inline mr-1" /> Passwords match perfectly.
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            id="btn-submit-change-password"
            disabled={isSubmitting || !isFormValid}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSubmitting ? 'Updating Password...' : 'Save New Password'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
