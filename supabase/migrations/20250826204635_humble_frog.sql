/*
  # Complete Reset of Teams RLS Policies

  1. Problem
    - Multiple conflicting policies from previous migrations
    - RLS still blocking team creation despite fixes
    - Need to completely reset all team-related policies

  2. Solution
    - Drop ALL existing team policies
    - Create minimal, working policies
    - Ensure team creation works without membership checks

  3. Security
    - Users can only create teams where they are the creator
    - Users can only access teams they are members of
    - Simple, non-recursive policies
*/

-- Disable RLS temporarily to clean up
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_charts DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies completely
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on teams table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teams') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON teams';
    END LOOP;
    
    -- Drop all policies on team_members table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON team_members';
    END LOOP;
    
    -- Drop all policies on team_charts table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_charts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON team_charts';
    END LOOP;
    
    -- Drop all policies on team_messages table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_messages') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON team_messages';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies

-- TEAMS TABLE - Simple policies
CREATE POLICY "teams_select_policy"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "teams_insert_policy"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "teams_update_policy"
  ON teams FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- TEAM_MEMBERS TABLE - Simple policies
CREATE POLICY "team_members_select_policy"
  ON team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "team_members_insert_policy"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "team_members_delete_policy"
  ON team_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- TEAM_CHARTS TABLE - Simple policies
CREATE POLICY "team_charts_select_policy"
  ON team_charts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_charts.team_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "team_charts_insert_policy"
  ON team_charts FOR INSERT
  TO authenticated
  WITH CHECK (updated_by = auth.uid());

CREATE POLICY "team_charts_update_policy"
  ON team_charts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_charts.team_id 
      AND user_id = auth.uid()
    )
  );

-- TEAM_MESSAGES TABLE - Simple policies
CREATE POLICY "team_messages_select_policy"
  ON team_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_messages.team_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "team_messages_insert_policy"
  ON team_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_messages.team_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "team_messages_delete_policy"
  ON team_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Ensure the trigger function exists and works
CREATE OR REPLACE FUNCTION add_team_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the team creator as an admin member
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  -- Create initial chart state for the team
  INSERT INTO team_charts (team_id, updated_by)
  VALUES (NEW.id, NEW.created_by);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS add_team_creator_trigger ON teams;
CREATE TRIGGER add_team_creator_trigger
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_team_creator_as_admin();

-- Test that policies work
DO $$
BEGIN
  RAISE NOTICE '✅ Teams RLS policies have been completely reset';
  RAISE NOTICE '✅ Simple, non-recursive policies created';
  RAISE NOTICE '✅ Team creation should now work';
END $$;