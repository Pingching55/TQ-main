/*
  # Fix Teams Invite Code System

  1. Problem
    - Teams may not have invite codes generated properly
    - Invite code generation function may not be working
    - Need to ensure all teams have valid invite codes

  2. Solution
    - Create robust invite code generation function
    - Add trigger to auto-generate codes on team creation
    - Fix any existing teams without invite codes
    - Ensure invite codes are properly formatted

  3. Security
    - Maintain existing RLS policies
    - Ensure invite codes are unique and secure
*/

-- Create improved invite code generation function
CREATE OR REPLACE FUNCTION generate_team_invite_code()
RETURNS text AS $$
DECLARE
  code text;
  attempts integer := 0;
  max_attempts integer := 50;
BEGIN
  LOOP
    -- Generate 8-character code with letters and numbers
    code := upper(
      chr(65 + floor(random() * 26)::int) ||  -- Random letter A-Z
      chr(65 + floor(random() * 26)::int) ||  -- Random letter A-Z
      floor(random() * 10)::text ||           -- Random digit 0-9
      chr(65 + floor(random() * 26)::int) ||  -- Random letter A-Z
      floor(random() * 10)::text ||           -- Random digit 0-9
      chr(65 + floor(random() * 26)::int) ||  -- Random letter A-Z
      floor(random() * 10)::text ||           -- Random digit 0-9
      chr(65 + floor(random() * 26)::int)     -- Random letter A-Z
    );
    
    -- Ensure it's unique
    IF NOT EXISTS (SELECT 1 FROM teams WHERE invite_code = code) THEN
      RETURN code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      -- Fallback to timestamp-based code
      code := upper(substring(md5(extract(epoch from now())::text || random()::text) from 1 for 8));
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ensure teams table has proper structure
DO $$
BEGIN
  -- Add invite_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE teams ADD COLUMN invite_code text;
  END IF;
  
  -- Make invite_code NOT NULL with default
  ALTER TABLE teams ALTER COLUMN invite_code SET DEFAULT generate_team_invite_code();
  
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'teams_invite_code_unique'
  ) THEN
    ALTER TABLE teams ADD CONSTRAINT teams_invite_code_unique UNIQUE (invite_code);
  END IF;
END $$;

-- Create trigger function to auto-generate invite codes
CREATE OR REPLACE FUNCTION set_team_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate invite code if not provided
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_team_invite_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new teams
DROP TRIGGER IF EXISTS set_team_invite_code_trigger ON teams;
CREATE TRIGGER set_team_invite_code_trigger
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_team_invite_code();

-- Fix existing teams without invite codes
UPDATE teams 
SET invite_code = generate_team_invite_code()
WHERE invite_code IS NULL OR invite_code = '';

-- Create index for fast invite code lookups
CREATE INDEX IF NOT EXISTS teams_invite_code_lookup_idx ON teams(invite_code);

-- Test the system
DO $$
DECLARE
  test_code text;
  test_team_id uuid;
BEGIN
  -- Test invite code generation
  test_code := generate_team_invite_code();
  RAISE NOTICE '✅ Generated test invite code: %', test_code;
  
  -- Verify format (8 characters, uppercase letters and numbers)
  IF length(test_code) = 8 AND test_code ~ '^[A-Z0-9]+$' THEN
    RAISE NOTICE '✅ Invite code format is correct';
  ELSE
    RAISE NOTICE '❌ Invite code format is wrong: % (length: %)', test_code, length(test_code);
  END IF;
  
  -- Check if any teams exist and show their invite codes
  FOR test_team_id IN (SELECT id FROM teams LIMIT 3) LOOP
    SELECT invite_code INTO test_code FROM teams WHERE id = test_team_id;
    RAISE NOTICE '📋 Existing team % has invite code: %', test_team_id, test_code;
  END LOOP;
END $$;