# Graph Report - .  (2026-05-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 467 nodes · 593 edges · 49 communities (39 shown, 10 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2499e040`
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

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 25 edges
2. `DatabaseAdapter` - 14 edges
3. `usePermissions()` - 13 edges
4. `formatDate()` - 11 edges
5. `openaiService` - 11 edges
6. `Main API Worker` - 10 edges
7. `GeminiService` - 8 edges
8. `WhatsAppService` - 8 edges
9. `Bindings` - 7 edges
10. `authMiddleware()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Main API Worker` --references--> `PostgreSQL Schema`  [INFERRED]
  src/worker/index.ts → migrations/postgres-schema.sql
- `Attendance System API` --conceptually_related_to--> `Hikvision Sync Agent`  [INFERRED]
  src/worker/index.ts → hikvision-sync-agent/agent.js
- `LoanDetailModal()` --calls--> `formatDate()`  [INFERRED]
  src/react-app/components/LoanDetailModal.tsx → src/shared/date-utils.ts
- `Request` --calls--> `getStatusText()`  [INFERRED]
  src/shared/types.ts → src/worker/index.ts
- `Chat()` --calls--> `usePermissions()`  [INFERRED]
  src/react-app/pages/Chat.tsx → src/react-app/hooks/usePermissions.ts

## Communities (49 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (127): actionType, allEvents, allowedExtensions, assetId, backupId, byCategory, byResolver, byType (+119 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (31): Recruitment API, Payslips API, AppLayout(), AppLayoutProps, ManagerOption, MenuItem, Sidebar(), SidebarProps (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (34): AssetHistoryEvent, Poll, EvaluationWithDetails, Asset, AssetAssignment, AssetCategory, AssetIncident, AssetMaintenance (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (20): BirthdayCard(), BirthdayCardProps, LoanDetailModal(), RegisterPaymentModalProps, UserProfileCard(), UserProfileCardProps, Assets(), AssetWithDetails (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (3): DatabaseAdapter, PreparedQuery, QueryResult

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (10): Chat(), GeminiConfig, GeminiService, ChatMessage, ChatOptions, createOpenAIService(), GenerateTextOptions, OpenAIConfig (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (12): uniqueDepts, alertId, caller, dateFrom, dateTo, days, dept, id (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (12): MochaUser, hrUserId, invalidPerms, targetUserId, usersWithParsedPermissions, validPermissions, db, dbHelpers (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (12): createWhatsAppService(), SendMessageParams, WhatsAppConfig, WhatsAppResponse, app, now, query, updateData (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.24
Nodes (12): sanitizeString(), validateCI(), validateDate(), validateEmail(), validateFloat(), validateInteger(), validateMoneyAmount(), validateMonth() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.26
Nodes (9): calculateAttendanceRecord(), DAYS_TO_SYNC, groupEventsByDate(), HIKVISION_CONFIG, HikvisionClient, main(), SUPABASE_CONFIG, syncAttendanceData() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.2
Nodes (5): MOODS, MoodScore, PulseFlow(), TREND_ICON, usePulseDashboard()

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (11): Assets Management API, Attendance System API, Chat & Messaging API, Loans & Repayment API, Reports & Analytics API, Hikvision Sync Agent, PostgreSQL Schema, Supabase Backend (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (4): Bindings, requirePermission(), hasPermission(), ROLE_PRESETS

### Community 14 - "Community 14"
Cohesion: 0.36
Nodes (6): AuditLog(), AuditLogEntry, AuditAction, AuditModule, createAuditContext(), logAudit()

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (5): BatchUploadResult, PayslipUploadModalProps, YEARS, currentYear, months

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (4): BackupOptions, createDatabaseBackup(), generateSQLBackup(), TableBackup

### Community 18 - "Community 18"
Cohesion: 0.6
Nodes (4): AuthUser, authMiddleware(), base64UrlDecode(), verifyJWT()

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (3): BroadcastData, BroadcastModal(), BroadcastModalProps

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (3): supabase, supabaseAnonKey, supabaseUrl

## Knowledge Gaps
- **236 isolated node(s):** `supabaseAdmin`, `Database`, `OpenAIConfig`, `GeminiConfig`, `WhatsAppConfig` (+231 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 1` to `Community 11`, `Community 3`, `Community 5`, `Community 14`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Why does `openaiService` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `Payslips API` connect `Community 1` to `Community 0`, `Community 12`, `Community 15`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `useAuth()` (e.g. with `Request` and `Complaint`) actually correct?**
  _`useAuth()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `usePermissions()` (e.g. with `Request` and `Complaint`) actually correct?**
  _`usePermissions()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `formatDate()` (e.g. with `WhatsAppPreferences.tsx` and `EvaluationDetailModal.tsx`) actually correct?**
  _`formatDate()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `supabaseAdmin`, `Database`, `OpenAIConfig` to the rest of the system?**
  _236 weakly-connected nodes found - possible documentation gaps or missing edges._