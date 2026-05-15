
CREATE TABLE employee_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  employee_ci TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('INACTIVATED', 'DELETED', 'ACTIVATED')),
  reason TEXT,
  performed_by_id INTEGER NOT NULL,
  performed_by_name TEXT NOT NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  employee_data_snapshot TEXT, -- JSON snapshot of employee data before action
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_audit_log_employee_id ON employee_audit_log(employee_id);
CREATE INDEX idx_employee_audit_log_action_type ON employee_audit_log(action_type);
CREATE INDEX idx_employee_audit_log_performed_at ON employee_audit_log(performed_at);
