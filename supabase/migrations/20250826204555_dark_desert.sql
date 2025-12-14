/*
  # Fix Teams Insert Policy - Allow Team Creation

  1. Problem
    - Teams INSERT policy is blocking team creation
    - User isn't a team member yet when creating the team
    - They become a member AFTER creation via trigger

  2. Solution
    - Fix the INSERT policy to allow team creators to create teams
    - Keep other policies secure
    - Allow team creation without membership check

  3. Security
    - Users can only create teams where they are the creator
    - All other security remains the same
*/

-- Fix the teams INSERT policy to allow creation
DROP POLICY IF EXISTS "Users can create teams" ON teams;

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Ensure the trigger function exists and works correctly
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