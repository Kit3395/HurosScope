/**
 * Currency Truth: HoruScope operates in Philippine Peso (PHP / ₱).
 *
 * Legacy model fields named `*USD` (Proposal.totalUSD, Lead.estimatedDealValueUSD,
 * ProposalItem.fixedPriceUSD) hold PHP amounts despite their names — a naming
 * debt from the original schema. Do NOT convert them; format them as PHP.
 * New fields must use PHP-suffixed names.
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
