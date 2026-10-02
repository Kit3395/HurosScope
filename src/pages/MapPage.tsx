import React, { useState, useMemo } from 'react';
import { businessService, leadService, intelligenceService } from '../services';
import { Business, Lead, LeadPipelineStatus } from '../types';
import {
  MapPin,
  Filter,
  ExternalLink,
  Search,
  Building2,
  Phone,
  Globe,
  Star,
  ShieldCheck,
  Flame,
  ArrowRight,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

interface MapFilters {
  status: string;
  category: string;
  minScore: number;
  searchQuery: string;
}

const CEBU_CITY = { lat: 10.3157, lng: 123.8854 };

export const MapPage: React.FC<{
  onNavigate: (page: string, params?: { leadId?: string; filterStatus?: LeadPipelineStatus }) => void;
}> = ({ onNavigate }) => {
  const [filters, setFilters] = useState<MapFilters>({
    status: 'ALL',
    category: 'ALL',
    minScore: 0,
    searchQuery: '',
  });

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const businesses = businessService.getAll();
  const leads = leadService.getAll();

  const mapData = useMemo(() => {
    return businesses.map((business, index) => {
      const lead = leads.find((l) => l.businessId === business.id);
      const scores = intelligenceService.getLeadScores(business.id);
      const latestScore =
        scores.length > 0
          ? [...scores].sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())[0]
          : null;

      // Deterministic coordinate offset based on business id hash
      const hash = business.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const latOffset = ((hash % 100) / 100 - 0.5) * 0.08;
      const lngOffset = (((hash * 7) % 100) / 100 - 0.5) * 0.08;

      const lat = business.external.externalAddress?.latitude || CEBU_CITY.lat + latOffset;
      const lng = business.external.externalAddress?.longitude || CEBU_CITY.lng + lngOffset;

      return {
        business,
        lead,
        score: latestScore?.aiScoreData?.overallProspectScore ?? null,
        position: { lat, lng },
        category: business.external.primaryCategoryCode || 'General Services',
        status: lead?.pipelineStatus || 'New',
      };
    });
  }, [businesses, leads]);

  const filteredData = useMemo(() => {
    return mapData.filter((item) => {
      if (filters.status !== 'ALL' && item.status !== filters.status) return false;
      if (filters.category !== 'ALL' && item.category !== filters.category) return false;
      if (item.score !== null && item.score < filters.minScore) return false;
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const name = (item.business.crm.verifiedBusinessName || item.business.external.tradeName || '').toLowerCase();
        const domain = (item.business.identifiers.normalizedDomain || '').toLowerCase();
        if (!name.includes(q) && !domain.includes(q)) return false;
      }
      return true;
    });
  }, [mapData, filters]);

  const activeSelectedItem = useMemo(() => {
    if (selectedBusinessId) {
      const found = mapData.find((d) => d.business.id === selectedBusinessId);
      if (found) return found;
    }
    return filteredData[0] || null;
  }, [selectedBusinessId, mapData, filteredData]);

  const getScoreBadge = (score: number | null) => {
    if (score === null) {
      return {
        label: 'UNSCORED',
        color: 'text-slate-500 bg-slate-50 border-slate-200',
        dot: 'bg-slate-300',
      };
    }
    if (score >= 85) {
      return {
        label: 'HOT ICP',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        dot: 'bg-rose-500',
      };
    }
    if (score >= 70) {
      return {
        label: 'HIGH VALUE',
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (score >= 50) {
      return {
        label: 'QUALIFIED',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        dot: 'bg-blue-500',
      };
    }
    return {
      label: 'TARGET',
      color: 'text-slate-700 bg-slate-100 border-slate-200',
      dot: 'bg-slate-400',
    };
  };

  const uniqueCategories = Array.from(new Set(mapData.map((d) => d.category)));
  const uniqueStatuses = Array.from(new Set(mapData.map((d) => d.status)));

  // Coordinate bounding box for SVG projection
  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    if (mapData.length === 0) {
      return {
        minLat: CEBU_CITY.lat - 0.05,
        maxLat: CEBU_CITY.lat + 0.05,
        minLng: CEBU_CITY.lng - 0.05,
        maxLng: CEBU_CITY.lng + 0.05,
      };
    }
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    mapData.forEach((d) => {
      if (d.position.lat < minLat) minLat = d.position.lat;
      if (d.position.lat > maxLat) maxLat = d.position.lat;
      if (d.position.lng < minLng) minLng = d.position.lng;
      if (d.position.lng > maxLng) maxLng = d.position.lng;
    });
    // Add margin
    const latMargin = Math.max(0.015, (maxLat - minLat) * 0.1);
    const lngMargin = Math.max(0.015, (maxLng - minLng) * 0.1);
    return {
      minLat: minLat - latMargin,
      maxLat: maxLat + latMargin,
      minLng: minLng - lngMargin,
      maxLng: maxLng + lngMargin,
    };
  }, [mapData]);

  // Project lat/lng into 0-100% SVG viewport
  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng || 1)) * 88 + 6;
    // Invert y because SVG y goes downwards while latitude goes upwards
    const y = ((maxLat - lat) / (maxLat - minLat || 1)) * 84 + 8;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(6, Math.min(94, y)) };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs text-blue-700 font-bold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Territory Intelligence & Geospatial Targeting</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Geographic Opportunity Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Interactive territory visualization of audited local business leads, redesign scores, and conversion heat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('discover')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Discover New Leads</span>
          </button>
          <button
            onClick={() => onNavigate('leads')}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Lead Pipeline</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Controls + Interactive Canvas + Selected Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filter Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>Territory Filters</span>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {filteredData.length} Matches
            </span>
          </div>

          {/* Search Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Search Business
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by business or website..."
                value={filters.searchQuery}
                onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Minimum Redesign / ICP Score Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Min Prospect Score
              </label>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {filters.minScore}+
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={filters.minScore}
              onChange={(e) => setFilters((f) => ({ ...f, minScore: parseInt(e.target.value) || 0 }))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>All (0)</span>
              <span>Qualified (50+)</span>
              <span>Hot (85+)</span>
            </div>
          </div>

          {/* Pipeline Stage Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pipeline Stage
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Pipeline Stages</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Business Category Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Industry Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filtered Quick List */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Matching Targets</span>
              <span className="text-slate-400 text-[11px]">Click to inspect</span>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredData.map((item) => {
                const isSelected = activeSelectedItem?.business.id === item.business.id;
                const badge = getScoreBadge(item.score);
                const name = item.business.crm.verifiedBusinessName || item.business.external.tradeName;

                return (
                  <button
                    key={item.business.id}
                    onClick={() => setSelectedBusinessId(item.business.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{name}</div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>{item.status}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center space-x-1.5 font-bold font-mono">
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                      <span className="text-xs text-slate-800">{item.score ?? '—'}</span>
                    </div>
                  </button>
                );
              })}
              {filteredData.length === 0 && (
                <div className="text-xs text-center text-slate-500 py-6">
                  No businesses match your current filters.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Territory Canvas & Selected Prospect (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Territory Canvas Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Metro Territory Map Canvas
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Cebu City Metro Hub & Regional Nodes • Approximate positions (no GPS data)
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Hot (85+)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> High (70+)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Qualified (50+)
                </span>
              </div>
            </div>

            {/* Visual SVG Map Canvas with Clean High-Contrast Light Styling */}
            <div className="relative w-full h-[420px] rounded-xl bg-slate-50 border border-slate-200 overflow-hidden select-none">
              {/* Subtle Grid Lines & Geographic Sector Rings */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-200/80" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="0.75" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                
                {/* Visual Radial Territory Rings centered around primary node */}
                <circle cx="50%" cy="50%" r="90" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="50%" cy="50%" r="160" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="50%" cy="50%" r="240" fill="none" stroke="#f1f5f9" strokeWidth="1" />
              </svg>

              {/* Center Metro Hub Marker */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
                style={{ zIndex: 1 }}
              >
                <div className="w-4 h-4 rounded-full bg-blue-600/20 border border-blue-600 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                </div>
                <span className="text-[9px] font-bold font-mono text-blue-700 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs mt-1 border border-blue-200">
                  Cebu Hub
                </span>
              </div>

              {/* Markers for Businesses */}
              {filteredData.map((item) => {
                const isSelected = activeSelectedItem?.business.id === item.business.id;
                const { x, y } = projectCoords(item.position.lat, item.position.lng);
                const badge = getScoreBadge(item.score);
                const name = item.business.crm.verifiedBusinessName || item.business.external.tradeName;

                return (
                  <button
                    key={item.business.id}
                    type="button"
                    onClick={() => setSelectedBusinessId(item.business.id)}
                    aria-label={`${name}${item.score === null ? ', not scored yet' : `, redesign score ${item.score}`}`}
                    className="absolute cursor-pointer transition-transform hover:scale-125"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isSelected ? 30 : 10,
                    }}
                    title={item.score === null ? `${name} • Not scored yet` : `${name} • Redesign Score: ${item.score}`}
                  >
                    <div
                      className={`relative flex items-center justify-center rounded-full p-1 transition-all shadow-md ${
                        isSelected
                          ? 'ring-4 ring-blue-400/40 scale-125 bg-white border-2 border-blue-600'
                          : 'bg-white border border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full ${badge.dot} flex items-center justify-center text-white font-mono text-[8px] font-bold`}>
                        {item.score !== null && item.score >= 85 ? '!' : ''}
                      </div>

                      {/* Tooltip Tag */}
                      <div
                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white block opacity-100'
                            : 'bg-white text-slate-800 border border-slate-200 hidden group-hover:block opacity-90'
                        }`}
                      >
                        <span className="truncate max-w-[130px] inline-block align-middle">{name}</span>
                        {item.score !== null && <span className="ml-1 text-amber-400">★{item.score}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Bottom Canvas Overlay Controls */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Approximate Positions — Not GPS-Verified</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  Lat: 10.3157° N • Lng: 123.8854° E
                </span>
              </div>
            </div>
          </div>

          {/* Active Lead Inspection Card */}
          {activeSelectedItem && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        getScoreBadge(activeSelectedItem.score).color
                      }`}
                    >
                      {getScoreBadge(activeSelectedItem.score).label}
                      {activeSelectedItem.score !== null && ` • ${activeSelectedItem.score} / 100`}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Stage: <strong className="text-slate-800">{activeSelectedItem.status}</strong>
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {activeSelectedItem.business.crm.verifiedBusinessName ||
                      activeSelectedItem.business.external.tradeName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {activeSelectedItem.business.external.externalAddress?.formattedAddress ||
                        'Metro Business District, Cebu City'}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onNavigate('leads', {
                        leadId: activeSelectedItem.lead?.id,
                        filterStatus: activeSelectedItem.lead?.pipelineStatus,
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Inspect CRM Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Data Grid: Contact, Website, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Website / Domain
                  </div>
                  <div className="font-semibold text-slate-900 truncate mt-1">
                    {activeSelectedItem.business.external.externalWebsiteUrl ? (
                      <a
                        href={activeSelectedItem.business.external.externalWebsiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 truncate"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{activeSelectedItem.business.external.externalWebsiteUrl}</span>
                      </a>
                    ) : (
                      <span className="text-rose-600 font-bold">No Website (Redesign Priority)</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Phone / Line
                  </div>
                  <div className="font-semibold text-slate-900 truncate mt-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{activeSelectedItem.business.external.externalPhone || 'Pending verification'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Redesign Potential
                  </div>
                  <div className="font-bold text-emerald-700 truncate mt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>High Commercial Upsell</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
