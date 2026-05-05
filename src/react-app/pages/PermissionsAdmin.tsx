import { useAuth } from "@/react-app/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, Shield, Users, Settings, Crown, 
  User, Check, ChevronDown, ChevronUp,
  AlertCircle, UserPlus, UserMinus
} from "lucide-react";
import type { EnhancedUser } from "@/shared/types";
import ConfirmationModal from "@/react-app/components/ConfirmationModal";
import { useConfirmationModal } from "@/react-app/hooks/useConfirmationModal";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";

interface HRUser {
  id: number;
  mocha_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: number;
  mocha_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  position: string;
  created_at: string;
}

interface PermissionsConfig {
  permissions: Record<string, string>;
  rolePresets: Record<string, string[]>;
}

export default function PermissionsAdmin() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { can, isHR, loading: permissionsLoading } = usePermissions();
  const [hrUsers, setHrUsers] = useState<HRUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<PermissionsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [showEmployeesList, setShowEmployeesList] = useState(false);
  const [, setUser] = useState<EnhancedUser | null>(null);
  const { modalConfig, showAlert, showConfirm, closeModal, handleConfirm } = useConfirmationModal();

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserAndData = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);

          if (userData.profile?.role !== 'HR') {
            navigate("/dashboard");
            return;
          }
        }

        // Fetch permissions data
        const [usersResponse, configResponse, employeesResponse] = await Promise.all([
          fetch('/api/admin/hr-users'),
          fetch('/api/admin/permissions-config'),
          fetch('/api/admin/employees-list')
        ]);

        if (usersResponse.ok && configResponse.ok) {
          const usersData = await usersResponse.json();
          const configData = await configResponse.json();
          
          setHrUsers(usersData);
          setConfig(configData);
        }

        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          setEmployees(employeesData);
        }
      } catch (error) {
        console.error('Error fetching permissions data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndData();
  }, [authUser, navigate, can]);

  const updateUserPermissions = async (userId: number, permissions: string[]) => {
    try {
      setSaving(userId);
      
      const response = await fetch(`/api/admin/hr-users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setHrUsers(prev => prev.map(user => 
          user.id === userId ? updatedUser : user
        ));
        showAlert('Permisos Actualizados', 'Los permisos se actualizaron exitosamente', 'success');
      } else {
        showAlert('Error', 'Error al actualizar permisos', 'error');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      showAlert('Error', 'Error al actualizar permisos', 'error');
    } finally {
      setSaving(null);
    }
  };

  const applyPreset = async (userId: number, preset: string) => {
    try {
      setSaving(userId);
      
      const response = await fetch(`/api/admin/hr-users/${userId}/apply-preset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preset }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setHrUsers(prev => prev.map(user => 
          user.id === userId ? updatedUser : user
        ));
        showAlert('Preset Aplicado', 'El preset de rol se aplicó exitosamente', 'success');
      } else {
        showAlert('Error', 'Error al aplicar preset', 'error');
      }
    } catch (error) {
      console.error('Error applying preset:', error);
      showAlert('Error', 'Error al aplicar preset', 'error');
    } finally {
      setSaving(null);
    }
  };

  const togglePermission = (userId: number, permission: string) => {
    const user = hrUsers.find(u => u.id === userId);
    if (!user) return;

    const currentPermissions = user.permissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];

    updateUserPermissions(userId, newPermissions);
  };

  const promoteToHR = async (employeeId: number, preset?: string) => {
    try {
      setPromoting(employeeId);
      
      const response = await fetch(`/api/admin/promote-to-hr/${employeeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preset }),
      });

      if (response.ok) {
        const newHRUser = await response.json();
        
        // Add to HR users list
        setHrUsers(prev => [...prev, newHRUser]);
        
        // Remove from employees list
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        
        showAlert('Usuario Promovido', 'Usuario promovido a HR exitosamente', 'success');
      } else {
        const error = await response.json();
        showAlert('Error', error.error || 'Error al promover usuario', 'error');
      }
    } catch (error) {
      console.error('Error promoting to HR:', error);
      showAlert('Error', 'Error al promover usuario', 'error');
    } finally {
      setPromoting(null);
    }
  };

  const demoteFromHR = async (hrUserId: number) => {
    const hrUser = hrUsers.find(u => u.id === hrUserId);
    if (!hrUser) return;

    const performDemotion = async () => {
      try {
        setSaving(hrUserId);
      
      const response = await fetch(`/api/admin/demote-from-hr/${hrUserId}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Fetch updated lists
        const [usersResponse, employeesResponse] = await Promise.all([
          fetch('/api/admin/hr-users'),
          fetch('/api/admin/employees-list')
        ]);

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setHrUsers(usersData);
        }

        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          setEmployees(employeesData);
        }
        
        showAlert('Usuario Removido', 'Usuario removido del equipo HR exitosamente', 'success');
      } else {
        const error = await response.json();
        showAlert('Error', error.error || 'Error al remover acceso HR', 'error');
      }
    } catch (error) {
      console.error('Error demoting from HR:', error);
      showAlert('Error', 'Error al remover acceso HR', 'error');
    } finally {
      setSaving(null);
    }
    };
    
    showConfirm(
      'Remover Acceso HR',
      `¿Está seguro de que desea remover el acceso HR de ${hrUser.first_name} ${hrUser.last_name}? Perderá todos sus permisos HR.`,
      performDemotion,
      { type: 'warning', confirmButtonText: 'Remover', cancelButtonText: 'Cancelar' }
    );
  };

  const getPermissionCategory = (permission: string): string => {
    if (permission.startsWith('employee:')) return 'Empleados';
    if (permission.startsWith('request:')) return 'Solicitudes';
    if (permission.startsWith('chat:')) return 'Chat';
    if (permission.startsWith('document:')) return 'Documentos';
    if (permission.startsWith('loan:')) return 'Préstamos';
    if (permission.startsWith('evaluation:')) return 'Evaluaciones';
    if (permission.startsWith('complaint:')) return 'Quejas';
    if (permission.startsWith('asset:')) return 'Activos';
    if (permission.startsWith('event:')) return 'Eventos';
    if (permission === 'hr:admin') return 'Administración';
    return 'Otros';
  };

  const getPermissionLabel = (permission: string): string => {
    const labels: Record<string, string> = {
      'employee:view': 'Ver empleados',
      'employee:create': 'Crear empleados',
      'employee:edit': 'Editar empleados',
      'employee:delete': 'Eliminar empleados',
      'employee:status_change': 'Cambiar estado empleados',
      'employee:import': 'Importar empleados',
      'employee:audit_log': 'Ver auditoría empleados',
      'request:view_all': 'Ver todas las solicitudes',
      'request:manage_status': 'Gestionar solicitudes',
      'chat:view_all_conversations': 'Ver todas las conversaciones',
      'chat:send_broadcast': 'Enviar difusiones',
      'chat:initiate_employee_chat': 'Iniciar chats',
      'chat:send_to_employee': 'Enviar mensajes',
      'document:upload': 'Subir documentos',
      'document:edit': 'Editar documentos',
      'document:delete': 'Eliminar documentos',
      'document:view_all': 'Ver todos los documentos',
      'loan:view_all': 'Ver todos los préstamos',
      'loan:create': 'Crear préstamos',
      'loan:edit': 'Editar préstamos',
      'loan:delete': 'Eliminar préstamos',
      'loan:register_payment': 'Registrar pagos',
      'evaluation:view_all': 'Ver todas las evaluaciones',
      'evaluation:manage_cycles': 'Gestionar ciclos evaluación',
      'evaluation:manage_employee_evaluation': 'Evaluar empleados',
      'complaint:view_all': 'Ver todas las quejas',
      'complaint:manage_status': 'Gestionar quejas',
      'asset:view_all': 'Ver todos los activos',
      'asset:create': 'Crear activos',
      'asset:edit': 'Editar activos',
      'asset:delete': 'Eliminar activos',
      'asset:assign': 'Asignar activos',
      'asset:maintenance': 'Gestionar mantenimiento',
      'event:create': 'Crear eventos',
      'event:edit': 'Editar eventos',
      'event:delete': 'Eliminar eventos',
      'event:view_all': 'Ver todos los eventos',
      'hr:admin': 'Administrador HR (Acceso total)',
    };
    
    return labels[permission] || permission;
  };

  const getRoleIcon = (permissions: string[]) => {
    if (permissions.includes(PERMISSIONS.HR_ADMIN)) {
      return <Crown className="w-5 h-5 text-yellow-600" />;
    }
    return <User className="w-5 h-5 text-blue-600" />;
  };

  const getRoleBadge = (permissions: string[]) => {
    if (permissions.includes(PERMISSIONS.HR_ADMIN)) {
      return <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">Administrador</span>;
    }
    return <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">Especialista HR</span>;
  };

  const groupPermissionsByCategory = (permissions: Record<string, string>) => {
    const grouped: Record<string, Array<{ key: string; label: string }>> = {};
    
    Object.entries(permissions).forEach(([key, value]) => {
      const category = getPermissionCategory(value);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({ key, label: getPermissionLabel(value) });
    });
    
    return grouped;
  };

  if (isPending || loading || permissionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando administración de permisos...</p>
      </div>
    );
  }

  if (!isHR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-lg text-gray-900">Acceso denegado</p>
        <p className="text-gray-600">Solo usuarios HR pueden acceder a esta página.</p>
      </div>
    );
  }

  const groupedPermissions = config ? groupPermissionsByCategory(config.permissions) : {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
              <Shield className="w-8 h-8 mr-3 text-blue-600" />
              Gestión de Permisos
            </h1>
            <p className="text-gray-600">
              Administra los permisos y roles de los usuarios del equipo de RRHH
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Usuarios HR</p>
                <p className="text-2xl font-bold text-gray-900">{hrUsers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Crown className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hrUsers.filter(u => u.permissions.includes(PERMISSIONS.HR_ADMIN)).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Permisos Disponibles</p>
                <p className="text-2xl font-bold text-gray-900">
                  {config ? Object.keys(config.permissions).length : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add HR Users Section */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
          <button
            onClick={() => setShowEmployeesList(!showEmployeesList)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Agregar Nuevos Usuarios HR
                </h2>
                <p className="text-sm text-gray-500">
                  Promover empleados para que puedan gestionar recursos humanos
                </p>
              </div>
            </div>
            {showEmployeesList ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showEmployeesList && (
            <div className="border-t border-gray-200">
              {employees.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <div key={employee.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{employee.email}</p>
                        <p className="text-xs text-gray-500">
                          {employee.position} {employee.department ? `• ${employee.department}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {config && Object.keys(config.rolePresets).map((presetName) => (
                          <button
                            key={presetName}
                            onClick={() => promoteToHR(employee.id, presetName)}
                            disabled={promoting === employee.id}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {promoting === employee.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              `Promover como ${presetName.replace('_', ' ')}`
                            )}
                          </button>
                        ))}
                        <button
                          onClick={() => promoteToHR(employee.id)}
                          disabled={promoting === employee.id}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Promover sin permisos
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    No hay empleados disponibles para promover
                  </p>
                  <p className="text-xs text-gray-500">
                    Todos los empleados activos ya son usuarios HR
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HR Users List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Usuarios HR ({hrUsers.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {hrUsers.map((hrUser) => (
              <div key={hrUser.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getRoleIcon(hrUser.permissions)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {hrUser.first_name} {hrUser.last_name}
                        </h3>
                        {getRoleBadge(hrUser.permissions)}
                      </div>
                      <p className="text-sm text-gray-600">{hrUser.email}</p>
                      <p className="text-xs text-gray-500">
                        {hrUser.permissions.length} permiso(s) asignado(s)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {saving === hrUser.id && (
                      <div className="flex items-center text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm">Guardando...</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => demoteFromHR(hrUser.id)}
                      disabled={saving === hrUser.id}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Remover acceso HR"
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      Remover HR
                    </button>
                    
                    <button
                      onClick={() => setExpandedUser(expandedUser === hrUser.id ? null : hrUser.id)}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Gestionar Permisos
                      {expandedUser === hrUser.id ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Permissions Section */}
                {expandedUser === hrUser.id && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    {/* Role Presets */}
                    {config && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Aplicar Rol Predefinido:</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(config.rolePresets).map(([presetName, permissions]) => (
                            <button
                              key={presetName}
                              onClick={() => applyPreset(hrUser.id, presetName)}
                              disabled={saving === hrUser.id}
                              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {presetName.replace('_', ' ')}
                              <span className="ml-2 text-xs text-gray-500">
                                ({permissions.length} permisos)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Individual Permissions */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Permisos Individuales:</h4>
                      
                      {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                        <div key={category} className="mb-6">
                          <h5 className="text-sm font-medium text-gray-700 mb-3 bg-gray-50 px-3 py-2 rounded-md">
                            {category}
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categoryPermissions.map((permission) => {
                              const hasPermission = hrUser.permissions.includes(permission.key);
                              const isDisabled = saving === hrUser.id;
                              
                              return (
                                <label
                                  key={permission.key}
                                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    hasPermission 
                                      ? 'bg-green-50 border-green-200' 
                                      : 'bg-white border-gray-200 hover:bg-gray-50'
                                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={hasPermission}
                                    onChange={() => togglePermission(hrUser.id, permission.key)}
                                    disabled={isDisabled}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${hasPermission ? 'text-green-900' : 'text-gray-900'}`}>
                                      {permission.label}
                                    </p>
                                  </div>
                                  {hasPermission && (
                                    <Check className="w-4 h-4 text-green-600" />
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hrUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hay usuarios HR
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Los usuarios HR aparecerán aquí para gestionar sus permisos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm ? handleConfirm : undefined}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmButtonText={modalConfig.confirmButtonText}
        cancelButtonText={modalConfig.cancelButtonText}
        isLoading={modalConfig.isLoading}
      />
    </div>
  );
}
