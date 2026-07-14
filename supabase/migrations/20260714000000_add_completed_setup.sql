-- Add has_completed_setup to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS has_completed_setup boolean DEFAULT false;
