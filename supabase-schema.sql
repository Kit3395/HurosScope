-- ============================================================================
-- HorusScope Sovereign Digital Intelligence - Production Supabase Schema
-- Complete relational database architecture for deployment
-- Copy and run in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ============================================================================

-- 1. BUSINESS ENTITIES
CREATE TABLE IF NOT EXISTS businesses (
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
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  external_payload JSONB DEFAULT '{}'::jsonb,
  crm_data JSONB DEFAULT '{}'::jsonb,
  app_data JSONB DEFAULT '{}'::jsonb,
  identifiers JSONB DEFAULT '{}'::jsonb,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for duplicate prevention and fast lookups
CREATE INDEX IF NOT EXISTS idx_businesses_place_id ON businesses(google_place_id);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_domain ON businesses(normalized_domain);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_phone ON businesses(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_stage ON businesses(pipeline_stage);

-- 2. CRM LEADS
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  pipeline_status TEXT NOT NULL DEFAULT 'Discover',
  deal_value NUMERIC(12, 2) DEFAULT 0,
  priority TEXT DEFAULT 'MEDIUM',
  tags JSONB DEFAULT '[]'::jsonb,
  owner_id TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON leads(pipeline_status);

-- 3. EXTERNAL DATA SOURCES
CREATE TABLE IF NOT EXISTS external_sources (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload_hash TEXT,
  attribution_text TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  is_primary_source BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_sources_biz ON external_sources(business_id);

-- 4. WEBSITE AUDITS
CREATE TABLE IF NOT EXISTS website_audits (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  audit_date TIMESTAMPTZ DEFAULT NOW(),
  overall_score INT DEFAULT 0,
  overall_grade TEXT,
  criteria_scores JSONB DEFAULT '{}'::jsonb,
  speed_index NUMERIC(5, 2),
  mobile_friendly BOOLEAN DEFAULT true,
  seo_rating TEXT,
  detected_issues JSONB DEFAULT '[]'::jsonb,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  executive_summary TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_audits_biz ON website_audits(business_id);

-- 5. SOCIAL AUDITS
CREATE TABLE IF NOT EXISTS social_audits (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT,
  profile_url TEXT,
  followers_count INT DEFAULT 0,
  last_post_date TIMESTAMPTZ,
  engagement_rate NUMERIC(5, 2),
  social_presence_score INT DEFAULT 0,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_audits_biz ON social_audits(business_id);

-- 6. CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  business_email TEXT,
  business_phone TEXT,
  linkedin_company_profile_url TEXT,
  source TEXT DEFAULT 'USER_ENTERED',
  verification_status TEXT DEFAULT 'UNVERIFIED',
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_biz ON contacts(business_id);

-- 7. AI ANALYSES
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT,
  analysis_type TEXT,
  executive_summary TEXT,
  pitch_angle TEXT,
  pain_points JSONB DEFAULT '[]'::jsonb,
  solution_stack JSONB DEFAULT '[]'::jsonb,
  full_payload JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model_version TEXT,
  confidence TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_biz ON ai_analyses(business_id);

-- 8. LEAD SCORES
CREATE TABLE IF NOT EXISTS lead_scores (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT,
  overall_score INT NOT NULL,
  grade TEXT NOT NULL,
  digital_opportunity INT DEFAULT 0,
  website_opportunity INT DEFAULT 0,
  social_opportunity INT DEFAULT 0,
  business_strength INT DEFAULT 0,
  contactability INT DEFAULT 0,
  explanation JSONB DEFAULT '{}'::jsonb,
  dimensions JSONB DEFAULT '{}'::jsonb,
  engine TEXT DEFAULT 'GEMINI_FLASH_3_8',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_biz ON lead_scores(business_id);

-- 9. OUTREACH ACTIVITIES
CREATE TABLE IF NOT EXISTS outreach_activities (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  performed_by TEXT,
  response_notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_biz ON outreach_activities(business_id);

-- 10. FOLLOW-UPS
CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_biz ON follow_ups(business_id);

-- 11. CLIENT PROPOSALS
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  proposal_number TEXT,
  title TEXT NOT NULL,
  scope_items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'DRAFT',
  notes TEXT,
  valid_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_biz ON proposals(business_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);

-- 12. ACCESS REQUESTS
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  organization TEXT,
  requested_role TEXT DEFAULT 'OPERATOR',
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- 13. USER ACCOUNTS
CREATE TABLE IF NOT EXISTS user_accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'OPERATOR',
  status TEXT DEFAULT 'APPROVED',
  organization TEXT,
  avatar_url TEXT,
  password_salt TEXT,
  password_hash TEXT,
  is_password_set BOOLEAN DEFAULT true,
  failed_login_attempts INT DEFAULT 0,
  lockout_until TIMESTAMPTZ,
  is_google_connected BOOLEAN DEFAULT false,
  google_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  actor_type TEXT DEFAULT 'USER',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_value_snapshot JSONB,
  new_value_snapshot JSONB,
  change_summary TEXT NOT NULL,
  ip_address_or_origin TEXT,
  severity TEXT DEFAULT 'INFO',
  category TEXT DEFAULT 'AUDIT_HISTORY'
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- 15. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Permissive Development & Application Policies (using anon or service_role)
DO $$
BEGIN
  -- Businesses
  CREATE POLICY "Allow full access to businesses" ON businesses FOR ALL USING (true) WITH CHECK (true);
  -- Leads
  CREATE POLICY "Allow full access to leads" ON leads FOR ALL USING (true) WITH CHECK (true);
  -- External sources
  CREATE POLICY "Allow full access to external_sources" ON external_sources FOR ALL USING (true) WITH CHECK (true);
  -- Website audits
  CREATE POLICY "Allow full access to website_audits" ON website_audits FOR ALL USING (true) WITH CHECK (true);
  -- Social audits
  CREATE POLICY "Allow full access to social_audits" ON social_audits FOR ALL USING (true) WITH CHECK (true);
  -- Contacts
  CREATE POLICY "Allow full access to contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
  -- AI Analyses
  CREATE POLICY "Allow full access to ai_analyses" ON ai_analyses FOR ALL USING (true) WITH CHECK (true);
  -- Lead scores
  CREATE POLICY "Allow full access to lead_scores" ON lead_scores FOR ALL USING (true) WITH CHECK (true);
  -- Outreach
  CREATE POLICY "Allow full access to outreach_activities" ON outreach_activities FOR ALL USING (true) WITH CHECK (true);
  -- Follow-ups
  CREATE POLICY "Allow full access to follow_ups" ON follow_ups FOR ALL USING (true) WITH CHECK (true);
  -- Proposals
  CREATE POLICY "Allow full access to proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);
  -- Access requests
  CREATE POLICY "Allow full access to access_requests" ON access_requests FOR ALL USING (true) WITH CHECK (true);
  -- User accounts
  CREATE POLICY "Allow full access to user_accounts" ON user_accounts FOR ALL USING (true) WITH CHECK (true);
  -- Audit logs
  CREATE POLICY "Allow full access to audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
  -- System settings
  CREATE POLICY "Allow full access to system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
