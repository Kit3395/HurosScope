import React, { useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  ShieldCheck,
  Activity,
  Layers,
  ArrowUpRight,
  Target,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  MessageSquare,
  PhoneCall,
  BrainCircuit,
  Lightbulb
} from 'lucide-react';
import { businessService, leadService, proposalService } from '../services';

export const AnalyticsPage: React.FC = () => {
  const businesses = businessService.getAll(false);
  const leads = leadService.getAll(false);
  const proposals = proposalService.getAll(false);
  const outreachActivities = leadService.getAllOutreach();

  const metrics = useMemo(() => {
    const qualifiedLeads = leads.filter(l => !['Discover', 'New', 'Researching', 'Lost'].includes(l.status));
    const wins = leads.filter(l => l.status === 'Client');
    const losses = leads.filter(l => l.status === 'Lost');
    
    const contactAttempts = outreachActivities.filter(o => o.status !== 'DRAFT' && o.status !== 'READY_FOR_MANUAL_SEND');
    const responses = outreachActivities.filter(o => o.status === 'REPLIED');
    const meetings = outreachActivities.filter(o => o.channel === 'MEETING' && ['COMPLETED', 'REPLIED'].includes(o.status));
    
    const revenue = proposals
      .filter(p => p.status === 'ACCEPTED')
      .reduce((sum, p) => sum + p.totalUSD, 0);

    return {
      businessesDiscovered: businesses.length,
      leadsImported: leads.length,
      qualifiedLeads: qualifiedLeads.length,
      contactAttempts: contactAttempts.length,
      responses: responses.length,
      meetings: meetings.length,
      proposalsSent: proposals.filter(p => p.status === 'CLIENT_SENT' || p.status === 'ACCEPTED' || p.status === 'DECLINED').length,
      proposals: proposals.length,
      wins: wins.length,
      losses: losses.length,
      revenue
    };
  }, [businesses, leads, proposals, outreachActivities]);

  // Real insights derived from the workspace's own data — no canned copy.
  const insights = useMemo(() => {
    const responded = outreachActivities.filter((o) => o.status === 'REPLIED');
    const attempted = outreachActivities.filter((o) => o.status !== 'DRAFT');

    // Response rate by business category
    const bizById = new Map(businesses.map((b) => [b.id, b]));
    const byCategory = new Map<string, { attempts: number; replies: number }>();
    for (const o of attempted) {
      const biz = bizById.get(o.businessId);
      const cat = biz?.external?.primaryCategoryCode || 'Other';
      const entry = byCategory.get(cat) || { attempts: 0, replies: 0 };
      entry.attempts++;
      if (responded.some((r) => r.id === o.id)) entry.replies++;
      byCategory.set(cat, entry);
    }
    let bestCategory: { cat: string; rate: number; replies: number; attempts: number } | null = null;
    for (const [cat, s] of byCategory) {
      if (s.attempts < 2) continue;
      const rate = s.replies / s.attempts;
      if (!bestCategory || rate > bestCategory.rate) {
        bestCategory = { cat, rate, replies: s.replies, attempts: s.attempts };
      }
    }

    // Response rate by channel
    const byChannel = new Map<string, { attempts: number; replies: number }>();
    for (const o of attempted) {
      const entry = byChannel.get(o.channel) || { attempts: 0, replies: 0 };
      entry.attempts++;
      if (responded.some((r) => r.id === o.id)) entry.replies++;
      byChannel.set(o.channel, entry);
    }
    let bestChannel: { channel: string; rate: number; replies: number; attempts: number } | null = null;
    for (const [channel, s] of byChannel) {
      if (s.attempts < 2) continue;
      const rate = s.replies / s.attempts;
      if (!bestChannel || rate > bestChannel.rate) {
        bestChannel = { channel, rate, replies: s.replies, attempts: s.attempts };
      }
    }

    // No-website share among qualified leads
    const qualified = leads.filter((l) => !['Discover', 'New', 'Researching', 'Lost'].includes(l.status));
    const noSite = qualified.filter((l) => {
      const biz = bizById.get(l.businessId);
      return biz && !biz.identifiers?.normalizedDomain;
    });

    return { bestCategory, bestChannel, qualified: qualified.length, noSite: noSite.length, attempted: attempted.length };
  }, [businesses, leads, outreachActivities]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-amber-500" />
              <span>Acquisition Analytics</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            System teaching you about your own business. Track performance and uncover AI-driven sales intelligence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Core Metrics Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
             <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <Target className="w-4 h-4 text-cyan-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Funnel Performance</h2>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               {[
                 { label: 'Discovered', value: metrics.businessesDiscovered, icon: Layers, color: 'text-slate-500' },
                 { label: 'Imported', value: metrics.leadsImported, icon: Users, color: 'text-blue-500' },
                 { label: 'Qualified', value: metrics.qualifiedLeads, icon: Activity, color: 'text-amber-500' },
                 { label: 'Contact Attempts', value: metrics.contactAttempts, icon: PhoneCall, color: 'text-violet-500' },
                 { label: 'Responses', value: metrics.responses, icon: MessageSquare, color: 'text-emerald-500' },
                 { label: 'Meetings', value: metrics.meetings, icon: Briefcase, color: 'text-pink-500' },
                 { label: 'Proposals', value: metrics.proposals, icon: Target, color: 'text-indigo-500' },
                 { label: 'Wins', value: metrics.wins, icon: CheckCircle2, color: 'text-emerald-500' },
               ].map((kpi, i) => (
                 <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between space-y-2">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                     <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                   </div>
                   <div className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</div>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
               <div className="space-y-1">
                 <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue Generated</span>
                 <div className="text-3xl font-bold text-slate-900 tracking-tight">${metrics.revenue.toLocaleString()}</div>
                 <div className="text-xs text-emerald-600 font-medium pt-1">From accepted proposals</div>
               </div>
               <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-medium">
                 <span className="text-slate-500">Win Rate</span>
                 <span className="text-slate-900">
                    {metrics.leadsImported > 0 ? Math.round((metrics.wins / metrics.leadsImported) * 100) : 0}%
                 </span>
               </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
               <div className="space-y-1">
                 <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lost Opportunities</span>
                 <div className="text-3xl font-bold text-slate-900 tracking-tight">{metrics.losses}</div>
                 <div className="text-xs text-red-500 font-medium pt-1">Dead leads in pipeline</div>
               </div>
               <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-medium">
                 <span className="text-slate-500">Contact-to-Response</span>
                 <span className="text-slate-900">
                    {metrics.contactAttempts > 0 ? Math.round((metrics.responses / metrics.contactAttempts) * 100) : 0}%
                 </span>
               </div>
            </div>
          </div>
        </div>
        
        {/* AI Insights Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-indigo-200/50 pb-3 mb-4">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">AI Sales Intelligence</h2>
            </div>
            
            <div className="space-y-4">
              {insights.attempted === 0 ? (
                <div className="bg-white/60 rounded-lg p-4 border border-white shadow-sm text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">Not enough activity yet.</span>{' '}
                  Insights appear here once outreach attempts are logged — every number below is computed from your workspace data, never canned.
                </div>
              ) : (
                <>
                  <div className="bg-white/60 rounded-lg p-3 border border-white shadow-sm backdrop-blur-sm">
                     <div className="flex items-start space-x-2">
                        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Best-Performing Category</h4>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            {insights.bestCategory ? (
                              <>
                                <span className="font-semibold text-slate-800">{insights.bestCategory.cat}</span> replies at{' '}
                                <span className="font-semibold text-slate-800">{Math.round(insights.bestCategory.rate * 100)}%</span>{' '}
                                ({insights.bestCategory.replies}/{insights.bestCategory.attempts} outreach attempts).
                              </>
                            ) : (
                              'No category has enough outreach attempts yet to rank performance.'
                            )}
                          </p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white/60 rounded-lg p-3 border border-white shadow-sm backdrop-blur-sm">
                     <div className="flex items-start space-x-2">
                        <Target className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">No-Website Segment</h4>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            {insights.qualified > 0 ? (
                              <>
                                <span className="font-semibold text-slate-800">{insights.noSite} of {insights.qualified}</span>{' '}
                                qualified leads have no detected website — a strong redesign pitch signal.
                              </>
                            ) : (
                              'No qualified leads yet. Import and qualify leads to surface the no-website segment.'
                            )}
                          </p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white/60 rounded-lg p-3 border border-white shadow-sm backdrop-blur-sm">
                     <div className="flex items-start space-x-2">
                        <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Best Channel</h4>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            {insights.bestChannel ? (
                              <>
                                <span className="font-semibold text-slate-800">{insights.bestChannel.channel}</span> leads at{' '}
                                <span className="font-semibold text-slate-800">{Math.round(insights.bestChannel.rate * 100)}%</span>{' '}
                                reply rate ({insights.bestChannel.replies}/{insights.bestChannel.attempts}).
                              </>
                            ) : (
                              'No channel has enough attempts yet to compare reply rates.'
                            )}
                          </p>
                        </div>
                     </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-5 pt-3 border-t border-indigo-200/50 text-[10px] text-center text-indigo-700/70 font-medium">
              Computed live from your workspace data — no sample or demo figures
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
