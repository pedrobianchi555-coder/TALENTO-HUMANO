# Ejecutar Migrations en Supabase

## 🚀 Opción 1: SQL Editor (Recomendado - Rápido)

1. **Abre Supabase Dashboard:**
   - https://app.supabase.com
   - Selecciona tu proyecto: `rykdfqtfesfpeesvtval`

2. **Ve a SQL Editor:**
   - Click en **SQL Editor** en la izquierda
   - Click en **New Query**

3. **Copia y pega el contenido de cada archivo migration en orden:**
   ```
   migrations/011-attendance-system.sql
   migrations/012-pulse-and-flow.sql
   migrations/013-notifications.sql
   ```

4. **Ejecuta cada uno:**
   - Selecciona el código
   - Click en **Run** (o Ctrl+Enter)
   - Espera a que termine

---

## ✅ Verificar que funcionó

En SQL Editor, corre:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deberías ver las tablas:
- `attendance_records`
- `attendance_monthly_summary`
- `attendance_config`
- `pulse_mood_shots`
- `pulse_team_friction`
- `pulse_point_ledger`
- `pulse_rewards`
- `pulse_redemptions`
- `pulse_alerts`
- `notifications`

---

## 📱 Probar la App

Una vez que las migrations están ejecutadas:

1. **Abre en el browser:**
   ```
   http://localhost:5175
   ```

2. **Click en "Iniciar Sesión"**
   - Se abre Google OAuth
   - Inicia sesión con tu cuenta Google

3. **Completa el perfil** si es la primera vez

4. **Navega a las nuevas features:**
   - **Notificaciones** → Bell en la esquina superior derecha
   - **Asistencia** → En el Sidebar (Employees → Asistencia)
   - **Pulse & Flow** → En el Sidebar (Pulse & Flow)

---

## 🐛 Troubleshooting

**"Error: relation 'notifications' does not exist"**
- Significa que la migration 013 no se ejecutó
- Copia y pega el contenido de `migrations/013-notifications.sql` en SQL Editor y ejecuta

**"No veo el bell de notificaciones"**
- Recarga el página (F5)
- Verifica la consola del browser (F12 → Console) para errors

**"Las notificaciones no llegan en tiempo real"**
- Asegúrate que Realtime está habilitado en Supabase:
  - Settings → Realtime → Habilitado
  - Table: `notifications` → ON

---

## 📝 Contenido de las Migrations

### 011-attendance-system.sql
- `attendance_records` — registros diarios de asistencia
- `attendance_monthly_summary` — caché de reportes mensuales
- `attendance_config` — horarios y configuración
- Trigger automático para actualizar resumen mensual

### 012-pulse-and-flow.sql
- `pulse_mood_shots` — registros de estado de ánimo
- `pulse_team_friction` — datos de fricción departamental
- `pulse_point_ledger` — balance de Flow Coins
- `pulse_rewards` — catálogo de recompensas
- `pulse_redemptions` — historial de canjes
- `pulse_alerts` — alertas de bienestar del equipo

### 013-notifications.sql
- `notifications` — notificaciones in-app con RLS
- Realtime publication habilitada
- Políticas de seguridad (cada usuario solo ve sus notificaciones)

---

## 🔄 Si necesitas resetear todo

```sql
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS pulse_alerts CASCADE;
DROP TABLE IF EXISTS pulse_redemptions CASCADE;
DROP TABLE IF EXISTS pulse_rewards CASCADE;
DROP TABLE IF EXISTS pulse_point_ledger CASCADE;
DROP TABLE IF EXISTS pulse_team_friction CASCADE;
DROP TABLE IF EXISTS pulse_mood_shots CASCADE;
DROP TABLE IF EXISTS attendance_config CASCADE;
DROP TABLE IF EXISTS attendance_monthly_summary CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
```

Luego vuelve a ejecutar las migrations desde cero.
