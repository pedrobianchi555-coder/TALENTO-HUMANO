-- PostgreSQL Schema for Talento Humano
-- Converted from SQLite migrations

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users (formerly user_profiles)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  mocha_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  ci VARCHAR(20) UNIQUE,
  phone VARCHAR(20),
  role TEXT DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'HR')),
  photo_url TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  birth_date DATE,
  department VARCHAR(255),
  position VARCHAR(255),
  payroll_type TEXT CHECK (payroll_type IN ('OPERARIO', 'EMPLEADO', 'CONFIDENCIAL')),
  base_salary DECIMAL(12, 2),
  manager_id BIGINT REFERENCES users(id),
  hr_permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  company_id BIGINT DEFAULT 1,
  sede TEXT CHECK (sede IN ('El Pilar', 'Caracas', 'Sur del Lago', 'Miranda', 'Apure')),
  company_name VARCHAR(255),
  shirt_size VARCHAR(10),
  pants_size VARCHAR(10),
  boots_size VARCHAR(10)
);

CREATE INDEX idx_users_mocha_user_id ON users(mocha_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_ci ON users(ci);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_status ON users(status);

-- Table: family_dependents
CREATE TABLE IF NOT EXISTS family_dependents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  relationship TEXT CHECK (relationship IN ('Cónyuge', 'Hijo/a')),
  ci VARCHAR(20),
  birth_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_family_dependents_user_id ON family_dependents(user_id);

-- Table: companies
CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: requests
CREATE TABLE IF NOT EXISTS requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255),
  category TEXT CHECK (category IN ('Gestión Laboral', 'Bienestar', 'Desarrollo')),
  details TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  file_url TEXT,
  rating SMALLINT,
  resolved_by_id BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_category ON requests(category);

-- Table: complaints
CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(255),
  details TEXT,
  status VARCHAR(50),
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_status ON complaints(status);

