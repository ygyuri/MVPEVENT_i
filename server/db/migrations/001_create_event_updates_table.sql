-- Migration: 001_create_event_updates_table.sql
-- Description: Create event_updates table for real-time event updates
-- Author: System
-- Date: 2025-10-02

CREATE TABLE IF NOT EXISTS event_updates (
    update_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    organizer_id UUID NOT NULL,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
    media_urls JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected')),
    moderation_flags JSONB DEFAULT '[]'::jsonb,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE event_updates 
    ADD CONSTRAINT fk_event_updates_event_id 
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE;

ALTER TABLE event_updates 
    ADD CONSTRAINT fk_event_updates_organizer_id 
    FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE event_updates 
    ADD CONSTRAINT fk_event_updates_reviewed_by 
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_updates_event_id ON event_updates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_updates_organizer_id ON event_updates(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_updates_created_at ON event_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_updates_priority ON event_updates(priority);
CREATE INDEX IF NOT EXISTS idx_event_updates_moderation_status ON event_updates(moderation_status);
CREATE INDEX IF NOT EXISTS idx_event_updates_deleted_at ON event_updates(deleted_at) WHERE deleted_at IS NULL;

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_event_updates_event_created ON event_updates(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_updates_event_priority ON event_updates(event_id, priority, created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_event_updates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_updates_updated_at
    BEFORE UPDATE ON event_updates
    FOR EACH ROW
    EXECUTE FUNCTION update_event_updates_updated_at();

-- Add comments for documentation
COMMENT ON TABLE event_updates IS 'Stores real-time updates posted by event organizers';
COMMENT ON COLUMN event_updates.update_id IS 'Unique identifier for the update';
COMMENT ON COLUMN event_updates.event_id IS 'Reference to the event this update belongs to';
COMMENT ON COLUMN event_updates.organizer_id IS 'Reference to the user who created this update';
COMMENT ON COLUMN event_updates.content IS 'The update text content (max 1000 characters)';
COMMENT ON COLUMN event_updates.media_urls IS 'Array of media URLs (images, videos) associated with the update';
COMMENT ON COLUMN event_updates.priority IS 'Priority level of the update (low, normal, high, urgent)';
COMMENT ON COLUMN event_updates.moderation_status IS 'Content moderation status';
COMMENT ON COLUMN event_updates.deleted_at IS 'Soft delete timestamp (NULL means not deleted)';
