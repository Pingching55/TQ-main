/*
  # Create Teams System for Collaborative Trading

  1. New Tables
    - `teams` - Private trading teams with invite codes
    - `team_members` - Team membership relationships
    - `team_charts` - Shared chart state (symbol, drawings, indicators)
    - `team_messages` - Real-time chat messages within teams

  2. Security
    - Enable RLS on all tables
    - Team members can only access their teams' data
    - Invite codes for secure team joining

  3. Real-time Features
    - Enable realtime for team_messages and team_charts
    - Live chat and chart synchronization
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  invite_code text UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create team charts table (shared chart state)
CREATE TABLE IF NOT EXISTS team_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  symbol text DEFAULT 'EURUSD',
  timeframe text DEFAULT '1H',
  chart_type text DEFAULT 'candlestick',
  drawings jsonb DEFAULT '[]'::jsonb,
  indicators jsonb DEFAULT '[]'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id)
);

-- Create team messages table (live chat)
CREATE TABLE IF NOT EXISTS team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
  image_url text,
  image_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Policies for teams table
CREATE POLICY "Users can read teams they are members of"
  ON teams FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team admins can update teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for team_members table
CREATE POLICY "Users can read team members of their teams"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join teams"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team admins can manage members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for team_charts table
CREATE POLICY "Team members can read team charts"
  ON team_charts FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update team charts"
  ON team_charts FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can modify team charts"
  ON team_charts FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policies for team_messages table
CREATE POLICY "Team members can read team messages"
  ON team_messages FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can send messages"
  ON team_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    ) AND auth.uid() = user_id
  );

CREATE POLICY "Users can delete own messages"
  ON team_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
  code text;
BEGIN
  -- Generate a random 8-character code
  code := upper(substring(md5(random()::text) from 1 for 8));
  
  -- Ensure it's unique
  WHILE EXISTS (SELECT 1 FROM teams WHERE invite_code = code) LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-add creator as admin when team is created
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-add creator as admin
CREATE TRIGGER add_team_creator_trigger
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_team_creator_as_admin();

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_charts_updated_at
  BEFORE UPDATE ON team_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_messages_updated_at
  BEFORE UPDATE ON team_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS teams_invite_code_idx ON teams(invite_code);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON team_members(user_id);
CREATE INDEX IF NOT EXISTS team_charts_team_id_idx ON team_charts(team_id);
CREATE INDEX IF NOT EXISTS team_messages_team_id_idx ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS team_messages_created_at_idx ON team_messages(created_at DESC);

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE team_charts;

-- Grant permissions
GRANT ALL ON teams TO authenticated;
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON team_charts TO authenticated;
GRANT ALL ON team_messages TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;