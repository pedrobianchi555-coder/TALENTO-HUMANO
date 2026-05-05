-- Tabla de registros de asistencia desde Hikvision
CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_ci VARCHAR(20) NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  hours_worked DECIMAL(5,2),
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ABSENT', -- PRESENT, ABSENT, LATE, EARLY_LEAVE
  notes TEXT,
  source VARCHAR(50) DEFAULT 'HIKVISION', -- HIKVISION, MANUAL, IMPORTED
  manually_registered_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevenir duplicados por empleado y día
  CONSTRAINT unique_employee_date UNIQUE(user_id, date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_ci_date ON attendance_records(employee_ci, date);
CREATE INDEX IF NOT EXISTS idx_attendance_month ON attendance_records(DATE_TRUNC('month', date), user_id);

-- Tabla de resumen mensual (caché para reportes rápidos)
CREATE TABLE IF NOT EXISTS attendance_monthly_summary (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month DATE NOT NULL,
  total_days_worked INT DEFAULT 0,
  total_absences INT DEFAULT 0,
  total_lates INT DEFAULT 0,
  total_hours_worked DECIMAL(6,2) DEFAULT 0,
  average_hours_per_day DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_month UNIQUE(user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_summary_user_month ON attendance_monthly_summary(user_id, year_month DESC);
CREATE INDEX IF NOT EXISTS idx_summary_month ON attendance_monthly_summary(year_month DESC);

-- Función para actualizar el resumen mensual automáticamente
CREATE OR REPLACE FUNCTION update_monthly_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_year_month DATE;
  v_total_worked INT;
  v_total_absences INT;
  v_total_lates INT;
  v_total_hours DECIMAL(6,2);
BEGIN
  v_year_month := DATE_TRUNC('month', NEW.date)::DATE;

  -- Calcular estadísticas del mes
  SELECT
    COUNT(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 END),
    COUNT(CASE WHEN status = 'ABSENT' THEN 1 END),
    COUNT(CASE WHEN status = 'LATE' THEN 1 END),
    COALESCE(SUM(hours_worked), 0)
  INTO v_total_worked, v_total_absences, v_total_lates, v_total_hours
  FROM attendance_records
  WHERE user_id = NEW.user_id
    AND DATE_TRUNC('month', date)::DATE = v_year_month;

  -- Upsert en el resumen
  INSERT INTO attendance_monthly_summary
    (user_id, year_month, total_days_worked, total_absences, total_lates, total_hours_worked, average_hours_per_day, updated_at)
  VALUES
    (NEW.user_id, v_year_month, v_total_worked, v_total_absences, v_total_lates, v_total_hours,
     CASE WHEN v_total_worked > 0 THEN v_total_hours / v_total_worked ELSE 0 END, NOW())
  ON CONFLICT (user_id, year_month)
  DO UPDATE SET
    total_days_worked = v_total_worked,
    total_absences = v_total_absences,
    total_lates = v_total_lates,
    total_hours_worked = v_total_hours,
    average_hours_per_day = CASE WHEN v_total_worked > 0 THEN v_total_hours / v_total_worked ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar resumen cuando hay cambios en asistencia
DROP TRIGGER IF EXISTS trg_update_attendance_summary ON attendance_records;
CREATE TRIGGER trg_update_attendance_summary
AFTER INSERT OR UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION update_monthly_summary();

-- Tabla de configuración de asistencia
CREATE TABLE IF NOT EXISTS attendance_config (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  company_id BIGINT,
  work_start_time TIME DEFAULT '08:00:00',
  work_end_time TIME DEFAULT '17:00:00',
  grace_period_minutes INT DEFAULT 15, -- Minutos de gracia para tardanzas
  lunch_break_start TIME DEFAULT '12:00:00',
  lunch_break_end TIME DEFAULT '13:00:00',
  lunch_break_minutes INT DEFAULT 60,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO attendance_config (work_start_time, work_end_time, grace_period_minutes)
VALUES ('08:00:00', '17:00:00', 15)
ON CONFLICT DO NOTHING;
