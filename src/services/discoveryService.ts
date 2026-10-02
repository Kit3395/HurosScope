/**
 * HorusScope - Phase 3: Business Discovery Service
 * Interfaces with official Google Places API (New) via secure server-side proxy.
 * Implements strict rate limiting, request cancellation (AbortController),
 * multi-signal deduplication checking, and controlled CRM imports.
 */

import { auditService } from '../audit';
import { repository } from '../database';
import {
  DiscoveredBusiness,
  DiscoveryApiStatus,
  DiscoverySearchParams,
  DiscoverySearchResult,
} from '../types';
import {
  checkDuplicateRisk,
  normalizeBusinessName,
  normalizePhoneNumber,
  normalizeWebsiteDomain,
} from '../utils';
import { apiFetch } from './api';

class DiscoveryService {
  private lastSearchTimestamp: number = 0;
  private currentAbortController: AbortController | null = null;

  /**
   * Fetches the current Google Maps Platform / Places API status from the secure backend.
   */
  public async getApiStatus(): Promise<DiscoveryApiStatus> {
    try {
      const response = await apiFetch('/api/discovery/status');
      if (!response.ok) {
        throw new Error(`Status check returned ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      return {
        hasApiKey: false,
        placesApiVersion: 'Google Places API (New) - v1/places:searchText',
        requestsThisMinute: 0,
        remainingThisMinute: 30,
        minuteResetSeconds: 60,
        sessionRequestsCount: 0,
        isDiagnosticsModeAvailable: true,
        throttlingDelayMs: 600,
        attributionNotice: 'Powered by Google Maps Platform (Offline / Fallback)',
      };
    }
  }

  /**
   * Cancels any currently pending discovery search request.
   */
  public cancelPendingSearch(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  /**
   * Executes a Business Discovery query against the server proxy.
   * Cross-references every result with existing CRM businesses for multi-signal deduplication.
   */
  public async search(
    params: DiscoverySearchParams,
    options?: {
      forceSandbox?: boolean;
      simulateError?: 'INVALID_KEY' | 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'NETWORK';
    }
  ): Promise<DiscoverySearchResult> {
    // 1. Throttling guard: enforce minimum spacing between discovery requests
    const now = Date.now();
    const elapsedSinceLast = now - this.lastSearchTimestamp;
    if (elapsedSinceLast < 400 && !options?.simulateError) {
      await new Promise((resolve) => setTimeout(resolve, 400 - elapsedSinceLast));
    }
    this.lastSearchTimestamp = Date.now();

    // 2. Abort previous search if in-flight
    this.cancelPendingSearch();
    this.currentAbortController = new AbortController();

    const payload = {
      location: params.location,
      category: params.category,
      keyword: params.keyword,
      radiusKm: params.radiusKm,
      pageSize: params.pageSize || 10,
      pageToken: params.pageToken,
      forceSandbox: options?.forceSandbox,
      simulateError: options?.simulateError,
    };

    const response = await apiFetch('/api/discovery/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: this.currentAbortController.signal,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const error: any = new Error(errorJson.message || `Discovery search failed with status ${response.status}`);
      error.status = response.status;
      error.code = errorJson.error || 'DISCOVERY_ERROR';
      error.remediation = errorJson.remediation;
      throw error;
    }

    const data: DiscoverySearchResult = await response.json();

    // 3. Perform Live Deduplication Analysis against existing CRM businesses
    const existingBusinesses = repository.getAllBusinesses(false);
    const existingPool = existingBusinesses.map((b) => ({
      id: b.id,
      googlePlaceId: b.identifiers.googlePlaceId,
      normalizedName: b.identifiers.normalizedName,
      normalizedPhone: b.identifiers.normalizedPhone,
      normalizedDomain: b.identifiers.normalizedDomain,
      originalName: b.crm.verifiedBusinessName || b.external.tradeName || '',
      address: b.external.externalAddress?.formattedAddress,
      locality: b.external.externalAddress?.locality,
    }));

    // Map through discovered places and flag duplicates
    const enrichedPlaces: DiscoveredBusiness[] = data.places.map((place) => {
      // Check exact Google Place ID
      const exactPlaceMatch = existingBusinesses.find(
        (b) => b.identifiers.googlePlaceId && b.identifiers.googlePlaceId === place.googlePlaceId
      );

      const existingLead = exactPlaceMatch
        ? repository.getLeadByBusinessId(exactPlaceMatch.id)
        : undefined;

      if (exactPlaceMatch) {
        return {
          ...place,
          duplicateStatus: 'EXISTING_IN_CRM',
          matchedExistingBusinessId: exactPlaceMatch.id,
          matchedExistingBusinessName:
            exactPlaceMatch.crm.verifiedBusinessName || exactPlaceMatch.external.tradeName,
          existingLeadId: existingLead?.id,
          duplicateMatches: [
            {
              matchedField: 'googlePlaceId',
              existingRecordId: exactPlaceMatch.id,
              existingValue: exactPlaceMatch.identifiers.googlePlaceId!,
              incomingValue: place.googlePlaceId,
              confidenceScore: 1.0,
            },
          ],
        };
      }

      // Check multi-signal duplicate risk (phone, domain, name+location)
      const risk = checkDuplicateRisk(
        {
          googlePlaceId: place.googlePlaceId,
          name: place.name,
          phone: place.phone,
          website: place.website,
          address: place.formattedAddress,
          location: place.locality,
        },
        existingPool
      );

      if (risk.hasPotentialDuplicate) {
        const topMatch = risk.matches[0];
        const matchedBiz = existingBusinesses.find((b) => b.id === topMatch?.existingRecordId);
        return {
          ...place,
          duplicateStatus: 'POTENTIAL_DUPLICATE',
          duplicateMatches: risk.matches,
          matchedExistingBusinessId: topMatch?.existingRecordId,
          matchedExistingBusinessName:
            matchedBiz?.crm.verifiedBusinessName || matchedBiz?.external.tradeName,
          existingLeadId: topMatch?.existingRecordId
            ? repository.getLeadByBusinessId(topMatch.existingRecordId)?.id
            : undefined,
        };
      }

      return {
        ...place,
        duplicateStatus: 'NEW',
      };
    });

    // 4. Audit Search Execution
    auditService.log({
      actorId: 'system_operator',
      actorType: 'USER',
      action: 'DISCOVERY_SEARCH_EXECUTED',
      entityType: 'Business',
      entityId: 'search_query_' + Date.now(),
      changeSummary: `Executed Places API discovery: "${params.location}" | Category: ${params.category} | Results: ${enrichedPlaces.length}`,
      newValue: {
        query: params,
        resultsCount: enrichedPlaces.length,
        source: data.source,
      },
    });

    return {
      ...data,
      places: enrichedPlaces,
    };
  }

  /**
   * Imports a single discovered business into the CRM.
   * Stores the Google Place ID as the primary external reference,
   * cleanly maintains External vs CRM layer boundaries,
   * and creates a linked Lead record with pipeline status 'New'.
   */
  public importBusiness(
    item: DiscoveredBusiness,
    options?: {
      customNotes?: string;
      customTags?: string[];
      actorId?: string;
    }
  ): { businessId: string; leadId: string } {
    const actor = options?.actorId || 'system_operator';

    // Register into segregated database layer
    const result = repository.registerBusiness({
      name: item.name,
      phone: item.phone,
      website: item.website,
      googlePlaceId: item.googlePlaceId,
      address: {
        formattedAddress: item.formattedAddress,
        locality: item.locality,
      },
      sourceType: 'GOOGLE_PLACES_API',
      notes:
        options?.customNotes ||
        `Imported via Google Places API discovery (Opportunity Score: ${item.opportunityScore}/100).\nRating: ★${item.rating || 'N/A'} (${item.reviewCount || 0} reviews). ${
          item.website ? `Website: ${item.website}` : 'No official website found.'
        }`,
      tags: [
        'Discovery',
        item.primaryType ? item.primaryType.replace(/_/g, ' ') : 'local business',
        item.websiteStatus === 'NO_WEBSITE' ? 'Prime Target: No Website' : 'Has Website',
        ...(options?.customTags || []),
      ],
    });

    const lead = repository.getLeadByBusinessId(result.business.id);

    // Update lead attributes based on discovery signals
    if (lead) {
      lead.pipelineStatus = 'Discover';
      lead.status = 'Discover';
      lead.priority = item.opportunityScore >= 70 ? 'HIGH' : item.opportunityScore >= 40 ? 'MEDIUM' : 'LOW';
      lead.dealType = item.websiteStatus === 'NO_WEBSITE' ? 'NEW_WEBSITE' : 'REDESIGN';
      lead.servicesRecommended = item.opportunityReasons;
      lead.serviceInterest = item.opportunityReasons;
      lead.owner = 'Kieth Gonzales';
      lead.source = 'Google Places API';
      lead.probability = item.opportunityScore >= 70 ? 40 : 25;
      lead.estimatedDealValueUSD = item.websiteStatus === 'NO_WEBSITE' ? 3500 : 5000;
      lead.tags = [
        'Discovery Import',
        item.primaryType ? item.primaryType.replace(/_/g, ' ') : 'Local Business',
        item.websiteStatus === 'NO_WEBSITE' ? 'No Website' : 'Needs Redesign',
        ...(options?.customTags || []),
      ];
      lead.notes = options?.customNotes || `Discovered via Places API (Opportunity Score: ${item.opportunityScore}/100, Rating: ${item.rating || 'N/A'}).`;
      
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 3);
      lead.nextFollowUp = followUpDate.toISOString().split('T')[0];
      lead.nextFollowUpDate = lead.nextFollowUp;
      lead.updatedAt = new Date().toISOString();
    }

    // Emit explicit audit log
    auditService.log({
      actorId: actor,
      actorType: 'USER',
      action: 'DISCOVERY_BUSINESS_IMPORTED',
      entityType: 'Business',
      entityId: result.business.id,
      changeSummary: `Imported "${item.name}" from Google Places API (Place ID: ${item.googlePlaceId})`,
      newValue: {
        businessId: result.business.id,
        googlePlaceId: item.googlePlaceId,
        leadId: lead?.id,
        opportunityScore: item.opportunityScore,
      },
    });

    return {
      businessId: result.business.id,
      leadId: lead?.id || '',
    };
  }

  /**
   * Controlled Batch Import for multiple selected businesses.
   * Only processes items that the user has explicitly selected or approved.
   */
  public importBatch(
    items: DiscoveredBusiness[],
    actorId?: string
  ): {
    importedCount: number;
    skippedDuplicatesCount: number;
    results: Array<{ name: string; businessId?: string; status: 'IMPORTED' | 'SKIPPED_DUPLICATE' }>;
  } {
    let importedCount = 0;
    let skippedDuplicatesCount = 0;
    const results: Array<{ name: string; businessId?: string; status: 'IMPORTED' | 'SKIPPED_DUPLICATE' }> = [];

    for (const item of items) {
      if (item.duplicateStatus === 'EXISTING_IN_CRM') {
        skippedDuplicatesCount++;
        results.push({ name: item.name, status: 'SKIPPED_DUPLICATE' });
        continue;
      }

      const imported = this.importBusiness(item, { actorId });
      importedCount++;
      results.push({ name: item.name, businessId: imported.businessId, status: 'IMPORTED' });
    }

    auditService.log({
      actorId: actorId || 'system_operator',
      actorType: 'USER',
      action: 'DISCOVERY_BATCH_IMPORTED',
      entityType: 'Lead',
      entityId: 'batch_' + Date.now(),
      changeSummary: `Batch imported ${importedCount} businesses from discovery (${skippedDuplicatesCount} duplicates skipped)`,
      newValue: {
        importedCount,
        skippedDuplicatesCount,
      },
    });

    return {
      importedCount,
      skippedDuplicatesCount,
      results,
    };
  }
}

export const discoveryService = new DiscoveryService();
