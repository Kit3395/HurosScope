/**
 * HoruScope - Authentication Form Validation Utilities
 * 
 * Provides client-side validation rules for authentication inputs.
 * Emits concise, privacy-conscious validation messages.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// RFC 5322 compliant simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Email address is required.',
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address.',
    };
  }

  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return {
      isValid: false,
      error: 'Password is required.',
    };
  }

  return { isValid: true };
}

export function validateLoginForm(email: string, password: string): { isValid: boolean; error?: string } {
  const emailRes = validateEmail(email);
  if (!emailRes.isValid) {
    return emailRes;
  }

  const passwordRes = validatePassword(password);
  if (!passwordRes.isValid) {
    return passwordRes;
  }

  return { isValid: true };
}
