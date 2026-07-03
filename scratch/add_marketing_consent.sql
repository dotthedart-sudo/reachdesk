-- SQL migration to add marketing_consent boolean column to user_profiles

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;
