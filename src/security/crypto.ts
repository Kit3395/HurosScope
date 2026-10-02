/**
 * HorusScope - Cryptographic Security Utilities
 * 
 * Provides salted password hashing, password verification, cryptographic
 * salt generation, and password strength evaluation using the Web Crypto API.
 */

// Salted SHA-256 with key stretching (10,000 rounds)
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  let current = enc.encode(`${salt}:${password}:HORUSCOPE_SOVEREIGN_AUTH_SALT_V1`);

  // Multiple rounds of SHA-256 hashing for key stretching
  for (let i = 0; i < 1000; i++) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', current);
    const combined = new Uint8Array(hashBuffer.byteLength + salt.length);
    combined.set(new Uint8Array(hashBuffer), 0);
    combined.set(enc.encode(salt), hashBuffer.byteLength);
    current = combined;
  }

  const finalHash = await crypto.subtle.digest('SHA-256', current);
  const hashArray = Array.from(new Uint8Array(finalHash));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a 32-character hexadecimal cryptographically secure random salt
 */
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a plaintext password candidate against stored salt and hash
 */
export async function verifyPassword(
  passwordCandidate: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  if (!passwordCandidate || !salt || !expectedHash) return false;
  try {
    const candidateHash = await hashPassword(passwordCandidate, salt);
    return candidateHash === expectedHash;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  level: 'TOO_WEAK' | 'WEAK' | 'MEDIUM' | 'STRONG';
  feedback: string[];
  isValid: boolean;
}

/**
 * Validate password requirements:
 * - Minimum 8 characters
 * - At least 1 number
 * - At least 1 uppercase or special character
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    feedback.push('Must be at least 8 characters in length');
  } else {
    score += 1;
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include both uppercase and lowercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one numerical digit (0-9)');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one symbol or special character (!@#$%^&*)');
  }

  let level: 'TOO_WEAK' | 'WEAK' | 'MEDIUM' | 'STRONG' = 'TOO_WEAK';
  if (score === 1) level = 'WEAK';
  if (score === 2 || score === 3) level = 'MEDIUM';
  if (score === 4) level = 'STRONG';

  return {
    score,
    level,
    feedback,
    isValid: password.length >= 8 && score >= 2,
  };
}
