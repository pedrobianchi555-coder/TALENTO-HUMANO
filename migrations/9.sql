
CREATE TABLE candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT NOT NULL,
  department TEXT,
  status TEXT NOT NULL CHECK (status IN ('APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED')) DEFAULT 'APPLIED',
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

CREATE TABLE interviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Filtro Telefónico', 'Técnica', 'RRHH', 'Final', 'Seguimiento')),
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED')) DEFAULT 'SCHEDULED',
  date DATE NOT NULL,
  time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  interviewer TEXT NOT NULL,
  location TEXT,
  meeting_link TEXT,
  notes TEXT,
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_department ON candidates(department);
CREATE INDEX idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX idx_interviews_date ON interviews(date);
