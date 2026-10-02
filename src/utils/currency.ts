/**
 * Currency Formatting Utility - Philippine Peso (PHP / ₱)
 */
export function formatPHP(amount: number | undefined | null): string {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function parsePHP(input: string): number {
  const clean = input.replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}
