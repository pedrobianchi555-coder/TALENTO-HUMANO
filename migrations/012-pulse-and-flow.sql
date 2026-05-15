-- ============================================================
-- PULSE & FLOW - Módulo de Bienestar Híbrido
-- Migration: 012-pulse-and-flow.sql
-- ============================================================

-- ============================================================
-- 1. MOOD SHOTS - Entradas diarias del Mood-Shot
--    Privacy: datos individuales, solo visibles por el propio usuario.
--    Managers NUNCA acceden a filas individuales.
-- ============================================================

CREATE TABLE IF NOT EXISTS pulse_mood_shots (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  day_date    DATE NOT NULL DEFAULT CURRENT_DATE,        -- partición lógica por día
  mood_score  SMALLINT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  -- 1=Agotado  2=Bajo  3=Normal  4=Bien  5=Excelente
  session     VARCHAR(10) NOT NULL DEFAULT 'MORNING'     -- MORNING | EVENING
              CHECK (session IN ('MORNING', 'EVENING')),
  -- Eliminado automáticamente tras 90 días (cronjob externo o pg_cron)
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '90 days',

  CONSTRAINT unique_user_day_session UNIQUE (user_id, day_date, session)
);

-- El usuario solo ve sus propias filas
ALTER TABLE pulse_mood_shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own mood shots" ON pulse_mood_shots
  FOR ALL USING (
    user_id = (
      SELECT id FROM users WHERE mocha_user_id = auth.uid()::text
    )
  );

-- ============================================================
-- 2. MÉTRICAS DE FRICCIÓN OPERATIVA (metadatos agregados)
--    Datos anónimos a nivel de equipo — NUNCA individuales.
--    El pipeline de ingesta (worker Cloudflare) solo inserta
--    filas con el equipo/dept, nunca con user_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS pulse_team_friction (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  department      TEXT NOT NULL,
  metric_date     DATE NOT NULL,
  -- Reuniones
  total_meeting_minutes     INT NOT NULL DEFAULT 0,  -- minutos totales de reuniones del día
  deep_work_blocks          INT NOT NULL DEFAULT 0,  -- bloques ≥90 min sin reuniones
  zombie_meeting_count      INT NOT NULL DEFAULT 0,  -- reuniones >60 min sin agenda detectada
  -- Carga fuera de horario (agregada, nunca individual)
  after_hours_events        INT NOT NULL DEFAULT 0,  -- # eventos tool después de 19:00
  weekend_events            INT NOT NULL DEFAULT 0,  -- # eventos en fin de semana
  -- Participantes (para validar umbral de anonimato ≥5)
  team_size                 SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_dept_date UNIQUE (department, metric_date)
);

-- Solo HR puede leer. Workers del backend insertan (service role).
ALTER TABLE pulse_team_friction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr reads team friction" ON pulse_team_friction
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE mocha_user_id = auth.uid()::text
        AND role = 'HR'
    )
  );

-- ============================================================
-- 3. SISTEMA DE PUNTOS (Flow Coins)
-- ============================================================

CREATE TABLE IF NOT EXISTS pulse_point_ledger (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points      INT NOT NULL,                -- positivo = ganado, negativo = redimido
  reason      TEXT NOT NULL,              -- 'DAILY_SHOT', 'STREAK_7', 'REDEMPTION', etc.
  reference_id BIGINT,                    -- id del mood_shot o redemption
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE pulse_point_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ledger" ON pulse_point_ledger
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE mocha_user_id = auth.uid()::text)
  );

-- Vista materializada: balance actual por usuario (NO expone filas individuales)
CREATE OR REPLACE VIEW pulse_point_balance AS
SELECT
  user_id,
  SUM(points) AS balance,
  COUNT(*) FILTER (WHERE points > 0 AND reason = 'DAILY_SHOT') AS total_shots
FROM pulse_point_ledger
GROUP BY user_id;

-- ============================================================
-- 4. CATÁLOGO DE BENEFICIOS (Marketplace)
-- ============================================================

