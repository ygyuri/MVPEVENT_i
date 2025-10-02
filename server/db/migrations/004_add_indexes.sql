-- Migration: 004_add_indexes.sql
-- Description: Add additional performance indexes for event updates system
-- Author: System
-- Date: 2025-10-02

-- Additional indexes for event_updates table
CREATE INDEX IF NOT EXISTS idx_event_updates_event_priority_created ON event_updates(event_id, priority, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_updates_organizer_created ON event_updates(organizer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_updates_moderation_pending ON event_updates(moderation_status, created_at ASC) WHERE moderation_status = 'pending';

-- Additional indexes for update_reads table
CREATE INDEX IF NOT EXISTS idx_update_reads_user_update ON update_reads(user_id, update_id);
CREATE INDEX IF NOT EXISTS idx_update_reads_recent_reads ON update_reads(user_id, read_at DESC) WHERE read_at > NOW() - INTERVAL '30 days';

-- Additional indexes for update_reactions table
CREATE INDEX IF NOT EXISTS idx_update_reactions_type_count ON update_reactions(update_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_update_reactions_user_recent ON update_reactions(user_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_event_updates_active ON event_updates(event_id, created_at DESC) WHERE deleted_at IS NULL AND moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_update_reactions_active ON update_reactions(update_id, reaction_type) WHERE created_at > NOW() - INTERVAL '1 year';

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_event_updates_analytics ON event_updates(event_id, created_at, priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_update_reactions_analytics ON update_reactions(update_id, reaction_type, created_at);

-- Indexes for cleanup operations
CREATE INDEX IF NOT EXISTS idx_event_updates_cleanup ON event_updates(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_update_reads_cleanup ON update_reads(created_at) WHERE created_at < NOW() - INTERVAL '1 year';

-- Add comments for documentation
COMMENT ON INDEX idx_event_updates_event_priority_created IS 'Optimizes queries for updates by event, priority, and creation time';
COMMENT ON INDEX idx_event_updates_organizer_created IS 'Optimizes queries for updates by organizer and creation time';
COMMENT ON INDEX idx_event_updates_moderation_pending IS 'Optimizes queries for pending moderation reviews';
COMMENT ON INDEX idx_update_reads_user_update IS 'Optimizes queries for specific user-read combinations';
COMMENT ON INDEX idx_update_reactions_type_count IS 'Optimizes queries for reaction counts by type';
COMMENT ON INDEX idx_event_updates_active IS 'Optimizes queries for active (non-deleted, approved) updates';
COMMENT ON INDEX idx_event_updates_analytics IS 'Optimizes analytics queries for event updates';
COMMENT ON INDEX idx_update_reactions_analytics IS 'Optimizes analytics queries for update reactions';
