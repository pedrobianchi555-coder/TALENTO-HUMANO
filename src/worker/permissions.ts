import type { UserProfile } from "@/shared/types";

// Definición de permisos específicos por módulo
export const PERMISSIONS = {
  // Permisos de Empleados
  EMPLOYEE_VIEW: 'employee:view',
  EMPLOYEE_CREATE: 'employee:create', 
  EMPLOYEE_EDIT: 'employee:edit',
  EMPLOYEE_DELETE: 'employee:delete',
  EMPLOYEE_STATUS_CHANGE: 'employee:status_change',
  EMPLOYEE_IMPORT: 'employee:import',
  EMPLOYEE_AUDIT_LOG: 'employee:audit_log',
  
  // Permisos de Solicitudes
  REQUEST_VIEW_ALL: 'request:view_all',
  REQUEST_MANAGE_STATUS: 'request:manage_status',
  REQUEST_VIEW_REPORTS: 'request:view_reports',
  
  // Permisos de Chat
  CHAT_VIEW_ALL_CONVERSATIONS: 'chat:view_all_conversations',
  CHAT_SEND_BROADCAST: 'chat:send_broadcast',
  CHAT_INITIATE_EMPLOYEE_CHAT: 'chat:initiate_employee_chat',
  CHAT_SEND_TO_EMPLOYEE: 'chat:send_to_employee',
  
  // Permisos de Documentos
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_EDIT: 'document:edit',
  DOCUMENT_DELETE: 'document:delete',
  DOCUMENT_VIEW_ALL: 'document:view_all',
  
  // Permisos de Préstamos
  LOAN_VIEW_ALL: 'loan:view_all',
  LOAN_CREATE: 'loan:create',
  LOAN_EDIT: 'loan:edit',
  LOAN_DELETE: 'loan:delete',
  LOAN_REGISTER_PAYMENT: 'loan:register_payment',
  
  // Permisos de Evaluaciones
  EVALUATION_VIEW_ALL: 'evaluation:view_all',
  EVALUATION_MANAGE_CYCLES: 'evaluation:manage_cycles',
  EVALUATION_MANAGE_EMPLOYEE_EVALUATION: 'evaluation:manage_employee_evaluation',
  
  // Permisos de Quejas
  COMPLAINT_VIEW_ALL: 'complaint:view_all',
  COMPLAINT_MANAGE_STATUS: 'complaint:manage_status',
  
  // Permisos de Activos/Assets
  ASSET_VIEW_ALL: 'asset:view_all',
  ASSET_CREATE: 'asset:create',
  ASSET_EDIT: 'asset:edit',
  ASSET_DELETE: 'asset:delete',
  ASSET_ASSIGN: 'asset:assign',
  ASSET_MAINTENANCE: 'asset:maintenance',
  
  // Permisos de Eventos
  EVENT_CREATE: 'event:create',
  EVENT_EDIT: 'event:edit',
  EVENT_DELETE: 'event:delete',
  EVENT_VIEW_ALL: 'event:view_all',
  
  // Permisos de Recibos de Pago
  PAYSLIP_VIEW_ALL: 'payslip:view_all',
  PAYSLIP_UPLOAD: 'payslip:upload',
  PAYSLIP_DELETE: 'payslip:delete',
  
  // Permisos de WhatsApp
  WHATSAPP_SEND_NOTIFICATION: 'whatsapp:send_notification',
  WHATSAPP_SEND_BROADCAST: 'whatsapp:send_broadcast',
  WHATSAPP_VIEW_HISTORY: 'whatsapp:view_history',
  
  // Permiso de Administrador (acceso total)
  HR_ADMIN: 'hr:admin'
} as const;

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(userProfile: UserProfile | null, requiredPermission: string): boolean {
  if (!userProfile || userProfile.role !== 'HR') {
    return false; // Solo los usuarios HR pueden tener permisos granulares
  }

  try {
    const permissions = userProfile.hr_permissions ? JSON.parse(userProfile.hr_permissions) : [];
    
    // Si tiene permiso de administrador, tiene acceso a todo
    if (permissions.includes(PERMISSIONS.HR_ADMIN)) {
      return true;
    }
    
    // Verificar el permiso específico
    return permissions.includes(requiredPermission);
  } catch (e) {
    console.error("Error parsing HR permissions for user:", userProfile.id, e);
    return false; // Por seguridad, denegar si hay error al parsear
  }
}

/**
 * Verifica si un usuario tiene al menos uno de los permisos especificados
 */
export function hasAnyPermission(userProfile: UserProfile | null, requiredPermissions: string[]): boolean {
  if (!userProfile || userProfile.role !== 'HR') {
    return false;
  }

  try {
    const permissions = userProfile.hr_permissions ? JSON.parse(userProfile.hr_permissions) : [];
    
    // Si tiene permiso de administrador, tiene acceso a todo
    if (permissions.includes(PERMISSIONS.HR_ADMIN)) {
      return true;
    }
    
    // Verificar si tiene al menos uno de los permisos requeridos
    return requiredPermissions.some(permission => permissions.includes(permission));
  } catch (e) {
    console.error("Error parsing HR permissions for user:", userProfile.id, e);
    return false;
  }
}

