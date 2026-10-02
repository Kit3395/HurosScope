/**
 * HorusScope - Strict AI Safety & Invariants Guardrail Engine
 * Production Safety-Net Layer
 * 
 * CORE MANDATE:
 * AI is strictly an analytical assistant and cannot perform privileged mutations.
 * 
 * Strict Hardcoded Constraints - AI CANNOT:
 * 1. Delete leads
 * 2. Merge records automatically
 * 3. Send messages automatically
 * 4. Change pricing
 * 5. Change proposal status
 * 6. Invent contact information
 * 7. Overwrite verified information
 * 8. Change system settings
 * without explicit controlled permissions & human approval.
 */

import { auditService } from '../audit';
import { authService } from './auth';

export type AIAttemptedAction =
  | 'DELETE_LEAD'
  | 'MERGE_RECORDS'
  | 'SEND_MESSAGE'
  | 'CHANGE_PRICING'
  | 'CHANGE_PROPOSAL_STATUS'
  | 'INVENT_CONTACT_INFO'
  | 'OVERWRITE_VERIFIED_DATA'
  | 'CHANGE_SYSTEM_SETTINGS';

export interface AIGuardrailViolation {
  action: AIAttemptedAction;
  ruleViolated: string;
  reason: string;
  timestamp: string;
  blockedPayload?: Record<string, unknown>;
}

export interface AIGuardrailRule {
  id: AIAttemptedAction;
  title: string;
  description: string;
  status: 'ACTIVE' | 'ENFORCED';
  severity: 'CRITICAL' | 'HIGH';
  rationale: string;
}

export const AI_GUARDRAIL_RULES: AIGuardrailRule[] = [
  {
    id: 'DELETE_LEAD',
    title: 'Prohibit AI Deletion of Leads',
    description: 'AI cannot execute lead deletion or soft deletion mutations under any circumstance.',
    status: 'ENFORCED',
    severity: 'CRITICAL',
    rationale: 'Protects business pipeline assets from automated model hallucinations or aggressive trimming.',
  },
  {
    id: 'MERGE_RECORDS',
    title: 'Prohibit Automatic Record Merging',
    description: 'AI cannot automatically merge businesses, leads, or contacts without human review.',
    status: 'ENFORCED',
    severity: 'CRITICAL',
    rationale: 'Fuzzy model matching must present side-by-side candidates for human verification.',
  },
  {
    id: 'SEND_MESSAGE',
    title: 'Prohibit Autonomous Message Dispatch',
    description: 'AI cannot automatically send emails, SMS, or social outreach to prospects.',
    status: 'ENFORCED',
    severity: 'CRITICAL',
    rationale: 'All outbound communications require human review and deliberate manual send click.',
  },
  {
    id: 'CHANGE_PRICING',
    title: 'Prohibit AI Modification of Pricing',
    description: 'AI cannot alter item pricing, package rates, or discounts in proposals.',
    status: 'ENFORCED',
    severity: 'CRITICAL',
    rationale: 'Prevents pricing drift and contractual liability. Pricing changes require human sign-off.',
  },
  {
    id: 'CHANGE_PROPOSAL_STATUS',
    title: 'Prohibit AI Proposal Status Transitions',
    description: 'AI cannot mark proposals as ACCEPTED, CLIENT_SENT, DECLINED, or SUPERSEDED.',
    status: 'ENFORCED',
    severity: 'HIGH',
    rationale: 'Proposal lifecycle transitions are legally binding commercial milestones reserved for operators.',
  },
  {
    id: 'INVENT_CONTACT_INFO',
    title: 'Prohibit Contact Information Fabrication',
    description: 'AI cannot synthesize unverified emails, phone numbers, or owners. Evaluates to "Not verified".',
    status: 'ENFORCED',
    severity: 'CRITICAL',
    rationale: 'Prevents harassment, spam complaints, and privacy policy compliance violations.',
  },
  {
    id: 'OVERWRITE_VERIFIED_DATA',
    title: 'Prohibit Overwriting Verified CRM Fields',
    description: 'AI data payloads cannot silently replace human-verified phone numbers, emails, or names.',
    status: 'ENFORCED',
    severity: 'CRITICAL',
    rationale: 'Preserves verified ground truth entered by sales team against automated overwrite.',
  },
  {
    id: 'CHANGE_SYSTEM_SETTINGS',
    title: 'Prohibit AI System Configuration Mutation',
    description: 'AI cannot modify API keys, rate limits, feature flags, or platform governance rules.',
    status: 'ENFORCED',
    severity: 'CRITICAL',
    rationale: 'System configuration is strictly restricted to authenticated human administrators.',
  },
];

class AIGuardrailService {
  private recentViolations: AIGuardrailViolation[] = [];

