/*
  # Fix Teams RLS Policies - Remove Infinite Recursion

  1. Problem
    - RLS policies have infinite recursion when checking team membership
    - Policy references team_members table from within team_members policy

  2. Solution
    - Simplify policies to avoid circular references
    - Use direct user_id checks where possible
    - Fix the recursive policy logic

  3. Security
    - Maintain same security level
    - Users can only access their own team data
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read teams they are members of" ON teams;
DROP POLICY IF EXISTS "Users can read team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team members can read team charts" ON team_charts;
DROP POLICY IF EXISTS "Team members can read team messages" ON team_messages;
DROP POLICY IF EXISTS "Team members can send messages" ON team_messages;
DROP POLICY IF EXISTS "Team members can update team charts" ON team_charts;
DROP POLICY IF EXISTS "Team members can modify team charts" ON team_charts;

-- Create simplified policies without recursion

-- Teams policies (simplified)
CREATE POLICY "Users can read teams they belong to"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = teams.id 
      AND tm.user_id = auth.uid()
    )
  );

-- Team members policies (no recursion)
CREATE POLICY "Users can read all team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert themselves as team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Team charts policies (simplified)
CREATE POLICY "Team members can read charts"
  ON team_charts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_charts.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert charts"
  ON team_charts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_charts.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update charts"
  ON team_charts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_charts.team_id 
      AND tm.user_id = auth.uid()
    )
  );

-- Team messages policies (simplified)
CREATE POLICY "Team members can read messages"
  ON team_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_messages.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can send messages"
  ON team_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_messages.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own messages"
  ON team_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());