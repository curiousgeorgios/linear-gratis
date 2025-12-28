-- Create customer_request_forms table for storing custom forms
CREATE TABLE IF NOT EXISTS customer_request_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  form_title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE customer_request_forms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own forms" ON customer_request_forms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own forms" ON customer_request_forms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own forms" ON customer_request_forms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own forms" ON customer_request_forms
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can view active forms (for public form access)
CREATE POLICY "Anyone can view active forms for submission" ON customer_request_forms
  FOR SELECT USING (is_active = true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_customer_request_forms_updated ON customer_request_forms;
CREATE TRIGGER on_customer_request_forms_updated
  BEFORE UPDATE ON customer_request_forms
  FOR EACH ROW EXECUTE FUNCTION public.handle_forms_updated_at();

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_request_forms_slug ON customer_request_forms(slug);

-- Create index on user_id for user form queries
CREATE INDEX IF NOT EXISTS idx_customer_request_forms_user_id ON customer_request_forms(user_id);