CREATE TABLE IF NOT EXISTS pulse_rewards (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL CHECK (category IN ('TIME', 'DIGITAL', 'CULTURE')),
  cost_points   INT NOT NULL,
  stock         INT,                   -- NULL = ilimitado
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE pulse_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active rewards" ON pulse_rewards
  FOR SELECT USING (is_active = true);

CREATE POLICY "hr manages rewards" ON pulse_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE mocha_user_id = auth.uid()::text AND role = 'HR')
  );

-- ============================================================
-- 5. REDENCIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS pulse_redemptions (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id   BIGINT NOT NULL REFERENCES pulse_rewards(id),
  status      TEXT NOT NULL DEFAULT 'PENDING'
              CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'DELIVERED')),
  points_used INT NOT NULL,
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE pulse_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own redemptions" ON pulse_redemptions
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE mocha_user_id = auth.uid()::text)
  );

CREATE POLICY "hr manages redemptions" ON pulse_redemptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE mocha_user_id = auth.uid()::text AND role = 'HR')
  );

-- ============================================================
-- 6. FUNCIÓN AGREGADORA — el corazón de la privacidad
--    Produce el índice de bienestar por equipo SIN exponer filas individuales.
--    Solo ejecutable por service_role (worker backend).
--    Aplica el umbral de anonimato (mínimo 5 personas).
-- ============================================================

CREATE OR REPLACE FUNCTION get_team_pulse(
  p_department TEXT,
  p_date_from  DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_date_to    DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  department       TEXT,
  avg_mood         NUMERIC,
  participation_pct NUMERIC,
  mood_trend       TEXT,     -- 'IMPROVING' | 'STABLE' | 'DECLINING'
  sample_size      INT,      -- número de empleados que participaron (para transparencia)
  is_anonymous     BOOLEAN   -- false si sample_size < 5 → no se devuelve avg_mood
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_count INT;
BEGIN
  -- Contar empleados del dept con al menos 1 shot en el período
  SELECT COUNT(DISTINCT ms.user_id) INTO v_team_count
  FROM pulse_mood_shots ms
  JOIN users u ON u.id = ms.user_id
  WHERE u.department = p_department
    AND ms.day_date BETWEEN p_date_from AND p_date_to
    AND u.status = 'ACTIVE';

  RETURN QUERY
  SELECT
    p_department,
    CASE WHEN v_team_count >= 5 THEN ROUND(AVG(ms.mood_score), 2) ELSE NULL END,
    ROUND(
      v_team_count::NUMERIC /
      NULLIF((SELECT COUNT(*) FROM users WHERE department = p_department AND status = 'ACTIVE'), 0)
      * 100, 1
    ),
    CASE
      WHEN v_team_count < 5 THEN 'INSUFFICIENT_DATA'
      WHEN (
        SELECT AVG(mood_score) FROM pulse_mood_shots ms2
        JOIN users u2 ON u2.id = ms2.user_id
        WHERE u2.department = p_department
          AND ms2.day_date > p_date_to - INTERVAL '3 days'
      ) > (
        SELECT AVG(mood_score) FROM pulse_mood_shots ms3
        JOIN users u3 ON u3.id = ms3.user_id
        WHERE u3.department = p_department
          AND ms3.day_date BETWEEN p_date_from AND p_date_from + INTERVAL '3 days'
      ) THEN 'IMPROVING'
      WHEN (
        SELECT AVG(mood_score) FROM pulse_mood_shots ms2
        JOIN users u2 ON u2.id = ms2.user_id
        WHERE u2.department = p_department
          AND ms2.day_date > p_date_to - INTERVAL '3 days'
      ) < (
        SELECT AVG(mood_score) FROM pulse_mood_shots ms3
        JOIN users u3 ON u3.id = ms3.user_id
        WHERE u3.department = p_department
          AND ms3.day_date BETWEEN p_date_from AND p_date_from + INTERVAL '3 days'
      ) THEN 'DECLINING'
      ELSE 'STABLE'
    END,
    v_team_count,
    v_team_count >= 5
  FROM pulse_mood_shots ms
  JOIN users u ON u.id = ms.user_id
  WHERE u.department = p_department
    AND ms.day_date BETWEEN p_date_from AND p_date_to
    AND u.status = 'ACTIVE';
END;
$$;

-- ============================================================
-- 7. ALERTAS AUTOMÁTICAS (generadas por el worker, consumidas por HR)
-- ============================================================

CREATE TABLE IF NOT EXISTS pulse_alerts (
  id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  department      TEXT NOT NULL,
  alert_type      TEXT NOT NULL CHECK (alert_type IN (
    'LOW_MOOD',           -- promedio < 2.5 por 3 días seguidos
    'ZOMBIE_MEETINGS',    -- >4h de reuniones/día por 3 días
    'AFTER_HOURS_SPIKE',  -- after_hours_events >200% de la baseline
    'LOW_PARTICIPATION'   -- participación < 40%
  )),
  severity        TEXT NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  message         TEXT NOT NULL,
  triggered_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  acknowledged_by BIGINT REFERENCES users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved        BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE pulse_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr reads alerts" ON pulse_alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE mocha_user_id = auth.uid()::text AND role = 'HR')
  );

CREATE POLICY "hr acknowledges alerts" ON pulse_alerts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE mocha_user_id = auth.uid()::text AND role = 'HR')
  );

