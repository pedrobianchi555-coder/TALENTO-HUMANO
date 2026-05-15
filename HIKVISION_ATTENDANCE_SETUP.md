# 🎯 Guía Rápida de Instalación - Sistema de Asistencia Hikvision

## ✅ QUÉ SE IMPLEMENTÓ

```
📊 Dashboard Completo
├── KPIs (Presentes, Tardanzas, Ausencias)
├── Gráficos (Línea y Pie)
├── Tabla de registros detallada
├── Filtros (Mes, Año, Departamento)
└── Exportar a CSV/PDF

🔌 Backend Endpoints
├── /api/attendance/employee/:id
├── /api/attendance/summary
├── /api/attendance/today
├── /api/reports/attendance (HR)
└── /api/attendance/manual (HR)

🤖 Agente Local
├── Extrae datos de Hikvision iVMS-4200
├── Sincroniza a Supabase cada 5 minutos
├── Calcula horas trabajadas automáticamente
└── Detección de tardanzas

💾 Base de Datos
├── attendance_records (registros completos)
├── attendance_monthly_summary (caché)
└── attendance_config (configuración)
```

---

## 🚀 INSTALACIÓN PASO A PASO

### PASO 1: Ejecutar Migración SQL en Supabase

1. **Ir a Supabase Dashboard:**
   - https://app.supabase.com
   - Selecciona tu proyecto
   - SQL Editor → New Query

2. **Copiar y ejecutar:**
   ```bash
   # Ir a:
   cat /home/user/TALENTO-HUMANO/migrations/011-attendance-system.sql
   
   # Copiar TODO el contenido y pegarlo en Supabase SQL Editor
   # Hacer click en "Run"
   ```

3. **Verificar:**
   ```sql
   SELECT * FROM attendance_records LIMIT 1;
   ```
   Debería no retornar errores

---

### PASO 2: Instalar y Configurar el Agente Local

**Requisitos previos:**
- Node.js 16+ instalado
- Acceso a red local donde está Hikvision
- Credenciales admin de Hikvision

**Instalación:**

```bash
# 1. Entrar a la carpeta
cd hikvision-sync-agent

# 2. Instalar dependencias
npm install

# 3. Crear archivo de configuración
cp .env.example .env

# 4. Editar .env con tus valores
# EN WINDOWS:
notepad .env
# EN LINUX/MAC:
nano .env
```

**Valores para .env:**

```ini
# Obtén esto del servidor Hikvision
HIKVISION_SERVER=http://192.168.1.100:8080
HIKVISION_USER=admin
HIKVISION_PASS=tu_password_hikvision

# Obtén esto de https://app.supabase.com → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Sincronización
SYNC_INTERVAL=*/5 * * * *
DAYS_TO_SYNC=1
```

**Probar funcionamiento:**

```bash
# Ejecutar manualmente
node agent.js

# Debería mostrar:
# ✅ Configuración válida
# 📡 Cliente Hikvision inicializado
# ✓ N empleados encontrados
# ✓ Empleado1 - 1 día(s)
# ✅ Sincronización completada
```

---

### PASO 3: Configurar Agente Como Servicio (Producción)

Elegir una opción según tu sistema:

#### OPCIÓN A: Windows + NSSM (Recomendado)

```batch
# 1. Descargar NSSM desde https://nssm.cc/download
# 2. Extraer a C:\nssm

# 3. Abrir PowerShell como Admin y ejecutar:
cd C:\nssm\win64

# 4. Instalar servicio
.\nssm install HikvisionSync "C:\Program Files\nodejs\node.exe" "C:\ruta\del\agente\agent.js"

# 5. Configurar directorio de trabajo
.\nssm set HikvisionSync AppDirectory "C:\ruta\del\agente"

# 6. Iniciar
.\nssm start HikvisionSync

# 7. Ver estado en Servicios de Windows
# O verificar con:
.\nssm status HikvisionSync
```

#### OPCIÓN B: Linux + systemd (Recomendado)

```bash
# 1. Crear archivo de servicio
sudo nano /etc/systemd/system/hikvision-sync.service
```

**Pegar esto (ajustar rutas):**
```ini
[Unit]
Description=Hikvision Attendance Sync Agent
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/home/user/hikvision-sync-agent
ExecStart=/usr/bin/node /home/user/hikvision-sync-agent/agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 2. Guardar (Ctrl+X, Y, Enter)

# 3. Recargar systemd
sudo systemctl daemon-reload

# 4. Habilitar al inicio
sudo systemctl enable hikvision-sync

# 5. Iniciar
sudo systemctl start hikvision-sync

# 6. Ver estado
sudo systemctl status hikvision-sync

# 7. Ver logs
journalctl -u hikvision-sync -f
```

