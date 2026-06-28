-- Prompts 1, 2, and 3: Comprehensive CRM Upgrade

BEGIN;

-- 1. Upgrade leads priority values and add CHECK constraint
UPDATE leads SET priority = 'Cold' WHERE priority = 'low';
UPDATE leads SET priority = 'Warm' WHERE priority = 'medium';
UPDATE leads SET priority = 'Hot' WHERE priority = 'high';

ALTER TABLE leads
ADD CONSTRAINT leads_priority_check 
CHECK (priority IN ('Hot', 'Warm', 'Cold'));

-- 1b. Upgrade column_definitions for priority to match exact Hot/Warm/Cold strings (remove emojis)
UPDATE column_definitions
SET dropdown_options = jsonb_build_array(
    jsonb_build_object('label', 'Hot', 'color', '#ef4444'),
    jsonb_build_object('label', 'Warm', 'color', '#f59e0b'),
    jsonb_build_object('label', 'Cold', 'color', '#3b82f6')
)
WHERE column_key = 'priority';

-- 2. Add lifecycle_stage and calendly_sent to leads
ALTER TABLE leads
ADD COLUMN lifecycle_stage text DEFAULT 'active' CHECK (lifecycle_stage IN ('active', 'converted')),
ADD COLUMN calendly_sent boolean DEFAULT false;

-- 3. Create user_folders table for Custom/Smart folders
CREATE TABLE user_folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    filter_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for user_folders
ALTER TABLE user_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own user_folders"
ON user_folders FOR ALL
USING (auth.uid() = user_id);

-- 4. Create clients table
CREATE TABLE clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    project_status text DEFAULT 'Onboarding' CHECK (project_status IN ('Onboarding', 'In Progress', 'On Hold', 'Completed')),
    contract_value numeric,
    contract_signed_date date,
    billing_invoice_link text,
    start_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own clients"
ON clients FOR ALL
USING (auth.uid() = user_id);

-- 5. Update lead_notes to support clients
ALTER TABLE lead_notes
ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE CASCADE;

-- Note: The existing RLS policy on lead_notes uses `user_id`. Since it does, 
-- we don't strictly need to modify the RLS policy just because we added `client_id`, 
-- as long as new notes for clients also have `user_id` set correctly.

-- 6. Create follow_up_reminders table
CREATE TABLE IF NOT EXISTS follow_up_reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
    lead_name text,
    reminder_number integer NOT NULL,
    scheduled_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed', 'completed')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own follow_up_reminders"
ON follow_up_reminders FOR ALL
USING (auth.uid() = user_id);

COMMIT;
