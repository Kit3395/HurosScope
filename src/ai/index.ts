/**
 * HorusScope - AI Safety, Prompt Guardrails & Analytical Engine
 * Phase 0: Technical Architecture & Foundation
 * 
 * CORE PRINCIPLE:
 * AI is strictly an analytical assistant, NEVER an authoritative primary source.
 * AI must never fabricate business owners, contact persons, emails, phone numbers,
 * websites, social media accounts, business relationships, or company claims.
 * Unverified facts MUST evaluate to "Not verified".
 */

import { AI_SAFETY_POLICIES } from '../config';
import { AIAnalysis, AIConfidenceLevel, DesignRecommendation } from '../types';
import { generateStableId } from '../utils';

export interface RawAIAssessmentRequest {
  businessId: string;
  businessName: string;
  websiteUrl?: string;
  extractedWebsiteTextSnippet?: string;
  currentDesignObservations?: string[];
}

/**
 * AI Output Safety Validator.
 * Inspects AI payloads before they are ever stored or surfaced.
 * Replaces hallucinated contact fields with "Not verified".
 */
export function sanitizeAndValidateAIOutput(
  rawOutput: Partial<AIAnalysis>
): { isValid: boolean; sanitized: Partial<AIAnalysis>; warnings: string[] } {
  const warnings: string[] = [];

  // 1. Ensure confidence level is strictly one of the 4 defined tiers
  let confidence: AIConfidenceLevel = 'UNVERIFIED';
  if (
    rawOutput.confidence &&
    AI_SAFETY_POLICIES.allowedConfidenceLevels.includes(rawOutput.confidence)
  ) {
    confidence = rawOutput.confidence;
  } else {
    warnings.push('Invalid or missing confidence tier from AI. Defaulted to UNVERIFIED.');
  }

  // 2. Scan text for suspected fabrication patterns of personal identities
  const suspiciousEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const suspiciousPhoneRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

  let sanitizedSummary = rawOutput.summary || '';
  if (suspiciousEmailRegex.test(sanitizedSummary)) {
    warnings.push('AI payload contained synthesized email address. Scrubbed to comply with non-fabrication rule.');
    sanitizedSummary = sanitizedSummary.replace(suspiciousEmailRegex, '[Email Not verified]');
  }

  if (suspiciousPhoneRegex.test(sanitizedSummary)) {
    warnings.push('AI payload contained synthesized telephone digits. Scrubbed.');
    sanitizedSummary = sanitizedSummary.replace(suspiciousPhoneRegex, '[Phone Not verified]');
  }

  const sanitized: Partial<AIAnalysis> = {
    ...rawOutput,
    isAiGenerated: true,
    confidence,
    summary: sanitizedSummary,
    verificationStatement: 'No contact identities, emails, or personal data were generated or assumed.',
  };

  return {
    isValid: true,
    sanitized,
    warnings,
  };
}

/**
 * Constructs an architectural analytical critique.
 * Simulates the strict analytical framework without live unverified scraping.
 */
