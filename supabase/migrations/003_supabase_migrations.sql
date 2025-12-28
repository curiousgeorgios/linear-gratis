-- Create public_views table
CREATE TABLE public_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    project_id TEXT,
    team_id TEXT,
    project_name TEXT,
    team_name TEXT,
    view_title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    show_assignees BOOLEAN NOT NULL DEFAULT true,
    show_labels BOOLEAN NOT NULL DEFAULT true,
    show_priorities BOOLEAN NOT NULL DEFAULT true,
    show_descriptions BOOLEAN NOT NULL DEFAULT true,
    allowed_statuses TEXT[] DEFAULT '{}',
    password_protected BOOLEAN NOT NULL DEFAULT false,
    password_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_public_views_user_id ON public_views(user_id);
CREATE INDEX idx_public_views_slug ON public_views(slug);
CREATE INDEX idx_public_views_active ON public_views(is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE public_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own views
CREATE POLICY "Users can view own public_views" ON public_views
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own views
CREATE POLICY "Users can insert own public_views" ON public_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own views
CREATE POLICY "Users can update own public_views" ON public_views
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own views
CREATE POLICY "Users can delete own public_views" ON public_views
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_public_views_updated_at
    BEFORE UPDATE ON public_views
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();