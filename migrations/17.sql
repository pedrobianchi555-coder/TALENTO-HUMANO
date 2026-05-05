
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  department TEXT,
  is_public BOOLEAN DEFAULT 0,
  file_url TEXT NOT NULL,
  uploaded_by_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_department ON documents(department);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by_id);
