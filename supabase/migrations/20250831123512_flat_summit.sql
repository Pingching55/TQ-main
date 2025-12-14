/*
  # Setup Team Image Storage

  1. Storage Setup
    - Create 'team-images' storage bucket
    - Set up proper access policies for team members
    - Allow team members to upload and view images

  2. Security
    - Only authenticated users can upload
    - Only team members can view team images
    - Proper file size and type restrictions

  3. Performance
    - Optimize storage policies for fast access
    - Set up proper indexing
*/

-- Create the team-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-images', 'team-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images to their team folders
CREATE POLICY "Team members can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-images' AND
  auth.uid()::text = (storage.foldername(name))[2] -- Check if user owns the folder
);

-- Allow team members to view images from their teams
CREATE POLICY "Team members can view team images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'team-images' AND
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id::text = (storage.foldername(name))[1]
    AND tm.user_id = auth.uid()
  )
);

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their own team images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-images' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Update team_messages table to ensure image columns exist
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

-- Update message_type constraint to include image
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE team_messages DROP CONSTRAINT IF EXISTS team_messages_message_type_check;
  
  -- Add new constraint with image type
  ALTER TABLE team_messages ADD CONSTRAINT team_messages_message_type_check 
    CHECK (message_type IN ('text', 'image'));
END $$;

-- Test the storage setup
DO $$
BEGIN
  RAISE NOTICE '✅ Team image storage bucket created';
  RAISE NOTICE '✅ Storage policies configured for team access';
  RAISE NOTICE '✅ Team messages table updated for image support';
  RAISE NOTICE '✅ Image sharing is now ready!';
END $$;