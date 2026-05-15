/**
 * Sistema de auditoría extendido para registrar todas las operaciones sensibles
 */

export enum AuditModule {
  EMPLOYEE = 'EMPLOYEE',
  LOAN = 'LOAN',
  REQUEST = 'REQUEST',
  COMPLAINT = 'COMPLAINT',
  DOCUMENT = 'DOCUMENT',
  ASSET = 'ASSET',
  EVALUATION = 'EVALUATION',
  EVENT = 'EVENT',
  PAYSLIP = 'PAYSLIP',
  CANDIDATE = 'CANDIDATE',
  PERMISSION = 'PERMISSION',
  BACKUP = 'BACKUP',
  SESSION = 'SESSION'
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ASSIGN = 'ASSIGN',
  UNASSIGN = 'UNASSIGN',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  STATUS_CHANGE = 'STATUS_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT'
}

export interface AuditLogEntry {
  userId: number;
  userEmail: string;
  actionType: AuditAction;
  module: AuditModule;
  resourceType?: string;
  resourceId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra una entrada de auditoría en la base de datos
 */
export async function logAudit(db: D1Database, entry: AuditLogEntry): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO audit_log (
        user_id, user_email, action_type, module, resource_type, 
        resource_id, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      entry.userId,
      entry.userEmail,
      entry.actionType,
      entry.module,
      entry.resourceType || null,
      entry.resourceId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      entry.userAgent || null
    ).run();

    console.log('[AUDIT]', JSON.stringify({
      user: entry.userEmail,
      action: entry.actionType,
      module: entry.module,
      resource: entry.resourceId ? `${entry.resourceType}:${entry.resourceId}` : entry.resourceType,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error logging audit entry:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Crea un contexto de auditoría desde el request
 */
export function createAuditContext(c: any): Pick<AuditLogEntry, 'ipAddress' | 'userAgent'> {
  return {
    ipAddress: c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
               c.req.header('X-Real-IP') ||
               'unknown',
    userAgent: c.req.header('User-Agent') || 'unknown'
  };
}

/**
 * Helper para registrar auditoría de manera más simple
 */
export async function auditLog(
  db: D1Database,
  c: any,
  userId: number,
  userEmail: string,
  actionType: AuditAction,
  module: AuditModule,
  resourceType?: string,
  resourceId?: number,
  details?: Record<string, any>
): Promise<void> {
  const context = createAuditContext(c);
  
  await logAudit(db, {
    userId,
    userEmail,
    actionType,
    module,
    resourceType,
    resourceId,
    details,
    ...context
  });
}
