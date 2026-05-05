# Arquitectura - Sistema de Gestión de Talento Humano

## Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TypeScript)            │
│              Vite | TailwindCSS | React Router               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    (HTTP REST API)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 Backend (Hono on Cloudflare Workers)         │
│                    src/worker/index.ts                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                     (SQL Queries)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│            Database (PostgreSQL via Supabase)                │
│                   Migrations in /migrations                  │
└─────────────────────────────────────────────────────────────┘

Auth: Mocha Users Service (OAuth con Google)
AI: OpenAI + Gemini APIs
Storage: Supabase Storage / R2 Buckets
```

## Estructura de Carpetas

### Frontend (`src/react-app/`)
- **pages/**: Páginas principales (rutas)
  - `Home.tsx` - Landing page pública
  - `Dashboard.tsx` - Dashboard del usuario
  - `Profile.tsx` - Perfil de usuario
  - `Employees.tsx` - Gestión de empleados (RRHH)
  - `Requests.tsx` - Solicitudes de empleados
  - Y más...

- **components/**: Componentes reutilizables
  - Modales (EditModal, FormModal, etc.)
  - Tarjetas (UserProfileCard, etc.)
  - Gestores (FamilyDependentsManager, etc.)

- **hooks/**: Custom React hooks
  - `usePermissions.ts` - Verificar permisos
  - `useConfirmationModal.ts` - Modal de confirmación
  - `useSessionTimeout.ts` - Timeout de sesión

### Backend (`src/worker/`)
- **index.ts**: Archivo principal con todas las rutas API
- **admin-endpoints.ts**: Endpoints administrativos
- **ai-endpoints.ts**: Endpoints de IA (análisis CVs, etc.)
- **whatsapp-endpoints.ts**: Integración WhatsApp
- **permissions.ts**: Sistema de permisos y roles
- **permission-middleware.ts**: Middleware de validación
- **audit-logger.ts**: Log de auditoría
- **backup-service.ts**: Servicio de backups
- **rate-limiter.ts**: Limitación de tasa (throttling)
- **security-logger.ts**: Logging de seguridad
- **validation.ts**: Validadores Zod

### Compartido (`src/shared/`)
- **types.ts**: Tipos de datos compartidos
- **date-utils.ts**: Utilidades de fechas
- **openai.ts**: Cliente OpenAI
- **gemini.ts**: Cliente Gemini
- **whatsapp.ts**: Utilidades WhatsApp
- **supabase-client.ts**: Cliente Supabase

### Base de datos (`/migrations/`)
- Migraciones SQL numeradas (1.sql, 2.sql, ..., 31.sql)
- Cada migración puede tener un archivo `down.sql` para reversiones

## Flujo de Autenticación

1. Usuario va a `/` (Home)
2. Click en "Login con Google" → Redirección a Mocha OAuth
3. Retorna a `/auth/callback` con token
4. `AuthCallback.tsx` almacena sesión y redirige a `/dashboard`
5. Middleware de autenticación verifica sesión en cada request
6. Roles (`EMPLOYEE` o `HR`) determinan qué ve cada usuario

## Sistema de Permisos

Basado en roles con granularidad:
- `EMPLOYEE`: Acceso a funcionalidades básicas (mis datos, solicitudes, documentos)
- `HR`: Acceso administrativo completo

Permisos adicionales pueden asignarse en `hr_permissions` JSON en `user_profiles`.

## Flujos principales por módulo

### Empleado

#### Mi Dashboard
- Vista de métricas personales
- Solicitudes pendientes
- Eventos próximos
- Cumpleaños del mes

#### Mis Solicitudes
- Crear nueva solicitud (permisos, viáticos, etc.)
- Ver estado de solicitudes
- Calificar servicio (1-5 estrellas)

#### Mi Préstamo
- Ver préstamos activos
- Cuotas y estado de pagos
- Proyección de pagos futuros

#### Mi Evaluación
- Autoevaluación durante ciclos
- Ver evaluación del gerente
- Historial de evaluaciones

### Administrador RRHH

#### Dashboard
- KPIs del departamento
- Solicitudes sin responder
- Empleados por vencer en documentación
- Activos sin asignar

#### Gestión de Empleados
- Crear/editar/inactivar empleados
- Importación masiva de Excel
- Historial de cambios (audit log)
- Asignar gerente/departamento

#### Reclutamiento
- Crear convocatoria
- Carga de CVs (análisis IA automático)
- Seguimiento de entrevistas
- Calificación de candidatos

#### Activos
- Inventario de bienes
- Asignación a empleados
- Mantenimiento y reparaciones
- Reportes de condición

#### Recibos de Pago
- Upload de payslips
- Notificación automática a empleados
- Descarga por período

## Seguridad

- **CORS**: Configurado por entorno
- **Rate Limiting**: 100 requests/minuto por IP
- **Audit Logging**: Todas las acciones de RRHH logged
- **Validación**: Zod schema en todos los inputs
- **Encryption**: Datos sensibles en Supabase con encriptación

## Variables de entorno

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
MOCHA_USERS_SERVICE_API_URL=
MOCHA_USERS_SERVICE_API_KEY=

# APIs Externas
OPENAI_API_KEY=
GEMINI_API_KEY=

# WhatsApp (Opcional)
WHATSAPP_BUSINESS_PHONE_ID=
WHATSAPP_API_TOKEN=

# App
APP_URL=http://localhost:5173
API_URL=http://localhost:8787
NODE_ENV=development
```

