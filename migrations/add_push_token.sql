-- Add push_token column to user_settings table for storing Expo push tokens
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index for better performance when looking up push tokens
CREATE INDEX IF NOT EXISTS idx_user_settings_push_token ON user_settings(push_token) WHERE push_token IS NOT NULL;