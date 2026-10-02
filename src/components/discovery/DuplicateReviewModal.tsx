/**
 * HorusScope - Phase 3: Duplicate Review Modal
 * Strictly adheres to rule: "Never automatically merge uncertain duplicates.
 * Instead show 'Potential duplicate' and allow manual review."
 * Provides side-by-side comparison of CRM Record vs Discovered Business.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Phone,
  Globe,
  Star,
  X,
  Link2,
  PlusCircle,
  ShieldAlert,
} from 'lucide-react';
import { Business, DiscoveredBusiness, DuplicateMatchDetail, Lead } from '../../types';
import { repository } from '../../database';
import { auditService } from '../../audit';

interface Props {
  isOpen: boolean;
  discoveredItem: DiscoveredBusiness | null;
  existingBusiness: Business | null;
  existingLead?: Lead;
  onClose: () => void;
  onResolved: (resolution: 'IMPORTED_DISTINCT' | 'LINKED_EXTERNAL_SOURCE' | 'DISMISSED') => void;
}

export const DuplicateReviewModal: React.FC<Props> = ({
  isOpen,
  discoveredItem,
  existingBusiness,
  existingLead,
  onClose,
  onResolved,
}) => {
  const [operatorNotes, setOperatorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !discoveredItem || !existingBusiness) {
    return null;
  }

  const matches = discoveredItem.duplicateMatches || [];

  const handleImportDistinct = () => {
    setIsSubmitting(true);
    try {
      // Import as a distinct record
      const result = repository.registerBusiness({
        name: discoveredItem.name,
        phone: discoveredItem.phone,
        website: discoveredItem.website,
        googlePlaceId: discoveredItem.googlePlaceId,
        address: {
          formattedAddress: discoveredItem.formattedAddress,
          locality: discoveredItem.locality,
        },
        sourceType: 'GOOGLE_PLACES_API',
        notes: `Imported as distinct entity after manual duplicate review.\nOperator note: ${
          operatorNotes || 'Confirmed distinct business/branch from ' + existingBusiness.id
        }\nPrevious matched candidate: ${existingBusiness.crm.verifiedBusinessName}`,
        tags: ['Duplicate Review: Marked Distinct', 'Phase 3 Discovery'],
      });

      auditService.log({
        actorId: 'system_operator',
        actorType: 'USER',
        action: 'DUPLICATE_REVIEWED',
        entityType: 'Business',
        entityId: result.business.id,
        changeSummary: `Operator manually resolved duplicate by importing as distinct entity (candidate: ${existingBusiness.id})`,
        newValue: {
          resolution: 'IMPORTED_DISTINCT',
          newBusinessId: result.business.id,
          existingBusinessId: existingBusiness.id,
        },
      });

      onResolved('IMPORTED_DISTINCT');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkExternalSource = () => {
    setIsSubmitting(true);
    try {
      // Safely link Google Place ID to existing business as a new ExternalSource without overwriting CRM fields
      repository.addExternalSourceToBusiness(existingBusiness.id, {
        sourceType: 'GOOGLE_PLACES_API',
        sourceId: discoveredItem.googlePlaceId,
        sourceUrl: discoveredItem.googleMapsUri,
        attributionText: 'Google Maps Platform / Places API (New)',
        payload: {
          googlePlaceId: discoveredItem.googlePlaceId,
          tradeName: discoveredItem.name,
          formattedAddress: discoveredItem.formattedAddress,
          phone: discoveredItem.phone,
          website: discoveredItem.website,
          rating: discoveredItem.rating,
          userRatingCount: discoveredItem.reviewCount,
        },
        isPrimarySource: false,
      });

      auditService.log({
        actorId: 'system_operator',
        actorType: 'USER',
        action: 'DUPLICATE_REVIEWED',
        entityType: 'Business',
        entityId: existingBusiness.id,
        changeSummary: `Operator linked Google Place ID ${discoveredItem.googlePlaceId} to existing CRM business ${existingBusiness.id}`,
        newValue: {
          resolution: 'LINKED_EXTERNAL_SOURCE',
          placeId: discoveredItem.googlePlaceId,
        },
      });

      onResolved('LINKED_EXTERNAL_SOURCE');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    auditService.log({
      actorId: 'system_operator',
      actorType: 'USER',
      action: 'DUPLICATE_REVIEWED',
      entityType: 'Business',
      entityId: existingBusiness.id,
      changeSummary: `Operator reviewed duplicate for "${discoveredItem.name}" and chose not to import.`,
      newValue: {
        resolution: 'DISMISSED',
      },
    });

    onResolved('DISMISSED');
    onClose();
  };

  return (
    <div
      id="duplicate-review-modal"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Potential Duplicate Detected</h2>
              <p className="text-xs text-slate-600 font-medium">
                A candidate matches one or more existing CRM business identifiers. Manual operator verification is required.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Duplicate Signals Summary */}
        <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>Matching Signals Detected ({matches.length}):</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {matches.map((m, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-900 shadow-2xs"
              >
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700">
                  {m.matchedField === 'googlePlaceId'
                    ? 'Place ID (Exact)'
                    : m.matchedField === 'normalizedDomain'
                    ? 'Website Domain'
                    : m.matchedField === 'normalizedPhone'
                    ? 'Phone Number'
                    : m.matchedField === 'nameAndLocation'
                    ? 'Name + Location'
                    : 'Normalized Name'}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-[11px] font-mono font-semibold text-slate-800">
                  Confidence: {Math.round(m.confidenceScore * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Column 1: Existing CRM Record */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Building2 className="h-4 w-4 text-blue-600" />
                Existing CRM Business
              </span>
              <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                In CRM Database
              </span>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verified Name</span>
                <p className="font-bold text-slate-900 text-sm">
                  {existingBusiness.crm.verifiedBusinessName || existingBusiness.external.tradeName}
                </p>
                <p className="font-mono text-[10px] text-slate-500">ID: {existingBusiness.id}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Google Place ID</span>
                <p className="font-mono text-[11px] text-slate-700 font-medium break-all">
                  {existingBusiness.identifiers.googlePlaceId || 'None assigned'}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                <span className="text-slate-700 font-medium">
                  {existingBusiness.external.externalAddress?.formattedAddress || 'No address stored'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="text-slate-700 font-medium">
                  {existingBusiness.external.externalPhone || 'No phone'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="text-slate-700 font-medium truncate">
                  {existingBusiness.external.externalWebsiteUrl || 'No website'}
                </span>
              </div>

              {existingLead && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-[11px]">
                  <span className="font-medium text-slate-500">Pipeline Status:</span>{' '}
                  <span className="font-bold text-blue-700">{existingLead.pipelineStatus}</span>
                  {existingLead.estimatedDealValueUSD && (
                    <span className="ml-2 text-slate-600 font-medium">
                      • Value: ${existingLead.estimatedDealValueUSD.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Incoming Discovered Business */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Globe className="h-4 w-4 text-emerald-600" />
                Discovered via Places API
              </span>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Incoming Candidate
              </span>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Place Name</span>
                <p className="font-bold text-slate-900 text-sm">{discoveredItem.name}</p>
                <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 font-semibold">
                  {discoveredItem.primaryType || 'establishment'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Google Place ID</span>
                <p className="font-mono text-[11px] text-slate-800 break-all font-semibold">
                  {discoveredItem.googlePlaceId}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                <span className="text-slate-700 font-medium">{discoveredItem.formattedAddress}</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="text-slate-700 font-medium">{discoveredItem.phone || 'No phone'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="text-slate-700 font-medium truncate">
                  {discoveredItem.website || 'No website detected'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-amber-700 font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  <span>{discoveredItem.rating ? discoveredItem.rating.toFixed(1) : 'N/A'}</span>
                  <span className="text-slate-500 text-[11px] font-normal">({discoveredItem.reviewCount || 0} reviews)</span>
                </div>
                <div className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  Opp Score: {discoveredItem.opportunityScore}/100
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Operator Notes */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Operator Review Notes (Optional audit annotation):
          </label>
          <input
            type="text"
            value={operatorNotes}
            onChange={(e) => setOperatorNotes(e.target.value)}
            placeholder="e.g. Confirmed this is a second branch or distinct legal franchise"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            Do Not Import (Keep CRM As-Is)
          </button>

          <button
            type="button"
            onClick={handleLinkExternalSource}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-600 bg-white px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 cursor-pointer"
          >
            <Link2 className="h-4 w-4" />
            Link Place ID to Existing CRM
          </button>

          <button
            type="button"
            onClick={handleImportDistinct}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            Import as Distinct Branch
          </button>
        </div>
      </div>
    </div>
  );
};
