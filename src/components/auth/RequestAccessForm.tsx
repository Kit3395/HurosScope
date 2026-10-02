import React, { useState } from 'react';
import { userAccessService } from '../../services/userAccessService';
import { AuthStatus } from './AuthStatus';
import { UserRole } from '../../types';
import { CheckCircle2, ArrowLeft, Send, ShieldCheck } from 'lucide-react';

interface RequestAccessFormProps {
  onSwitchToSignIn: () => void;
  className?: string;
}

export const RequestAccessForm: React.FC<RequestAccessFormProps> = ({
  onSwitchToSignIn,
  className = '',
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('OPERATOR');
  const [reason, setReason] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    organization?: string;
    reason?: string;
  }>({});

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }

    if (!email.trim()) {
      errors.email = 'Business email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!organization.trim()) {
      errors.organization = 'Company or organization is required.';
    }

    if (!reason.trim()) {
      errors.reason = 'Please briefly state your operational need.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      userAccessService.submitAccessRequest({
        fullName: fullName.trim(),
        email: email.trim(),
        organization: organization.trim(),
        requestedRole,
        reason: reason.trim(),
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to submit request. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-7 sm:p-9 shadow-xl text-slate-900 ${className}`}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-slate-900">
              Access Request Submitted
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
              Your application for <span className="font-semibold text-slate-900">{email}</span> has been received and queued for review.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#B48C36]" />
              <span>What happens next?</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Our workspace administrators review credential requests during standard operations. You will be granted access upon approval.
            </p>
          </div>

          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-7 sm:p-9 shadow-xl text-slate-900 ${className}`}>
      {/* Header */}
      <div className="space-y-1.5 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Request Access
          </h2>
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-xs font-semibold text-[#B48C36] hover:text-[#926C15] flex items-center space-x-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>
        <p className="text-xs sm:text-sm text-slate-600">
          Apply for authorized access to the HoruScope intelligence workspace.
        </p>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-5 space-y-2">
          <AuthStatus type="error" message={errorMessage} />
          {errorMessage.toLowerCase().includes('already awaiting') && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
              <span>Your request is queued. An administrator will review and grant access.</span>
              <button
                type="button"
                onClick={onSwitchToSignIn}
                className="font-bold underline text-amber-900 hover:text-black shrink-0 ml-2"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <div className="space-y-1">
          <label htmlFor="req-name" className="block text-xs font-semibold uppercase text-slate-700 font-mono tracking-wider">
            Full Name
          </label>
          <input
            id="req-name"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            disabled={isLoading}
            required
            placeholder="Jane Doe"
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
              fieldErrors.fullName
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-300 focus:border-[#B48C36] focus:ring-[#B48C36]/20'
            }`}
          />
          {fieldErrors.fullName && (
            <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.fullName}</p>
          )}
        </div>

        {/* Business Email */}
        <div className="space-y-1">
          <label htmlFor="req-email" className="block text-xs font-semibold uppercase text-slate-700 font-mono tracking-wider">
            Business Email
          </label>
          <input
            id="req-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={isLoading}
            required
            placeholder="jane@company.com"
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-300 focus:border-[#B48C36] focus:ring-[#B48C36]/20'
            }`}
          />
          {fieldErrors.email && (
            <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.email}</p>
          )}
        </div>

        {/* Organization / Company */}
        <div className="space-y-1">
          <label htmlFor="req-org" className="block text-xs font-semibold uppercase text-slate-700 font-mono tracking-wider">
            Company / Organization
          </label>
          <input
            id="req-org"
            type="text"
            value={organization}
            onChange={(e) => {
              setOrganization(e.target.value);
              if (fieldErrors.organization) setFieldErrors((prev) => ({ ...prev, organization: undefined }));
            }}
            disabled={isLoading}
            required
            placeholder="Acme Growth Partners"
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
              fieldErrors.organization
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-300 focus:border-[#B48C36] focus:ring-[#B48C36]/20'
            }`}
          />
          {fieldErrors.organization && (
            <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.organization}</p>
          )}
        </div>

        {/* Requested Role / Objective */}
        <div className="space-y-1">
          <label htmlFor="req-role" className="block text-xs font-semibold uppercase text-slate-700 font-mono tracking-wider">
            Operational Focus
          </label>
          <select
            id="req-role"
            value={requestedRole}
            onChange={(e) => setRequestedRole(e.target.value as UserRole)}
            disabled={isLoading}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#B48C36] focus:ring-2 focus:ring-[#B48C36]/20 cursor-pointer"
          >
            <option value="OPERATOR">Operator • Lead Discovery & Outreach</option>
            <option value="VIEWER">Analyst • Read-Only Intelligence & Audits</option>
            <option value="DIRECTOR">Director • Strategy & Team Coordination</option>
          </select>
        </div>

        {/* Reason / Use Case */}
        <div className="space-y-1">
          <label htmlFor="req-reason" className="block text-xs font-semibold uppercase text-slate-700 font-mono tracking-wider">
            Intended Use Case
          </label>
          <textarea
            id="req-reason"
            rows={2}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (fieldErrors.reason) setFieldErrors((prev) => ({ ...prev, reason: undefined }));
            }}
            disabled={isLoading}
            required
            placeholder="e.g. B2B prospect discovery and market diagnostics for Midwest dental practices..."
            className={`w-full px-3.5 py-2 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 resize-none ${
              fieldErrors.reason
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-300 focus:border-[#B48C36] focus:ring-[#B48C36]/20'
            }`}
          />
          {fieldErrors.reason && (
            <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.reason}</p>
          )}
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-2 font-mono bg-[#B48C36] hover:bg-[#9B762A] text-white shadow-sm hover:shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>SUBMITTING...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>SUBMIT ACCESS REQUEST</span>
              </>
            )}
          </button>
        </div>

        {/* Already have an account */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already authorized?{' '}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="font-semibold text-slate-900 hover:text-[#B48C36] transition-colors underline cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