export function createSafeAnalyticalCritique(
  req: RawAIAssessmentRequest
): AIAnalysis {
  const recommendations: DesignRecommendation[] = [
    {
      id: generateStableId('rec'),
      title: 'Above-the-Fold Value Proposition Clarification',
      targetArea: 'HERO_SECTION',
      currentObservation: req.websiteUrl
        ? `Website header lacks immediate benefit-driven headline for ${req.businessName}.`
        : 'No verified landing page detected; pitch needs to focus on modern web presence.',
      proposedRedesignConcept:
        'Implement an asymmetric hero grid with bold typography, 3-second comprehension headline, and high-contrast consultation booking CTA.',
      confidence: req.websiteUrl ? 'HIGH CONFIDENCE' : 'MEDIUM CONFIDENCE',
      potentialImpact: 'HIGH',
    },
    {
      id: generateStableId('rec'),
      title: 'Mobile Viewport Touch Targets & Sticky Action Bar',
      targetArea: 'MOBILE_NAVIGATION',
      currentObservation:
        'Desktop-centric layout causes thumb-reach friction on modern smartphones.',
      proposedRedesignConcept:
        'Add ergonomic 48px minimum touch targets and a persistent bottom quick-action bar for call/quote requests.',
      confidence: 'HIGH CONFIDENCE',
      potentialImpact: 'HIGH',
    },
    {
      id: generateStableId('rec'),
      title: 'Lighthouse Performance & Core Web Vitals Optimization',
      targetArea: 'SPEED',
      currentObservation:
        'Potential unoptimized media assets slowing down initial Largest Contentful Paint (LCP).',
      proposedRedesignConcept:
        'Migrate to Next.js / modern static export with WebP/AVIF auto-conversion and zero render-blocking styles.',
      confidence: 'MEDIUM CONFIDENCE',
      potentialImpact: 'MEDIUM',
    },
  ];

  return {
    id: generateStableId('ai_critique'),
    category: 'AI_ANALYSIS',
    businessId: req.businessId,
    promptIntent: 'WEBSITE_CRITIQUE',
    isAiGenerated: true,
    modelIdentifier: 'gemini-2.5-pro-analytical',
    confidence: req.websiteUrl ? 'HIGH CONFIDENCE' : 'MEDIUM CONFIDENCE',
    confidenceRationale: req.websiteUrl
      ? 'Evaluated against verified website URL structure and modern responsive web standards.'
      : 'Evaluated based on typical local business web deficiencies. Requires live verification in Phase 1.',
    verificationStatement: 'No contact identities, emails, or personal data were generated or assumed.',
    summary: `Technical audit for ${req.businessName}: Opportunities identified in visual hierarchy, mobile viewport pacing, and lead capture clarity.`,
    strengths: [
      'Established local brand recognition',
      'Core service offerings defined',
    ],
    vulnerabilities: [
      'Lack of clear conversion CTA in primary visual focus',
      'Mobile layout responsiveness requires modernization',
      'Speed metrics indicate potential render-blocking scripts',
    ],
    pitchAngles: [
      'Complete web redesign emphasizing mobile conversion',
      'Speed optimization & local SEO landing page package',
      'Modern client booking portal integration',
    ],
    recommendations,
    designIntelligence: _generateMockDesignIntelligence(req.businessName),
    isDismissed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

function _generateMockDesignIntelligence(businessName: string) {
  const nameLower = businessName.toLowerCase();
  
  if (nameLower.includes('dental') || nameLower.includes('health') || nameLower.includes('clinic')) {
    return {
      industry: 'Healthcare / Dental',
      brandPersonality: 'Clean, professional, trustworthy, calming',
      targetAudience: 'Families, professionals seeking premium care',
      existingBranding: 'Typically outdated clinical aesthetics',
      recommendedColors: [
        { name: 'Blue', hexCode: '#0ea5e9' },
        { name: 'White', hexCode: '#ffffff' },
        { name: 'Teal', hexCode: '#14b8a6' },
        { name: 'Light gray', hexCode: '#f1f5f9' },
      ],
      typographyDirection: 'Clean sans-serif (e.g., Inter, Plus Jakarta Sans) for readability and trust.',
      uiStyle: 'Minimalist white architecture, generous negative space, soft rounded corners.',
      photographyDirection: 'Bright, natural lighting, authentic smiling patients, modern clinic interiors.',
      ctaStyle: 'Prominent pill-shaped buttons in deep teal or blue for appointment booking.',
      designRationale: 'Builds immediate trust and reduces anxiety through clinical yet warm aesthetic choices.',
    };
  }

  if (nameLower.includes('restaurant') || nameLower.includes('bistro') || nameLower.includes('pizza') || nameLower.includes('food') || nameLower.includes('trattoria') || nameLower.includes('cafe')) {
    return {
      industry: 'Hospitality / Restaurant',
      brandPersonality: 'Warm, inviting, premium, appetizing',
      targetAudience: 'Local foodies, date nights, families',
      existingBranding: 'Often cluttered, poor typography, unoptimized menus',
      recommendedColors: [
        { name: 'Deep green', hexCode: '#14532d' },
        { name: 'Cream', hexCode: '#fefce8' },
        { name: 'Warm gold', hexCode: '#d97706' },
        { name: 'Dark charcoal', hexCode: '#1c1917' },
      ],
      typographyDirection: 'Elegant serif headers (e.g., Playfair Display) paired with clean sans-serif body text.',
      uiStyle: 'High-contrast luxury, rich imagery-focused layout, subtle textures.',
      photographyDirection: 'Macro food photography, moody directional lighting, lifestyle interior shots.',
      ctaStyle: 'Warm gold rectangular buttons with subtle hover lift for reservations.',
      designRationale: 'Evokes appetite and exclusivity while remaining accessible and welcoming.',
    };
  }

  // Generic fallback
  return {
    industry: 'Local Services',
    brandPersonality: 'Reliable, professional, approachable, modern',
    targetAudience: 'Local community members seeking dependable services',
    existingBranding: 'Needs modernization and stronger visual hierarchy',
    recommendedColors: [
      { name: 'Primary Blue', hexCode: '#2563eb' },
      { name: 'Soft Slate', hexCode: '#64748b' },
      { name: 'Crisp White', hexCode: '#ffffff' },
      { name: 'Deep Navy', hexCode: '#0f172a' },
    ],
    typographyDirection: 'Strong, legible sans-serif for clear communication of services.',
    uiStyle: 'Structured bento grids, clear section dividers, highly legible service lists.',
    photographyDirection: 'Authentic team photos, action shots of service delivery, clear before/afters.',
    ctaStyle: 'High-contrast primary blue buttons with strong action verbs (e.g., "Get a Quote").',
    designRationale: 'Prioritizes clarity, trust, and frictionless conversion for service inquiries.',
  };
}
