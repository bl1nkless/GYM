-- Migration: Add workout timing fields
-- Adds started_at and finished_at columns to track workout duration

-- Add started_at column (when workout actually started)
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Add finished_at column (when workout was completed)
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- Add duration_minutes column (computed duration for quick access)
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Create index for started_at for queries
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON workout_sessions(started_at);

-- Comment on columns
COMMENT ON COLUMN workout_sessions.started_at IS 'Timestamp when the workout was actually started';
COMMENT ON COLUMN workout_sessions.finished_at IS 'Timestamp when the workout was marked as completed';
COMMENT ON COLUMN workout_sessions.duration_minutes IS 'Workout duration in minutes (computed from started_at and finished_at)';
