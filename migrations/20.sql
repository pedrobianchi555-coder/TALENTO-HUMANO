
-- Tabla de auditoría general para todas las operaciones sensibles
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  resource_type TEXT,
  resource_id INTEGER,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_module ON audit_log(module);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Tabla para gestión de copias de seguridad
CREATE TABLE backup_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_type TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  tables_included TEXT,
  row_count INTEGER,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_by_id INTEGER NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
