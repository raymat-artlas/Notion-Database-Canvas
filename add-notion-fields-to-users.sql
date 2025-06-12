-- Add Notion fields to users table
-- These fields are referenced in the Notion API routes

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notion_api_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS notion_workspace_name VARCHAR(255);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('notion_api_key', 'notion_workspace_name')
ORDER BY column_name;