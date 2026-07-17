ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS meeting_ends_at timestamptz;
