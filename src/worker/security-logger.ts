/**
 * Security event logging utility
 * Logs security-relevant events for monitoring and audit
 */

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  SENSITIVE_OPERATION = 'SENSITIVE_OPERATION',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  DATA_EXPORT = 'DATA_EXPORT',
  BULK_OPERATION = 'BULK_OPERATION'
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string | number;
  userEmail?: string;
  ipAddress?: string;
  endpoint: string;
  details?: Record<string, any>;
  timestamp?: string;
}

/**
 * Log a security event
 * In production, this should send to a centralized logging service
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    severity: getSeverity(event.type)
  };
  
  // Log to console (in production, send to logging service like Datadog, Sentry, etc.)
  if (logEntry.severity === 'high' || logEntry.severity === 'critical') {
    console.error('[SECURITY]', JSON.stringify(logEntry));
  } else if (logEntry.severity === 'medium') {
    console.warn('[SECURITY]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY]', JSON.stringify(logEntry));
  }
}

function getSeverity(type: SecurityEventType): 'low' | 'medium' | 'high' | 'critical' {
  switch (type) {
    case SecurityEventType.LOGIN_FAILURE:
    case SecurityEventType.UNAUTHORIZED_ACCESS:
    case SecurityEventType.PERMISSION_DENIED:
      return 'high';
    
    case SecurityEventType.PERMISSION_CHANGED:
    case SecurityEventType.USER_ROLE_CHANGED:
    case SecurityEventType.DATA_EXPORT:
      return 'critical';
    
    case SecurityEventType.RATE_LIMIT_EXCEEDED:
    case SecurityEventType.INVALID_INPUT:
    case SecurityEventType.BULK_OPERATION:
      return 'medium';
    
    case SecurityEventType.LOGIN_SUCCESS:
    case SecurityEventType.SENSITIVE_OPERATION:
    default:
      return 'low';
  }
}

/**
 * Create a security context from request
 */
export function createSecurityContext(c: any): Pick<SecurityEvent, 'ipAddress' | 'endpoint'> {
  return {
    ipAddress: c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
               c.req.header('X-Real-IP') ||
               'unknown',
    endpoint: c.req.path
  };
}
