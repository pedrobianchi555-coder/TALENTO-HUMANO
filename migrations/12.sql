
-- Add company_name field to users table
ALTER TABLE users ADD COLUMN company_name TEXT;

-- Set all existing employees to Cacao San Jose, C.A.
UPDATE users SET company_name = 'Cacao San Jose, C.A.' WHERE company_name IS NULL;
