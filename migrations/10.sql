-- Create asset_maintenance table
CREATE TABLE asset_maintenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  assignment_id INTEGER,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  completed_date DATE,
  cost REAL,
  performed_by TEXT,
  notes TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_maintenance_asset_id ON asset_maintenance(asset_id);
CREATE INDEX idx_asset_maintenance_assignment_id ON asset_maintenance(assignment_id);

-- Create asset_incidents table
CREATE TABLE asset_incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  assignment_id INTEGER,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_date DATE NOT NULL,
  reported_by_id INTEGER NOT NULL,
  resolution TEXT,
  resolved_date DATE,
  cost REAL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_incidents_asset_id ON asset_incidents(asset_id);
CREATE INDEX idx_asset_incidents_assignment_id ON asset_incidents(assignment_id);