/*
  # Create missing profiles for existing auth users

  This creates profile records for the 2 existing auth users so they can login with usernames.
*/

-- Create profile for wcat7600@gmail.com
INSERT INTO profiles (id, full_name, phone_number, username, email, created_at, updated_at)
VALUES (
  'e6faf07d-c521-45eb-ba27-86cf6461afe7',
  'WCat User',
  '',
  'wcat7600',
  'wcat7600@gmail.com',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create profile for pingching5566@hotmail.com  
INSERT INTO profiles (id, full_name, phone_number, username, email, created_at, updated_at)
VALUES (
  'b334cbf9-94ce-457a-9925-cb5d68f42e8',
  'PingChing User', 
  '',
  'pingching5566',
  'pingching5566@hotmail.com',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;