-- ============================================================
-- 8. RACHAS (STREAKS) — calculadas desde el ledger, no almacenadas
--    Vista para que el usuario vea su racha actual
-- ============================================================

CREATE OR REPLACE VIEW pulse_user_streak AS
WITH daily_shots AS (
  SELECT
    user_id,
    day_date,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day_date DESC) AS rn,
    day_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day_date DESC))::INT AS grp
  FROM pulse_mood_shots
  WHERE day_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id, day_date  -- un registro por día aunque haya morning+evening
),
streaks AS (
  SELECT user_id, grp, COUNT(*) AS streak_length, MAX(day_date) AS last_day
  FROM daily_shots
  GROUP BY user_id, grp
)
SELECT
  user_id,
  COALESCE(
    (SELECT streak_length FROM streaks s2
     WHERE s2.user_id = s.user_id
       AND s2.last_day >= CURRENT_DATE - 1
     ORDER BY last_day DESC LIMIT 1),
    0
  ) AS current_streak,
  MAX(streak_length) AS best_streak
FROM streaks s
GROUP BY user_id;

-- ============================================================
-- 9. DATOS SEMILLA — Catálogo inicial de beneficios
-- ============================================================

INSERT INTO pulse_rewards (title, description, category, cost_points, stock) VALUES
-- TIME
('🚫 Inmunidad a Reuniones',   '1 tarde sin poder ser invitado a reuniones', 'TIME', 150, NULL),
('🌅 Late Start',              'Empezar 2h más tarde un día hábil',           'TIME', 200, 4),
('🎉 Viernes Libre',           'Tarde del viernes libre (salida a las 13:00)', 'TIME', 300, 2),
-- DIGITAL
('🎵 Spotify Premium 1 mes',   'Código de regalo Spotify',                    'DIGITAL', 500, 10),
('☕ Bono Café x5',            '5 cafés en la cafetería del edificio',        'DIGITAL', 120, NULL),
('🖥️ Upgrade Home Office',     'Voucher $50 para accesorios de trabajo',      'DIGITAL', 800, 5),
-- CULTURE
('😎 Emoji exclusivo en Slack', 'Tu meme favorito como emoji del equipo',     'CULTURE', 80,  NULL),
('🎵 Playlist Semanal',        'Tú eliges la playlist de la oficina 1 semana','CULTURE', 60,  NULL),
('🎁 Sorteo Mensual',          'Entrada al sorteo de fin de mes',             'CULTURE', 50,  NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. ÍNDICES de rendimiento
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pulse_mood_user_date ON pulse_mood_shots (user_id, day_date DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_mood_dept_date ON pulse_mood_shots (day_date DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_friction_dept ON pulse_team_friction (department, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_ledger_user ON pulse_point_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_alerts_dept ON pulse_alerts (department, triggered_at DESC) WHERE NOT resolved;

-- ============================================================
-- NOTAS DE PRIVACIDAD:
-- • pulse_mood_shots: RLS limita cada fila a su propietario
-- • get_team_pulse(): devuelve NULL en avg_mood si sample < 5
-- • pulse_team_friction: solo agrega a nivel dept, sin user_id
-- • Ningún manager puede ejecutar SELECT * FROM pulse_mood_shots
--   porque RLS solo permite auth.uid() = propio user_id
-- ============================================================
