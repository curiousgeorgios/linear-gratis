-- Create roadmaps table
CREATE TABLE roadmaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic information
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,

    -- Layout configuration
    layout_type TEXT NOT NULL DEFAULT 'kanban' CHECK (layout_type IN ('kanban', 'timeline')),
    timeline_granularity TEXT DEFAULT 'quarter' CHECK (timeline_granularity IN ('month', 'quarter')),

    -- Column configuration for kanban (maps Linear state types to columns)
    kanban_columns JSONB DEFAULT '[
        {"key": "planned", "label": "Planned", "state_types": ["backlog", "unstarted"]},
        {"key": "in_progress", "label": "In progress", "state_types": ["started"]},
        {"key": "shipped", "label": "Shipped", "state_types": ["completed"]}
    ]'::jsonb,

    -- Linear project IDs to include (each project = a category/row)
    project_ids TEXT[] DEFAULT '{}',

    -- Display options
    show_item_descriptions BOOLEAN NOT NULL DEFAULT true,
    show_item_dates BOOLEAN NOT NULL DEFAULT true,
    show_progress_percentage BOOLEAN NOT NULL DEFAULT false,
    show_vote_counts BOOLEAN NOT NULL DEFAULT true,
    show_comment_counts BOOLEAN NOT NULL DEFAULT true,

    -- Engagement options
    allow_voting BOOLEAN NOT NULL DEFAULT true,
    allow_comments BOOLEAN NOT NULL DEFAULT true,
    require_email_for_comments BOOLEAN NOT NULL DEFAULT true,
    moderate_comments BOOLEAN NOT NULL DEFAULT false,

    -- Access control
    is_active BOOLEAN NOT NULL DEFAULT true,
    password_protected BOOLEAN NOT NULL DEFAULT false,
    password_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for roadmaps
CREATE INDEX idx_roadmaps_user_id ON roadmaps(user_id);
CREATE INDEX idx_roadmaps_slug ON roadmaps(slug);
CREATE INDEX idx_roadmaps_active ON roadmaps(is_active);

-- Enable RLS for roadmaps
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

-- RLS policies for roadmaps
CREATE POLICY "Users can view own roadmaps" ON roadmaps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roadmaps" ON roadmaps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roadmaps" ON roadmaps
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own roadmaps" ON roadmaps
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_roadmaps_updated_at
    BEFORE UPDATE ON roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Create roadmap_votes table
CREATE TABLE roadmap_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,

    -- Linear issue ID being voted on
    issue_id TEXT NOT NULL,

    -- Visitor identification (combination prevents gaming)
    visitor_fingerprint TEXT NOT NULL,
    ip_hash TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one vote per visitor per issue per roadmap
    UNIQUE(roadmap_id, issue_id, visitor_fingerprint)
);

-- Create indexes for votes
CREATE INDEX idx_roadmap_votes_roadmap_issue ON roadmap_votes(roadmap_id, issue_id);
CREATE INDEX idx_roadmap_votes_fingerprint ON roadmap_votes(visitor_fingerprint);

-- Enable RLS for votes
ALTER TABLE roadmap_votes ENABLE ROW LEVEL SECURITY;

-- Public read access for vote counts (anyone can see votes)
CREATE POLICY "Anyone can view votes" ON roadmap_votes
    FOR SELECT USING (true);

-- Public insert for voting (rate limited at API level)
CREATE POLICY "Anyone can insert votes" ON roadmap_votes
    FOR INSERT WITH CHECK (true);

-- Allow deletion of own votes (by fingerprint match - handled at API level)
CREATE POLICY "Anyone can delete votes" ON roadmap_votes
    FOR DELETE USING (true);


-- Create roadmap_comments table
CREATE TABLE roadmap_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,

    -- Linear issue ID being commented on
    issue_id TEXT NOT NULL,

    -- Commenter information
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_email_verified BOOLEAN NOT NULL DEFAULT false,

    -- Comment content
    content TEXT NOT NULL,

    -- Moderation
    is_approved BOOLEAN NOT NULL DEFAULT true,
    is_hidden BOOLEAN NOT NULL DEFAULT false,

    -- Reply support (for future enhancement)
    parent_id UUID REFERENCES roadmap_comments(id) ON DELETE CASCADE,

    -- Visitor identification
    visitor_fingerprint TEXT,
    ip_hash TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments
CREATE INDEX idx_roadmap_comments_roadmap_issue ON roadmap_comments(roadmap_id, issue_id);
CREATE INDEX idx_roadmap_comments_approved ON roadmap_comments(is_approved) WHERE is_approved = true;
CREATE INDEX idx_roadmap_comments_email ON roadmap_comments(author_email);

-- Enable RLS for comments
ALTER TABLE roadmap_comments ENABLE ROW LEVEL SECURITY;

-- Public read access for approved, non-hidden comments
CREATE POLICY "Anyone can view approved comments" ON roadmap_comments
    FOR SELECT USING (is_approved = true AND is_hidden = false);

-- Roadmap owners can view all comments (for moderation)
CREATE POLICY "Owners can view all comments" ON roadmap_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM roadmaps
            WHERE roadmaps.id = roadmap_comments.roadmap_id
            AND roadmaps.user_id = auth.uid()
        )
    );

-- Public insert for commenting
CREATE POLICY "Anyone can insert comments" ON roadmap_comments
    FOR INSERT WITH CHECK (true);

-- Owners can update comments (for moderation)
CREATE POLICY "Owners can update comments" ON roadmap_comments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM roadmaps
            WHERE roadmaps.id = roadmap_comments.roadmap_id
            AND roadmaps.user_id = auth.uid()
        )
    );

-- Trigger for updated_at on comments
CREATE TRIGGER update_roadmap_comments_updated_at
    BEFORE UPDATE ON roadmap_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Update custom_domains to support roadmap target type
ALTER TABLE custom_domains
    DROP CONSTRAINT IF EXISTS custom_domains_target_type_check;

ALTER TABLE custom_domains
    ADD CONSTRAINT custom_domains_target_type_check
    CHECK (target_type IN ('form', 'view', 'roadmap'));
