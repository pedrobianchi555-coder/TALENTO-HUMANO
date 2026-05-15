-- Remove the company_id column
ALTER TABLE users DROP COLUMN company_id;

-- Drop indexes
DROP INDEX idx_users_department;
DROP INDEX idx_users_role;
DROP INDEX idx_users_ci;
DROP INDEX idx_users_email;

-- Drop the users table
DROP TABLE users;