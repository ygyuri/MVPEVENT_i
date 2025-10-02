-- Migration: 003_create_update_reactions_table.sql
-- Description: Create update_reactions table to track user reactions to updates
-- Author: System
-- Date: 2025-10-02

CREATE TABLE IF NOT EXISTS update_reactions (
    reaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'clap', 'wow', 'sad', 'fire', 'thumbs_up', 'heart', 'laugh', 'angry')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE update_reactions 
    ADD CONSTRAINT fk_update_reactions_update_id 
    FOREIGN KEY (update_id) REFERENCES event_updates(update_id) ON DELETE CASCADE;

ALTER TABLE update_reactions 
    ADD CONSTRAINT fk_update_reactions_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate reactions (one reaction per user per update)
ALTER TABLE update_reactions 
    ADD CONSTRAINT uk_update_reactions_update_user 
    UNIQUE (update_id, user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_update_reactions_update_id ON update_reactions(update_id);
CREATE INDEX IF NOT EXISTS idx_update_reactions_user_id ON update_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_update_reactions_reaction_type ON update_reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_update_reactions_created_at ON update_reactions(created_at DESC);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_update_reactions_update_type ON update_reactions(update_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_update_reactions_user_created ON update_reactions(user_id, created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_reactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reactions_updated_at
    BEFORE UPDATE ON update_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_reactions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE update_reactions IS 'Tracks user reactions to event updates';
COMMENT ON COLUMN update_reactions.reaction_id IS 'Unique identifier for the reaction';
COMMENT ON COLUMN update_reactions.update_id IS 'Reference to the update that was reacted to';
COMMENT ON COLUMN update_reactions.user_id IS 'Reference to the user who reacted';
COMMENT ON COLUMN update_reactions.reaction_type IS 'Type of reaction (like, love, clap, wow, sad, fire, thumbs_up, heart, laugh, angry)';
COMMENT ON COLUMN update_reactions.created_at IS 'Timestamp when the reaction was created';
