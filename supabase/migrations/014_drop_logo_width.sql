-- logo_width is no longer read anywhere. The public pages now render logos
-- with width: auto and logo_height as a maxHeight cap, so the intrinsic
-- aspect ratio is preserved and a separate width control is redundant.

ALTER TABLE branding_settings DROP COLUMN IF EXISTS logo_width;
