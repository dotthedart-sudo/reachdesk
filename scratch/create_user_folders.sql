CREATE TABLE IF NOT EXISTS user_folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    filter_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for user_folders
ALTER TABLE user_folders ENABLE ROW LEVEL SECURITY;

-- Create policy (wrapped in DO block to prevent error if it already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_folders' AND policyname = 'Users can manage their own user_folders'
    ) THEN
        CREATE POLICY "Users can manage their own user_folders"
        ON user_folders FOR ALL
        USING (auth.uid() = user_id);
    END IF;
END
$$;
