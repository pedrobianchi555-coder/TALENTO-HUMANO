-- Tabla de notificaciones in-app con soporte Supabase Realtime
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(60) NOT NULL,
  -- REQUEST_APPROVED, REQUEST_REJECTED, REQUEST_CREATED,
  -- LOAN_APPROVED, LOAN_PAYMENT_RECORDED,
  -- EVALUATION_ASSIGNED, EVALUATION_COMPLETED,
  -- ATTENDANCE_REGISTERED, ASSET_ASSIGNED, ASSET_RETURNED,
  -- EVENT_REMINDER, COMPLAINT_RESOLVED, GENERAL
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  link VARCHAR(255),          -- ruta interna, ej: /requests
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,             -- datos extra opcionales (request_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- RLS: cada usuario solo ve sus propias notificaciones
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_owner ON notifications;
CREATE POLICY notifications_owner ON notifications
  FOR ALL USING (user_id = (
    SELECT id FROM users WHERE mocha_user_id = auth.uid()::text LIMIT 1
  ));

-- Habilitar Realtime en la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
