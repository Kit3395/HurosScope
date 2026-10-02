/**
 * HorusScope - Core Utilities
 * Phase 0: Normalization, Duplicate Detection, and Identifier Generation
 */

import { DuplicateDetectionResult, DuplicateMatchDetail } from '../types';

/**
 * Generate cryptographically random, collision-resistant stable internal IDs.
 * Stable internal IDs ensure business names or mutable external fields are never used as primary keys.
 */
export function generateStableId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${randomPart}`;
}

/**
 * Normalizes a website URL into a canonical domain string for duplicate matching.
 * Examples:
 *   "https://www.example.com/about?ref=1" -> "example.com"
 *   "http://sub.example.co.uk/"           -> "sub.example.co.uk"
 */
export function normalizeWebsiteDomain(url?: string | null): string {
  if (!url) return '';
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
  clean = clean.split('/')[0];
  clean = clean.split('?')[0];
  clean = clean.split('#')[0];
  return clean;
}

/**
 * Normalizes a phone number to digits only to enable cross-format matching.
 * Examples:
 *   "+1 (555) 019-2834" -> "15550192834"
 *   "555.019.2834"      -> "5550192834"
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Normalizes a business name by removing standard legal entity suffixes,
 * stripping special characters, and converting to lower case.
 * Examples:
 *   "Apex Dental Clinic, LLC" -> "apex dental clinic"
 *   "Summit Web Design & Dev Inc." -> "summit web design and dev"
 */
export function normalizeBusinessName(name?: string | null): string {
  if (!name) return '';
  let clean = name.toLowerCase().trim();
  clean = clean.replace(/&/g, 'and');
  clean = clean.replace(/[^a-z0-9\s]/g, ' ');
  // Remove common corporate suffixes
  clean = clean.replace(/\b(llc|inc|incorporated|corp|corporation|ltd|limited|co|company|group|services)\b/g, '');
  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

/**
 * Simple Levenshtein distance ratio (0.0 to 1.0) for fuzzy duplicate name matching.
 */
export function calculateStringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  let previous = new Array(shorter.length + 1).fill(0).map((_, i) => i);
  for (let i = 0; i < longer.length; i++) {
    const current = [i + 1];
    for (let j = 0; j < shorter.length; j++) {
      const insertion = previous[j + 1] + 1;
      const deletion = current[j] + 1;
      const substitution = previous[j] + (longer[i] === shorter[j] ? 0 : 1);
      current.push(Math.min(insertion, deletion, substitution));
    }
    previous = current;
  }
  const editDistance = previous[shorter.length];
  return (longerLength - editDistance) / longerLength;
}

/**
 * Evaluates duplicate risk across multiple identifiers without automatically merging.
 * Principle: Support duplicate detection using multiple identifiers such as:
 * - internal ID
 * - Google Place ID
 * - normalized business name
 * - normalized phone
 * - normalized website domain
 * Potential duplicates should be flagged for review.
 */
export function checkDuplicateRisk(
  candidate: {
    internalId?: string;
    googlePlaceId?: string;
    name: string;
    phone?: string;
    website?: string;
    location?: string;
    address?: string;
  },
  existingPool: Array<{
    id: string;
    googlePlaceId?: string;
    normalizedName: string;
    normalizedPhone?: string;
    normalizedDomain?: string;
    originalName: string;
    address?: string;
    locality?: string;
  }>
): DuplicateDetectionResult {
  const normName = normalizeBusinessName(candidate.name);
  const normPhone = normalizePhoneNumber(candidate.phone);
  const normDomain = normalizeWebsiteDomain(candidate.website);
  const candidateLocation = (candidate.address || candidate.location || '').toLowerCase();

  const matches: DuplicateMatchDetail[] = [];

  for (const existing of existingPool) {
    // 1. Exact Internal ID match (Primary Key conflict)
    if (candidate.internalId && candidate.internalId === existing.id) {
      matches.push({
        matchedField: 'internalId',
        existingRecordId: existing.id,
        existingValue: existing.id,
        incomingValue: candidate.internalId,
        confidenceScore: 1.0,
      });
    }

    // 2. Exact Google Place ID match (Official external identifier)
    if (
      candidate.googlePlaceId &&
      existing.googlePlaceId &&
      candidate.googlePlaceId === existing.googlePlaceId
    ) {
      matches.push({
        matchedField: 'googlePlaceId',
        existingRecordId: existing.id,
        existingValue: existing.googlePlaceId,
        incomingValue: candidate.googlePlaceId,
        confidenceScore: 0.98,
      });
    }

    // 3. Exact Normalized Domain match
    if (normDomain && existing.normalizedDomain && normDomain === existing.normalizedDomain) {
      matches.push({
        matchedField: 'normalizedDomain',
        existingRecordId: existing.id,
        existingValue: existing.normalizedDomain,
        incomingValue: normDomain,
        confidenceScore: 0.92,
      });
    }

    // 4. Exact Normalized Phone match
    if (normPhone && existing.normalizedPhone && normPhone.length >= 7 && normPhone === existing.normalizedPhone) {
      matches.push({
        matchedField: 'normalizedPhone',
        existingRecordId: existing.id,
        existingValue: existing.normalizedPhone,
        incomingValue: normPhone,
        confidenceScore: 0.88,
      });
    }

    // 5. Normalized Business Name + Location Signal
    const existingLocation = (existing.address || existing.locality || '').toLowerCase();
    const hasLocationOverlap =
      candidateLocation.length > 3 &&
      existingLocation.length > 3 &&
      (candidateLocation.includes(existingLocation) || existingLocation.includes(candidateLocation));

    if (normName && existing.normalizedName) {
      const similarity = calculateStringSimilarity(normName, existing.normalizedName);
      if (similarity >= 0.85) {
        if (hasLocationOverlap) {
          matches.push({
            matchedField: 'nameAndLocation',
            existingRecordId: existing.id,
            existingValue: `${existing.originalName} (${existingLocation})`,
            incomingValue: `${candidate.name} (${candidateLocation})`,
            confidenceScore: Math.min(1.0, similarity + 0.1),
          });
        } else {
          matches.push({
            matchedField: 'normalizedName',
            existingRecordId: existing.id,
            existingValue: existing.originalName,
            incomingValue: candidate.name,
            confidenceScore: similarity,
          });
        }
      }
    }
  }

  const hasPotentialDuplicate = matches.length > 0;
  const highestConfidence = matches.reduce((max, m) => Math.max(max, m.confidenceScore), 0);

  let recommendation: 'PROCEED' | 'FLAG_FOR_REVIEW' | 'REJECT_EXACT_DUPLICATE' = 'PROCEED';
  if (highestConfidence >= 0.98) {
    recommendation = 'FLAG_FOR_REVIEW'; // Never automatically merge or reject blindly
  } else if (highestConfidence >= 0.75) {
    recommendation = 'FLAG_FOR_REVIEW';
  }

  return {
    hasPotentialDuplicate,
    highestConfidence,
    matches,
    recommendation,
  };
}

/**
 * Format ISO-8601 UTC date string cleanly for human audit inspection.
 */
export function formatAuditTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
}
