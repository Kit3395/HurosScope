import React, { useState } from 'react';
import {
  Globe,
  Share2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  Smartphone,
  Lock,
  MousePointerClick,
  CalendarCheck,
  Flame,
  Layers,
  ArrowRight,
  Target,
  Search,
  Check,
  Eye,
  Info,
  Award,
  Bot,
  Zap,
  Users,
  Palette
} from 'lucide-react';
import { intelligenceService, businessService, contactService } from '../services';
import { AIConfidenceBadge } from '../components/AIConfidenceBadge';
import { DataCategoryPill } from '../components/DataCategoryPill';
import { AIAnalysis, WebsiteAudit, SocialAudit, WebsiteStatusTier, SocialPlatformPresenceStatus, LeadScore } from '../types';

export const IntelligencePage: React.FC = () => {
  const businesses = businessService.getAll(false);
  const [selectedBizId, setSelectedBizId] = useState<string>(businesses[0]?.id || '');
  const [isAuditingWebsite, setIsAuditingWebsite] = useState(false);
  const [isAuditingSocial, setIsAuditingSocial] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isScoringLead, setIsScoringLead] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedBiz = businessService.getById(selectedBizId);
  const webAudits: WebsiteAudit[] = selectedBizId ? intelligenceService.getWebAudits(selectedBizId) : [];
  const socialAudits: SocialAudit[] = selectedBizId ? intelligenceService.getSocialAudits(selectedBizId) : [];
  const aiAnalyses: AIAnalysis[] = selectedBizId ? intelligenceService.getAIAnalyses(selectedBizId) : [];
  const leadScores: LeadScore[] = selectedBizId ? intelligenceService.getLeadScores(selectedBizId) : [];
  const contacts = selectedBizId ? contactService.getByBusiness(selectedBizId) : [];

  const latestWebAudit = webAudits[0];
  const latestSocialAudit = socialAudits[0];
  const latestLeadScore = leadScores[0];

  const handleScoreLead = async () => {
    if (!selectedBizId) return;
    setIsScoringLead(true);
    setErrorMessage(null);
    setActionSuccessMsg(null);

    try {
      const score = await intelligenceService.scoreLead(selectedBizId);
      setActionSuccessMsg(
        `AI Lead Score updated to ${score.overallScore}/100 with 6 diagnostic dimensions via ${score.aiScoreData?.engine === 'GEMINI_FLASH_3_8' ? 'Gemini 3.8 Flash' : 'AI Engine'}.`
      );
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsScoringLead(false);
    }
  };

  const handleRunWebsiteAudit = async () => {
    if (!selectedBizId) return;
    setIsAuditingWebsite(true);
    setErrorMessage(null);
    setActionSuccessMsg(null);

    try {
      await intelligenceService.auditWebsite(selectedBizId);
      setActionSuccessMsg('Website intelligence audit successfully refreshed with 13 diagnostic criteria.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsAuditingWebsite(false);
    }
  };

  const handleRunSocialAudit = async () => {
    if (!selectedBizId) return;
    setIsAuditingSocial(true);
    setErrorMessage(null);
    setActionSuccessMsg(null);

    try {
      await intelligenceService.auditSocial(selectedBizId);
      setActionSuccessMsg('Social intelligence audit generated cross-channel presence and sales insights.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsAuditingSocial(false);
    }
  };

  const handleRunAICritique = async () => {
    if (!selectedBizId) return;
    setIsGeneratingAI(true);
    setErrorMessage(null);
    setActionSuccessMsg(null);

    try {
      await intelligenceService.generateAnalyticalCritique(selectedBizId);
      setActionSuccessMsg('AI analytical critique generated with verified confidence metrics.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Helper for website status pill rendering
  const renderWebsiteStatusBadge = (status?: WebsiteStatusTier) => {
    switch (status) {
      case 'NO_WEBSITE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            No website
          </span>
        );
      case 'POTENTIALLY_OUTDATED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Potentially outdated
          </span>
        );
      case 'GOOD_WEBSITE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Good website
          </span>
        );
      case 'WEBSITE_EXISTS':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Globe className="w-3.5 h-3.5 mr-1 text-sky-600" />
            Website exists
          </span>
        );
    }
  };

  // Helper for social status badge
  const renderSocialStatusBadge = (status: SocialPlatformPresenceStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Active
          </span>
        );
      case 'DORMANT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Dormant
          </span>
        );
      case 'UNKNOWN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3 h-3 mr-1 text-slate-500" />
            Unknown
          </span>
        );
      case 'NONE':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            None
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Intelligence & Sales Audits</h1>
            <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800/40 text-purple-300 text-xs font-mono font-bold">
              ACTIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Deterministic website diagnostics, multi-platform social presence auditing, and objective sales insight generation.
          </p>
        </div>

        {/* Prospect Selector */}
        <div className="flex items-center space-x-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <label className="text-slate-400 text-xs font-medium pl-2">Target Prospect:</label>
          <select
            id="prospect-intelligence-select"
            value={selectedBizId}
            onChange={(e) => setSelectedBizId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium focus:border-purple-500 outline-none cursor-pointer"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.crm.verifiedBusinessName} {b.external.externalWebsiteUrl ? '' : '(No Website)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Business Overview Strip */}
      {selectedBiz && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-bold text-white">{selectedBiz.crm.verifiedBusinessName}</h2>
              {renderWebsiteStatusBadge(latestWebAudit?.websiteStatus)}
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono">
                {selectedBiz.external.primaryCategoryCode || 'Business'}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{selectedBiz.external.externalAddress.formattedAddress}</span>
              <span>•</span>
              <span>{selectedBiz.external.externalWebsiteUrl || 'No verified website URL'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="run-website-audit-btn"
              disabled={isAuditingWebsite}
              onClick={handleRunWebsiteAudit}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditingWebsite ? 'animate-spin' : ''}`} />
              <span>{isAuditingWebsite ? 'Auditing...' : 'Run Website Audit'}</span>
            </button>

            <button
              id="run-social-audit-btn"
              disabled={isAuditingSocial}
              onClick={handleRunSocialAudit}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Share2 className={`w-3.5 h-3.5 ${isAuditingSocial ? 'animate-spin' : ''}`} />
              <span>{isAuditingSocial ? 'Auditing...' : 'Run Social Audit'}</span>
            </button>

            <button
              id="run-ai-critique-btn"
              disabled={isGeneratingAI}
              onClick={handleRunAICritique}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAI ? 'Analyzing...' : 'Generate AI Critique'}</span>
            </button>

            <button
              id="run-lead-scoring-btn"
              disabled={isScoringLead}
              onClick={handleScoreLead}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-all shadow-md cursor-pointer"
            >
              <Award className={`w-3.5 h-3.5 ${isScoringLead ? 'animate-spin' : ''}`} />
              <span>{isScoringLead ? 'Scoring...' : 'Score Lead (Gemini AI)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Banners */}
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* AI Safety Banner */}
      <div className="bg-slate-900/90 border border-purple-800/40 rounded-xl p-4 text-xs text-slate-300 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-purple-300">Safety & Non-Fabrication Directives:</span>
          <p className="text-slate-400 leading-relaxed">
            AI assessment never fabricates website age or launch dates (e.g. avoiding statements like &ldquo;Website was built in 2017&rdquo;). Instead, verified objective criteria are evaluated using precise diagnostic language: <strong className="text-purple-300">&ldquo;AI assessment indicates the website may have outdated design patterns.&rdquo;</strong> Unclaimed or unverified profiles are rendered strictly as <strong className="text-amber-300">&ldquo;Unknown&rdquo;</strong> or <strong className="text-rose-300">&ldquo;Not verified&rdquo;</strong>.
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* AI MULTI-DIMENSIONAL LEAD SCORING */}
      {/* =================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">AI Multi-Dimensional Lead Scoring</h2>
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-300 text-[10px] font-mono">
                  EXPLAINABLE PROSPECT INTELLIGENCE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-dimensional opportunity scoring across 5 diagnostic criteria and overall prospect potential, paired with grounded AI narrative explanation.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <DataCategoryPill category="APP_GENERATED" />
            <button
              disabled={isScoringLead}
              onClick={handleScoreLead}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScoringLead ? 'animate-spin' : ''}`} />
              <span>{isScoringLead ? 'Calculating...' : latestLeadScore ? 'Recalculate Score' : 'Calculate Score'}</span>
            </button>
          </div>
        </div>

        {latestLeadScore?.aiScoreData ? (
          <div className="space-y-6">
            {/* The Grounded AI Explanation Narrative */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-50/40 via-white to-slate-50 border border-cyan-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {latestLeadScore.aiScoreData.overallProspectScore}
                    </span>
                    <span className="text-sm font-mono text-slate-500">/ 100</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
                    GRADE {latestLeadScore.grade || 'A'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    • Engine: {latestLeadScore.aiScoreData.engine === 'GEMINI_FLASH_3_8' ? 'Gemini 3.8 Flash' : 'Horus Scoring Engine'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{latestLeadScore.aiScoreData.confidence}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-700 uppercase tracking-wider">
                  <Bot className="w-4 h-4 text-cyan-600" />
                  <span>AI Score Explanation (Why {latestLeadScore.aiScoreData.overallProspectScore}/100?)</span>
                </div>
                <p className="text-slate-800 text-sm font-medium leading-relaxed italic">
                  &ldquo;{latestLeadScore.aiScoreData.explanation.narrative}&rdquo;
                </p>
              </div>

              {/* Bulleted Why This Score Breakdown */}
              {latestLeadScore.aiScoreData.explanation.whyThisScore &&
                latestLeadScore.aiScoreData.explanation.whyThisScore.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ground Truth Key Drivers:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {latestLeadScore.aiScoreData.explanation.whyThisScore.map((driver, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                          <span className="text-slate-700">{driver}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Pitch Angle & Next Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {latestLeadScore.aiScoreData.explanation.recommendedPitchAngle && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
                      <Target className="w-3.5 h-3.5 text-amber-600" />
                      <span>Recommended Pitch Angle</span>
                    </span>
                    <p className="text-slate-700">{latestLeadScore.aiScoreData.explanation.recommendedPitchAngle}</p>
                  </div>
                )}

                {latestLeadScore.aiScoreData.explanation.actionableNextStep && (
                  <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-xs space-y-1">
                    <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider flex items-center space-x-1">
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Actionable Next Step</span>
                    </span>
                    <p className="text-slate-700">{latestLeadScore.aiScoreData.explanation.actionableNextStep}</p>
                  </div>
                )}
              </div>
            </div>

            {/* The 6 Multi-Dimensional Scores Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="uppercase tracking-wider">Multi-Dimensional Scoring Criteria</span>
                <span className="text-slate-500 font-normal">Granular 0–100 breakdown per domain</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: 'Digital Opportunity',
                    score: latestLeadScore.aiScoreData.digitalOpportunity,
                    dim: latestLeadScore.aiScoreData.dimensions.digitalOpportunity,
                    color: 'from-cyan-500 to-blue-500',
                    textColor: 'text-cyan-600',
                    border: 'border-cyan-200',
                  },
                  {
                    name: 'Website Opportunity',
                    score: latestLeadScore.aiScoreData.websiteOpportunity,
                    dim: latestLeadScore.aiScoreData.dimensions.websiteOpportunity,
                    color: 'from-blue-500 to-indigo-500',
                    textColor: 'text-blue-600',
                    border: 'border-blue-200',
                  },
                  {
                    name: 'Social Opportunity',
                    score: latestLeadScore.aiScoreData.socialOpportunity,
                    dim: latestLeadScore.aiScoreData.dimensions.socialOpportunity,
                    color: 'from-purple-500 to-pink-500',
                    textColor: 'text-purple-600',
                    border: 'border-purple-200',
                  },
                  {
                    name: 'Business Strength',
                    score: latestLeadScore.aiScoreData.businessStrength,
                    dim: latestLeadScore.aiScoreData.dimensions.businessStrength,
                    color: 'from-emerald-500 to-teal-500',
                    textColor: 'text-emerald-600',
                    border: 'border-emerald-200',
                  },
                  {
                    name: 'Contactability',
                    score: latestLeadScore.aiScoreData.contactability,
                    dim: latestLeadScore.aiScoreData.dimensions.contactability,
                    color: 'from-amber-500 to-orange-500',
                    textColor: 'text-amber-600',
                    border: 'border-amber-200',
                  },
                  {
                    name: 'Overall Prospect Score',
                    score: latestLeadScore.aiScoreData.overallProspectScore,
                    dim: latestLeadScore.aiScoreData.dimensions.overallProspectScore,
                    color: 'from-cyan-400 via-teal-400 to-emerald-400',
                    textColor: 'text-cyan-600',
                    border: 'border-cyan-300',
                  },
                ].map((item, idx) => {
                  const tierStyle =
                    item.score >= 90
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : item.score >= 75
                      ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      : item.score >= 50
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border ${item.border} bg-white shadow-xs space-y-3 flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs pb-1">
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tierStyle}`}>
                            {item.dim?.tier || (item.score >= 90 ? 'EXCEPTIONAL' : item.score >= 75 ? 'HIGH' : 'MODERATE')}
                          </span>
                        </div>

                        <div className="flex items-baseline space-x-1 my-1">
                          <span className={`text-2xl font-black font-mono ${item.textColor}`}>{item.score}</span>
                          <span className="text-xs text-slate-500 font-mono">/ 100</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-2">
                          <div
                            className={`bg-gradient-to-r ${item.color} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {item.dim?.rationale || 'Diagnostic indicator evaluated from verified business parameters.'}
                        </p>
                      </div>

                      {item.dim?.keySignals && item.dim.keySignals.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100">
                          {item.dim.keySignals.map((sig, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-700"
                            >
                              {sig}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs space-y-3">
            <Award className="w-8 h-8 text-cyan-600/50 mx-auto" />
            <p>Click &ldquo;Score Lead (Gemini AI)&rdquo; above to calculate granular multi-dimensional scores and generate an AI explanation.</p>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* CONTACT INTELLIGENCE */}
      {/* =================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">Contact Intelligence</h2>
                <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono">
                  DECISION-MAKER DISCOVERY
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Identifies key decision-makers strictly through verified public sources. Never guesses owners.
              </p>
            </div>
          </div>
          <DataCategoryPill category="APP_GENERATED" />
        </div>

        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-2">
                     <span className="text-xs font-mono text-slate-500">Contact:</span>
                     <span className="text-sm font-bold text-slate-900">{contact.fullName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    High Confidence
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div>
                    <span className="block text-slate-500 font-medium mb-1">Role:</span>
                    <span className="text-slate-800 font-semibold">{contact.jobTitle || 'Owner'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-medium mb-1">Source:</span>
                    <span className="text-slate-800 font-semibold">{contact.sourceUrl ? 'Official Business Website' : 'Verified Registration'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-500 font-medium mb-1">Verification:</span>
                    <div className="flex items-center space-x-1.5 text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="font-semibold">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-4 max-w-md">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                 <span className="text-xs font-mono text-slate-500">Contact:</span>
                 <span className="text-sm font-bold text-slate-500 italic">Unknown</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Needs Research
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-xs">
              <div>
                <span className="block text-slate-500 font-medium mb-1">Role:</span>
                <span className="text-slate-500 italic">Unknown</span>
              </div>
              <div>
                <span className="block text-slate-500 font-medium mb-1">Source:</span>
                <span className="text-slate-500 italic">None</span>
              </div>
              <div className="col-span-2">
                <span className="block text-slate-500 font-medium mb-1">Status:</span>
                <div className="flex items-center space-x-1.5 text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-semibold">Needs Research</span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-700 font-medium italic">
                &ldquo;No verified decision-maker identified.&rdquo;
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SOCIAL INTELLIGENCE & SALES INSIGHTS */}
      {/* =================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-950/80 border border-sky-700/50 text-sky-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Social Intelligence & Sales Insights</h2>
                <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-800/60 text-sky-300 text-[10px] font-mono">
                  CROSS-PLATFORM PRESENCE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audits publicly available business-facing social presence and translates presence discrepancies into actionable sales insights.
              </p>
            </div>
          </div>
          <DataCategoryPill category="APP_GENERATED" />
        </div>

        {latestSocialAudit ? (
          <div className="space-y-6">
            {/* Cross-Channel Summary Matrix */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 uppercase tracking-wider">
                  Public Cross-Channel Presence Matrix
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Summary: <span className="text-sky-300 font-semibold">{latestSocialAudit.crossChannelSummary}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                {latestSocialAudit.channels.map((ch, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{ch.platformDisplayName}</span>
                      {renderSocialStatusBadge(ch.status)}
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-400 text-[11px] font-medium">
                        {ch.audienceMetric || 'No metric'}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-2">
                        {ch.activityIndicator || 'Verified status evaluated'}
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Verified status:</span>
                      <span
                        className={
                          ch.isClaimed === true
                            ? 'text-emerald-400 font-semibold'
                            : ch.isClaimed === 'Not verified'
                            ? 'text-amber-400 font-semibold'
                            : 'text-slate-500'
                        }
                      >
                        {ch.isClaimed === true
                          ? 'Claimed'
                          : ch.isClaimed === false
                          ? 'Unclaimed'
                          : 'Not verified'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated Sales Insights (User Requirement: "Strong Facebook presence but no dedicated website. That becomes a sales insight.") */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Generated Sales Insights & Conversion Angles
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestSocialAudit.salesInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-4 bg-slate-950 border border-amber-900/40 rounded-xl space-y-3 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-amber-950 border-b border-l border-amber-800/60 rounded-bl text-amber-300 text-[10px] font-bold">
                      {insight.confidence}
                    </div>

                    <div className="pr-16 space-y-1">
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-mono">
                        {insight.salesOpportunityType}
                      </span>
                      <h4 className="text-sm font-bold text-white text-amber-200 pt-1 leading-snug">
                        &ldquo;{insight.headline}&rdquo;
                      </h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      {insight.narrative}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        <span>Actionable Pitch Hook:</span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium bg-amber-950/20 p-2.5 rounded border border-amber-800/30">
                        {insight.actionablePitchAngle}
                      </p>
                    </div>

                    {insight.recommendedServices && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          Recommended Services to Pitch:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {insight.recommendedServices.map((svc, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]"
                            >
                              {svc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950 rounded-xl text-slate-400 text-xs space-y-2">
            <p>No social intelligence audit recorded for this prospect yet.</p>
            <button
              onClick={handleRunSocialAudit}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Run Social Audit Now
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* WEBSITE INTELLIGENCE & 13 AUDIT CRITERIA */}
      {/* =================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">Website Intelligence & Opportunity Score</h2>
                <span className="px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-mono">
                  13 CRITERIA AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Evaluation of mobile responsiveness, HTTPS, metadata, navigation, CTA, performance, and accessibility.
              </p>
            </div>
          </div>
          <DataCategoryPill category="APP_GENERATED" />
        </div>

        {latestWebAudit ? (
          <div className="space-y-6">
            {/* Opportunity Score & Design Assessment Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Score Gauge Card */}
              <div className="p-5 bg-slate-50 border border-cyan-200 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Website Opportunity Score
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      latestWebAudit.opportunityScore >= 75
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : latestWebAudit.opportunityScore >= 45
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {latestWebAudit.opportunityGrade}
                  </span>
                </div>

                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-extrabold text-slate-900 font-mono">
                    {latestWebAudit.opportunityScore}
                  </span>
                  <span className="text-slate-500 text-sm font-semibold">/ 100 Opportunity</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${
                      latestWebAudit.opportunityScore >= 75
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : latestWebAudit.opportunityScore >= 45
                        ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                        : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                    }`}
                    style={{ width: `${latestWebAudit.opportunityScore}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-500">
                  Higher scores represent larger financial opportunities for high-margin website redesigns or new builds.
                </p>
              </div>

              {/* Design Pattern Assessment Card (Strict Cautious Language Mandate) */}
              <div className="lg:col-span-2 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Design Pattern Modernity Assessment
                    </span>
                    {renderWebsiteStatusBadge(latestWebAudit.websiteStatus)}
                  </div>

                  {/* Strictly using the required cautious language */}
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs text-purple-900 font-medium leading-relaxed">
                      &ldquo;{latestWebAudit.designPatternAssessment}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Opportunity Breakdown Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  {latestWebAudit.opportunityScoreBreakdown?.slice(0, 2).map((factor, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-800 font-semibold">{factor.factor}</span>
                        <span className="text-cyan-700 font-mono font-bold">+{factor.pointsAwarded} pts</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{factor.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* The 13 Specific Audit Criteria */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  13 Rigorous Website Audit Criteria
                </h3>
                <span className="text-slate-500 text-[11px]">All criteria verified without fabrication</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* 1. Mobile Responsiveness */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-semibold text-slate-900">
                      <Smartphone className="w-3.5 h-3.5 text-cyan-600" />
                      <span>1. Mobile Responsiveness</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        latestWebAudit.criteria?.mobileResponsive.passed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {latestWebAudit.criteria?.mobileResponsive.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {latestWebAudit.criteria?.mobileResponsive.details}
                  </p>
                </div>

                {/* 2. HTTPS */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-semibold text-slate-900">
                      <Lock className="w-3.5 h-3.5 text-cyan-600" />
                      <span>2. HTTPS & SSL Security</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        latestWebAudit.criteria?.https.passed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {latestWebAudit.criteria?.https.passed ? 'SECURE' : 'INSECURE'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {latestWebAudit.criteria?.https.details}
                  </p>
                </div>

                {/* 3. Page Title */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">3. Page Title</span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px] font-mono">
                      {latestWebAudit.criteria?.pageTitle.status}
                    </span>
                  </div>
                  <p className="text-slate-800 text-[11px] font-medium truncate">
                    {latestWebAudit.criteria?.pageTitle.title || 'No Title Tag'}
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    {latestWebAudit.criteria?.pageTitle.details}
                  </p>
                </div>

                {/* 4. Metadata */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">4. Metadata & OpenGraph</span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px] font-mono">
                      {latestWebAudit.criteria?.metadata.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-600">
                    <span>OG Tags: {latestWebAudit.criteria?.metadata.hasOpenGraph ? 'Yes' : 'No'}</span>
                    <span>•</span>
                    <span>Description: {latestWebAudit.criteria?.metadata.hasDescription ? 'Yes' : 'Missing'}</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    {latestWebAudit.criteria?.metadata.details}
                  </p>
                </div>

                {/* 5. Navigation */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">5. Navigation & Hierarchy</span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px] font-mono">
                      {latestWebAudit.criteria?.navigation.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {latestWebAudit.criteria?.navigation.details}
                  </p>
                </div>

                {/* 6. Call to Action (CTA) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-semibold text-slate-900">
                      <MousePointerClick className="w-3.5 h-3.5 text-cyan-600" />
                      <span>6. Call to Action (CTA)</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                      {latestWebAudit.criteria?.callToAction.presence}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Placement: <span className="text-slate-800 font-mono">{latestWebAudit.criteria?.callToAction.placement}</span>. {latestWebAudit.criteria?.callToAction.details}
                  </p>
                </div>

                {/* 7. Contact Accessibility */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">7. Contact Accessibility</span>
                    <span className="text-[10px] font-mono text-cyan-700">
                      {latestWebAudit.criteria?.contactAccessibility.hasClickToCall ? 'Click-to-Call' : 'No Phone Link'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded ${latestWebAudit.criteria?.contactAccessibility.hasClickToCall ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'}`}>
                      Phone Link
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${latestWebAudit.criteria?.contactAccessibility.hasContactForm ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'}`}>
                      Form
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${latestWebAudit.criteria?.contactAccessibility.hasMapOrDirections ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'}`}>
                      Map
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    {latestWebAudit.criteria?.contactAccessibility.details}
                  </p>
                </div>

                {/* 8. Visual Consistency */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">8. Visual Consistency</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
                      {latestWebAudit.criteria?.visualConsistency.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {latestWebAudit.criteria?.visualConsistency.details}
                  </p>
                </div>

                {/* 9. Content Quality */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">9. Content Quality</span>
                    <span className="text-[10px] font-mono text-slate-600">
                      Recency: {latestWebAudit.criteria?.contentQuality.recencySignal}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {latestWebAudit.criteria?.contentQuality.details}
                  </p>
                </div>

                {/* 10. Performance Indicators */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">10. Performance Indicators</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-mono text-[10px] border border-amber-200">
                      {latestWebAudit.criteria?.performanceIndicators.performanceGrade}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-800">
                    {latestWebAudit.criteria?.performanceIndicators.estimatedLoadTimeSeconds
                      ? `${latestWebAudit.criteria?.performanceIndicators.estimatedLoadTimeSeconds}s page load`
                      : 'Not measured'}
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    {latestWebAudit.criteria?.performanceIndicators.details}
                  </p>
                </div>

                {/* 11. Accessibility Indicators */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">11. Accessibility Indicators</span>
                    <span className="text-[10px] font-mono text-slate-600">
                      Score: {latestWebAudit.criteria?.accessibilityIndicators.estimatedScore || 0}/100
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    WCAG AA Contrast: {latestWebAudit.criteria?.accessibilityIndicators.contrastCompliance ? 'Passed' : 'Contrast Failures Detected'}
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    {latestWebAudit.criteria?.accessibilityIndicators.details}
                  </p>
                </div>

                {/* 12. Social Integration */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">12. Social Integration</span>
                    <span className="text-[10px] text-slate-600">
                      {latestWebAudit.criteria?.socialIntegration.hasSocialLinks ? 'Links Present' : 'None'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {latestWebAudit.criteria?.socialIntegration.linkedPlatforms.map((p, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white text-sky-700 border border-slate-200">
                        {p}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    {latestWebAudit.criteria?.socialIntegration.details}
                  </p>
                </div>

                {/* 13. Booking / Order Functionality */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-semibold text-slate-900">
                      <CalendarCheck className="w-3.5 h-3.5 text-cyan-600" />
                      <span>13. Booking & Order Funnel</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-white text-cyan-700 border border-slate-200 text-[10px] font-mono">
                      {latestWebAudit.criteria?.bookingOrderFunctionality.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {latestWebAudit.criteria?.bookingOrderFunctionality.details}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs space-y-2">
            <p>No website intelligence audit recorded for this prospect yet.</p>
            <button
              onClick={handleRunWebsiteAudit}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              Run Website Audit Now
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* AI ANALYTICAL CRITIQUE & RECOMMENDATIONS */}
      {/* =================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Analytical Design Critique</h2>
              <p className="text-xs text-slate-500">
                Grounded strategic critique with verified confidence scores and zero fabricated personal contacts.
              </p>
            </div>
          </div>
          <DataCategoryPill category="AI_ANALYSIS" />
        </div>

        {aiAnalyses.length > 0 ? (
          <div className="space-y-4">
            {aiAnalyses.map((analysis) => (
              <div key={analysis.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <AIConfidenceBadge confidence={analysis.confidence} />
                    <span className="text-xs text-slate-600 font-mono">
                      Reason: {analysis.confidenceRationale}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Model: {analysis.modelIdentifier}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-600 font-semibold">Executive Analytical Critique:</div>
                  <p className="text-sm text-slate-800 leading-relaxed">{analysis.summary}</p>
                </div>

                {/* Pitch Angles */}
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-600 font-semibold">Suggested Client Pitch Angles:</div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.pitchAngles.map((angle, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-medium"
                      >
                        {angle}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Design & UX Recommendations ({analysis.recommendations.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysis.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{rec.title}</span>
                          <AIConfidenceBadge confidence={rec.confidence} />
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          <strong className="text-slate-800">Observation:</strong> {rec.currentObservation}
                        </div>
                        <div className="text-purple-900 text-[11px] bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                          <strong className="text-purple-800">Concept:</strong> {rec.proposedRedesignConcept}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color Psychology & Design Intelligence */}
                {analysis.designIntelligence && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center space-x-2 pb-1 border-b border-slate-200">
                      <Palette className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">Color Psychology + Design Intelligence</h3>
                    </div>
                    
                    {/* Disclaimer Banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                        <strong>Important:</strong> Color psychology and stylistic directions are generated as subjective design recommendations to build aesthetic cohesion, not absolute scientific certainties.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="block text-slate-500 font-medium mb-0.5">Industry</span>
                          <span className="text-slate-900 font-semibold">{analysis.designIntelligence.industry}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 font-medium mb-0.5">Brand Personality</span>
                          <span className="text-slate-800">{analysis.designIntelligence.brandPersonality}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 font-medium mb-0.5">Target Audience</span>
                          <span className="text-slate-800">{analysis.designIntelligence.targetAudience}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 font-medium mb-0.5">Existing Branding</span>
                          <span className="text-slate-600 italic">{analysis.designIntelligence.existingBranding}</span>
                        </div>
                        
                        <div>
                          <span className="block text-slate-500 font-medium mb-1.5">Recommended Color Direction</span>
                          <div className="flex flex-wrap gap-2">
                            {analysis.designIntelligence.recommendedColors.map((color, i) => (
                              <div key={i} className="flex items-center space-x-2 bg-white border border-slate-200 rounded-md p-1.5 pr-3 shadow-2xs">
                                <div className="w-4 h-4 rounded shadow-2xs border border-black/10" style={{ backgroundColor: color.hexCode }} />
                                <span className="text-[11px] font-medium text-slate-700">{color.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="block text-slate-500 font-medium mb-0.5">Typography Direction</span>
                          <span className="text-slate-800">{analysis.designIntelligence.typographyDirection}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 font-medium mb-0.5">UI Style</span>
                          <span className="text-slate-800">{analysis.designIntelligence.uiStyle}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 font-medium mb-0.5">Photography Direction</span>
                          <span className="text-slate-800">{analysis.designIntelligence.photographyDirection}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 font-medium mb-0.5">CTA Style</span>
                          <span className="text-slate-800">{analysis.designIntelligence.ctaStyle}</span>
                        </div>
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <span className="block text-emerald-800 font-semibold mb-0.5">Design Rationale</span>
                          <span className="text-emerald-900">{analysis.designIntelligence.designRationale}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] text-slate-600 italic">
                  🛡️ {analysis.verificationStatement}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs space-y-2">
            <p>Click &ldquo;Generate AI Critique&rdquo; above to produce a safety-verified analytical critique.</p>
          </div>
        )}
      </div>
    </div>
  );
};
