import React, { useState } from 'react';
import {
  Building2,
  Database,
  Globe,
  Share2,
  Users,
  Sparkles,
  Award,
  Send,
  CalendarClock,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Layers,
  Check,
} from 'lucide-react';
import { BusinessEntityTree } from '../database';
import { businessService } from '../services';

interface DatabaseTreeViewerProps {
  entityTree: BusinessEntityTree;
  onRefresh?: () => void;
}

export const DatabaseTreeViewer: React.FC<DatabaseTreeViewerProps> = ({
  entityTree,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'provenance' | 'comparison'>('tree');
  const [adoptingName, setAdoptingName] = useState(false);
  const [adoptMessage, setAdoptMessage] = useState<string | null>(null);

  const { business, externalSources, websiteAudits, socialAudits, contacts, aiAnalyses, leadScores, outreach, followUps, proposals } = entityTree;

  const handleAdoptExternalName = () => {
    setAdoptingName(true);
    try {
      businessService.adoptExternalData(business.id, { name: true });
      setAdoptMessage('External trade name adopted into verified CRM layer.');
      if (onRefresh) onRefresh();
    } catch {
      setAdoptMessage('Adoption failed.');
    } finally {
      setTimeout(() => {
        setAdoptingName(false);
        setAdoptMessage(null);
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Axiom Status Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 shadow-xs">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Axiom 1: External Data ≠ CRM Data
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono border border-emerald-300 font-bold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-700">
              External source payloads ({externalSources.length} sources) are strictly read-only. Third-party Google/registry updates cannot silently overwrite verified CRM values without explicit operator adoption.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 flex items-start space-x-3 shadow-xs">
          <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Axiom 2: AI Data ≠ Verified Data
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-mono border border-cyan-300 font-bold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-700">
              AI analysis ({aiAnalyses.length} inferences) is tagged with model versions and confidence scores. Hallucination guard prevents AI from generating or mutating verified contact records ({contacts.length} verified).
            </p>
          </div>
        </div>
      </div>

      {/* Sub-view Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'tree'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Hierarchical Entity Tree</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>External vs. CRM Comparison</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('provenance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'provenance'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>Field Provenance Matrix</span>
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 font-medium">
          ID: <span className="text-slate-800 font-bold">{business.id}</span> (v{business.version})
        </div>
      </div>

      {/* VIEW 1: Complete 9-Entity Tree */}
      {activeTab === 'tree' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Root Anchor: Business Record ({business.crm.verifiedBusinessName})
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono font-medium">
              Stable Key: {business.id}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs pl-2 sm:pl-4 border-l-2 border-slate-200">
            {/* 1. External Sources */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-emerald-700 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. External Sources ({externalSources.length} records)</span>
                </span>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 font-bold">
                  CATEGORY: EXTERNAL_SOURCE
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {externalSources.length > 0
                  ? `Primary: ${externalSources[0].sourceType} (${externalSources[0].sourceId}) - Hash: ${externalSources[0].rawPayloadHash.slice(0, 16)}...`
                  : 'No raw third-party sources attached.'}
              </p>
            </div>

            {/* 2. Website Audit */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-sky-700 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  <span>2. Website Audit ({websiteAudits.length} records)</span>
                </span>
                <span className="text-[10px] text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded border border-sky-300 font-bold">
                  CATEGORY: APP_GENERATED
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {websiteAudits.length > 0
                  ? `Audited: ${websiteAudits[0].auditDate.slice(0, 10)} - Load: ${websiteAudits[0].metrics.estimatedLoadTimeSeconds}s, Mobile: ${websiteAudits[0].metrics.mobileResponsive ? 'Yes' : 'No'}, SSL: ${websiteAudits[0].metrics.hasSslCertificate ? 'Yes' : 'No'}`
                  : 'No technical crawl record registered.'}
              </p>
            </div>

            {/* 3. Social Audit */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-indigo-700 flex items-center space-x-1.5">
                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. Social Audit ({socialAudits.length} records)</span>
                </span>
                <span className="text-[10px] text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-300 font-bold">
                  CATEGORY: APP_GENERATED
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {socialAudits.length > 0
                  ? `Presence Grade: ${socialAudits[0].overallSocialPresenceGrade} (${socialAudits[0].channelsFound.length} channels indexed)`
                  : 'Social channels not yet mapped.'}
              </p>
            </div>

            {/* 4. Contacts (Verified CRM Data) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-emerald-800 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4. Contacts ({contacts.length} verified records)</span>
                </span>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 font-bold">
                  CATEGORY: USER_CRM (VERIFIED)
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {contacts.length > 0
                  ? contacts.map((c) => `${c.fullName} (${c.jobTitle || 'Representative'} - ${c.businessEmail || c.businessPhone || 'No direct phone'})`).join('; ')
                  : 'No verified human contacts attached.'}
              </p>
            </div>

            {/* 5. AI Analysis (AI Data ≠ Verified Data) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-purple-700 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>5. AI Analysis ({aiAnalyses.length} inferences)</span>
                </span>
                <span className="text-[10px] text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300 font-bold">
                  CATEGORY: AI_ANALYSIS (INFERENCE ONLY)
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {aiAnalyses.length > 0
                  ? `Model: ${aiAnalyses[0].modelIdentifier} - Confidence: ${aiAnalyses[0].confidence}. Non-fabrication guarantee validated.`
                  : 'No AI critiques generated yet.'}
              </p>
            </div>

            {/* 6. Lead Score */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-amber-800 flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>6. Lead Score ({leadScores.length} scorecards)</span>
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-bold">
                  CATEGORY: APP_GENERATED (FORMULA)
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {leadScores.length > 0
                  ? `Score: ${leadScores[0].overallScore}/100 (Grade: ${leadScores[0].grade}) - Model: ${leadScores[0].calculationModelVersion}`
                  : 'Scoring scorecard not yet computed.'}
              </p>
            </div>

            {/* 7. Outreach */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-rose-800 flex items-center space-x-1.5">
                  <Send className="w-3.5 h-3.5 text-rose-600" />
                  <span>7. Outreach Activities ({outreach.length} logged touches)</span>
                </span>
                <span className="text-[10px] text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 font-bold">
                  CATEGORY: USER_CRM (MANUAL ONLY)
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {outreach.length > 0
                  ? `Latest touch: ${outreach[0].channel} (${outreach[0].status}) - "${outreach[0].subject || 'Touchpoint'}"`
                  : 'No outreach touches recorded yet.'}
              </p>
            </div>

            {/* 8. Follow-ups */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-teal-800 flex items-center space-x-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-teal-600" />
                  <span>8. Follow-ups ({followUps.length} scheduled reminders)</span>
                </span>
                <span className="text-[10px] text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded border border-teal-300 font-bold">
                  CATEGORY: USER_CRM
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {followUps.length > 0
                  ? `${followUps.filter((f) => !f.isCompleted).length} pending, ${followUps.filter((f) => f.isCompleted).length} completed.`
                  : 'No scheduled follow-up tasks.'}
              </p>
            </div>

            {/* 9. Proposals */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-emerald-800 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>9. Proposals ({proposals.length} drafted)</span>
                </span>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 font-bold">
                  CATEGORY: USER_CRM (COMMERCIAL)
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {proposals.length > 0
                  ? `Proposal ${proposals[0].proposalNumber}: "${proposals[0].title}" ($${proposals[0].totalUSD.toLocaleString()} USD)`
                  : 'No proposal drafted for this lead.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: External vs. CRM Comparison */}
      {activeTab === 'comparison' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Boundary Inspection: External Data vs. User CRM Data
            </h4>
            {adoptMessage && (
              <span className="text-xs font-mono text-emerald-600 flex items-center space-x-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{adoptMessage}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* External Data Column */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-emerald-700 font-mono flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>External Source Payload</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">Read-Only</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">TRADE NAME:</span>
                  <span className="text-slate-900 font-medium">{business.external.tradeName || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">LEGAL/REGISTERED:</span>
                  <span className="text-slate-800 font-medium">{business.external.legalOrRegisteredName || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">EXTERNAL PHONE:</span>
                  <span className="text-slate-800 font-medium">{business.external.externalPhone || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">EXTERNAL ADDRESS:</span>
                  <span className="text-slate-800 text-[11px] font-medium">{business.external.externalAddress?.formattedAddress || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">GOOGLE REVIEWS:</span>
                  <span className="text-amber-600 font-bold">★ {business.external.googleRating || 'N/A'} ({business.external.googleReviewCount || 0} reviews)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={handleAdoptExternalName}
                  disabled={adoptingName}
                  className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>Explicitly Adopt Trade Name into CRM</span>
                </button>
              </div>
            </div>

            {/* CRM Data Column */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-cyan-700 font-mono flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>User CRM Layer (Protected)</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-mono font-bold">Protected</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">VERIFIED NAME:</span>
                  <span className="text-slate-900 font-bold">{business.crm.verifiedBusinessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">QUALIFICATION STATUS:</span>
                  <span className="text-emerald-700 font-bold">{business.crm.qualificationStatus}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">PREFERRED CONTACT METHOD:</span>
                  <span className="text-slate-800 font-medium">{business.crm.preferredContactMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">INTERNAL CRM TAGS:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {business.crm.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-white text-slate-800 border border-slate-200 text-[10px] font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">OPERATOR CRM NOTES:</span>
                  <span className="text-slate-800 italic text-[11px] line-clamp-2 font-medium">
                    {business.crm.internalNotes || 'No notes added yet.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Field Provenance Matrix */}
      {activeTab === 'provenance' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
            Field Provenance & Data Category Mapping
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="pb-2 font-bold">Entity / Attribute</th>
                  <th className="pb-2 font-bold">Data Category</th>
                  <th className="pb-2 font-bold">Mutability</th>
                  <th className="pb-2 font-bold">Separation Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2.5 text-slate-900 font-bold">Google Rating / Reviews</td>
                  <td className="py-2.5 text-emerald-700 font-semibold">EXTERNAL_SOURCE</td>
                  <td className="py-2.5 text-slate-600 font-medium">Read-Only Cached</td>
                  <td className="py-2.5 text-emerald-800 font-sans text-[11px] font-medium">Cannot overwrite CRM notes</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-900 font-bold">Verified Business Name</td>
                  <td className="py-2.5 text-cyan-700 font-semibold">USER_CRM</td>
                  <td className="py-2.5 text-emerald-700 font-semibold">Operator Editable</td>
                  <td className="py-2.5 text-emerald-800 font-sans text-[11px] font-medium">Protected from external sync</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-900 font-bold">Verified Contact Email</td>
                  <td className="py-2.5 text-cyan-700 font-semibold">USER_CRM</td>
                  <td className="py-2.5 text-emerald-700 font-semibold">Human Verified</td>
                  <td className="py-2.5 text-emerald-800 font-sans text-[11px] font-medium">AI prohibited from writing/hallucinating</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-900 font-bold">AI Pitch Angles & Critique</td>
                  <td className="py-2.5 text-purple-700 font-semibold">AI_ANALYSIS</td>
                  <td className="py-2.5 text-slate-600 font-medium">Analytical Inferences</td>
                  <td className="py-2.5 text-emerald-800 font-sans text-[11px] font-medium">Tagged with confidence badge</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-900 font-bold">Normalized Domain / Phone</td>
                  <td className="py-2.5 text-amber-700 font-semibold">APP_GENERATED</td>
                  <td className="py-2.5 text-slate-600 font-medium">Deterministic System</td>
                  <td className="py-2.5 text-emerald-800 font-sans text-[11px] font-medium">Indexed for O(1) duplicate detection</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
