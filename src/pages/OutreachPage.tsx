import React, { useState } from 'react';
import {
  Send,
  Lock,
  Mail,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
} from 'lucide-react';
import { businessService, leadService } from '../services';
import { humanApprovalGate } from '../security/approvalGate';
import { auditService } from '../audit';
import { PipelineLifecycleBanner } from '../components/PipelineLifecycleBanner';

export const OutreachPage: React.FC = () => {
  const businesses = businessService.getAll(false);
  const followUps = leadService.getAllFollowUps(false);

  const [selectedBizId, setSelectedBizId] = useState<string>(businesses[0]?.id || '');
  const activeBiz = businesses.find((b) => b.id === selectedBizId) || businesses[0];

  const [notification, setNotification] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState<string>(() =>
    activeBiz
      ? `Digital design & acquisition overview for ${activeBiz.crm.verifiedBusinessName || activeBiz.external.tradeName}`
      : ''
  );
  const [draftMessage, setDraftMessage] = useState<string>(() =>
    activeBiz
      ? `Hi ${activeBiz.crm.verifiedBusinessName || 'Team'},\n\nI was reviewing your web and mobile presence and noted several opportunities to improve layout performance and customer conversion.\n\nWould you be open to reviewing a brief consultative summary of these findings?\n\nBest regards,\nHORUSCOPE Acquisition Team`
      : ''
  );

  const handleBizChange = (bizId: string) => {
    setSelectedBizId(bizId);
    const biz = businesses.find((b) => b.id === bizId);
    if (biz) {
      const name = biz.crm.verifiedBusinessName || biz.external.tradeName;
      setDraftSubject(`Digital design & acquisition overview for ${name}`);
      setDraftMessage(
        `Hi ${name},\n\nI was reviewing your web and mobile presence and noted several opportunities to improve layout performance and customer conversion.\n\nWould you be open to reviewing a brief consultative summary of these findings?\n\nBest regards,\nHORUSCOPE Acquisition Team`
      );
    }
  };

  const handleSendExternalCommunication = async () => {
    if (!activeBiz) return;
    const bizName = activeBiz.crm.verifiedBusinessName || activeBiz.external.tradeName || 'Prospect';
    const approved = await humanApprovalGate.requestApproval({
      actionType: 'EXTERNAL_COMMUNICATION',
      targetSummary: `Direct Communication to ${bizName}`,
      customDescription: `Outbound communication regarding: "${draftSubject}". External dispatch cannot be revoked once processed.`,
    });

    if (approved) {
      // Record a REAL outreach activity on the lead so the pipeline reflects
      // what happened (previously this only wrote an audit log entry).
      const lead = leadService.getByBusinessId(activeBiz.id);
      if (lead) {
        leadService.addOutreach({
          businessId: activeBiz.id,
          leadId: lead.id,
          channel: 'EMAIL',
          messageBody: `Subject: ${draftSubject}\n\n${draftMessage}`,
          subject: draftSubject,
          status: 'READY_FOR_MANUAL_SEND',
          outcomeNotes: 'Approved via human approval gate; awaiting manual send.',
          nextAction: 'Send the message manually, then mark as COMPLETED.',
        });
      }
      auditService.log({
        actorId: 'operator_session',
        actorType: 'USER',
        action: 'SENT_MESSAGE',
        entityType: 'Lead',
        entityId: activeBiz.id,
        changeSummary: `Operator approved outbound communication to ${bizName} and logged it to the lead outreach history.`,
        severity: 'MEDIUM',
      });
      setNotification(
        lead
          ? `Outreach approved and logged to ${bizName}'s history. Send it manually, then mark it completed.`
          : `Outreach approved for ${bizName}. No lead record exists yet — import the business as a lead first.`
      );
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleBulkOutreachQueue = async () => {
    const qualifiedLeads = businesses.filter(b => b.crm.qualificationStatus === 'QUALIFIED');
    const count = qualifiedLeads.length || 5;

    const approved = await humanApprovalGate.requestApproval({
      actionType: 'BULK_OUTREACH',
      targetSummary: `${count} Qualified Prospects queued for sequential outreach`,
      itemCount: count,
      customDescription: `Operator must type "SEND" to confirm queuing outbound communications to ${count} prospects.`,
    });

    if (approved) {
      // Queue a REAL outreach activity per qualified lead (previously audit-only).
      let queued = 0;
      for (const biz of qualifiedLeads) {
        const lead = leadService.getByBusinessId(biz.id);
        if (!lead) continue;
        const bizName = biz.crm.verifiedBusinessName || biz.external.tradeName || 'Prospect';
        leadService.addOutreach({
          businessId: biz.id,
          leadId: lead.id,
          channel: 'EMAIL',
          messageBody: `Bulk outreach queued for ${bizName} — draft and send manually.`,
          status: 'READY_FOR_MANUAL_SEND',
          outcomeNotes: 'Queued via approved bulk outreach batch.',
          nextAction: 'Draft a personalized message and send manually.',
        });
        queued++;
      }
      auditService.log({
        actorId: 'operator_session',
        actorType: 'USER',
        action: 'BATCH_OUTREACH_QUEUED',
        entityType: 'Lead',
        entityId: 'bulk_batch',
        changeSummary: `Human approval confirmed bulk outreach queue for ${count} leads; ${queued} outreach records created.`,
        severity: 'HIGH',
      });
      setNotification(
        queued > 0
          ? `Bulk outreach approved — ${queued} outreach records queued for manual sending.`
          : `Bulk outreach approved, but no qualified leads have lead records yet. Import them as leads first.`
      );
      setTimeout(() => setNotification(null), 6000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Outreach & Follow-Up Tracking
            </h1>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-mono">
              MANUAL DISPATCH ONLY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Personalized client communications, consultative pitch drafting, and human approval verification.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleBulkOutreachQueue}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Test Bulk Outreach Gate</span>
          </button>
        </div>
      </div>

      {/* Governing Acquisition Principle Bar */}
      <PipelineLifecycleBanner currentStage="Contact" />

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Manual Action Invariant Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
        <div className="flex items-center space-x-2 text-amber-600 font-semibold text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Core Safety Invariant: Operator-Supervised Manual Outreach</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          HORUSCOPE prevents automated cold email blasting. All communication drafts must be manually reviewed and dispatched by you. This ensures high-touch personalization, zero spam violations, and authentic consultative relationships.
        </p>
      </div>

      {/* Manual Outreach Composer & Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Manual Pitch Drafter</h2>
            </div>
            {businesses.length > 0 ? (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-500">Recipient:</span>
                <select
                  value={activeBiz?.id || ''}
                  onChange={(e) => handleBizChange(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs font-medium focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.crm.verifiedBusinessName || b.external.tradeName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs text-slate-400">No active prospects</span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Subject Line</label>
              <input
                type="text"
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Message Body</label>
              <textarea
                rows={10}
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              Status: READY_FOR_MANUAL_SEND • requiresManualAction: true
            </span>
            <div className="flex items-center space-x-2">
              <button
                id="copy-pitch-btn"
                onClick={() => {
                  navigator.clipboard.writeText(`${draftSubject}\n\n${draftMessage}`);
                  setNotification('Draft copied to clipboard.');
                }}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Copy to Clipboard
              </button>

              <button
                id="send-pitch-btn"
                onClick={handleSendExternalCommunication}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch with Approval Gate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Follow-Up Tracker & Schedule */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <Calendar className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Follow-Up Tasks</h3>
          </div>

          <div className="space-y-3 text-xs">
            {followUps.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                No pending follow-ups scheduled.
              </div>
            ) : (
              followUps.map((fu) => {
                const lead = leadService.getById(fu.leadId);
                const biz = lead ? businessService.getById(lead.businessId) : undefined;
                const bizName = biz?.crm.verifiedBusinessName || biz?.external.tradeName || 'Prospect';

                return (
                  <div key={fu.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{bizName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 text-[10px] font-bold">
                        DUE {new Date(fu.scheduledDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {fu.reason}
                    </p>
                    <div className="text-slate-400 text-[10px] font-mono">Channel: Email • Priority: {fu.priority}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
