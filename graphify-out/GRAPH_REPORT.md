# Graph Report - TALENTO-HUMANO  (2026-05-14)

## Corpus Check
- 160 files · ~117,532 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1070 nodes · 1255 edges · 90 communities (66 shown, 24 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6b1caa77`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 31 edges
2. `usePermissions()` - 19 edges
3. `GeminiService` - 15 edges
4. `🎉 ESTADO FINAL DE SESIÓN - Sistema HR Integral` - 15 edges
5. `🔄 CONTINUATION SESSION - Phase 3 Migration Progress` - 15 edges
6. `🔄 CONTINUATION SESSION - Part 3 Migration Progress` - 14 edges
7. `DatabaseAdapter` - 14 edges
8. `formatDate()` - 13 edges
9. `🚀 Sistema Integral de Gestión de Talento Humano` - 13 edges
10. `Arquitectura - Sistema de Gestión de Talento Humano` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Main API Worker` --references--> `PostgreSQL Schema`  [INFERRED]
  src/worker/index.ts → migrations/postgres-schema.sql
- `Attendance System API` --conceptually_related_to--> `Hikvision Sync Agent`  [INFERRED]
  src/worker/index.ts → hikvision-sync-agent/agent.js
- `BackupManagement()` --calls--> `formatDate()`  [INFERRED]
  src/react-app/pages/BackupManagement.tsx → src/shared/date-utils.ts
- `WhatsAppPreferences()` --calls--> `formatDateShort()`  [INFERRED]
  src/react-app/components/WhatsAppPreferences.tsx → src/shared/date-utils.ts
- `Request` --calls--> `usePermissions()`  [INFERRED]
  src/shared/types.ts → src/react-app/hooks/usePermissions.ts

## Communities (90 total, 24 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (132): actionType, allEvents, allowedExtensions, assetId, authUser, backupId, byCategory, byResolver (+124 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (46): 🎓 APRENDIZAJES, Archivo Modificado (Principal), Archivos Documentación, Archivos Nuevos, 🏗️ ARQUITECTURA FINAL, 💾 BASE DE DATOS, 📁 CAMBIOS EN CÓDIGO, code:block1 (1. 480aea6 - Fase 1: Extracción y setup completo) (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (19): Chat(), Poll, ChatMessage, ChatOptions, GeminiConfig, GeminiService, GenerateTextOptions, ChatMessage (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (44): 1. Supabase, 2. Agente Ejecutándose, 3. Datos en el Dashboard, code:block1 (📊 Dashboard Completo), code:bash (# 2. Guardar (Ctrl+X, Y, Enter)), code:bash (# 1. Instalar globalmente), code:bash (curl -H "Authorization: Bearer TOKEN" \), code:sql (-- Ver registros sincronizados) (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (43): 1. Ver Asistencia Personal, 2. Resumen del Mes, 3. Asistencia de Hoy, 4. Reporte de Asistencia (HR only), 5. Registrar Asistencia Manual (HR only), Acceso, 📡 API Endpoints, 🏗️ Arquitectura (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (41): Activos, Administrador RRHH, Arquitectura - Sistema de Gestión de Talento Humano, Backend Routes, Backend (`src/worker/`), Base de datos, Base de datos (`/migrations/`), code:block1 (┌───────────────────────────────────────────────────────────) (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (27): AssetEditModal(), AssetEditModalProps, AssetWithDetails, BirthdayCard(), BirthdayCardProps, CandidateDetailModal(), CandidateDetailModalProps, EvaluationDetailModal() (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (34): Asset, AssetHistoryEvent, AssetHistoryModalProps, Asset, AssetAssignment, AssetCategory, AssetIncident, AssetMaintenance (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (30): 1. Clonar el repositorio y cambiar a la rama de desarrollo, 2. Instalar dependencias, 3. Configurar Supabase, 4. Configurar variables de entorno, 5. Ejecutar migraciones de base de datos, 6. Ejecutar en modo desarrollo, Características principales, code:bash (git clone <repo-url>) (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (30): API, 📁 Archivos Creados/Modificados, 🏗️ Arquitectura Implementada, Base de Datos, 🔄 Cambios Principales Realizados, code:block1 (Frontend (React 19)), code:block2 (Fase 1: Fundación), Código Backend (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (20): uniqueDepts, alertId, app, Bindings, caller, dateFrom, dateTo, days (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (23): Assets (Advanced) - 3 endpoints, Assets Management (14 endpoints), Audit & Documents (2 endpoints), Candidates & Recruitment (5 endpoints), Chat & Messaging - 5+ endpoints, code:block1 (Phase 3: Core HR Management), code:typescript (// Permission check), ✅ COMPLETED MIGRATIONS (Supabase) (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (22): Administrador RRHH, ✨ Características, code:bash (# Clonar y entrar al proyecto), code:block2 (TALENTO-HUMANO/), code:bash (npm run dev           # Ejecutar frontend en dev), 📝 Commits, 🤝 Contribuir, 📚 Documentación (+14 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (21): code:typescript (const { data, error } = await db), ✅ Completado, D1 Pattern, 🚀 Definición de Done para Phase 2, Documentación, 🔄 En Progreso, Endpoints Críticos para Phase 2, Endpoints HR (Fase 3+) (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (3): DatabaseAdapter, PreparedQuery, QueryResult

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (19): 1. Actualizar tipo Bindings ✅, 2. Inicializar Supabase en el middleware, 3. Reemplazar queries D1 con Supabase, Cambios necesarios, code:typescript (type Bindings = {), code:typescript (app.use('*', async (c, next) => {), code:typescript (const { data, error } = await supabase), code:block5 (SUPABASE_URL=https://your-project.supabase.co) (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (14): EmployeeEditModal(), EmployeeEditModalProps, ManagerOption, PERMISSIONS, usePermissions(), UsePermissionsReturn, Complaints(), ComplaintWithUser (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (17): MochaUser, app, authUser, Bindings, employeeId, hrUserId, invalidPerms, permissions (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (16): db, dbHelpers, now, query, updateData, app, authUser, Bindings (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (18): code:bash (# 1. Copiar la carpeta del agente), code:ini (# Hikvision), code:bash (# Ejecutar una sola vez (no programado)), code:bash (# Descargar NSSM desde: https://nssm.cc/download), code:bash (# Instalar PM2 globalmente), code:bash (# Crear archivo de servicio), code:ini ([Unit]), code:bash (# Recargar systemd) (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.16
Nodes (10): Recruitment API, ModalConfig, useConfirmationModal(), Employees(), Evaluations(), EvaluationWithDetails, ProfileSetup(), Recruitment() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (10): useAuth(), Birthdays(), Home(), ExtendedLoan, Loans(), Profile(), Requests(), RequestWithUser (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (11): Payslips API, BatchUploadResult, CURRENT_YEAR, MONTHS, PayslipUploadModalProps, YEARS, MONTHS, Payslip (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (12): sanitizeString(), validateCI(), validateDate(), validateEmail(), validateFloat(), validateInteger(), validateMoneyAmount(), validateMonth() (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.23
Nodes (9): calculateAttendanceRecord(), DAYS_TO_SYNC, groupEventsByDate(), HIKVISION_CONFIG, HikvisionClient, main(), SUPABASE_CONFIG, syncAttendanceData() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.2
Nodes (11): Assets Management API, Attendance System API, Chat & Messaging API, Loans & Repayment API, Reports & Analytics API, Hikvision Sync Agent, PostgreSQL Schema, Supabase Backend (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.2
Nodes (5): MOODS, MoodScore, PulseFlow(), TREND_ICON, usePulseDashboard()

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (11): Assets Management (12 endpoints), code:typescript (✅ GET /api/candidates           - List candidates with inter), code:typescript (✅ POST /api/interviews          - Create interview record), code:typescript (✅ GET /api/asset-categories     - List categories), code:typescript (✅ GET /api/employee-audit-log   - Filtered audit records), code:typescript (✅ GET /api/employees            - List employees), HR Core Operations (4 endpoints), Interviews (2 endpoints) (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.31
Nodes (8): AuditLog(), AuditLogEntry, AuditAction, auditLog(), AuditLogEntry, AuditModule, createAuditContext(), logAudit()

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (6): Bindings, Bindings, requirePermission(), hasPermission(), PERMISSIONS, ROLE_PRESETS

### Community 30 - "Community 30"
Cohesion: 0.2
Nodes (9): code:block11 (Phase 1: Foundation), code:block13 (Duration:           ~2-3 hours equivalent), code:typescript (// 1. Permission/Role Check), 🔄 CONTINUATION SESSION - Phase 3 Migration Progress, ✨ FINAL STATUS, 🏗️ MIGRATION PATTERNS STANDARDIZED, 📈 PHASE PROGRESS TRACKING, 🔐 SECURITY & QUALITY CHECKLIST (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.31
Nodes (6): Employee, NewConversationModalProps, Employee, HRUser, PermissionsAdmin(), PermissionsConfig

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (9): Batch Pattern, code:typescript (const { data, error } = await db), code:typescript (const { data, error } = await db), code:typescript (const { error } = await db), code:typescript (const { error } = await db), Insert Pattern, 📈 MIGRATION PATTERN CONSISTENCY, Query Pattern (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (8): Access Control, 📊 CODE METRICS, code:block16 (Files Modified:      1 (src/worker/index.ts)), 🔄 CONTINUATION SESSION - Part 3 Migration Progress, Error Handling, 🔗 REFERENCES, 🔐 SECURITY & QUALITY, ✨ SESSION SUMMARY

### Community 34 - "Community 34"
Cohesion: 0.38
Nodes (6): AuthUser, authMiddleware(), AuthUser, base64UrlDecode(), Bindings, verifyJWT()

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (7): Breakdown by Category, code:block5 (BEFORE this part:  70/87 endpoints (80%)), code:block6 (✅ Fully Migrated:        ~82 endpoints), code:block7 (Employees:         ✅ 5/5 (100%)), 📊 CUMULATIVE MIGRATION STATISTICS, Endpoints by Status, Overall Progress

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (7): Chat & Messaging (6 endpoints), code:typescript (✅ GET /api/payslips           - List payslips (role-based)), code:typescript (✅ GET /api/chat/conversations    - List conversations (role-), code:typescript (✅ GET /api/loans/detailed     - Detailed loans with payment ), Loans & Repayment (5 endpoints), ✅ NEWLY MIGRATED ENDPOINTS (PART 3), Payslips Management (4 endpoints)

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (7): Code Metrics, code:block10 (Reports:        ~14 endpoints (PDF/CSV exports, analytics)), code:block8 (Frontend Files:     No changes), code:block9 (Recruitment:     5/5    (100%) ✅), 📊 DETAILED STATISTICS, Endpoint Categories, Still Using D1 (Remaining Work)

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (7): code:block14 (Reports (6 endpoints):), code:block15 (Total Migrated This Session: 40 endpoints), code:block16 (1. ce2d0ce - Migrate main report endpoints to Supabase), Commits Added (Part 2), 🔄 CONTINUATION SESSION 2 - Additional Progress, New Endpoints Migrated (This Part), Updated Phase Completion

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (4): BackupOptions, createDatabaseBackup(), generateSQLBackup(), TableBackup

### Community 40 - "Community 40"
Cohesion: 0.6
Nodes (3): AppLayout(), AppLayoutProps, useSessionTimeout()

### Community 42 - "Community 42"
Cohesion: 0.4
Nodes (4): createWhatsAppService(), SendMessageParams, WhatsAppConfig, WhatsAppResponse

### Community 43 - "Community 43"
Cohesion: 0.4
Nodes (5): code:block8 (Evaluation Endpoints (~4 remaining)), code:block9 (Evaluation endpoints:  ~45 min (complex logic)), Estimated Remaining Time, High Priority (Still Using D1), 🎯 REMAINING WORK

### Community 44 - "Community 44"
Cohesion: 0.4
Nodes (5): code:block10 (✅ 31 tables complete), code:block11 (✅ Single query for related data (no N+1)), 💾 DATABASE & PERFORMANCE, Performance Patterns Applied, Schema Optimization Status

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (3): MenuItem, Sidebar(), SidebarProps

### Community 47 - "Community 47"
Cohesion: 0.83
Nodes (3): BroadcastData, BroadcastModal(), BroadcastModalProps

### Community 50 - "Community 50"
Cohesion: 0.83
Nodes (3): supabase, supabaseAnonKey, supabaseUrl

### Community 51 - "Community 51"
Cohesion: 0.5
Nodes (3): Database, supabaseAdmin, supabaseClient

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (4): Knowledge Gained, Patterns Proven, 🎓 TECHNICAL INSIGHTS, What Went Well

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (4): Chat Conversations, 🏗️ KEY IMPROVEMENTS BY ENDPOINT TYPE, Loans Management, Payslips Batch Upload

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (4): Final Steps, Immediate Priority (Session 4), 🚀 NEXT SESSION ROADMAP, Then Complete

### Community 55 - "Community 55"
Cohesion: 0.5
Nodes (4): code:block1 (1. 62d8f7a - Complete Payslips migration to Supabase (4 endp), Commits Completed This Part, 📈 SESSION ACHIEVEMENTS (PART 3), Total Progress This Part

### Community 56 - "Community 56"
Cohesion: 0.5
Nodes (4): ✅ Completed (Continuation Session), 🔄 In Progress, 🎯 PHASE 3 COMPLETION ROADMAP, 📋 Remaining

### Community 57 - "Community 57"
Cohesion: 0.5
Nodes (4): code:block12 (Tables:         31 (complete)), Current Schema Status, 💾 DATABASE OPTIMIZATION, Performance Improvements Made

### Community 58 - "Community 58"
Cohesion: 0.5
Nodes (4): For Production, 🎓 KEY LEARNINGS, Technical Insights, What Worked Well

### Community 59 - "Community 59"
Cohesion: 0.5
Nodes (4): code:block1 (1. e058961 - Migrate Phase 3: Recruitment + Assets (14 endpo), Commits Completed This Continuation, 📈 SESSION ACHIEVEMENTS, Total Progress

### Community 78 - "Community 78"
Cohesion: 0.67
Nodes (3): For Next Session (Recommended Order), 🚀 NEXT IMMEDIATE STEPS, Quick Wins Available

### Community 79 - "Community 79"
Cohesion: 0.67
Nodes (3): Created, 📝 DOCUMENTATION UPDATES, Updated

## Knowledge Gaps
- **553 isolated node(s):** `OpenAIConfig`, `GeminiConfig`, `ChatMessage`, `GenerateTextOptions`, `ChatOptions` (+548 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 21` to `Community 65`, `Community 2`, `Community 6`, `Community 40`, `Community 45`, `Community 46`, `Community 16`, `Community 20`, `Community 22`, `Community 26`, `Community 28`, `Community 31`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `openaiService` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `usePermissions()` connect `Community 16` to `Community 2`, `Community 46`, `Community 20`, `Community 21`, `Community 22`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `useAuth()` (e.g. with `Sidebar()` and `AppLayout()`) actually correct?**
  _`useAuth()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `usePermissions()` (e.g. with `EmployeeEditModal()` and `Sidebar()`) actually correct?**
  _`usePermissions()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `OpenAIConfig`, `GeminiConfig`, `ChatMessage` to the rest of the system?**
  _553 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._