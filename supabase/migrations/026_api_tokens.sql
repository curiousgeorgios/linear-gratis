-- 026_api_tokens.sql
-- Organisation-scoped API tokens for machine clients (the MCP endpoint used by
-- Claude Code and other agents). Only a SHA-256 hash of the secret is stored;
-- the plaintext is shown once at creation time.
--
-- RLS is enabled with no policies on purpose: the table is only reachable
-- through server-side routes that use the service-role key and re-check
-- organisation membership themselves. Browser clients can never read hashes.

BEGIN;

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  token_prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_organisation_id
  ON api_tokens(organisation_id);

ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

COMMIT;
