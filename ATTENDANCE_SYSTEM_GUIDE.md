# 📊 Sistema de Asistencia - Guía Completa

## 📋 Tabla de Contenidos
1. [Arquitectura](#arquitectura)
2. [Instalación del Agente](#instalación-del-agente)
3. [Configuración Hikvision](#configuración-hikvision)
4. [API Endpoints](#api-endpoints)
5. [Dashboard](#dashboard)
6. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│  Hikvision      │
│  iVMS-4200      │
│  (LAN)          │
└────────┬────────┘
         │
         │ ISAPI HTTP
         ▼
┌─────────────────────────────────────┐
│ Agente Local (Node.js)              │
│ - Extrae eventos cada 5 minutos     │
│ - Procesa y calcula horas           │
│ - Sincroniza a Supabase             │
└────────┬────────────────────────────┘
         │
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│ Supabase (Cloud)                    │
│ - attendance_records (datos)        │
│ - attendance_monthly_summary (cache)│
└────────┬────────────────────────────┘
         │
         │
         ▼
┌─────────────────────────────────────┐
│ HR System (Cloudflare Workers)      │
│ /api/attendance/*                   │
│ /api/reports/attendance             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Frontend Dashboard (React)          │
│ Gráficos, Reportes, Filtros        │
└─────────────────────────────────────┘
```

---

## 🚀 Instalación del Agente

### Requisitos Previos

- **Node.js** 16+ (desde nodejs.org)
- **npm** o **yarn**
- Acceso a red local donde está Hikvision
- Credenciales admin de Hikvision
- Credenciales Supabase

### Paso 1: Preparar el Servidor Local

El agente debe correr en la red local (LAN) donde está el servidor Hikvision. Opciones:

**Opción A: En el mismo servidor Hikvision (recomendado)**
- Acceso directo, sin delays de red
- IP local: `http://localhost:8080` o `http://192.168.x.x:8080`

**Opción B: En otra máquina de la LAN**
- PC, servidor Windows, Raspberry Pi
- IP del servidor: `http://192.168.1.100:8080`

### Paso 2: Instalación

```bash
# 1. Copiar la carpeta del agente
cd hikvision-sync-agent

# 2. Instalar dependencias
npm install

# 3. Crear archivo de configuración
cp .env.example .env

# 4. Editar .env con tus credenciales
nano .env  # Linux/Mac
# o
notepad .env  # Windows
```

### Paso 3: Configurar Credenciales

**Archivo: `.env`**

```ini
# Hikvision
HIKVISION_SERVER=http://192.168.1.100:8080
HIKVISION_USER=admin
HIKVISION_PASS=tu_contraseña_hikvision

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Sincronización
SYNC_INTERVAL=*/5 * * * *  # Cada 5 minutos
DAYS_TO_SYNC=1              # Última 1 día
```

### Paso 4: Probar Conexión

```bash
# Ejecutar una sola vez (no programado)
node agent.js

# Debería mostrar:
# ✅ Configuración válida
# 📡 Cliente Hikvision inicializado
# ✓ N empleados encontrados
# ✓ Empleado1 - 1 día(s)
# ✅ Sincronización completada
```

### Paso 5: Instalar Como Servicio (Producción)

#### 🪟 Windows - Usar NSSM

```bash
# Descargar NSSM desde: https://nssm.cc/download
# O instalar con choco
choco install nssm

# Instalar servicio
nssm install HikvisionSync "C:\ruta\a\node.exe" "C:\ruta\a\agent.js"

# Configurar para iniciar automáticamente
nssm set HikvisionSync AppDirectory "C:\ruta\del\agente"

# Iniciar servicio
nssm start HikvisionSync

# Ver logs
nssm dump HikvisionSync

# Detener
nssm stop HikvisionSync

# Desinstalar
nssm remove HikvisionSync confirm
```

#### 🐧 Linux/Raspberry Pi - Usar PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar agente
pm2 start agent.js --name "hikvision-sync"

# Guardar configuración
pm2 save

# Hacer que inicie automáticamente
pm2 startup

# Ver logs
pm2 logs hikvision-sync

# Detener
pm2 stop hikvision-sync

# Reiniciar
pm2 restart hikvision-sync
```

#### 🐧 Linux - Usar systemd

```bash
# Crear archivo de servicio
sudo nano /etc/systemd/system/hikvision-sync.service
```

**Contenido:**
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
# Recargar systemd
sudo systemctl daemon-reload

# Habilitar al inicio
sudo systemctl enable hikvision-sync

# Iniciar servicio
sudo systemctl start hikvision-sync

# Ver estado
sudo systemctl status hikvision-sync

# Ver logs
journalctl -u hikvision-sync -f
```

---

## 🔌 Configuración Hikvision

### Obtener IP y Puerto

1. **En iVMS-4200:**
   - Abrir iVMS-4200
   - Ir a: View → Device Manager
   - Buscar tu NVR/DVR
   - Anotar IP y puerto (usualmente 8080 o 80)

2. **O usar el navegador:**
   - Ir a: `http://192.168.1.100:8080` (cambiar IP)
   - Login con admin
   - Comprobar que funciona

### Habilitar ISAPI (si es necesario)

1. **En iVMS-4200 o web:**
   - Maintenance → System Settings
   - Remote Service → Habilitado
   - Guardar cambios

### Probar Conexión Manual

```bash
# Test básico con curl
curl -u admin:password http://192.168.1.100:8080/ISAPI/AccessControl/UserInfo/Search?format=json

# Debería retornar JSON con empleados
```

---

## 📡 API Endpoints

### 1. Ver Asistencia Personal

**GET** `/api/attendance/employee/:id`

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8787/api/attendance/employee/123?days=30
```

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "date": "2024-05-05",
    "check_in": "2024-05-05T08:05:00Z",
    "check_out": "2024-05-05T17:30:00Z",
    "hours_worked": 9.42,
    "status": "PRESENT",
    "source": "HIKVISION"
  }
]
```

### 2. Resumen del Mes

**GET** `/api/attendance/summary`

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8787/api/attendance/summary
```

**Response:**
```json
{
  "total_days_worked": 20,
  "total_absences": 2,
  "total_lates": 3,
  "total_hours_worked": 160.5,
  "average_hours_per_day": 8.03
}
```

### 3. Asistencia de Hoy

**GET** `/api/attendance/today`

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8787/api/attendance/today
```

### 4. Reporte de Asistencia (HR only)

**GET** `/api/reports/attendance?month=5&year=2024&department=IT`

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8787/api/reports/attendance?month=5&year=2024
```

**Response:**
```json
{
  "records": [...],
  "stats": {
    "total_employees": 45,
    "presents": 42,
    "lates": 5,
    "absents": 3,
    "early_leaves": 2,
    "total_hours_worked": 336.0,
    "average_hours": 7.47
  }
}
```

### 5. Registrar Asistencia Manual (HR only)

**POST** `/api/attendance/manual`

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123,
    "date": "2024-05-05",
    "check_in": "2024-05-05T08:00:00Z",
    "check_out": "2024-05-05T17:00:00Z",
    "status": "PRESENT",
    "notes": "Registro manual"
  }' \
  http://localhost:8787/api/attendance/manual
```

---

## 📊 Dashboard

### Acceso

**URL:** `/dashboard/attendance` (una vez agregado a rutas)

### Funcionalidades

✅ **KPIs Principales**
- Total de empleados
- Presentes del día/mes
- Tardanzas
- Ausencias
- Promedio de horas trabajadas

✅ **Gráficos**
- Línea: Tendencia de asistencia (presente/tardanza/ausencia por día)
- Pie: Distribución de estados
- Barras: Por departamento

✅ **Filtros**
- Mes/Año
- Departamento
- Tipo de estado

✅ **Exportar**
- CSV para Excel/Sheets
- PDF para informes

✅ **Tabla de Registros**
- Empleado, Departamento, Fecha
- Check-in/out con hora exacta
- Horas trabajadas
- Estado (badge con color)

---

## 🔧 Troubleshooting

### ❌ "No se puede conectar a Hikvision"

```bash
# 1. Verificar IP del servidor
ping 192.168.1.100

# 2. Verificar puerto
telnet 192.168.1.100 8080

# 3. Probar credenciales
curl -u admin:password http://192.168.1.100:8080/

# 4. Verificar firewall
# - En Windows: Allow node.exe en firewall
# - En Linux: sudo ufw allow 8080
```

### ❌ "Usuario CI no encontrado en HR system"

La sincronización necesita que el CI del empleado en Hikvision coincida con el CI en el HR system.

**Solución:**
1. En HR Dashboard: Editar empleado
2. Verificar que el campo "CI" sea exacto
3. Debe coincidir con "cardNo" en Hikvision

### ❌ "Errores de Supabase"

```bash
# 1. Verificar credenciales
echo $SUPABASE_URL
echo $SUPABASE_KEY

# 2. Probar conexión
curl -H "Authorization: Bearer $SUPABASE_KEY" \
  https://your-project.supabase.co/rest/v1/attendance_records

# 3. Ver error exacto en logs
node agent.js
```

### ⚠️ "Sincronización lenta"

- Aumentar `DAYS_TO_SYNC` lentamente
- Reducir `SYNC_INTERVAL` si hay recursos
- Ejecutar en servidor dedicado, no en PC personal

### 📊 "No hay datos en el dashboard"

1. Esperar 5 minutos (intervalo de sync)
2. Ejecutar manualmente: `node agent.js`
3. Verificar logs en Supabase Dashboard
4. Comprobar que la migración SQL se ejecutó:
   ```sql
   SELECT COUNT(*) FROM attendance_records;
   ```

---

## 📈 Monitoreo

### Logs del Agente

**Ver logs en tiempo real:**
```bash
# Con PM2
pm2 logs hikvision-sync

# Con systemd
journalctl -u hikvision-sync -f

# Manual
node agent.js
```

### Supabase Dashboard

1. Ir a: https://app.supabase.com
2. Seleccionar tu proyecto
3. SQL Editor
4. Ejecutar:

```sql
-- Ver últimas sincronizaciones
SELECT user_id, DATE(date), COUNT(*) as records, MAX(synced_at)
FROM attendance_records
GROUP BY user_id, DATE(date)
ORDER BY MAX(synced_at) DESC
LIMIT 20;

-- Ver resumen por empleado
SELECT u.first_name, u.last_name, s.total_days_worked, s.total_absences, s.total_lates
FROM attendance_monthly_summary s
JOIN users u ON s.user_id = u.id
ORDER BY s.updated_at DESC;
```

---

## 📞 Soporte

### Preguntas Comunes

**P: ¿Puedo cambiar el intervalo de sincronización?**
R: Sí, edita `SYNC_INTERVAL` en `.env`. Ejemplos:
- `0 * * * *` = cada hora
- `0 0 * * *` = una vez al día

**P: ¿Qué pasa si cae el agente?**
R: Como servicio, se reinicia automáticamente. Verifica que sea iniciado al arrancar.

**P: ¿Cómo sincronizar datos históricos?**
R: Cambia `DAYS_TO_SYNC=60` y ejecuta `node agent.js` una vez. Luego vuelve a poner `DAYS_TO_SYNC=1`.

**P: ¿Es seguro almacenar contraseñas en .env?**
R: Es lo recomendado. Asegúrate de:
- No commitear `.env` a git
- Usar permisos restrictivos: `chmod 600 .env`
- En producción, usar variables de entorno del sistema

---

## ✅ Checklist de Instalación

- [ ] Node.js 16+ instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] `.env` configurado con credenciales
- [ ] Conexión a Hikvision probada
- [ ] Migración SQL ejecutada en Supabase
- [ ] Agente iniciado exitosamente
- [ ] Datos sincronizados en dashboard
- [ ] Agente configurado como servicio
- [ ] Logs monitoreados

---

*Documento actualizado: 2026-05-05*
*Versión: 1.0.0*