#### OPCIÓN C: Linux/Mac + PM2

```bash
# 1. Instalar globalmente
npm install -g pm2

# 2. Iniciar agente
pm2 start agent.js --name "hikvision-sync"

# 3. Guardar configuración
pm2 save

# 4. Startup automático
pm2 startup

# 5. Ver logs
pm2 logs hikvision-sync
```

---

### PASO 4: Acceder al Dashboard

1. **URL:** `http://localhost:5173/attendance` (desarrollo)
2. **O en producción:** `https://tu-dominio.com/attendance`
3. **Se necesita:** Estar logueado como HR

---

## 📱 USO DEL DASHBOARD

### Vista Principal
- **KPIs:** Presentes, Tardanzas, Ausencias, Horas Promedio
- **Gráficos:** Tendencia (línea) y Distribución (pie)
- **Tabla:** Todos los registros con filtros

### Filtros
- **Mes:** Seleccionar mes
- **Año:** Cambiar año
- **Departamento:** Filtrar por área

### Exportar
- **CSV:** Descargar para Excel/Sheets
- **PDF:** Generar informe imprimible

### Reportes HR
**GET** `/api/reports/attendance?month=5&year=2024`

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8787/api/reports/attendance?month=5&year=2024
```

---

## 🔍 VERIFICACIÓN

### 1. Supabase
```sql
-- Ver registros sincronizados
SELECT COUNT(*) FROM attendance_records;

-- Ver últimas sincronizaciones
SELECT user_id, date, check_in, check_out, status 
FROM attendance_records
ORDER BY synced_at DESC LIMIT 10;

-- Ver resumen del mes
SELECT * FROM attendance_monthly_summary;
```

### 2. Agente Ejecutándose
```bash
# Ver si el proceso está activo

# Windows
tasklist | findstr node

# Linux
ps aux | grep agent.js

# Con PM2
pm2 list
```

### 3. Datos en el Dashboard
- Ir a `/attendance`
- Deberían verse empleados y registros
- Si no, ejecutar: `node agent.js` manualmente

---

## 🆘 PROBLEMAS COMUNES

### ❌ "No se puede conectar a Hikvision"

```bash
# Verificar IP
ping 192.168.1.100

# Verificar puerto
telnet 192.168.1.100 8080

# Probar con curl
curl -u admin:password http://192.168.1.100:8080/
```

**Solución:** Verificar IP/puerto correcto en iVMS-4200

### ❌ "Usuario CI no encontrado"

**Problema:** El CI en Hikvision no coincide con el de HR

**Solución:**
1. Ir a `/employees` en el HR app
2. Editar cada empleado
3. Verificar que el campo CI sea idéntico al de Hikvision
4. Guardar

### ❌ "Errores de Supabase"

```bash
# Verificar credenciales
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Probar conexión
curl -H "Authorization: Bearer $SUPABASE_KEY" \
  https://your-project.supabase.co/rest/v1/attendance_records
```

**Solución:** Obtener credenciales nuevas de Supabase Dashboard

### ⚠️ "Sin datos en el dashboard después de 5 min"

```bash
# Ejecutar manualmente
cd hikvision-sync-agent
node agent.js

# Ver logs
pm2 logs hikvision-sync
# O
journalctl -u hikvision-sync -f
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Para más detalles, ver:
- **ATTENDANCE_SYSTEM_GUIDE.md** - Guía técnica completa
- **migrations/011-attendance-system.sql** - Schema de BD
- **hikvision-sync-agent/agent.js** - Código del agente

---

## 🎯 SIGUIENTES PASOS

1. ✅ Ejecutar migración SQL
2. ✅ Instalar y configurar agente
3. ✅ Iniciar como servicio
4. ✅ Esperar 5 minutos para sincronización
5. ✅ Abrir dashboard en `/attendance`
6. ✅ Verificar datos

---

## 📞 SOPORTE RÁPIDO

**¿El agente no sincroniza?**
- Verificar `.env` con credenciales correctas
- Ejecutar manualmente: `node agent.js`
- Ver logs detallados

**¿No aparecen empleados?**
- Verificar que CIs coincidan
- Ejecutar: `SELECT COUNT(*) FROM users;`

**¿Dashboard vacío?**
- Esperar 5 minutos desde primera sincronización
- Ejecutar migración SQL nuevamente
- Limpiar caché del navegador

---

**Versión:** 1.0.0  
**Actualizado:** 2026-05-05
