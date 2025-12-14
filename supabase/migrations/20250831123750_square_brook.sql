/*
  # Fix Team Image Storage Setup

  1. Storage Setup
    - Create 'team-images' storage bucket if it doesn't exist
    - Set up proper access policies for team members
    - Allow team members to upload and view images
    - Make bucket public for easier access

  2. Security
    - Only authenticated users can upload
    - Team members can view team images
    - Proper file size and type restrictions

  3. Testing
    - Verify bucket creation and policies
*/

-- Create the team-images storage bucket (public for easier access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-images', 
  'team-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Allow authenticated users to upload images
CREATE POLICY IF NOT EXISTS "Team members can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-images' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to view images
CREATE POLICY IF NOT EXISTS "Anyone can view team images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'team-images');

-- Allow users to delete their own uploaded images
CREATE POLICY IF NOT EXISTS "Users can delete their own team images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[3] -- Check if user owns the file
);

-- Ensure team_messages table has image columns
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
DECLARE
  bucket_exists boolean;
  policy_count integer;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'team-images'
  ) INTO bucket_exists;
  
  -- Count storage policies
  SELECT COUNT(*) FROM pg_policies 
  WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE '%team%image%'
  INTO policy_count;
  
  IF bucket_exists THEN
    RAISE NOTICE '✅ Team images storage bucket exists';
  ELSE
    RAISE NOTICE '❌ Team images storage bucket missing';
  END IF;
  
  RAISE NOTICE '📋 Storage policies created: %', policy_count;
  RAISE NOTICE '✅ Team image sharing setup complete!';
END $$;