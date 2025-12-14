/*
  # Fix Team Invite Code System

  1. Problem
    - Invite codes may not be generating properly
    - Teams table might not have proper invite code constraints
    - Need to ensure invite codes are unique and properly generated

  2. Solution
    - Add proper invite code generation function
    - Ensure teams table has correct structure
    - Add trigger to auto-generate invite codes
    - Fix any existing teams without invite codes

  3. Security
    - Maintain existing RLS policies
    - Ensure invite codes are unique
*/

-- Create or replace the invite code generation function
CREATE OR REPLACE FUNCTION generate_unique_invite_code()
RETURNS text AS $$
DECLARE
  code text;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    -- Generate a random 8-character code using uppercase letters and numbers
    code := upper(
      substring(md5(random()::text || clock_timestamp()::text) from 1 for 4) ||
      substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)
    );
    
    -- Replace any lowercase letters with numbers (shouldn't happen but safety)
    code := translate(code, 'abcdef', '123456');
    
    -- Ensure it's exactly 8 characters and uppercase
    code := upper(substring(code from 1 for 8));
    
    -- Check if this code already exists
    IF NOT EXISTS (SELECT 1 FROM teams WHERE invite_code = code) THEN
      RETURN code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique invite code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ensure teams table has proper invite_code column
DO $$
BEGIN
  -- Check if invite_code column exists and has proper constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE teams ADD COLUMN invite_code text;
  END IF;
  
  -- Ensure invite_code is unique
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'teams_invite_code_key'
  ) THEN
    ALTER TABLE teams ADD CONSTRAINT teams_invite_code_key UNIQUE (invite_code);
  END IF;
  
  -- Ensure invite_code is not null
  ALTER TABLE teams ALTER COLUMN invite_code SET NOT NULL;
END $$;

-- Create or replace trigger function to auto-generate invite codes
CREATE OR REPLACE FUNCTION auto_generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- If invite_code is not provided or is empty, generate one
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_unique_invite_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invite codes on insert
DROP TRIGGER IF EXISTS auto_generate_invite_code_trigger ON teams;
CREATE TRIGGER auto_generate_invite_code_trigger
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invite_code();

-- Fix any existing teams that don't have invite codes
UPDATE teams 
SET invite_code = generate_unique_invite_code()
WHERE invite_code IS NULL OR invite_code = '';

-- Create index for better performance on invite code lookups
CREATE INDEX IF NOT EXISTS teams_invite_code_idx ON teams(invite_code);

-- Test the invite code generation
DO $$
DECLARE
  test_code text;
BEGIN
  test_code := generate_unique_invite_code();
  RAISE NOTICE '✅ Invite code generation test successful: %', test_code;
  
  -- Verify the code format
  IF length(test_code) = 8 AND test_code ~ '^[A-Z0-9]+$' THEN
    RAISE NOTICE '✅ Invite code format is correct';
  ELSE
    RAISE NOTICE '❌ Invite code format is incorrect: %', test_code;
  END IF;
END $$;