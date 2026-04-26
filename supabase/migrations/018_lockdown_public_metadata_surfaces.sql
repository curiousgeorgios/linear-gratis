-- Remove public full-row reads for metadata tables that are served by
-- dedicated API routes or a sanitized routing view.

BEGIN;

DROP POLICY IF EXISTS "Anyone can view active forms for submission" ON customer_request_forms;
DROP POLICY IF EXISTS "Anyone can view branding settings for public access" ON branding_settings;
DROP POLICY IF EXISTS "Anyone can view verified active custom domains" ON custom_domains;

CREATE OR REPLACE VIEW public_custom_domain_routes AS
SELECT
  domain,
  target_type,
  target_slug,
  redirect_to_https
FROM custom_domains
WHERE verification_status = 'verified'
  AND is_active = true;

GRANT SELECT ON public_custom_domain_routes TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);

ALTER TABLE public_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
  bucket_count integer;
  bucket_reset_at timestamptz;
BEGIN
  INSERT INTO public_rate_limits AS buckets (key, count, reset_at)
  VALUES (p_key, 1, now_ts + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN buckets.reset_at <= now_ts THEN 1
          ELSE buckets.count + 1
        END,
        reset_at = CASE
          WHEN buckets.reset_at <= now_ts THEN now_ts + make_interval(secs => p_window_seconds)
          ELSE buckets.reset_at
        END
  RETURNING count, reset_at
  INTO bucket_count, bucket_reset_at;

  allowed := bucket_count <= p_limit;
  retry_after_seconds := greatest(1, ceil(extract(epoch from bucket_reset_at - now_ts))::integer);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION consume_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_rate_limit(text, integer, integer) TO service_role;

COMMIT;
