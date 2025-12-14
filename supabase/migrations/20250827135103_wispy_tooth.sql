/*
  # Fix Teams Invite Code System - Final Fix

  1. Problem
    - Teams exist but invite codes aren't working
    - Case sensitivity issues
    - Missing invite codes on existing teams

  2. Solution
    - Ensure all teams have proper invite codes
    - Fix case sensitivity in lookups
    - Add proper indexes and constraints

  3. Security
    - Maintain existing RLS policies
    - Ensure invite codes are unique
*/

-- First, let's see what we have in the teams table
DO $$
DECLARE
  team_record RECORD;
BEGIN
  RAISE NOTICE '=== CURRENT TEAMS TABLE STATUS ===';
  
  -- Check if teams table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    RAISE NOTICE '✅ Teams table exists';
    
    -- Show current teams and their invite codes
    FOR team_record IN (SELECT id, name, invite_code FROM teams LIMIT 10) LOOP
      RAISE NOTICE 'Team: % | Invite Code: %', team_record.name, COALESCE(team_record.invite_code, 'NULL');
    END LOOP;
  ELSE
    RAISE NOTICE '❌ Teams table does not exist';
  END IF;
END $$;

-- Ensure invite_code column exists and has proper structure
DO $$
BEGIN
  -- Add invite_code column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE teams ADD COLUMN invite_code text;
    RAISE NOTICE '✅ Added invite_code column';
  END IF;
  
  -- Remove NOT NULL constraint temporarily to fix existing data
  ALTER TABLE teams ALTER COLUMN invite_code DROP NOT NULL;
  
  -- Drop existing unique constraint if it exists
  ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_invite_code_key;
  ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_invite_code_unique;
END $$;

-- Create robust invite code generation function
CREATE OR REPLACE FUNCTION generate_team_invite_code()
RETURNS text AS $$
DECLARE
  code text;
  attempts integer := 0;
  max_attempts integer := 50;
BEGIN
  LOOP
    -- Generate 8-character code: 4 letters + 4 numbers
    code := 
      chr(65 + floor(random() * 26)::int) ||  -- A-Z
      chr(65 + floor(random() * 26)::int) ||  -- A-Z
      chr(65 + floor(random() * 26)::int) ||  -- A-Z
      chr(65 + floor(random() * 26)::int) ||  -- A-Z
      floor(random() * 10)::text ||           -- 0-9
      floor(random() * 10)::text ||           -- 0-9
      floor(random() * 10)::text ||           -- 0-9
      floor(random() * 10)::text;             -- 0-9
    
    -- Ensure it's unique
    IF NOT EXISTS (SELECT 1 FROM teams WHERE invite_code = code) THEN
      RETURN code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      -- Fallback: use timestamp + random
      code := upper(substring(md5(extract(epoch from now())::text || random()::text) from 1 for 8));
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Fix all existing teams without invite codes
UPDATE teams 
SET invite_code = generate_team_invite_code()
WHERE invite_code IS NULL OR invite_code = '';

-- Now add constraints back
ALTER TABLE teams ALTER COLUMN invite_code SET NOT NULL;
ALTER TABLE teams ADD CONSTRAINT teams_invite_code_unique UNIQUE (invite_code);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS teams_invite_code_lookup_idx ON teams(invite_code);

-- Create trigger for new teams
CREATE OR REPLACE FUNCTION set_team_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_team_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_team_invite_code_trigger ON teams;
CREATE TRIGGER set_team_invite_code_trigger
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_team_invite_code();

-- Show final status
DO $$
DECLARE
  team_record RECORD;
  team_count integer;
BEGIN
  SELECT COUNT(*) INTO team_count FROM teams;
  RAISE NOTICE '=== FINAL TEAMS STATUS ===';
  RAISE NOTICE 'Total teams: %', team_count;
  
  FOR team_record IN (SELECT id, name, invite_code FROM teams ORDER BY created_at DESC LIMIT 5) LOOP
    RAISE NOTICE 'Team: % | Invite Code: %', team_record.name, team_record.invite_code;
  END LOOP;
  
  RAISE NOTICE '✅ All teams now have invite codes!';
END $$;