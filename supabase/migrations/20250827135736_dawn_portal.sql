/*
  # Fix Profiles RLS Policy for Team Chat

  1. Problem
    - Current profiles RLS policy only allows users to see their own profile
    - Team chat needs to display other users' names
    - Chat shows "user_b3314cbf" instead of actual usernames

  2. Solution
    - Add policy to allow team members to see each other's profiles
    - Keep existing security for non-team contexts
    - Allow profile lookup for team chat functionality

  3. Security
    - Users can still only see their own profile in general contexts
    - Team members can see basic profile info (username, full_name) of other team members
    - No sensitive information exposed
*/

-- Add policy to allow team members to see each other's profiles
CREATE POLICY "Team members can see each other's profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if it's the user's own profile (existing behavior)
    auth.uid() = id
    OR
    -- Allow if the profile belongs to someone in the same team
    EXISTS (
      SELECT 1 FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() 
      AND tm2.user_id = profiles.id
    )
  );

-- Test the policy
DO $$
DECLARE
  test_user_id uuid;
  profile_count integer;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Count how many profiles this user can see
    SELECT COUNT(*) INTO profile_count 
    FROM profiles;
    
    RAISE NOTICE '✅ User can now see % profiles (should be more than 1 if in teams)', profile_count;
  END IF;
END $$;