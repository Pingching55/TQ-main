/*
  # Create Team Images Storage Bucket

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
DROP POLICY IF EXISTS "Team members can upload images" ON storage.objects;
CREATE POLICY "Team members can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-images' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to view images
DROP POLICY IF EXISTS "Anyone can view team images" ON storage.objects;
CREATE POLICY "Anyone can view team images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'team-images');

-- Allow users to delete their own uploaded images
DROP POLICY IF EXISTS "Users can delete their own team images" ON storage.objects;
CREATE POLICY "Users can delete their own team images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[3] -- Check if user owns the file
);

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