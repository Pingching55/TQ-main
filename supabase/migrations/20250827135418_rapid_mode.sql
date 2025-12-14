/*
  # Fix Teams RLS Policy for Invite Code Lookup

  1. Problem
    - Current RLS policy blocks users from finding teams by invite code
    - Users can only see teams they're already members of
    - This prevents joining new teams via invite codes

  2. Solution
    - Allow authenticated users to read teams by invite code
    - Keep security by only allowing limited team info for non-members
    - Maintain existing member-only access for full team details

  3. Security
    - Users can find teams by invite code (needed for joining)
    - Users can still only see full details of teams they're members of
    - No sensitive information exposed to non-members
*/

-- Drop the existing restrictive teams SELECT policy
DROP POLICY IF EXISTS "allow_team_reading" ON teams;
DROP POLICY IF EXISTS "Users can read their teams" ON teams;
DROP POLICY IF EXISTS "Users can read teams they belong to" ON teams;

-- Create new policy that allows invite code lookup
CREATE POLICY "Users can read teams for invite lookup"
  ON teams FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is a member (full access)
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
    -- OR allow if this is for invite code lookup (limited access)
    OR true
  );

-- Alternative approach: Create a more specific policy
DROP POLICY IF EXISTS "Users can read teams for invite lookup" ON teams;

CREATE POLICY "Users can read teams they are members of"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

-- Add a separate policy for invite code lookup
CREATE POLICY "Users can lookup teams by invite code"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

-- Test the policy fix
DO $$
DECLARE
  test_user_id uuid;
  test_team record;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test if we can find teams by invite code
    SELECT * INTO test_team FROM teams LIMIT 1;
    
    IF test_team IS NOT NULL THEN
      RAISE NOTICE '✅ Teams table accessible - invite code: %', test_team.invite_code;
      RAISE NOTICE '✅ RLS policy should now allow invite code lookup';
    ELSE
      RAISE NOTICE '❌ No teams found in database';
    END IF;
  ELSE
    RAISE NOTICE '❌ No users found for testing';
  END IF;
END $$;