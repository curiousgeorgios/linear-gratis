-- Add cloudflare_hostname_id column to custom_domains table
-- This stores the Cloudflare for SaaS custom hostname ID for automatic cleanup on deletion

ALTER TABLE custom_domains
ADD COLUMN IF NOT EXISTS cloudflare_hostname_id TEXT;

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_custom_domains_cloudflare_hostname_id ON custom_domains(cloudflare_hostname_id);

-- Add comment
COMMENT ON COLUMN custom_domains.cloudflare_hostname_id IS 'Cloudflare for SaaS custom hostname ID, used for automatic cleanup on domain deletion';
