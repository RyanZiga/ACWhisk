-- Debug RLS policies and auth issues
-- Run this in Supabase SQL editor to debug RLS issues

-- Check current user and auth state
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() as current_jwt,
  auth.role() as current_role;

-- Check if profiles exist for the current user
SELECT * FROM profiles WHERE id = auth.uid();

-- Test recipe insertion with debugging
DO $$
DECLARE
    current_uid UUID := auth.uid();
    test_recipe_id UUID;
BEGIN
    RAISE NOTICE 'Current auth.uid(): %', current_uid;
    
    -- Check if profile exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = current_uid) THEN
        RAISE NOTICE 'No profile found for user %', current_uid;
        
        -- Try to create a profile
        INSERT INTO profiles (id, name, role, created_at, updated_at) 
        VALUES (current_uid, 'Test User', 'student', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Profile created for user %', current_uid;
    END IF;
    
    -- Try to insert a test recipe
    INSERT INTO recipes (
        title, 
        description, 
        ingredients, 
        instructions, 
        author_id, 
        is_public
    ) VALUES (
        'Test Recipe', 
        'A test recipe for debugging', 
        '["test ingredient"]'::jsonb, 
        '["test instruction"]'::jsonb, 
        current_uid, 
        true
    ) RETURNING id INTO test_recipe_id;
    
    RAISE NOTICE 'Test recipe created with ID: %', test_recipe_id;
    
    -- Clean up test recipe
    DELETE FROM recipes WHERE id = test_recipe_id;
    RAISE NOTICE 'Test recipe cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error occurred: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Update RLS policies to be more permissive for debugging
-- (Remove these after debugging is complete)

-- Temporarily create a more permissive recipe creation policy
DROP POLICY IF EXISTS "Debug: Users can create recipes" ON recipes;
CREATE POLICY "Debug: Users can create recipes" ON recipes FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
        auth.uid() = author_id 
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
    )
);

-- Add a policy to allow users to insert their own profiles if missing
DROP POLICY IF EXISTS "Debug: Users can insert profiles" ON profiles;
CREATE POLICY "Debug: Users can insert profiles" ON profiles FOR INSERT WITH CHECK (
    auth.uid() = id OR auth.uid() IS NOT NULL
);

-- Check what policies are currently active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('recipes', 'profiles')
ORDER BY tablename, policyname;