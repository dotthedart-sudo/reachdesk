CREATE TABLE IF NOT EXISTS user_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snippet_key text NOT NULL,
  snippet_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, snippet_key)
);

ALTER TABLE user_snippets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_snippets' AND policyname = 'users manage their own snippets'
  ) THEN
    CREATE POLICY "users manage their own snippets" ON user_snippets
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
