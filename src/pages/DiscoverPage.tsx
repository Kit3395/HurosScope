/**
 * HorusScope - Phase 3: Business Discovery Page
 * Powered by official Google Places API (New) via secure server-side proxy.
 * Implements field masking, rate limiting, request cancellation,
 * multi-signal deduplication, and controlled CRM imports.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Globe,
  Info,
  Layers,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import {
  Business,
  DiscoveredBusiness,
  DiscoverySearchParams,
  DiscoverySearchResult,
  LeadPipelineStatus,
} from '../types';
import { businessService, discoveryService, leadService } from '../services';
import { humanApprovalGate } from '../security/approvalGate';
import { GoogleAttributionBanner } from '../components/discovery/GoogleAttributionBanner';
import { DuplicateReviewModal } from '../components/discovery/DuplicateReviewModal';
import { DiscoveryDiagnosticsCard } from '../components/discovery/DiscoveryDiagnosticsCard';
import { PipelineLifecycleBanner } from '../components/PipelineLifecycleBanner';
import { LocationAutocomplete } from '../components/discovery/LocationAutocomplete';
import { EXPANDED_CATEGORIES, INDUSTRY_GROUPS, getCategoriesGrouped } from '../config/categories';

interface Props {
  onNavigate?: (page: string, params?: { leadId?: string; filterStatus?: LeadPipelineStatus }) => void;
}

const CATEGORIES = EXPANDED_CATEGORIES;

const SUGGESTED_LOCATIONS = [
  'Cebu City, Philippines',
  'Makati, Philippines',
  'Austin, TX',
  'Miami, FL',
  'Denver, CO',
  'Chicago, IL',
  'London, United Kingdom',
];

export const DiscoverPage: React.FC<Props> = ({ onNavigate }) => {
  // Search parameters
  const [params, setParams] = useState<DiscoverySearchParams>({
    location: 'Cebu City',
    category: 'Restaurants',
    keyword: '',
    radiusKm: 10,
    minRating: 4.0,
    minReviews: 20,
    websiteStatus: 'NO_WEBSITE', // Default to prime prospect target!
    socialPresence: 'ALL',
    leadStatus: 'ALL',
    opportunityFilter: 'ALL',
    pageSize: 10,
  });

  // State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<DiscoverySearchResult | null>(null);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [errorAlert, setErrorAlert] = useState<{
    status?: number;
    code?: string;
    message: string;
    remediation?: string;
  } | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Duplicate Review Modal State
  const [reviewItem, setReviewItem] = useState<DiscoveredBusiness | null>(null);
  const [reviewExistingBiz, setReviewExistingBiz] = useState<Business | null>(null);

  // Filter Drawer / Advanced options
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Perform search
  const handleExecuteSearch = async (overrideParams?: Partial<DiscoverySearchParams>) => {
    const searchParams = { ...params, ...(overrideParams || {}) };
    setErrorAlert(null);
    setSuccessBanner(null);
    setIsSearching(true);
    setSelectedPlaceIds(new Set());

    try {
      const result = await discoveryService.search(searchParams);
      setSearchResult(result);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // User cancelled
      }
      setErrorAlert({
        status: err.status,
        code: err.code || 'SEARCH_FAILED',
        message: err.message || 'Unable to execute Places API discovery query.',
        remediation:
          err.remediation ||
          'Check network connectivity and confirm that your Google Cloud project has enabled the Places API (New).',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Cancel search
  const handleCancelSearch = () => {
    discoveryService.cancelPendingSearch();
    setIsSearching(false);
  };

  // Initial load: automatically run search for Cebu City to show working interface immediately
  useEffect(() => {
    handleExecuteSearch();
  }, []);

  // Filter results client-side based on criteria
  const filteredPlaces = useMemo(() => {
    if (!searchResult) return [];
    return searchResult.places.filter((place) => {
      // Rating filter
      if (params.minRating > 0 && (place.rating || 0) < params.minRating) {
        return false;
      }
      // Reviews filter
      if (params.minReviews > 0 && (place.reviewCount || 0) < params.minReviews) {
        return false;
      }
      // Website status
      if (params.websiteStatus === 'NO_WEBSITE' && place.websiteStatus !== 'NO_WEBSITE') {
        return false;
      }
      if (params.websiteStatus === 'HAS_WEBSITE' && place.websiteStatus !== 'HAS_WEBSITE') {
        return false;
      }
      // Lead status
      if (params.leadStatus === 'NOT_IN_CRM' && place.duplicateStatus === 'EXISTING_IN_CRM') {
        return false;
      }
      if (params.leadStatus === 'IN_CRM' && place.duplicateStatus !== 'EXISTING_IN_CRM') {
        return false;
      }
      // Opportunity filter
      if (params.opportunityFilter === 'HIGH' && place.opportunityScore < 70) {
        return false;
      }
      if (
        params.opportunityFilter === 'MEDIUM' &&
        (place.opportunityScore < 40 || place.opportunityScore >= 70)
      ) {
        return false;
      }
      if (params.opportunityFilter === 'LOW' && place.opportunityScore >= 40) {
        return false;
      }
      return true;
    });
  }, [searchResult, params]);

  // Handle single import
  const handleImportSingle = (place: DiscoveredBusiness) => {
    if (place.duplicateStatus === 'POTENTIAL_DUPLICATE' && place.matchedExistingBusinessId) {
      // Open duplicate review modal
      const existing = businessService.getById(place.matchedExistingBusinessId);
      if (existing) {
        setReviewItem(place);
        setReviewExistingBiz(existing);
        return;
      }
    }

    try {
      const imported = discoveryService.importBusiness(place);
      setSuccessBanner(`Successfully imported "${place.name}" into CRM (Lead created).`);
      // Update place status locally
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          places: searchResult.places.map((p) =>
            p.id === place.id ? { ...p, duplicateStatus: 'EXISTING_IN_CRM' } : p
          ),
        });
      }
    } catch (err: any) {
      setErrorAlert({
        message: err.message || 'Failed to import business.',
      });
    }
  };

  // Handle selected batch import
  const handleImportSelected = async () => {
    const toImport = filteredPlaces.filter((p) => selectedPlaceIds.has(p.id));
    if (toImport.length === 0) return;

    // Human Approval Gate Check
    const approved = await humanApprovalGate.requestApproval({
      actionType: 'BULK_IMPORT',
      targetSummary: `${toImport.length} Selected Prospects for CRM Ingestion`,
      itemCount: toImport.length,
    });
    if (!approved) return;

    // Check if any selected are flagged as potential duplicates
    const flagged = toImport.filter((p) => p.duplicateStatus === 'POTENTIAL_DUPLICATE');
    if (flagged.length > 0) {
      const firstFlagged = flagged[0];
      const existing = businessService.getById(firstFlagged.matchedExistingBusinessId || '');
      if (existing) {
        setReviewItem(firstFlagged);
        setReviewExistingBiz(existing);
        return;
      }
    }

    const res = discoveryService.importBatch(toImport);
    setSuccessBanner(
      `Batch Import Complete: ${res.importedCount} businesses imported successfully into CRM (${res.skippedDuplicatesCount} duplicates skipped).`
    );

    // Refresh place statuses
    if (searchResult) {
      setSearchResult({
        ...searchResult,
        places: searchResult.places.map((p) =>
          selectedPlaceIds.has(p.id) ? { ...p, duplicateStatus: 'EXISTING_IN_CRM' } : p
        ),
      });
    }
    setSelectedPlaceIds(new Set());
  };

  // Handle import all visible results
  const handleImportVisible = async () => {
    const nonDuplicates = filteredPlaces.filter((p) => p.duplicateStatus !== 'EXISTING_IN_CRM');
    if (nonDuplicates.length === 0) {
      setSuccessBanner('All visible businesses are already present in CRM.');
      return;
    }

    // Human Approval Gate Check
    const approved = await humanApprovalGate.requestApproval({
      actionType: 'BULK_IMPORT',
      targetSummary: `${nonDuplicates.length} Visible Prospects for Batch CRM Import`,
      itemCount: nonDuplicates.length,
    });
    if (!approved) return;

    // Check for duplicates
    const flagged = nonDuplicates.filter((p) => p.duplicateStatus === 'POTENTIAL_DUPLICATE');
    if (flagged.length > 0) {
      const first = flagged[0];
      const existing = businessService.getById(first.matchedExistingBusinessId || '');
      if (existing) {
        setReviewItem(first);
        setReviewExistingBiz(existing);
        return;
      }
    }

    const res = discoveryService.importBatch(nonDuplicates);
    setSuccessBanner(
      `Imported ${res.importedCount} visible businesses (${res.skippedDuplicatesCount} existing duplicates skipped).`
    );

    if (searchResult) {
      setSearchResult({
        ...searchResult,
        places: searchResult.places.map((p) => ({
          ...p,
          duplicateStatus: 'EXISTING_IN_CRM',
        })),
      });
    }
  };

  // Toggle selection
  const toggleSelectPlace = (id: string) => {
    const next = new Set(selectedPlaceIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlaceIds(next);
  };

  // Select all visible
  const handleToggleSelectAll = () => {
    if (selectedPlaceIds.size === filteredPlaces.length) {
      setSelectedPlaceIds(new Set());
    } else {
      setSelectedPlaceIds(new Set(filteredPlaces.map((p) => p.id)));
    }
  };

  // Copy Place ID helper
  const handleCopyPlaceId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Preset search query handler
  const applyPresetQuery = (
    loc: string,
    cat: string,
    web: 'NO_WEBSITE' | 'ALL',
    rating: number,
    reviews: number,
    kw?: string
  ) => {
    const nextParams: DiscoverySearchParams = {
      ...params,
      location: loc,
      category: cat,
      websiteStatus: web,
      minRating: rating,
      minReviews: reviews,
      keyword: kw || '',
    };
    setParams(nextParams);
    handleExecuteSearch(nextParams);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Title & Status Pill */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Business Discovery
                </h1>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  Google Places API (New)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Authorized prospect search with multi-signal deduplication, field-mask compliance, and controlled CRM imports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            <span>Anti-Scraping Enforced</span>
          </span>
        </div>
      </div>

      {/* Governing Acquisition Principle Bar */}
      <PipelineLifecycleBanner
        currentStage="Discover"
        onSelectStage={(stage) => {
          if (onNavigate) {
            onNavigate('leads', { filterStatus: stage });
          }
        }}
      />

      {/* Diagnostics Card (Includes Test Suite verification buttons) */}
      <DiscoveryDiagnosticsCard
        isSearching={isSearching}
        onRunTestQuery={(loc, cat, kw) => {
          applyPresetQuery(loc, cat, 'ALL', 0, 0, kw);
        }}
        onSimulateError={async (type) => {
          setErrorAlert(null);
          setIsSearching(true);
          try {
            await discoveryService.search(params, { simulateError: type });
          } catch (err: any) {
            setErrorAlert({
              status: err.status,
              code: err.code,
              message: err.message,
              remediation: err.remediation,
            });
          } finally {
            setIsSearching(false);
          }
        }}
      />

      {/* Feedback & Alert Banners */}
      {errorAlert && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <span>{errorAlert.code || 'Google Places API Error'}</span>
              {errorAlert.status && (
                <span className="rounded-md bg-red-200 px-1.5 py-0.2 text-[10px] font-mono">
                  HTTP {errorAlert.status}
                </span>
              )}
            </div>
            <p className="leading-relaxed">{errorAlert.message}</p>
            {errorAlert.remediation && (
              <p className="text-red-700/90 font-medium mt-1">
                Remediation: {errorAlert.remediation}
              </p>
            )}
          </div>
          <button
            onClick={() => setErrorAlert(null)}
            className="rounded-lg p-1 text-red-500 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SEARCH INTERFACE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        {/* Preset Queries Quick Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Quick Scenarios:
          </span>
          <button
            type="button"
            onClick={() => applyPresetQuery('Cebu City', 'Restaurants', 'NO_WEBSITE', 4.0, 20)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-amber-600" />
            Cebu City • Restaurants • No Website • 4+ ★ • 20+ Reviews
          </button>

          <button
            type="button"
            onClick={() => applyPresetQuery('Cebu City', 'Dentists', 'ALL', 4.5, 10)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            Cebu City • Dental Clinics • 4.5+ ★
          </button>

          <button
            type="button"
            onClick={() => applyPresetQuery('Austin, TX', 'Contractors', 'NO_WEBSITE', 4.0, 10)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            Austin, TX • Contractors • No Website
          </button>
        </div>

        {/* Primary Search Inputs Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Location with Auto-Suggest */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                Location <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-blue-600 font-bold">Type for Suggestions</span>
            </div>
            <LocationAutocomplete
              value={params.location}
              onChange={(loc) => setParams({ ...params, location: loc })}
              placeholder="e.g. Cebu City, Philippines or Austin, TX"
            />
            {/* Quick suggestions */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {SUGGESTED_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setParams({ ...params, location: loc })}
                  className="text-[10px] text-slate-600 hover:text-blue-600 hover:underline cursor-pointer font-medium"
                >
                  {loc.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Business Category with Grouping */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                Business Category <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">45+ High-Ticket Niches</span>
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select
                value={params.category}
                onChange={(e) => setParams({ ...params, category: e.target.value })}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs text-slate-900 font-medium focus:border-blue-500 focus:outline-hidden"
              >
                {INDUSTRY_GROUPS.map((group) => {
                  const groupCategories = EXPANDED_CATEGORIES.filter((c) => c.industryGroup === group.id);
                  return (
                    <optgroup key={group.id} label={`── ${group.label} ──`}>
                      {groupCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label} {cat.highOpportunityNiche ? '★' : ''}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
            {/* Category opportunity pitch hint */}
            {(() => {
              const currentCatDef = EXPANDED_CATEGORIES.find(
                (c) => c.id.toLowerCase() === params.category.toLowerCase()
              );
              if (currentCatDef?.opportunityPitch) {
                return (
                  <div className="mt-1 text-[10px] text-slate-600 truncate" title={currentCatDef.opportunityPitch}>
                    <span className="font-bold text-blue-600">Angle:</span> {currentCatDef.opportunityPitch}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Keyword */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Keyword (Optional)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={params.keyword}
                onChange={(e) => setParams({ ...params, keyword: e.target.value })}
                placeholder="e.g. seafood, cafe, rooftop"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Website Status (Crucial for prospecting) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Website Status
            </label>
            <select
              value={params.websiteStatus}
              onChange={(e) =>
                setParams({
                  ...params,
                  websiteStatus: e.target.value as DiscoverySearchParams['websiteStatus'],
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">All Businesses</option>
              <option value="NO_WEBSITE">🚨 No Website Only (Prime Leads)</option>
              <option value="HAS_WEBSITE">Has Website (Redesign Targets)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Controls Row */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-3 border-t border-slate-100 text-xs">
          {/* Minimum Rating */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Minimum Rating
            </label>
            <select
              value={params.minRating}
              onChange={(e) => setParams({ ...params, minRating: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-900 font-medium"
            >
              <option value={0}>Any Rating</option>
              <option value={3.5}>3.5+ Stars</option>
              <option value={4.0}>4.0+ Stars (Recommended)</option>
              <option value={4.5}>4.5+ Stars (Top Rated)</option>
            </select>
          </div>

          {/* Minimum Reviews */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Minimum Reviews
            </label>
            <select
              value={params.minReviews}
              onChange={(e) => setParams({ ...params, minReviews: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-900 font-medium"
            >
              <option value={0}>Any Review Count</option>
              <option value={5}>5+ Reviews</option>
              <option value={20}>20+ Reviews (Established)</option>
              <option value={50}>50+ Reviews (High Traffic)</option>
              <option value={100}>100+ Reviews (Market Leaders)</option>
            </select>
          </div>

          {/* Opportunity Score Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Opportunity Score
            </label>
            <select
              value={params.opportunityFilter}
              onChange={(e) =>
                setParams({
                  ...params,
                  opportunityFilter: e.target.value as DiscoverySearchParams['opportunityFilter'],
                })
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-900 font-medium"
            >
              <option value="ALL">All Opportunity Levels</option>
              <option value="HIGH">High Opportunity (70+)</option>
              <option value="MEDIUM">Medium Opportunity (40-69)</option>
              <option value="LOW">Low Opportunity (&lt;40)</option>
            </select>
          </div>

          {/* Lead Status in CRM */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              CRM Status Filter
            </label>
            <select
              value={params.leadStatus}
              onChange={(e) =>
                setParams({
                  ...params,
                  leadStatus: e.target.value as DiscoverySearchParams['leadStatus'],
                })
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-900 font-medium"
            >
              <option value="ALL">All Discovered</option>
              <option value="NOT_IN_CRM">Not Yet in CRM (New)</option>
              <option value="IN_CRM">Already In CRM</option>
            </select>
          </div>
        </div>

        {/* Search Execution Bar */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Radius:</span>
            {[5, 10, 25, 50].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setParams({ ...params, radiusKm: r })}
                className={`rounded-md px-2.5 py-1 font-bold transition-colors cursor-pointer ${
                  params.radiusKm === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isSearching && (
              <button
                type="button"
                onClick={handleCancelSearch}
                className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                Cancel Search
              </button>
            )}

            <button
              type="button"
              disabled={isSearching}
              onClick={() => handleExecuteSearch()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Searching Places API...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search Businesses</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS HEADER & CONTROLLED IMPORT TOOLBAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={
              filteredPlaces.length > 0 && selectedPlaceIds.size === filteredPlaces.length
            }
            onChange={handleToggleSelectAll}
            className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-xs font-bold text-slate-900">
              {filteredPlaces.length} Discovered Businesses
            </span>
            <span className="text-slate-500 text-xs ml-1.5 font-medium">
              in {params.location} ({selectedPlaceIds.size} selected)
            </span>
          </div>
        </div>

        {/* Controlled Import Actions (Explicitly no unrestricted bulk scraping) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selectedPlaceIds.size === 0}
            onClick={handleImportSelected}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Import Selected ({selectedPlaceIds.size})</span>
          </button>

          <button
            type="button"
            disabled={filteredPlaces.length === 0}
            onClick={handleImportVisible}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Import Visible Results ({filteredPlaces.length})</span>
          </button>
        </div>
      </div>

      {/* RESULTS LIST */}
      {filteredPlaces.length === 0 && !isSearching && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No Discovered Businesses Found</h3>
          <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto font-medium">
            Try broadening your search criteria, selecting "All Businesses" under Website Status, or increasing the search radius.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredPlaces.map((place) => {
          const isSelected = selectedPlaceIds.has(place.id);
          const hasWebsite = place.websiteStatus === 'HAS_WEBSITE';
          const isPotentialDup = place.duplicateStatus === 'POTENTIAL_DUPLICATE';
          const isExisting = place.duplicateStatus === 'EXISTING_IN_CRM';

          return (
            <div
              key={place.id}
              className={`group relative rounded-2xl border transition-all p-4.5 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/30 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                {/* Left: Info Block */}
                <div className="flex items-start gap-3.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectPlace(place.id)}
                    className="mt-1 h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {place.name}
                      </h3>

                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {place.primaryType?.replace(/_/g, ' ') || 'local business'}
                      </span>

                      {/* Duplicate Status Tag */}
                      {isExisting && (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          In CRM
                        </span>
                      )}

                      {isPotentialDup && (
                        <button
                          type="button"
                          onClick={() => {
                            const existing = businessService.getById(
                              place.matchedExistingBusinessId || ''
                            );
                            if (existing) {
                              setReviewItem(place);
                              setReviewExistingBiz(existing);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                        >
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          Potential Duplicate (Review)
                        </button>
                      )}

                      {!isExisting && !isPotentialDup && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Ready to Import
                        </span>
                      )}
                    </div>

                    {/* Meta line: Address, Phone, Website, Rating */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600">
                      {/* Rating & Reviews */}
                      <div className="flex items-center gap-1 text-amber-700 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        <span>{place.rating ? place.rating.toFixed(1) : 'N/A'}</span>
                        <span className="text-slate-500 font-normal">
                          ({place.reviewCount || 0} reviews)
                        </span>
                      </div>

                      {/* Address */}
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate max-w-xs sm:max-w-md">
                          {place.formattedAddress}
                        </span>
                      </div>

                      {/* Phone */}
                      {place.phone && (
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{place.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Website status pill */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {!hasWebsite ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          <Sparkles className="h-3 w-3 text-amber-600" />
                          🚨 No Website Detected — Prime Web Design Opportunity (+45 Opp Score)
                        </span>
                      ) : (
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          <span>{place.website}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      {/* Google Maps link */}
                      {place.googleMapsUri && (
                        <a
                          href={place.googleMapsUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                        >
                          View on Google Maps
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Google Place ID Tag (Primary External Reference) */}
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                      <span className="font-mono">
                        Google Place ID: <span className="text-slate-700 font-medium">{place.googlePlaceId}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPlaceId(place.googlePlaceId)}
                        title="Copy Place ID"
                        className="rounded p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {copiedId === place.googlePlaceId ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Opportunity Score Gauge & Action Button */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
                  {/* Opportunity Score Indicator */}
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 lg:justify-end">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Opportunity Score
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold border ${
                          place.opportunityScore >= 70
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : place.opportunityScore >= 40
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {place.opportunityScore} / 100
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isExisting ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigate && place.existingLeadId) {
                            onNavigate('leads', { leadId: place.existingLeadId });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        View in CRM
                      </button>
                    ) : isPotentialDup ? (
                      <button
                        type="button"
                        onClick={() => {
                          const existing = businessService.getById(
                            place.matchedExistingBusinessId || ''
                          );
                          if (existing) {
                            setReviewItem(place);
                            setReviewExistingBiz(existing);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Review Duplicate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleImportSingle(place)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Import Lead
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {searchResult && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredPlaces.length}</span> results in current search window
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={true}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              disabled={!searchResult.nextPageToken || isSearching}
              onClick={() => handleExecuteSearch({ pageToken: searchResult.nextPageToken })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
            >
              Next Page
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Official Google Maps Platform Attribution & Compliance Footer */}
      <GoogleAttributionBanner
        source={searchResult?.source}
        isSandbox={searchResult?.isSandboxData}
      />

      {/* Side-by-Side Duplicate Review Modal */}
      <DuplicateReviewModal
        isOpen={Boolean(reviewItem && reviewExistingBiz)}
        discoveredItem={reviewItem}
        existingBusiness={reviewExistingBiz}
        existingLead={
          reviewExistingBiz ? leadService.getByBusinessId(reviewExistingBiz.id) : undefined
        }
        onClose={() => {
          setReviewItem(null);
          setReviewExistingBiz(null);
        }}
        onResolved={(res) => {
          if (res === 'IMPORTED_DISTINCT' && reviewItem && searchResult) {
            setSuccessBanner(`Imported "${reviewItem.name}" as distinct business record.`);
            setSearchResult({
              ...searchResult,
              places: searchResult.places.map((p) =>
                p.id === reviewItem.id ? { ...p, duplicateStatus: 'EXISTING_IN_CRM' } : p
              ),
            });
          } else if (res === 'LINKED_EXTERNAL_SOURCE' && reviewItem && searchResult) {
            setSuccessBanner(`Linked Place ID ${reviewItem.googlePlaceId} to existing CRM business.`);
          }
        }}
      />
    </div>
  );
};
