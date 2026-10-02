/**
 * HorusScope - Soft Deletion & Recycle Bin Service
 * Production Safety-Net Layer
 */

import { auditService } from '../audit';
import { repository } from '../database';
import { authService } from '../security/auth';
import { Business, Lead, Proposal } from '../types';

export interface DeletedItemSummary {
  id: string;
  entityType: 'Lead' | 'Business' | 'Proposal';
  title: string;
  subtitle: string;
  deletedAt: string;
  deletedBy: string;
}

class SoftDeleteService {
  /**
   * Retrieves all soft-deleted records across the platform.
   */
  public getRecycleBinItems(): DeletedItemSummary[] {
    const deletedBusinesses = repository.getAllBusinesses(true).filter((b) => b.isDeleted);
    const deletedLeads = repository.getAllLeads(true, true).filter((l) => l.isDeleted);
    const deletedProposals = repository.getAllProposals(true).filter((p) => p.isDeleted);

    const items: DeletedItemSummary[] = [];

    deletedLeads.forEach((l) => {
      const biz = repository.getBusinessById(l.businessId);
      items.push({
        id: l.id,
        entityType: 'Lead',
        title: biz?.crm.verifiedBusinessName || l.id,
        subtitle: `Pipeline: ${l.pipelineStatus} • Deal: $${l.estimatedDealValueUSD?.toLocaleString() || 0}`,
        deletedAt: l.deletedAt || l.updatedAt,
        deletedBy: l.deletedBy || 'operator',
      });
    });

    deletedBusinesses.forEach((b) => {
      // If lead already listed, skip duplicate visual
      const hasLead = deletedLeads.some((l) => l.businessId === b.id);
      if (!hasLead) {
        items.push({
          id: b.id,
          entityType: 'Business',
          title: b.crm.verifiedBusinessName,
          subtitle: `Domain: ${b.identifiers.normalizedDomain || 'None'} • Phone: ${b.identifiers.normalizedPhone || 'None'}`,
          deletedAt: b.deletedAt || b.updatedAt,
          deletedBy: b.deletedBy || 'operator',
        });
      }
    });

    deletedProposals.forEach((p) => {
      const biz = repository.getBusinessById(p.businessId);
      items.push({
        id: p.id,
        entityType: 'Proposal',
        title: p.title,
        subtitle: `Target: ${biz?.crm.verifiedBusinessName || 'Unknown'} • Value: $${p.totalUSD.toLocaleString()}`,
        deletedAt: p.deletedAt || p.updatedAt,
        deletedBy: p.deletedBy || 'operator',
      });
    });

    return items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }

  /**
   * Restores a soft-deleted item.
   */
  public restoreItem(entityType: 'Lead' | 'Business' | 'Proposal', id: string): boolean {
    const session = authService.getSession();

    if (entityType === 'Lead') {
      return repository.restoreLead(id, session.displayName);
    } else if (entityType === 'Business') {
      return repository.restoreBusiness(id);
    } else if (entityType === 'Proposal') {
      const proposal = repository.getProposalById(id);
      if (proposal && proposal.isDeleted) {
        proposal.isDeleted = false;
        proposal.deletedAt = null;
        proposal.deletedBy = null;
        proposal.updatedAt = new Date().toISOString();
        auditService.log({
          actorId: session.userId,
          actorType: 'USER',
          action: 'ENTITY_RESTORED',
          entityType: 'Proposal',
          entityId: id,
          changeSummary: `Restored soft-deleted proposal "${proposal.title}".`,
        });
        return true;
      }
    }
    return false;
  }

  public getTrashCount(): number {
    return this.getRecycleBinItems().length;
  }
}

export const softDeleteService = new SoftDeleteService();
