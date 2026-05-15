import { useAuth } from "@/react-app/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, Users, Search,
  Upload, CheckCircle,
  Calendar, Phone, Mail, Building,
  AlertCircle, FileText, Activity, User
} from "lucide-react";
import type { UserProfile, EnhancedUser } from "@/shared/types";
import { formatDateShort } from "@/shared/date-utils";
import ImportEmployeesModal from "@/react-app/components/ImportEmployeesModal";
import EmployeeAssetHistoryModal from "@/react-app/components/EmployeeAssetHistoryModal";
import EmployeeEditModal from "@/react-app/components/EmployeeEditModal";
import EmployeeReportModal from "@/react-app/components/EmployeeReportModal";
import ConfirmationModal from "@/react-app/components/ConfirmationModal";
import { useConfirmationModal } from "@/react-app/hooks/useConfirmationModal";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";

export default function Employees() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { can, isHR, loading: permissionsLoading } = usePermissions();
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setUser] = useState<EnhancedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAssetHistoryModal, setShowAssetHistoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  
  // Confirmation modal
  const { modalConfig, showAlert, closeModal, handleConfirm } = useConfirmationModal();

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserAndEmployees = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
          
          // Check if user is HR
          if (userData.profile?.role !== 'HR') {
            navigate("/dashboard");
            return;
          }
        }

        // Get employees
        const employeesResponse = await fetch(`/api/employees?include_inactive=${showInactiveEmployees}`);
        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          setEmployees(employeesData);
          setFilteredEmployees(employeesData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndEmployees();
  }, [authUser, navigate, showInactiveEmployees]);

  useEffect(() => {
    let filtered = employees;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(employee => 
        `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.ci.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply company filter
    if (selectedCompany) {
      filtered = filtered.filter(employee => 
        employee.company_name === selectedCompany
      );
    }
    
    setFilteredEmployees(filtered);
  }, [searchTerm, employees, selectedCompany]);

  if (isPending || loading || permissionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando empleados...</p>
      </div>
    );
  }

  if (!isHR || !can(PERMISSIONS.EMPLOYEE_VIEW)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-lg text-gray-900">Acceso denegado</p>
        <p className="text-gray-600">No tienes permisos para gestionar empleados.</p>
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    return role === 'HR' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getPayrollColor = (payrollType: string | null) => {
    switch (payrollType) {
      case 'OPERARIO':
        return 'bg-orange-100 text-orange-800';
      case 'EMPLEADO':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIDENCIAL':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <Users className="w-8 h-8 mr-3 text-blue-600" />
                Gestión de Empleados
              </h1>
              <p className="text-gray-600">
                Administra el personal y sus datos en el sistema
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generar Reportes
              </button>
              {can(PERMISSIONS.EMPLOYEE_IMPORT) && (
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar CSV
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar empleados por nombre, email, CI, departamento o posición..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showInactiveEmployees}
                  onChange={(e) => setShowInactiveEmployees(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Mostrar empleados inactivos</span>
              </label>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(e => e.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Departamentos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(employees.filter(e => e.department).map(e => e.department)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Administradores HR</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(e => e.role === 'HR').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Filters */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedCompany(selectedCompany === 'Cacao San Jose, C.A.' ? null : 'Cacao San Jose, C.A.')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCompany === 'Cacao San Jose, C.A.'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Building className="w-4 h-4 inline mr-2" />
              Cacao San José
            </button>
            <button
              onClick={() => setSelectedCompany(selectedCompany === 'Hacienda San Jose, C.A.' ? null : 'Hacienda San Jose, C.A.')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCompany === 'Hacienda San Jose, C.A.'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Building className="w-4 h-4 inline mr-2" />
              Hacienda San José
            </button>
            <button
              onClick={() => setSelectedCompany(selectedCompany === 'Agropecuaria Santa Ana, C.A.' ? null : 'Agropecuaria Santa Ana, C.A.')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCompany === 'Agropecuaria Santa Ana, C.A.'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Building className="w-4 h-4 inline mr-2" />
              Agropecuaria Santa Ana
            </button>
          </div>
        </div>

        {/* Employees List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Lista de Empleados ({filteredEmployees.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(employee.role)}`}>
                            {employee.role === 'HR' ? 'RRHH' : 'Empleado'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(employee.status)}`}>
                            {employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                          {employee.payroll_type && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPayrollColor(employee.payroll_type)}`}>
                              {employee.payroll_type}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{employee.email}</span>
                          </div>
                          
                          {employee.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              <span>{employee.phone}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span>CI: {employee.ci}</span>
                          </div>
                          
                          {employee.department && (
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-2 text-gray-400" />
                              <span>{employee.department}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-3">
                          <span>Registrado: {formatDateShort(employee.created_at)}</span>
                          {employee.base_salary && (
                            <span>Salario Base: $ {employee.base_salary.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {can(PERMISSIONS.EMPLOYEE_EDIT) && (
                      <button 
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setShowEditModal(true);
                        }}
                        className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <User className="w-3 h-3 mr-1 inline" />
                        Editar
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowAssetHistoryModal(true);
                      }}
                      className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
                    >
                      <Activity className="w-3 h-3 mr-1 inline" />
                      Activos
                    </button>

                    {can(PERMISSIONS.EMPLOYEE_AUDIT_LOG) && (
                      <button 
                        onClick={() => {
                          showAlert('Función de Auditoría', 'La función de auditoría está disponible', 'info');
                        }}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Auditoría
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No se encontraron empleados' : 'No hay empleados registrados'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'Prueba con otros términos de búsqueda.'
                  : 'Los empleados aparecerán aquí cuando se registren en el sistema.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && can(PERMISSIONS.EMPLOYEE_IMPORT) && (
        <ImportEmployeesModal
          onClose={() => setShowImportModal(false)}
          onSuccess={async () => {
            const employeesResponse = await fetch(`/api/employees?include_inactive=${showInactiveEmployees}`);
            if (employeesResponse.ok) {
              const employeesData = await employeesResponse.json();
              setEmployees(employeesData);
              setFilteredEmployees(employeesData);
            }
          }}
        />
      )}

      {/* Edit Modal */}
      {selectedEmployee && showEditModal && can(PERMISSIONS.EMPLOYEE_EDIT) && (
        <EmployeeEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onSave={async () => {
            // Refresh employees list
            const employeesResponse = await fetch(`/api/employees?include_inactive=${showInactiveEmployees}`);
            if (employeesResponse.ok) {
              const employeesData = await employeesResponse.json();
              setEmployees(employeesData);
              setFilteredEmployees(employeesData);
            }
          }}
        />
      )}

      {/* Asset History Modal */}
      {selectedEmployee && (
        <EmployeeAssetHistoryModal
          isOpen={showAssetHistoryModal}
          onClose={() => {
            setShowAssetHistoryModal(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
        />
      )}

      {/* Report Modal */}
      <EmployeeReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

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
