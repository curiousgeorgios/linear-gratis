-- Create branding_settings table for storing custom branding per user
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Logo settings
  logo_url TEXT,
  logo_width INT DEFAULT 120,
  logo_height INT DEFAULT 40,
  favicon_url TEXT,

  -- Brand identity
  brand_name TEXT,
  tagline TEXT,

  -- Colour settings (stored as hex values)
  primary_color TEXT DEFAULT '#5E6AD2',
  secondary_color TEXT DEFAULT '#8B95A5',
  accent_color TEXT DEFAULT '#4C9AFF',
  background_color TEXT DEFAULT '#FFFFFF',
  text_color TEXT DEFAULT '#1F2937',
  border_color TEXT DEFAULT '#E5E7EB',

  -- Typography
  font_family TEXT DEFAULT 'Inter, system-ui, sans-serif',
  heading_font_family TEXT,

  -- Footer customisation
  footer_text TEXT,
  footer_links JSONB DEFAULT '[]',
  show_powered_by BOOLEAN DEFAULT true,

  -- Social links
  social_links JSONB DEFAULT '{}',

  -- Custom CSS (for advanced users)
  custom_css TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own branding settings" ON branding_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own branding settings" ON branding_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own branding settings" ON branding_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own branding settings" ON branding_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can view branding settings for public forms/views (needed for displaying branded pages)
CREATE POLICY "Anyone can view branding settings for public access" ON branding_settings
  FOR SELECT USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_branding_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_branding_settings_updated ON branding_settings;
CREATE TRIGGER on_branding_settings_updated
  BEFORE UPDATE ON branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_branding_settings_updated_at();

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_branding_settings_user_id ON branding_settings(user_id);

-- Insert default branding settings for existing users (optional)
-- This can be uncommented if you want to create default branding for all existing users
-- INSERT INTO branding_settings (user_id)
-- SELECT id FROM auth.users
-- ON CONFLICT (user_id) DO NOTHING;
