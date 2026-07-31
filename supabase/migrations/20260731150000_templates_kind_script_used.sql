-- Separate messaging templates from call scripts; track script selection on leads.

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'messaging';

ALTER TABLE templates
  DROP CONSTRAINT IF EXISTS templates_kind_check;

ALTER TABLE templates
  ADD CONSTRAINT templates_kind_check CHECK (kind IN ('messaging', 'calls'));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS script_used text;
