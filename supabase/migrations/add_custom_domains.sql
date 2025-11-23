-- Create custom_domains table for storing user custom domains
CREATE TABLE IF NOT EXISTS custom_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Domain information
  domain TEXT NOT NULL UNIQUE,
  subdomain TEXT, -- e.g., 'support' from 'support.example.com'

  -- Verification
  verification_token TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verified_at TIMESTAMP WITH TIME ZONE,

  -- DNS configuration
  dns_records JSONB DEFAULT '[]',

  -- SSL/TLS
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  ssl_issued_at TIMESTAMP WITH TIME ZONE,

  -- Domain configuration
  redirect_to_https BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  -- Target mapping (which form or view this domain points to)
  target_type TEXT CHECK (target_type IN ('form', 'view')),
  target_slug TEXT, -- slug of the form or view

  -- Metadata
  last_checked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own custom domains" ON custom_domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom domains" ON custom_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom domains" ON custom_domains
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom domains" ON custom_domains
  FOR DELETE USING (auth.uid() = user_id);

-- System needs to check domains for routing (public access for verified domains)
CREATE POLICY "Anyone can view verified active custom domains" ON custom_domains
  FOR SELECT USING (verification_status = 'verified' AND is_active = true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_custom_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_custom_domains_updated ON custom_domains;
CREATE TRIGGER on_custom_domains_updated
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW EXECUTE FUNCTION public.handle_custom_domains_updated_at();

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_verification_status ON custom_domains(verification_status);
CREATE INDEX IF NOT EXISTS idx_custom_domains_target ON custom_domains(target_type, target_slug);

-- Create function to generate verification token
CREATE OR REPLACE FUNCTION generate_domain_verification_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'linear-verify-' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;
