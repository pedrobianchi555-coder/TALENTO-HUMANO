# 🚀 Sistema Integral de Gestión de Talento Humano

Una plataforma moderna y completa para la gestión integral del área de Recursos Humanos, diseñada para EMPLEADOS y ADMINISTRADORES.

## ✨ Características

### Para Empleados
- 📊 Dashboard personalizado con KPIs
- 👤 Perfil y datos personales
- 📝 Solicitudes (permisos, viáticos, licencias)
- 📄 Documentos compartidos
- 💰 Gestión de préstamos y cuotas
- ⭐ Evaluaciones de desempeño
- 🎉 Eventos corporativos
- 💬 Chat interno
- 🎂 Historial de cumpleaños

### Para Administración RRHH
- 👥 Gestión integral de empleados (CRUD)
- 🤖 Reclutamiento inteligente con análisis IA de CVs
- 📦 Gestión de activos y bienes
- 📋 Recibos de pago (payslips)
- ✅ Sistema de solicitudes y aprobaciones
- 📊 Reportes y analytics en PDF
- 🔐 Control granular de permisos y roles
- 📜 Log de auditoría completo
- 💬 Integración con WhatsApp
- 🔄 Backup automático

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| **Frontend** | React 19 + TypeScript + TailwindCSS |
| **Backend** | Hono (Cloudflare Workers) |
| **Base de datos** | PostgreSQL (Supabase) |
| **Autenticación** | Mocha Users Service (OAuth) |
| **IA** | OpenAI + Google Gemini |
| **Storage** | Supabase Storage / R2 Buckets |

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase (gratuita)

### Instalación

```bash
# Clonar y entrar al proyecto
git clone <repo-url>
cd TALENTO-HUMANO

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev        # Frontend
wrangler dev       # Backend (en otra terminal)
```

Para instrucciones detalladas, ver [SETUP.md](SETUP.md)

## 📁 Estructura del Proyecto

```
TALENTO-HUMANO/
├── src/
│   ├── react-app/          # Frontend
│   │   ├── pages/          # Páginas (Dashboard, Employees, etc.)
│   │   ├── components/     # Componentes reutilizables
│   │   └── hooks/          # Custom hooks
│   ├── worker/             # Backend API (Hono)
│   │   └── index.ts        # Rutas y lógica principal
│   └── shared/             # Código compartido
├── migrations/             # SQL migrations (31 en total)
├── SETUP.md               # Guía de instalación
├── ARCHITECTURE.md        # Arquitectura del proyecto
└── package.json           # Dependencias

```

## 🔧 Scripts disponibles

```bash
npm run dev           # Ejecutar frontend en dev
npm run dev:full      # Frontend + Backend (requiere concurrently)
npm run build         # Build para producción
npm run lint          # Verificar código
npm run check         # TypeScript + build check
```

## 🔐 Sistema de Autenticación

- **Mocha Users Service** con OAuth de Google
- Roles: `EMPLOYEE` y `HR`
- Sistema de permisos granular
- Session management automático

## 📊 Módulos Implementados

### Usuario
- [x] Home / Landing
- [x] Auth Callback
- [x] Dashboard
- [x] Perfil
- [x] Solicitudes
- [x] Documentos
- [x] Préstamos
- [x] Evaluaciones
- [x] Eventos
- [x] Chat
- [x] Quejas/Denuncias

### Administrador RRHH
- [x] Gestión de empleados
- [x] Reclutamiento
- [x] Activos
- [x] Recibos de pago
- [x] Dashboard de solicitudes
- [x] Permisos y roles
- [x] Log de auditoría
- [x] Backup
- [x] WhatsApp settings

## 🎯 Plan de Desarrollo

**Fase 1** ✅ Fundación
- [x] Setup inicial
- [x] Configuración Supabase
- [x] Documentación

**Fase 2** 🔄 Core Empleado
- Dashboard y perfil
- Solicitudes
- Documentos y préstamos

**Fase 3** Core RRHH
- Gestión de empleados
- Recibos de pago
- Activos

**Fase 4** Módulos avanzados
- Evaluaciones
- Reclutamiento + IA
- Reportes

**Fase 5** Operaciones
- Pulido y tests
- Deployment

Ver [ARCHITECTURE.md](ARCHITECTURE.md) para detalles completos.

## 📚 Documentación

- [SETUP.md](SETUP.md) - Guía de instalación y setup local
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitectura completa y guía de desarrollo
- [migrations/](migrations/) - Schema de base de datos

## 🤝 Contribuir

1. Crear rama: `git checkout -b feature/nombre-feature`
2. Hacer cambios y commit: `git commit -m "feat: descripción"`
3. Push: `git push -u origin feature/nombre-feature`
4. Pull Request a `claude/hr-management-app-GIWCq`

## 📝 Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `refactor:` Refactor sin cambios funcionales
- `docs:` Documentación
- `chore:` Tareas de mantenimiento

## 🔒 Seguridad

- CORS configurado por entorno
- Rate limiting (100 req/min)
- Validación con Zod
- Audit logging completo
- Encriptación en base de datos

---

**Hecho con ❤️ para optimizar la gestión de Talento Humano**

This project was built on top of [Mocha](https://getmocha.com) infrastructure.
