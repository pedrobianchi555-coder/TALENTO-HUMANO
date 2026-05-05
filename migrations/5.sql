-- Create users table first
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ci TEXT,
  role TEXT,
  department TEXT,
  position TEXT,
  hire_date DATE,
  birth_date DATE,
  address TEXT,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  bank_account TEXT,
  salary REAL,
  is_active BOOLEAN DEFAULT 1,
  hr_permissions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_ci ON users(ci);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);

-- Then add the company_id column
ALTER TABLE users ADD COLUMN company_id INTEGER DEFAULT 1;