-- Table: asset_categories
CREATE TABLE IF NOT EXISTS asset_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: assets
CREATE TABLE IF NOT EXISTS assets (
  id BIGSERIAL PRIMARY KEY,
  asset_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id BIGINT REFERENCES asset_categories(id),
  brand VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255) UNIQUE,
  purchase_date DATE,
  purchase_cost DECIMAL(12, 2),
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED')),
  condition_status TEXT DEFAULT 'GOOD' CHECK (condition_status IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR')),
  location VARCHAR(255),
  assigned_to_id BIGINT REFERENCES users(id),
  assigned_date DATE,
  warranty_expiry_date DATE,
  notes TEXT,
  photo_url TEXT,
  invoice_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_asset_code ON assets(asset_code);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_assigned_to_id ON assets(assigned_to_id);
CREATE INDEX idx_assets_category_id ON assets(category_id);

-- Table: asset_assignments
CREATE TABLE IF NOT EXISTS asset_assignments (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_id BIGINT NOT NULL REFERENCES users(id),
  assigned_date DATE NOT NULL,
  return_date DATE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED')),
  assignment_notes TEXT,
  return_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_assignments_asset_id ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_user_id ON asset_assignments(user_id);
CREATE INDEX idx_asset_assignments_status ON asset_assignments(status);

-- Table: asset_maintenance
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(255),
  description TEXT,
  maintenance_date DATE NOT NULL,
  cost DECIMAL(12, 2),
  performed_by VARCHAR(255),
  next_maintenance_date DATE,
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_by_id BIGINT NOT NULL REFERENCES users(id),
  assignment_id BIGINT REFERENCES asset_assignments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_maintenance_asset_id ON asset_maintenance(asset_id);
CREATE INDEX idx_asset_maintenance_status ON asset_maintenance(status);

-- Table: corporate_events
CREATE TABLE IF NOT EXISTS corporate_events (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  location VARCHAR(255),
  category VARCHAR(255),
  target_audience VARCHAR(255),
  created_by_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_corporate_events_start_date ON corporate_events(start_date);

-- Table: event_rsvp
CREATE TABLE IF NOT EXISTS event_rsvp (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES corporate_events(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ATTENDING' CHECK (status IN ('ATTENDING', 'NOT_ATTENDING', 'MAYBE')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_rsvp_event_id ON event_rsvp(event_id);
CREATE INDEX idx_event_rsvp_user_id ON event_rsvp(user_id);

-- Table: evaluation_cycles
CREATE TABLE IF NOT EXISTS evaluation_cycles (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  department VARCHAR(255),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_by_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evaluation_cycles_status ON evaluation_cycles(status);

-- Table: evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id BIGSERIAL PRIMARY KEY,
  cycle_id BIGINT NOT NULL REFERENCES evaluation_cycles(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluator_id BIGINT NOT NULL REFERENCES users(id),
  self_score DECIMAL(5, 2),
  manager_score DECIMAL(5, 2),
  final_score DECIMAL(5, 2),
  self_comments TEXT,
  manager_comments TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SELF_COMPLETED', 'MANAGER_EVALUATION_PENDING', 'MANAGER_COMPLETED', 'COMPLETED')),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evaluations_employee_id ON evaluations(employee_id);
CREATE INDEX idx_evaluations_cycle_id ON evaluations(cycle_id);
CREATE INDEX idx_evaluations_status ON evaluations(status);

-- Table: loans
CREATE TABLE IF NOT EXISTS loans (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  principal_amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID_OFF', 'CANCELLED')),
  issue_date DATE NOT NULL,
  category VARCHAR(255),
  monthly_installment DECIMAL(12, 2),
  total_installments INTEGER,
  remaining_installments INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);

-- Table: loan_installments
CREATE TABLE IF NOT EXISTS loan_installments (
  id BIGSERIAL PRIMARY KEY,
  loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount_due DECIMAL(12, 2) NOT NULL,
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'PARTIALLY_PAID')),
  balance DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_installments_loan_id ON loan_installments(loan_id);
CREATE INDEX idx_loan_installments_status ON loan_installments(status);

-- Table: loan_payments
CREATE TABLE IF NOT EXISTS loan_payments (
  id BIGSERIAL PRIMARY KEY,
  loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_id BIGINT NOT NULL REFERENCES loan_installments(id),
  amount_paid DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'PAYROLL' CHECK (payment_method IN ('PAYROLL', 'TRANSFER', 'CASH')),
  reference VARCHAR(255),
  recorded_by_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX idx_loan_payments_payment_date ON loan_payments(payment_date);

-- Table: loan_repayment_plans
CREATE TABLE IF NOT EXISTS loan_repayment_plans (
  id BIGSERIAL PRIMARY KEY,
  loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  method TEXT CHECK (method IN ('FIXED_AMOUNT', 'FIXED_INSTALLMENTS', 'SALARY_PERCENTAGE')),
  value DECIMAL(12, 2),
  frequency TEXT CHECK (frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY')),
  start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: candidates
CREATE TABLE IF NOT EXISTS candidates (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  position VARCHAR(255),
  department VARCHAR(255),
  status TEXT DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED')),
  resume_url TEXT,
  cover_letter_url TEXT,
  resume_text TEXT,
  resume_pdf_base64 TEXT,
  ai_profile TEXT,
  application_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_position ON candidates(position);

-- Table: interviews
CREATE TABLE IF NOT EXISTS interviews (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('Filtro Telefónico', 'Técnica', 'RRHH', 'Final', 'Seguimiento')),
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED')),
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER,
  interviewer VARCHAR(255),
  location VARCHAR(255),
  meeting_link TEXT,
  notes TEXT,
  feedback TEXT,
  rating SMALLINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX idx_interviews_status ON interviews(status);

-- Table: asset_incidents
CREATE TABLE IF NOT EXISTS asset_incidents (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  assignment_id BIGINT REFERENCES asset_assignments(id),
  incident_type VARCHAR(255),
  description TEXT,
  incident_date DATE NOT NULL,
  reported_by_id BIGINT NOT NULL REFERENCES users(id),
  resolution TEXT,
  resolved_date DATE,
  cost DECIMAL(12, 2),
  severity VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_incidents_asset_id ON asset_incidents(asset_id);
CREATE INDEX idx_asset_incidents_severity ON asset_incidents(severity);

-- Table: conversations
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: conversation_participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  is_broadcast BOOLEAN DEFAULT FALSE,
  poll_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_poll ON messages(poll_id);

-- Table: polls
CREATE TABLE IF NOT EXISTS polls (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  votes JSONB DEFAULT '{}',
  voters JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: documents
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(255),
  department VARCHAR(255),
  is_public BOOLEAN DEFAULT FALSE,
  file_url TEXT NOT NULL,
  uploaded_by_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_is_public ON documents(is_public);

-- Table: employee_audit_log
CREATE TABLE IF NOT EXISTS employee_audit_log (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  employee_ci TEXT,
  employee_name TEXT,
  employee_email TEXT,
  action_type TEXT CHECK (action_type IN ('INACTIVATED', 'DELETED', 'ACTIVATED')),
  reason TEXT,
  performed_by_id BIGINT NOT NULL REFERENCES users(id),
  performed_by_name TEXT,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  employee_data_snapshot JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_audit_log_employee_id ON employee_audit_log(employee_id);
CREATE INDEX idx_employee_audit_log_action_type ON employee_audit_log(action_type);
CREATE INDEX idx_employee_audit_log_performed_at ON employee_audit_log(performed_at);
