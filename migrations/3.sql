
-- Create loans table
CREATE TABLE loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  principal_amount REAL NOT NULL,
  interest_rate REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID_OFF', 'CANCELLED')),
  issue_date DATE NOT NULL,
  category TEXT DEFAULT 'General',
  monthly_installment REAL NOT NULL,
  total_installments INTEGER NOT NULL,
  remaining_installments INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create loan installments table
CREATE TABLE loan_installments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount_due REAL NOT NULL,
  amount_paid REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'PARTIALLY_PAID')),
  balance REAL NOT NULL, -- Remaining loan balance after this installment
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create loan payments table
CREATE TABLE loan_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL,
  installment_id INTEGER NOT NULL,
  amount_paid REAL NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'PAYROLL' CHECK (payment_method IN ('PAYROLL', 'TRANSFER', 'CASH')),
  reference TEXT,
  recorded_by_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create repayment plans table
CREATE TABLE loan_repayment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL UNIQUE,
  method TEXT NOT NULL CHECK (method IN ('FIXED_AMOUNT', 'FIXED_INSTALLMENTS', 'SALARY_PERCENTAGE')),
  value REAL NOT NULL, -- number of installments, fixed amount, or salary percentage
  frequency TEXT NOT NULL CHECK (frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY')),
  start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loan_installments_loan_id ON loan_installments(loan_id);
CREATE INDEX idx_loan_installments_status ON loan_installments(status);
CREATE INDEX idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX idx_loan_payments_installment_id ON loan_payments(installment_id);
CREATE INDEX idx_loan_repayment_plans_loan_id ON loan_repayment_plans(loan_id);
