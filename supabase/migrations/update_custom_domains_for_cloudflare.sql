-- Update custom_domains table for Cloudflare-native verification flow
-- This migration adds columns to store Cloudflare-specific data

-- Add column for Cloudflare hostname status
-- Tracks the actual status from Cloudflare API: pending, active, pending_deletion, moved, deleted
ALTER TABLE custom_domains
ADD COLUMN IF NOT EXISTS cloudflare_hostname_status TEXT;

-- Add index for status-based lookups
CREATE INDEX IF NOT EXISTS idx_custom_domains_cloudflare_status ON custom_domains(cloudflare_hostname_status);

-- Add comment
COMMENT ON COLUMN custom_domains.cloudflare_hostname_status IS 'Current status from Cloudflare API: pending, active, pending_deletion, moved, deleted';

-- The dns_records JSONB field will now store Cloudflare''s actual required records
-- with structure: { type, name, value, purpose: ''routing'' | ''ownership'' | ''ssl'' }
-- No schema change needed, just documenting the new structure

-- Make verification_token optional (no longer required for Cloudflare flow)
-- The column already allows NULL in most Postgres configs, but we ensure it here
ALTER TABLE custom_domains
ALTER COLUMN verification_token DROP NOT NULL;

-- Note: Existing domains with the old verification flow will continue to work.
-- When users click "Verify", the system will:
-- 1. Create a Cloudflare hostname if one doesn't exist
-- 2. Poll Cloudflare for the actual status
-- 3. Update dns_records with Cloudflare's actual requirements
