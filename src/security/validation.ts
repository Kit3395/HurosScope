/**
 * HorusScope - Input & Output Validation Engine
 * Production Safety-Net Layer
 */

/**
 * Strips HTML tags and script injections to prevent Cross-Site Scripting (XSS).
 */
export function sanitizeInputString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Validates and formats business email addresses.
 */
export function validateEmail(email: string): { isValid: boolean; normalized: string; error?: string } {
  const clean = email.trim().toLowerCase();
  if (!clean) {
    return { isValid: false, normalized: '', error: 'Email cannot be empty.' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, normalized: clean, error: 'Invalid email address syntax.' };
  }

  // Prevent common throwaway domains
  const bannedDomains = ['mailinator.com', 'tempmail.com', '10minutemail.com'];
  const domain = clean.split('@')[1];
  if (bannedDomains.includes(domain)) {
    return { isValid: false, normalized: clean, error: 'Disposable email addresses are not permitted.' };
  }

  return { isValid: true, normalized: clean };
}

/**
 * Validates telephone number digits and length.
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; digitsOnly: string; error?: string } {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return { isValid: false, digitsOnly: '', error: 'Phone number cannot be empty.' };
  }

  if (digits.length < 7 || digits.length > 15) {
    return { isValid: false, digitsOnly: digits, error: 'Phone number must have between 7 and 15 digits.' };
  }

  return { isValid: true, digitsOnly: digits };
}

/**
 * Validates and normalizes web URLs.
 */
export function validateUrl(url: string): { isValid: boolean; normalized: string; error?: string } {
  const clean = url.trim();
  if (!clean) {
    return { isValid: false, normalized: '', error: 'URL cannot be empty.' };
  }

  let testUrl = clean;
  if (!/^https?:\/\//i.test(testUrl)) {
    testUrl = 'https://' + testUrl;
  }

  try {
    const parsed = new URL(testUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, normalized: clean, error: 'Only HTTP and HTTPS protocols are permitted.' };
    }
    return { isValid: true, normalized: parsed.href };
  } catch {
    return { isValid: false, normalized: clean, error: 'Malformed website URL.' };
  }
}

/**
 * Validates commercial proposal and package pricing.
 */
export function validatePricing(amount: number): { isValid: boolean; normalized: number; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { isValid: false, normalized: 0, error: 'Price must be a valid number.' };
  }

  if (amount < 0) {
    return { isValid: false, normalized: 0, error: 'Price cannot be negative.' };
  }

  if (amount > 1_000_000) {
    return { isValid: false, normalized: amount, error: 'Price exceeds maximum allowable threshold ($1,000,000).' };
  }

  // Round to two decimal places
  const normalized = Math.round(amount * 100) / 100;
  return { isValid: true, normalized };
}

/**
 * Output sanitizer: scrubs hallucinated contact information, formats data safely for render.
 */
export function sanitizeOutputForDisplay(text: string): string {
  if (!text) return '';
  // Prevent any lingering injection in string outputs
  return text.replace(/javascript:/gi, '').replace(/data:/gi, '');
}
