/**
 * HorusScope - Human Approval Gate Coordinator
 * Production Safety-Net Layer
 * 
 * Mandates explicit human confirmation before executing sensitive, high-impact, or destructive actions:
 * 1. Bulk import
 * 2. Bulk delete
 * 3. Merge
 * 4. Proposal finalization
 * 5. External communication (sending outreach messages)
 * 6. Bulk outreach
 * 7. Changing pricing
 * 8. Changing system configuration
 */

import { auditService } from '../audit';
import { ApprovalActionType, HumanApprovalRequest } from '../types';
import { authService } from './auth';

export interface ApprovalGateDefinition {
  actionType: ApprovalActionType;
  title: string;
  defaultDescription: string;
  dangerLevel: 'INFO' | 'WARNING' | 'CRITICAL';
  requiresPhraseConfirmation: boolean;
  expectedPhrase?: string;
  requiredPermission: string;
}

export const APPROVAL_GATE_DEFINITIONS: Record<ApprovalActionType, ApprovalGateDefinition> = {
  BULK_IMPORT: {
    actionType: 'BULK_IMPORT',
    title: 'Bulk Prospect Ingestion',
    defaultDescription: 'You are about to import a batch of discovered businesses into the CRM pipeline.',
    dangerLevel: 'WARNING',
    requiresPhraseConfirmation: false,
    requiredPermission: 'BULK_IMPORT',
  },
  BULK_DELETE: {
    actionType: 'BULK_DELETE',
    title: 'Bulk Lead Deletion',
    defaultDescription: 'You are about to soft-delete multiple lead records from the active CRM database.',
    dangerLevel: 'CRITICAL',
    requiresPhraseConfirmation: true,
    expectedPhrase: 'DELETE',
    requiredPermission: 'BULK_DELETE',
  },
  MERGE: {
    actionType: 'MERGE',
    title: 'Consolidate Duplicate Records',
    defaultDescription: 'You are about to merge two business records. Data from the secondary record will be consolidated into the master record.',
    dangerLevel: 'CRITICAL',
    requiresPhraseConfirmation: true,
    expectedPhrase: 'MERGE',
    requiredPermission: 'MERGE_RECORDS',
  },
  PROPOSAL_FINALIZATION: {
    actionType: 'PROPOSAL_FINALIZATION',
    title: 'Proposal Finalization & Lock',
    defaultDescription: 'Finalizing this proposal will freeze its deliverables and commercial pricing.',
    dangerLevel: 'WARNING',
    requiresPhraseConfirmation: false,
    requiredPermission: 'FINALIZE_PROPOSAL',
  },
  EXTERNAL_COMMUNICATION: {
    actionType: 'EXTERNAL_COMMUNICATION',
    title: 'Dispatch Outbound Communication',
    defaultDescription: 'You are about to send a real outreach message to this prospect.',
    dangerLevel: 'WARNING',
    requiresPhraseConfirmation: false,
    requiredPermission: 'SEND_OUTREACH',
  },
  BULK_OUTREACH: {
    actionType: 'BULK_OUTREACH',
    title: 'Bulk Outreach Dispatch',
    defaultDescription: 'You are about to queue outbound communications across multiple prospects.',
    dangerLevel: 'CRITICAL',
    requiresPhraseConfirmation: true,
    expectedPhrase: 'SEND',
    requiredPermission: 'BULK_OUTREACH',
  },
  CHANGING_PRICING: {
    actionType: 'CHANGING_PRICING',
    title: 'Modify Commercial Pricing',
    defaultDescription: 'You are about to update official proposal line item prices or package rates.',
    dangerLevel: 'WARNING',
    requiresPhraseConfirmation: false,
    requiredPermission: 'CHANGE_PRICING',
  },
  CHANGING_SYSTEM_CONFIG: {
    actionType: 'CHANGING_SYSTEM_CONFIG',
    title: 'Change System Configuration & Safety Locks',
    defaultDescription: 'You are modifying global platform configuration or architectural safety limits.',
    dangerLevel: 'CRITICAL',
    requiresPhraseConfirmation: true,
    expectedPhrase: 'CONFIRM',
    requiredPermission: 'CHANGE_SYSTEM_CONFIG',
  },
};

