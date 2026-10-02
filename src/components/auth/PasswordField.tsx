import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id = 'password',
  value,
  onChange,
  disabled = false,
  error,
  placeholder = 'Enter your password',
  required = true,
  autoComplete = 'current-password',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase text-slate-700 font-mono tracking-wider"
      >
        Password
      </label>

      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors pr-11 focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              : 'border-slate-300 focus:border-[#B48C36] focus:ring-[#B48C36]/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-[#B48C36] transition-colors rounded-lg cursor-pointer"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} className="text-[11px] text-rose-600 font-medium pt-0.5">
          {error}
        </p>
      )}
    </div>
  );
};