/**
 * Obtiene todos los permisos de un usuario
 */
export function getUserPermissions(userProfile: UserProfile | null): string[] {
  if (!userProfile || userProfile.role !== 'HR') {
    return [];
  }

  try {
    return userProfile.hr_permissions ? JSON.parse(userProfile.hr_permissions) : [];
  } catch (e) {
    console.error("Error parsing HR permissions for user:", userProfile.id, e);
    return [];
  }
}

// Note: Middleware function moved to separate file to avoid circular dependencies

/**
 * Predefined permission sets for common roles
 */
export const ROLE_PRESETS = {
  HR_ADMIN: [PERMISSIONS.HR_ADMIN],
  
  HR_MANAGER: [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_EDIT,
    PERMISSIONS.EMPLOYEE_STATUS_CHANGE,
    PERMISSIONS.EMPLOYEE_IMPORT,
    PERMISSIONS.EMPLOYEE_AUDIT_LOG,
    PERMISSIONS.REQUEST_VIEW_ALL,
    PERMISSIONS.REQUEST_MANAGE_STATUS,
    PERMISSIONS.REQUEST_VIEW_REPORTS,
    PERMISSIONS.CHAT_VIEW_ALL_CONVERSATIONS,
    PERMISSIONS.CHAT_SEND_BROADCAST,
    PERMISSIONS.CHAT_INITIATE_EMPLOYEE_CHAT,
    PERMISSIONS.CHAT_SEND_TO_EMPLOYEE,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_EDIT,
    PERMISSIONS.LOAN_VIEW_ALL,
    PERMISSIONS.LOAN_CREATE,
    PERMISSIONS.LOAN_EDIT,
    PERMISSIONS.LOAN_REGISTER_PAYMENT,
    PERMISSIONS.EVALUATION_VIEW_ALL,
    PERMISSIONS.EVALUATION_MANAGE_CYCLES,
    PERMISSIONS.EVALUATION_MANAGE_EMPLOYEE_EVALUATION,
    PERMISSIONS.COMPLAINT_VIEW_ALL,
    PERMISSIONS.COMPLAINT_MANAGE_STATUS,
    PERMISSIONS.ASSET_VIEW_ALL,
    PERMISSIONS.ASSET_CREATE,
    PERMISSIONS.ASSET_EDIT,
    PERMISSIONS.ASSET_ASSIGN,
    PERMISSIONS.ASSET_MAINTENANCE,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_EDIT,
    PERMISSIONS.EVENT_VIEW_ALL,
    PERMISSIONS.PAYSLIP_VIEW_ALL,
    PERMISSIONS.PAYSLIP_UPLOAD,
    PERMISSIONS.WHATSAPP_SEND_NOTIFICATION,
    PERMISSIONS.WHATSAPP_SEND_BROADCAST,
    PERMISSIONS.WHATSAPP_VIEW_HISTORY
  ],
  
  HR_SPECIALIST: [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_EDIT,
    PERMISSIONS.EMPLOYEE_STATUS_CHANGE,
    PERMISSIONS.REQUEST_VIEW_ALL,
    PERMISSIONS.REQUEST_MANAGE_STATUS,
    PERMISSIONS.CHAT_INITIATE_EMPLOYEE_CHAT,
    PERMISSIONS.CHAT_SEND_TO_EMPLOYEE,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.LOAN_VIEW_ALL,
    PERMISSIONS.EVALUATION_VIEW_ALL,
    PERMISSIONS.COMPLAINT_VIEW_ALL,
    PERMISSIONS.COMPLAINT_MANAGE_STATUS,
    PERMISSIONS.ASSET_VIEW_ALL,
    PERMISSIONS.EVENT_VIEW_ALL,
    PERMISSIONS.PAYSLIP_VIEW_ALL,
    PERMISSIONS.WHATSAPP_VIEW_HISTORY
  ],
  
  HR_ASSISTANT: [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.REQUEST_VIEW_ALL,
    PERMISSIONS.CHAT_SEND_TO_EMPLOYEE,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.LOAN_VIEW_ALL,
    PERMISSIONS.EVALUATION_VIEW_ALL,
    PERMISSIONS.COMPLAINT_VIEW_ALL,
    PERMISSIONS.ASSET_VIEW_ALL,
    PERMISSIONS.EVENT_VIEW_ALL,
    PERMISSIONS.PAYSLIP_VIEW_ALL
  ],
  
  HR_RECRUITER: [
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_EDIT,
    PERMISSIONS.EMPLOYEE_IMPORT,
    PERMISSIONS.CHAT_SEND_TO_EMPLOYEE,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.EVALUATION_VIEW_ALL
  ]
} as const;
