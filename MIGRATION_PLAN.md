# Plan de Migración D1 → Supabase

## Estrategia

Dado que `src/worker/index.ts` tiene 6385 líneas de código con queries D1, la migración se hará en fases:

### Fase Actual (Fase 2): Core Empleado

**Endpoints críticos a actualizar:**

1. **Authentication & User Profile**
   - `GET /api/users/me` - Obtener usuario actual con perfil
   - `POST /api/users/profile` - Crear/actualizar perfil

2. **Dashboard**
   - `GET /api/dashboard/stats` - Estadísticas del dashboard

3. **Requests (Solicitudes)**
   - `GET /api/requests` - Obtener solicitudes del usuario
   - `POST /api/requests` - Crear nueva solicitud
   - `PUT /api/requests/:id/status` - Actualizar estado de solicitud

4. **Documents**
   - `GET /api/documents` - Obtener documentos públicos

5. **Loans**
   - `GET /api/loans` - Obtener préstamos del usuario
   - `GET /api/loans/:id/installments` - Cuotas de préstamo
   - `GET /api/loans/:id/payments` - Pagos de préstamo

6. **Evaluations**
   - `GET /api/evaluations` - Obtener evaluaciones del usuario

7. **Events**
   - `GET /api/events` - Obtener eventos corporativos

8. **Birthdays**
   - `GET /api/birthdays` - Obtener cumpleaños próximos

### Cambios necesarios

#### 1. Actualizar tipo Bindings ✅
```typescript
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  OPENAI_API_KEY: string;
  R2_BUCKET?: R2Bucket;
};
```

#### 2. Inicializar Supabase en el middleware
```typescript
app.use('*', async (c, next) => {
  // Initialize Supabase for this request
  c.env.supabase = initializeSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  await next();
});
```

#### 3. Reemplazar queries D1 con Supabase

**Patrón D1:**
```typescript
const result = await c.env.DB.prepare(
  "SELECT * FROM users WHERE mocha_user_id = ?"
).bind(mochaUser.id).first();
```

**Patrón Supabase:**
```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('mocha_user_id', mochaUser.id)
  .single();
```

## Tabla de Conversión

| D1 Método | Supabase Equivalente | Notas |
|-----------|---------------------|-------|
| `prepare(sql)` | `from(table)` | Cambia de SQL a query builder |
| `.bind(val)` | Inline en método (`.eq()`, `.in()`, etc.) | Los valores se pasan directamente |
| `.first()` | `.single()` | Retorna un objeto, no array |
| `.all()` | `.select()` (default) | Retorna array |
| `INSERT` | `.insert()` | Parecido pero retorna `data` |
| `UPDATE` | `.update().eq()` | Usa métodos de filtro |
| `DELETE` | `.delete().eq()` | Usa métodos de filtro |

## Orden de Implementación

1. ✅ Crear `postgres-schema.sql` con schema PostgreSQL
2. ✅ Crear `db.ts` con helpers
3. ✅ Crear `db-adapter.ts` como wrapper
4. 🔄 **Actualizar endpoints críticos (en progreso)**
   - Fase 2a: User profile endpoints
   - Fase 2b: Dashboard + stats
   - Fase 2c: Requests CRUD
   - Fase 2d: Documents, Loans, Evaluations

5. Actualizar endpoints HR (Fase 3+)
6. Testing completo
7. Deployment

## Configuración en Supabase

1. En Supabase dashboard, ir a SQL Editor
2. Ejecutar el contenido completo de `migrations/postgres-schema.sql`
3. Las variables de entorno se configuran en `wrangler.env.local`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

## Notas importantes

- **Timestamp**: PostgreSQL usa `CURRENT_TIMESTAMP` (igual que SQLite)
- **AUTOINCREMENT**: Usamos `SERIAL` o `BIGSERIAL` en PostgreSQL
- **Boolean**: Mismo tipo en ambos
- **JSON**: En Supabase usar `JSONB` para mejor performance
- **Foreign Keys**: Ya están configuradas en el schema
- **NULL vs NOT NULL**: Verificar constraints

## Testing local

```bash
# 1. Configurar variables de entorno
cp .env.local.example .env.local
# Editar con credenciales Supabase

# 2. Instalar dependencias
npm install

# 3. Ejecutar migrations en Supabase
# (Manual en dashboard o via CLI)

# 4. Correr en dev mode
npm run dev
wrangler dev --local

# 5. Probar endpoints
curl http://localhost:8787/api/users/me
```

## Rollback plan

Si algo falla:
1. Los datos SQLite están en backup (ZIP original)
2. Supabase permite reversiones
3. Cada migración tiene un `down.sql`

## Siguiente fase

Una vez completados estos endpoints, proceder con:
- Endpoints HR (admin)
- AI endpoints
- WhatsApp endpoints
- Backup & audit
