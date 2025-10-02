-- Migration: 002_create_update_reads_table.sql
-- Description: Create update_reads table to track which users have read which updates
-- Author: System
-- Date: 2025-10-02

CREATE TABLE IF NOT EXISTS update_reads (
    read_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID NOT NULL,
    user_id UUID NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE update_reads 
    ADD CONSTRAINT fk_update_reads_update_id 
    FOREIGN KEY (update_id) REFERENCES event_updates(update_id) ON DELETE CASCADE;

ALTER TABLE update_reads 
    ADD CONSTRAINT fk_update_reads_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate reads
ALTER TABLE update_reads 
    ADD CONSTRAINT uk_update_reads_update_user 
    UNIQUE (update_id, user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_update_reads_update_id ON update_reads(update_id);
CREATE INDEX IF NOT EXISTS idx_update_reads_user_id ON update_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_update_reads_read_at ON update_reads(read_at DESC);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_update_reads_user_read_at ON update_reads(user_id, read_at DESC);

-- Add comments for documentation
COMMENT ON TABLE update_reads IS 'Tracks which users have read which event updates';
COMMENT ON COLUMN update_reads.read_id IS 'Unique identifier for the read record';
COMMENT ON COLUMN update_reads.update_id IS 'Reference to the update that was read';
COMMENT ON COLUMN update_reads.user_id IS 'Reference to the user who read the update';
COMMENT ON COLUMN update_reads.read_at IS 'Timestamp when the user read the update';
