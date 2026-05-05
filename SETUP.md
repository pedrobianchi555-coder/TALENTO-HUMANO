# Setup - Sistema de Gestión de Talento Humano

## Requisitos previos

- Node.js 18+ y npm
- Git
- Cuenta de Supabase (gratuita en https://supabase.com)

## Pasos de instalación

### 1. Clonar el repositorio y cambiar a la rama de desarrollo

```bash
git clone <repo-url>
cd TALENTO-HUMANO
git checkout claude/hr-management-app-GIWCq
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

#### Opción A: Usar Supabase Cloud (Recomendado para desarrollo)

1. Ve a https://app.supabase.com y crea un nuevo proyecto
2. Ve a Project Settings > API Keys
3. Copia `Project URL` y `anon key` (clave pública)
4. Para desarrollo local también necesitarás el `service_role key` (clave privada)

#### Opción B: Supabase Local (Docker)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar Supabase local
supabase init
supabase start
```

### 4. Configurar variables de entorno

Copia el archivo de ejemplo y actualiza con tus credenciales:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con:
- `SUPABASE_URL`: Tu URL de Supabase
- `SUPABASE_ANON_KEY`: Tu clave anónima
- `SUPABASE_SERVICE_ROLE_KEY`: Tu clave de role de servicio

Ejemplo:
```env
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
MOCHA_USERS_SERVICE_API_KEY=your-key
OPENAI_API_KEY=sk-...
APP_URL=http://localhost:5173
API_URL=http://localhost:8787
NODE_ENV=development
```

### 5. Ejecutar migraciones de base de datos

Las migraciones están en `/migrations`. Para Supabase:

```bash
# Opción 1: Usar Supabase CLI (recomendado)
supabase db pull  # Para traer el estado actual
supabase db push  # Para aplicar migraciones locales

# Opción 2: Ejecutar migraciones manualmente en Supabase SQL Editor
# Ve a SQL Editor en Supabase y ejecuta los archivos en migrations/ en orden
```

### 6. Ejecutar en modo desarrollo

```bash
# Solo frontend (Vite)
npm run dev

# Frontend + Backend Hono (en otra terminal)
wrangler dev --local --port 8787

# O ambos en paralelo (requiere concurrently)
npm run dev:full
```

El app estará disponible en:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8787

## Estructura del proyecto

```
├── src/
│   ├── react-app/          # Frontend React + TypeScript
│   │   ├── pages/          # Páginas principales
│   │   ├── components/     # Componentes reutilizables
│   │   └── hooks/          # Custom React hooks
│   ├── worker/             # Backend Hono + Cloudflare
│   │   ├── index.ts        # API principal
│   │   ├── admin-endpoints.ts
│   │   ├── ai-endpoints.ts
│   │   └── ...
│   └── shared/             # Código compartido frontend/backend
│       ├── types.ts        # Tipos de datos
│       ├── date-utils.ts
│       ├── openai.ts
│       └── supabase-client.ts
├── migrations/             # SQL migrations para PostgreSQL
├── wrangler.json           # Configuración de Cloudflare Workers
├── vite.config.ts          # Configuración de Vite
├── tsconfig.json           # Configuración de TypeScript
└── package.json            # Dependencias del proyecto
```

## Características principales

### Para Empleados
- Dashboard personalizado
- Perfil y datos personales
- Solicitudes (permisos, viáticos, etc.)
- Documentos compartidos
- Préstamos y cuotas
- Evaluaciones de desempeño
- Eventos corporativos
- Chat interno
- Historial de cumpleaños

### Para Administración de RRHH
- Gestión integral de empleados
- Reclutamiento con análisis IA de CVs
- Gestión de activos/bienes
- Recibos de pago (payslips)
- Evaluaciones de desempeño
- Reportes y analytics
- Control de permisos y roles
- Log de auditoría
- Gestión de respuestas a solicitudes
- Integración con WhatsApp

## Flujo de desarrollo

1. **Crear rama de feature**: `git checkout -b feature/nombre-feature`
2. **Hacer cambios**: Editar archivos en `src/`
3. **Commit**: `git commit -m "tipo: descripción"`
4. **Push**: `git push -u origin feature/nombre-feature`
5. **Pull Request**: Crear PR a `claude/hr-management-app-GIWCq`

## Tipos de commits

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `refactor:` Cambios en código sin alterar funcionalidad
- `docs:` Cambios en documentación
- `test:` Agregar o actualizar tests
- `chore:` Tareas de mantenimiento

## Troubleshooting

### Error: "SUPABASE_URL is missing"
Verifica que `.env.local` existe y tiene `SUPABASE_URL` configurado.

### Error: "auth/callback" no funciona
Asegúrate de que tienes los valores correctos de Mocha en `.env.local`.

### Puerto 8787 en uso
Usa `wrangler dev --port 9999` para usar otro puerto.

## Siguiente paso

Una vez que todo esté funcionando, dirígete a los módulos de **Fase 1** documentados en ARCHITECTURE.md para comenzar a codificar.
