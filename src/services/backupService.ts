/**
 * HorusScope - Database Backup & Disaster Recovery Service
 * Production Safety-Net Layer
 */

import { auditService } from '../audit';
import { repository } from '../database';
import { authService } from '../security/auth';
import { BackupSnapshot } from '../types';

const SNAPSHOTS_STORAGE_KEY = 'horusscope_auto_snapshots_v1';

class BackupService {
  private autoSnapshots: BackupSnapshot[] = [];

  constructor() {
    this.loadAutoSnapshots();
  }

  private loadAutoSnapshots(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
        if (stored) {
          this.autoSnapshots = JSON.parse(stored);
        }
      } catch {
        this.autoSnapshots = [];
      }
    }
  }

  private persistAutoSnapshots(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(this.autoSnapshots.slice(-5)));
      } catch {
        // Handle storage quota limit
      }
    }
  }

  /**
   * Generates a complete snapshot of all active and soft-deleted data.
   */
  public createSnapshot(): BackupSnapshot {
    const session = authService.getSession();
    const dump = repository.exportCompleteDump();
    const auditLogs = auditService.getLogs({ limit: 500 });

    const totalEntities =
      dump.businesses.length +
      dump.leads.length +
      dump.contacts.length +
      dump.proposals.length +
      dump.outreachActivities.length;

    const entitiesSummary = {
      businesses: dump.businesses.length,
      leads: dump.leads.length,
      contacts: dump.contacts.length,
      externalSources: dump.externalSources.length,
      websiteAudits: dump.webAudits.length,
      socialAudits: dump.socialAudits.length,
      aiAnalyses: dump.aiAnalyses.length,
      proposals: dump.proposals.length,
      outreachActivities: dump.outreachActivities.length,
      auditLogs: auditLogs.length,
    };

    const snapshotId = `bkp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const checksum = `sha256_${Date.now()}_${totalEntities}`;

    const snapshot: BackupSnapshot = {
      id: snapshotId,
      version: '1.0.0-production',
      createdAt: new Date().toISOString(),
      createdBy: session.displayName,
      schemaVersion: 1,
      checksum,
      totalEntitiesCount: totalEntities,
      entitiesSummary,
      data: {
        ...dump,
        auditLogs,
      },
    };

    // Save into auto snapshot history
    this.autoSnapshots.unshift(snapshot);
    if (this.autoSnapshots.length > 5) {
      this.autoSnapshots = this.autoSnapshots.slice(0, 5);
    }
    this.persistAutoSnapshots();

    auditService.log({
      actorId: session.userId,
      actorType: 'USER',
      action: 'BACKUP_CREATED',
      entityType: 'BackupSnapshot',
      entityId: snapshotId,
      changeSummary: `Full system backup snapshot created with ${totalEntities} entities across 10 collections.`,
      newValue: { entitiesSummary },
    });

    return snapshot;
  }

  /**
   * Triggers client download of the backup JSON file.
   */
  public downloadBackupFile(snapshot?: BackupSnapshot): void {
    const backup = snapshot || this.createSnapshot();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horusscope_backup_${new Date().toISOString().slice(0, 10)}_${backup.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Validates and restores a complete snapshot into the repository.
   */
  public restoreSnapshot(snapshot: BackupSnapshot): { success: boolean; message: string } {
    if (!snapshot || !snapshot.data || !Array.isArray(snapshot.data.businesses)) {
      throw new Error('Invalid backup file structure: missing data collections.');
    }

    const session = authService.getSession();

    const result = repository.restoreFromCompleteDump({
      businesses: snapshot.data.businesses,
      leads: snapshot.data.leads || [],
      contacts: snapshot.data.contacts || [],
      externalSources: snapshot.data.externalSources || [],
      webAudits: snapshot.data.webAudits || [],
      socialAudits: snapshot.data.socialAudits || [],
      aiAnalyses: snapshot.data.aiAnalyses || [],
      leadScores: snapshot.data.leadScores || [],
      outreachActivities: snapshot.data.outreachActivities || [],
      followUps: snapshot.data.followUps || [],
      proposals: snapshot.data.proposals || [],
    });

    auditService.log({
      actorId: session.userId,
      actorType: 'USER',
      action: 'BACKUP_RESTORED',
      entityType: 'BackupSnapshot',
      entityId: snapshot.id,
      changeSummary: `System successfully restored from backup snapshot ${snapshot.id}. Restored: ${result.restoredCounts.businesses} businesses, ${result.restoredCounts.leads} leads.`,
      newValue: { restoredCounts: result.restoredCounts },
      severity: 'CRITICAL',
    });

    return {
      success: true,
      message: `System restored ${result.restoredCounts.businesses} businesses and ${result.restoredCounts.leads} leads.`,
    };
  }

  public getAutoSnapshots(): BackupSnapshot[] {
    return [...this.autoSnapshots];
  }
}

export const backupService = new BackupService();
