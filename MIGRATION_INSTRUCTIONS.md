# Supabase Migration Instructions

## Current Status
The application code has been updated to use the unified `access_passwords` table for both user authentication and Notion settings. However, the Supabase database schema still needs to be updated.

## Required Manual Steps

### 1. Add Notion Columns to Supabase
Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/hhabjtdapcosifnnsnzp/sql) and execute:

```sql
-- Add Notion columns to access_passwords table
ALTER TABLE public.access_passwords 
ADD COLUMN IF NOT EXISTS notion_api_key TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_name TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'access_passwords' 
AND table_schema = 'public'
ORDER BY column_name;
```

### 2. Migrate Existing Data (if needed)
If there's existing data in `notion_integrations` table, run:

```sql
-- Migrate data from notion_integrations to access_passwords
UPDATE access_passwords 
SET 
  notion_api_key = ni.api_key,
  notion_workspace_name = ni.workspace_name
FROM notion_integrations ni
WHERE access_passwords.user_id = ni.user_id
  AND ni.is_active = true;
```

### 3. Verify Migration
After running the SQL commands, test with:
```bash
node run-migration.js
```

## What Changed in Code

### Files Updated:
- `src/lib/supabase.ts` - Added Notion fields to AccessPassword interface
- `src/app/api/notion/settings/route.ts` - Now uses access_passwords table
- Database structure unified for better user management

### Benefits:
- ✅ No more duplicate API key records
- ✅ Unified user data management 
- ✅ Simpler architecture
- ✅ Better data consistency

## Next Steps After Migration
1. Test Notion API key saving/loading
2. Verify no duplicate records are created
3. Test plan management features
4. Remove old `notion_integrations` table (optional)