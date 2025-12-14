/*
  # Add author email to posts table

  1. Changes
    - Add `author_email` column to posts table
    - Add `author_username` column to posts table  
    - Update existing posts with author information
    - Create trigger to auto-populate these fields

  2. Security
    - No RLS changes needed
    - These fields are readable by everyone (public post info)

  3. Benefits
    - No need to query auth.users from client
    - Author info always available
    - Works with existing RLS policies
*/

-- Add author email and username columns to posts
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS author_email text,
ADD COLUMN IF NOT EXISTS author_username text;

-- Update existing posts with author information
UPDATE posts 
SET 
  author_email = au.email,
  author_username = COALESCE(p.username, split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE posts.user_id = au.id
  AND (posts.author_email IS NULL OR posts.author_username IS NULL);

-- Create function to auto-populate author info on insert
CREATE OR REPLACE FUNCTION populate_post_author_info()
RETURNS TRIGGER AS $$
BEGIN
  -- Get user email from auth.users
  SELECT 
    au.email,
    COALESCE(p.username, split_part(au.email, '@', 1))
  INTO 
    NEW.author_email,
    NEW.author_username
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE au.id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-populate author info
DROP TRIGGER IF EXISTS populate_post_author_info_trigger ON posts;
CREATE TRIGGER populate_post_author_info_trigger
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION populate_post_author_info();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS posts_author_email_idx ON posts(author_email);
CREATE INDEX IF NOT EXISTS posts_author_username_idx ON posts(author_username);