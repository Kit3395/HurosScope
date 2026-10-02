-- ============================================================================
-- Supabase Database Migration
-- Migration: 20260918000000_create_core_crm_tables.sql
-- Tables: businesses, leads, contacts, proposals
-- Relational Model: Strict foreign keys with cascading deletes (ON DELETE CASCADE)
-- ============================================================================

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. BUSINESSES TABLE (Primary Parent Entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_or_registered_name TEXT,
  trade_name TEXT,
  category TEXT,
  formatted_address TEXT,
  phone TEXT,
  website_url TEXT,
  google_rating NUMERIC(3, 2),
  google_review_count INT DEFAULT 0,
  business_status TEXT DEFAULT 'OPERATIONAL',
  opportunity_score INT DEFAULT 0,
  opportunity_grade TEXT DEFAULT 'LOW_OPPORTUNITY',
  pipeline_stage TEXT DEFAULT 'DISCOVERY',
  google_place_id TEXT,
  normalized_domain TEXT,
  normalized_phone TEXT,
  normalized_name TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  external_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  crm_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  app_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  identifiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & Lookup Indexes for Businesses
CREATE INDEX IF NOT EXISTS idx_businesses_place_id ON public.businesses(google_place_id);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_domain ON public.businesses(normalized_domain);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_phone ON public.businesses(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_pipeline_stage ON public.businesses(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_businesses_is_deleted ON public.businesses(is_deleted);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON public.businesses(created_at DESC);

-- ============================================================================
-- 2. LEADS TABLE (Child of businesses - Cascading Delete)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  pipeline_status TEXT NOT NULL DEFAULT 'Discover',
  deal_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  deal_type TEXT NOT NULL DEFAULT 'NEW_WEBSITE',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_id TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Relational Foreign Key: Deleting a business cascades to its leads
  CONSTRAINT fk_leads_business
    FOREIGN KEY (business_id)
    REFERENCES public.businesses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Performance & Relational Indexes for Leads
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON public.leads(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_is_deleted ON public.leads(is_deleted);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- ============================================================================
-- 3. CONTACTS TABLE (Child of businesses & leads - Cascading Delete)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  lead_id TEXT,
  full_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  business_email TEXT,
  business_phone TEXT,
  linkedin_company_profile_url TEXT,
  source TEXT NOT NULL DEFAULT 'USER_ENTERED',
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Relational Foreign Keys: Deleting a business or lead cascades to associated contacts
  CONSTRAINT fk_contacts_business
    FOREIGN KEY (business_id)
    REFERENCES public.businesses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_contacts_lead
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Performance & Relational Indexes for Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON public.contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON public.contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(business_email);
CREATE INDEX IF NOT EXISTS idx_contacts_is_deleted ON public.contacts(is_deleted);

-- ============================================================================
-- 4. PROPOSALS TABLE (Child of businesses & leads - Cascading Delete)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposals (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  lead_id TEXT,
  proposal_number TEXT,
  title TEXT NOT NULL,
  scope_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  valid_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Relational Foreign Keys: Deleting a business or lead cascades to associated proposals
  CONSTRAINT fk_proposals_business
    FOREIGN KEY (business_id)
    REFERENCES public.businesses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_proposals_lead
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Performance & Relational Indexes for Proposals
CREATE INDEX IF NOT EXISTS idx_proposals_business_id ON public.proposals(business_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON public.proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_is_deleted ON public.proposals(is_deleted);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);

-- ============================================================================
-- 5. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON public.contacts;
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Businesses Policy
  DROP POLICY IF EXISTS "businesses_all_access" ON public.businesses;
  CREATE POLICY "businesses_all_access"
    ON public.businesses
    FOR ALL
    USING (true)
    WITH CHECK (true);

  -- Leads Policy
  DROP POLICY IF EXISTS "leads_all_access" ON public.leads;
  CREATE POLICY "leads_all_access"
    ON public.leads
    FOR ALL
    USING (true)
    WITH CHECK (true);

  -- Contacts Policy
  DROP POLICY IF EXISTS "contacts_all_access" ON public.contacts;
  CREATE POLICY "contacts_all_access"
    ON public.contacts
    FOR ALL
    USING (true)
    WITH CHECK (true);

  -- Proposals Policy
  DROP POLICY IF EXISTS "proposals_all_access" ON public.proposals;
  CREATE POLICY "proposals_all_access"
    ON public.proposals
    FOR ALL
    USING (true)
    WITH CHECK (true);
END $$;
