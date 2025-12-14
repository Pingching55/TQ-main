/*
  # Fix Community Forum Foreign Key Relationships

  1. Problem
    - Supabase can't find relationship between posts and profiles
    - Need explicit foreign key constraint for joins to work

  2. Solution
    - Add proper foreign key constraint from posts.user_id to profiles.id
    - Add proper foreign key constraint from comments.user_id to profiles.id
    - This will allow Supabase to automatically join tables

  3. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add foreign key constraint from posts to profiles
-- Note: We reference profiles.id instead of auth.users.id for better joins
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_user_id_profiles_fkey'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE posts 
    ADD CONSTRAINT posts_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint from comments to profiles
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_user_id_profiles_fkey'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE comments 
    ADD CONSTRAINT comments_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Verify the relationships exist
DO $$
BEGIN
  -- Check posts relationship
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_user_id_profiles_fkey'
  ) THEN
    RAISE NOTICE '✅ Posts -> Profiles relationship created successfully';
  ELSE
    RAISE NOTICE '❌ Failed to create Posts -> Profiles relationship';
  END IF;

  -- Check comments relationship
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_user_id_profiles_fkey'
  ) THEN
    RAISE NOTICE '✅ Comments -> Profiles relationship created successfully';
  ELSE
    RAISE NOTICE '❌ Failed to create Comments -> Profiles relationship';
  END IF;
END $$;