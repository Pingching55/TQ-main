/*
  # Direct Fix for Teams RLS Policy Issue
  
  This completely resets all team-related policies and creates working ones.
  Run this directly in Supabase SQL Editor.
*/

-- Step 1: Completely disable RLS to clean up
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_charts DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (brute force approach)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all team tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('teams', 'team_members', 'team_charts', 'team_messages')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Create minimal working policies

-- TEAMS: Allow creation and reading
CREATE POLICY "allow_team_creation" ON teams
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "allow_team_reading" ON teams
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = teams.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "allow_team_updates" ON teams
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid());

-- TEAM_MEMBERS: Allow all operations for authenticated users
CREATE POLICY "allow_member_operations" ON team_members
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (user_id = auth.uid());

-- TEAM_CHARTS: Allow operations for team members
CREATE POLICY "allow_chart_operations" ON team_charts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_charts.team_id AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_charts.team_id AND user_id = auth.uid()
        )
    );

-- TEAM_MESSAGES: Allow operations for team members
CREATE POLICY "allow_message_operations" ON team_messages
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_messages.team_id AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = team_messages.team_id AND user_id = auth.uid()
        )
    );

-- Step 5: Ensure trigger function exists
CREATE OR REPLACE FUNCTION add_team_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Add creator as admin
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin');
    
    -- Create initial chart
    INSERT INTO team_charts (team_id, updated_by)
    VALUES (NEW.id, NEW.created_by);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Ensure trigger exists
DROP TRIGGER IF EXISTS add_team_creator_trigger ON teams;
CREATE TRIGGER add_team_creator_trigger
    AFTER INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION add_team_creator_as_admin();

-- Step 7: Grant permissions
GRANT ALL ON teams TO authenticated;
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON team_charts TO authenticated;
GRANT ALL ON team_messages TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;