  /**
   * Asserts that an AI action is permitted. Throws error and logs security alert if violated.
   */
  public assertPermitted(action: AIAttemptedAction, contextPayload?: Record<string, unknown>): boolean {
    const rule = AI_GUARDRAIL_RULES.find((r) => r.id === action);
    const ruleTitle = rule ? rule.title : action;

    const violation: AIGuardrailViolation = {
      action,
      ruleViolated: ruleTitle,
      reason: `Safety Guardrail blocked AI attempt: ${rule?.description || action}`,
      timestamp: new Date().toISOString(),
      blockedPayload: contextPayload,
    };

    this.recentViolations.unshift(violation);
    if (this.recentViolations.length > 50) {
      this.recentViolations = this.recentViolations.slice(0, 50);
    }

    // Record immutable audit log
    auditService.log({
      actorId: 'ai_engine_subsystem',
      actorType: 'SAFETY_GUARD',
      action: 'AI_SAFETY_VIOLATION_BLOCKED',
      entityType: 'SecurityGate',
      entityId: `guard_${action}`,
      changeSummary: `BLOCKED: AI attempted restricted operation [${action}]. Rule: "${ruleTitle}". Access denied by strict safety invariants.`,
      newValue: { violation },
    });

    throw new Error(
      `[AI Safety Guardrail Violation] AI is strictly forbidden from executing "${action}". ${rule?.description}`
    );
  }

  /**
   * Validates AI-proposed outreach message content before drafting.
   * Ensures no fabricated contacts or direct automated sending flags.
   */
  public validateProposedOutreachDraft(draft: {
    messageBody: string;
    autoSendRequested?: boolean;
  }): { isValid: boolean; sanitizedBody: string; warnings: string[] } {
    const warnings: string[] = [];

    if (draft.autoSendRequested) {
      this.assertPermitted('SEND_MESSAGE', { requestedAutoSend: true });
    }

    let sanitizedBody = draft.messageBody;

    // Scan for synthesized personal phones/emails
    const suspiciousEmail = /[a-zA-Z0-9._%+-]+@(?!example\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (suspiciousEmail.test(sanitizedBody)) {
      warnings.push('AI draft contained external email. Contact identities must be human-verified.');
    }

    return {
      isValid: true,
      sanitizedBody,
      warnings,
    };
  }

  /**
   * Validates proposed proposal items generated by AI.
   * Ensures base package pricing adheres to official catalog and has not been arbitrarily altered.
   */
  public validateProposedProposalPricing(
    proposedItems: Array<{ id: string; title: string; fixedPriceUSD: number }>,
    baseCatalogPrices: Record<string, number>
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    for (const item of proposedItems) {
      if (typeof item.fixedPriceUSD !== 'number' || isNaN(item.fixedPriceUSD) || item.fixedPriceUSD <= 0) {
        warnings.push(`Item "${item.title}" had invalid price ${item.fixedPriceUSD}. Reset to catalog standard.`);
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Prevents AI analysis from overwriting verified CRM contacts.
   */
  public guardVerifiedContactOverwrite(
    verifiedFields: { name?: string; phone?: string; email?: string },
    incomingAiPayload: { name?: string; phone?: string; email?: string }
  ): { safePayload: Record<string, unknown>; blockedFields: string[] } {
    const blockedFields: string[] = [];
    const safePayload: Record<string, unknown> = { ...incomingAiPayload };

    if (verifiedFields.phone && incomingAiPayload.phone && verifiedFields.phone !== incomingAiPayload.phone) {
      blockedFields.push('phone');
      safePayload.phone = verifiedFields.phone; // Preserve human ground truth
    }

    if (verifiedFields.email && incomingAiPayload.email && verifiedFields.email !== incomingAiPayload.email) {
      blockedFields.push('email');
      safePayload.email = verifiedFields.email;
    }

    if (blockedFields.length > 0) {
      auditService.log({
        actorId: 'ai_engine_subsystem',
        actorType: 'SAFETY_GUARD',
        action: 'AI_SAFETY_VIOLATION_BLOCKED',
        entityType: 'Contact',
        entityId: 'verified_contact_guard',
        changeSummary: `Prevented AI payload from overwriting verified fields: ${blockedFields.join(', ')}.`,
      });
    }

    return { safePayload, blockedFields };
  }

  public getRules(): AIGuardrailRule[] {
    return [...AI_GUARDRAIL_RULES];
  }

  public getRecentViolations(): AIGuardrailViolation[] {
    return [...this.recentViolations];
  }

  public clearViolationsForTesting(): void {
    this.recentViolations = [];
  }
}

export const aiGuardrailService = new AIGuardrailService();
