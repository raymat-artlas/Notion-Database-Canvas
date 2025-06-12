-- Fix users table to support promo code functionality
-- This script adds the missing columns needed for promo code application

-- Add plan_source column to track how user got their plan
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan_source VARCHAR(50) DEFAULT 'default';

-- Add active_trial_code column to store current promo code
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS active_trial_code VARCHAR(100);

-- Update existing users to have proper default values
UPDATE users 
SET plan_source = 'default' 
WHERE plan_source IS NULL;

-- Add index for better performance on plan_source queries
CREATE INDEX IF NOT EXISTS idx_users_plan_source ON users(plan_source);

-- Add index for active_trial_code lookups
CREATE INDEX IF NOT EXISTS idx_users_active_trial_code ON users(active_trial_code);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('plan_source', 'active_trial_code')
ORDER BY column_name;