class HumanApprovalGateService {
  private activePendingRequest: HumanApprovalRequest | null = null;
  private resolver: ((approved: boolean) => void) | null = null;
  private listeners: Set<(request: HumanApprovalRequest | null) => void> = new Set();

  public subscribe(callback: (request: HumanApprovalRequest | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.activePendingRequest));
  }

  /**
   * Triggers an approval gate modal and returns a promise that resolves
   * when the human confirms or declines the action.
   */
  public async requestApproval(params: {
    actionType: ApprovalActionType;
    targetSummary: string;
    itemCount?: number;
    customDescription?: string;
    payload?: Record<string, unknown>;
  }): Promise<boolean> {
    const session = authService.getSession();
    const def = APPROVAL_GATE_DEFINITIONS[params.actionType];

    const request: HumanApprovalRequest = {
      id: `apr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      actionType: params.actionType,
      title: def.title,
      description: params.customDescription || def.defaultDescription,
      targetSummary: params.targetSummary,
      itemCount: params.itemCount,
      dangerLevel: def.dangerLevel,
      requiredConfirmationPhrase: def.requiresPhraseConfirmation ? def.expectedPhrase : undefined,
      requestedBy: {
        userId: session.userId,
        displayName: session.displayName,
        role: session.role,
      },
      requestedAt: new Date().toISOString(),
      payload: params.payload,
    };

    this.activePendingRequest = request;
    this.notify();

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  /**
   * Called when user approves in the confirmation UI.
   */
  public grantApproval(phraseInput?: string): boolean {
    if (!this.activePendingRequest) return false;

    const req = this.activePendingRequest;
    const def = APPROVAL_GATE_DEFINITIONS[req.actionType];

    // Check phrase match if critical
    if (def.requiresPhraseConfirmation) {
      const cleanInput = (phraseInput || '').trim().toUpperCase();
      if (cleanInput !== def.expectedPhrase) {
        throw new Error(`Confirmation phrase mismatch. Expected "${def.expectedPhrase}".`);
      }
    }

    const session = authService.getSession();

    auditService.log({
      actorId: session.userId,
      actorType: 'USER',
      action: 'HUMAN_APPROVAL_GRANTED',
      entityType: 'SecurityGate',
      entityId: req.id,
      changeSummary: `Human approval GRANTED for [${req.actionType}] by ${session.displayName} (${session.role}). Target: "${req.targetSummary}".`,
      newValue: {
        actionType: req.actionType,
        targetSummary: req.targetSummary,
        itemCount: req.itemCount,
        confirmedAt: new Date().toISOString(),
      },
      severity: req.dangerLevel === 'CRITICAL' ? 'WARNING' : 'INFO',
    });

    const resolve = this.resolver;
    this.activePendingRequest = null;
    this.resolver = null;
    this.notify();

    if (resolve) resolve(true);
    return true;
  }

  /**
   * Called when user declines or closes the modal.
   */
  public rejectApproval(reason: string = 'User declined in approval gate'): void {
    if (!this.activePendingRequest) return;

    const req = this.activePendingRequest;
    const session = authService.getSession();

    auditService.log({
      actorId: session.userId,
      actorType: 'USER',
      action: 'HUMAN_APPROVAL_REJECTED',
      entityType: 'SecurityGate',
      entityId: req.id,
      changeSummary: `Human approval CANCELLED for [${req.actionType}] by ${session.displayName}. Reason: ${reason}.`,
      previousValue: {
        actionType: req.actionType,
        targetSummary: req.targetSummary,
      },
      severity: 'INFO',
    });

    const resolve = this.resolver;
    this.activePendingRequest = null;
    this.resolver = null;
    this.notify();

    if (resolve) resolve(false);
  }

  public getActiveRequest(): HumanApprovalRequest | null {
    return this.activePendingRequest;
  }
}

export const humanApprovalGate = new HumanApprovalGateService();