## Plan de Desarrollo Completo

### Fase 1: Fundación ✅ (EN PROGRESO)
- [x] Extraer código del ZIP
- [x] Configurar Supabase en lugar de D1
- [x] Setup local con variables de entorno
- [x] Estructura inicial del proyecto
- [ ] Verificar que compila sin errores
- [ ] Migrar esquema a Supabase
- [ ] Primer commit y push

### Fase 2: Core Empleado (Próxima)
- Dashboard con métricas personales
- Perfil de usuario con edición
- Solicitudes (CRUD)
- Documentos (visualización)
- Préstamos (visualización)
- Evaluaciones (visualización)

### Fase 3: Core RRHH
- Gestión de empleados (CRUD + importación)
- Recibos de pago
- Dashboard de solicitudes
- Respuesta a solicitudes
- Activos (CRUD + asignación)

### Fase 4: Módulos Avanzados
- Evaluaciones de desempeño
- Reclutamiento + IA
- Chat interno + encuestas
- Reportes PDF

### Fase 5: Operaciones
- Log de auditoría
- Backup management
- WhatsApp integration
- Polish y testing

## Naming Conventions

### React Components
```typescript
// PascalCase para componentes
export default function UserProfileCard() {}

// camelCase para funciones y hooks
function getUserData() {}
const useUserPermissions = () => {}
```

### Backend Routes
```typescript
// RESTful naming
POST   /api/employees              // Crear empleado
GET    /api/employees/:id          // Obtener empleado
PUT    /api/employees/:id          // Actualizar empleado
DELETE /api/employees/:id          // Eliminar empleado

GET    /api/requests/:id/status    // Obtener estado de solicitud
```

### Base de datos
```sql
-- snake_case para tablas y columnas
user_profiles
request_history
asset_assignments
```

## Testing (Por implementar)

- Unit tests: Jest + React Testing Library
- E2E tests: Playwright
- API testing: Thunder Client / Postman

## Deployment

1. **Staging**: Push a rama `staging`
2. **Production**: Push a rama `main`
3. **CI/CD**: GitHub Actions (por configurar)

## Recursos útiles

- [Supabase Docs](https://supabase.com/docs)
- [Hono Docs](https://hono.dev)
- [React Docs](https://react.dev)
- [TailwindCSS](https://tailwindcss.com)
- [Mocha Auth](https://getmocha.com)
