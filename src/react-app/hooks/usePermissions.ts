import { useState, useEffect } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import type { EnhancedUser } from "@/shared/types";

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
  
  // Permiso de Administrador (acceso total)
  HR_ADMIN: 'hr:admin'
} as const;

export interface UsePermissionsReturn {
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  isHR: boolean;
  isAdmin: boolean;
  userPermissions: string[];
  loading: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, isPending } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending) {
      const enhancedUser = user as EnhancedUser;
      if (enhancedUser?.profile?.hr_permissions) {
        try {
          const permissions = JSON.parse(enhancedUser.profile.hr_permissions);
          setUserPermissions(Array.isArray(permissions) ? permissions : []);
        } catch (e) {
          console.error("Error parsing HR permissions:", e);
          setUserPermissions([]);
        }
      } else {
        setUserPermissions([]);
      }
      setLoading(false);
    }
  }, [user, isPending]);

  const enhancedUser = user as EnhancedUser;
  const isHR = enhancedUser?.profile?.role === 'HR';
  const isAdmin = isHR && userPermissions.includes(PERMISSIONS.HR_ADMIN);

  const can = (permission: string): boolean => {
    if (!isHR) {
      return false; // Solo los usuarios HR pueden tener permisos granulares
    }

    if (isAdmin) {
      return true; // El administrador tiene acceso completo
    }

    return userPermissions.includes(permission);
  };

  const canAny = (permissions: string[]): boolean => {
    if (!isHR) {
      return false;
    }

    if (isAdmin) {
      return true;
    }

    return permissions.some(permission => userPermissions.includes(permission));
  };

  return {
    can,
    canAny,
    isHR,
    isAdmin,
    userPermissions,
    loading: loading || isPending
  };
}

export default usePermissions;
