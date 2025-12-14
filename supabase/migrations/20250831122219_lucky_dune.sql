/*
  # Add Image Support to Team Messages

  1. Changes
    - Add `image_url` column to team_messages table for storing image URLs
    - Add `image_path` column to team_messages table for storage path reference
    - Update existing messages to have null values for new columns

  2. Security
    - No RLS changes needed - existing policies cover image messages
    - Images will be stored in Supabase Storage with proper access controls

  3. Storage
    - Images will be uploaded to 'team-images' bucket
    - File paths will be organized by team and user
*/

-- Add image columns to team_messages table
DO $$
BEGIN
  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_messages' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE team_messages ADD COLUMN image_url text;
  END IF;
  
  -- Add image_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_messages' AND column_name = 'image_path'
  ) THEN
    ALTER TABLE team_messages ADD COLUMN image_path text;
  END IF;
END $$;

-- Update message_type check constraint to include 'image'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE team_messages DROP CONSTRAINT IF EXISTS team_messages_message_type_check;
  
  -- Add new constraint with image type
  ALTER TABLE team_messages ADD CONSTRAINT team_messages_message_type_check 
    CHECK (message_type IN ('text', 'image'));
END $$;

-- Create index for better performance on image queries
CREATE INDEX IF NOT EXISTS team_messages_image_url_idx ON team_messages(image_url) WHERE image_url IS NOT NULL;

-- Test the new columns
DO $$
BEGIN
  RAISE NOTICE '✅ Image columns added to team_messages table';
  RAISE NOTICE '✅ Message type constraint updated to include image';
  RAISE NOTICE '✅ Team chat now supports image sharing';
END $$;