import { useAuth } from "@/react-app/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, Users, FileText, Calendar, 
  ClipboardList, UserPlus, CreditCard, BarChart, 
  AlertCircle, Package, Receipt
} from "lucide-react";
import type { EnhancedUser } from "@/shared/types";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";

interface DashboardStats {
  // HR Stats
  activeEmployees?: number;
  candidatesInProcess?: number;
  pendingRequests?: number;
  activeLoans?: number;
  pendingEvaluations?: number;
  upcomingEvents?: number;
  pendingComplaints?: number;
  assignedAssets?: number;
  
  currentMonthPayslips?: number;
  
  // Employee Stats
  myPendingRequests?: number;
  myActiveLoans?: number;
  myPendingEvaluations?: number;
  myAssignedAssets?: number;
  myPendingComplaints?: number;
  myPayslipsThisYear?: number;
  
}

export default function Dashboard() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { can, isHR } = usePermissions();
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({});
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return;

      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          if (!userData.profile) {
            navigate("/profile-setup");
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUser, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!authUser) return;

      try {
        const response = await fetch("/api/dashboard/stats");
        if (response.ok) {
          const statsData = await response.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [authUser]);

  if (isPending || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando dashboard...</p>
      </div>
    );
  }

  if (!user?.profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Hola, {user.profile.first_name}!
            </h1>
            <p className="text-lg text-gray-600">
              {isHR 
                ? "Gestiona los recursos humanos de la empresa desde tu panel de control."
                : "Bienvenido a tu portal de autoservicio de recursos humanos."
              }
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Key Metrics Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Estadísticas Clave</h2>
            
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Cargando estadísticas...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isHR ? (
                  <>
                    {/* HR Metrics */}
                    <button
                      onClick={() => navigate("/employees")}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Users className="w-8 h-8 text-blue-600" />
                        <span className="text-3xl font-bold text-blue-600">{stats.activeEmployees || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Empleados Activos</h3>
                      <p className="text-sm text-gray-600 mt-1">Total en la empresa</p>
                    </button>

                    <button
                      onClick={() => navigate("/recruitment")}
                      className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm border border-purple-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <UserPlus className="w-8 h-8 text-purple-600" />
                        <span className="text-3xl font-bold text-purple-600">{stats.candidatesInProcess || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Candidatos en Proceso</h3>
                      <p className="text-sm text-gray-600 mt-1">En reclutamiento</p>
                    </button>

                    {can(PERMISSIONS.REQUEST_VIEW_ALL) && (
                      <button
                        onClick={() => navigate("/requests")}
                        className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <ClipboardList className="w-8 h-8 text-green-600" />
                          <span className="text-3xl font-bold text-green-600">{stats.pendingRequests || 0}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">Solicitudes Pendientes</h3>
                        <p className="text-sm text-gray-600 mt-1">Requieren revisión</p>
                      </button>
                    )}

                    {can(PERMISSIONS.LOAN_VIEW_ALL) && (
                      <button
                        onClick={() => navigate("/loans")}
                        className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-sm border border-yellow-200 hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <CreditCard className="w-8 h-8 text-yellow-600" />
                          <span className="text-3xl font-bold text-yellow-600">{stats.activeLoans || 0}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">Préstamos Activos</h3>
                        <p className="text-sm text-gray-600 mt-1">En proceso de pago</p>
                      </button>
                    )}

                    {can(PERMISSIONS.EVALUATION_VIEW_ALL) && (
                      <button
                        onClick={() => navigate("/evaluations")}
                        className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-sm border border-indigo-200 hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <BarChart className="w-8 h-8 text-indigo-600" />
                          <span className="text-3xl font-bold text-indigo-600">{stats.pendingEvaluations || 0}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Evaluaciones Pendientes</h3>
                        <p className="text-sm text-gray-600 mt-1">Por completar</p>
                      </button>
                    )}

                    <button
                      onClick={() => navigate("/events")}
                      className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl shadow-sm border border-pink-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Calendar className="w-8 h-8 text-pink-600" />
                        <span className="text-3xl font-bold text-pink-600">{stats.upcomingEvents || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">Eventos Próximos</h3>
                      <p className="text-sm text-gray-600 mt-1">En el calendario</p>
                    </button>

                    {can(PERMISSIONS.COMPLAINT_VIEW_ALL) && (
                      <button
                        onClick={() => navigate("/complaints")}
                        className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <AlertCircle className="w-8 h-8 text-red-600" />
                          <span className="text-3xl font-bold text-red-600">{stats.pendingComplaints || 0}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">Quejas Pendientes</h3>
                        <p className="text-sm text-gray-600 mt-1">Requieren atención</p>
                      </button>
                    )}

                    {can(PERMISSIONS.ASSET_VIEW_ALL) && (
                      <button
                        onClick={() => navigate("/assets")}
                        className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl shadow-sm border border-teal-200 hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Package className="w-8 h-8 text-teal-600" />
                          <span className="text-3xl font-bold text-teal-600">{stats.assignedAssets || 0}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">Activos Asignados</h3>
                        <p className="text-sm text-gray-600 mt-1">En uso actual</p>
                      </button>
                    )}

                    

                    {can(PERMISSIONS.PAYSLIP_VIEW_ALL) && (
                      <button
                        onClick={() => navigate("/payslips")}
                        className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-sm border border-orange-200 hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Receipt className="w-8 h-8 text-orange-600" />
                          <span className="text-3xl font-bold text-orange-600">{stats.currentMonthPayslips || 0}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Recibos Mes Actual</h3>
                        <p className="text-sm text-gray-600 mt-1">Procesados</p>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Employee Metrics */}
                    <button
                      onClick={() => navigate("/requests")}
                      className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <ClipboardList className="w-8 h-8 text-green-600" />
                        <span className="text-3xl font-bold text-green-600">{stats.myPendingRequests || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">Mis Solicitudes Pendientes</h3>
                      <p className="text-sm text-gray-600 mt-1">En revisión</p>
                    </button>

                    <button
                      onClick={() => navigate("/loans")}
                      className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-sm border border-yellow-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <CreditCard className="w-8 h-8 text-yellow-600" />
                        <span className="text-3xl font-bold text-yellow-600">{stats.myActiveLoans || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">Mis Préstamos Activos</h3>
                      <p className="text-sm text-gray-600 mt-1">En proceso de pago</p>
                    </button>

                    <button
                      onClick={() => navigate("/evaluations")}
                      className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-sm border border-indigo-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <BarChart className="w-8 h-8 text-indigo-600" />
                        <span className="text-3xl font-bold text-indigo-600">{stats.myPendingEvaluations || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Mis Evaluaciones Pendientes</h3>
                      <p className="text-sm text-gray-600 mt-1">Por completar</p>
                    </button>

                    <button
                      onClick={() => navigate("/events")}
                      className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl shadow-sm border border-pink-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Calendar className="w-8 h-8 text-pink-600" />
                        <span className="text-3xl font-bold text-pink-600">{stats.upcomingEvents || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">Eventos Próximos</h3>
                      <p className="text-sm text-gray-600 mt-1">Para asistir</p>
                    </button>

                    <button
                      onClick={() => navigate("/assets")}
                      className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl shadow-sm border border-teal-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Package className="w-8 h-8 text-teal-600" />
                        <span className="text-3xl font-bold text-teal-600">{stats.myAssignedAssets || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">Mis Activos Asignados</h3>
                      <p className="text-sm text-gray-600 mt-1">Bajo mi responsabilidad</p>
                    </button>

                    <button
                      onClick={() => navigate("/complaints")}
                      className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                        <span className="text-3xl font-bold text-red-600">{stats.myPendingComplaints || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">Mis Quejas Pendientes</h3>
                      <p className="text-sm text-gray-600 mt-1">En proceso</p>
                    </button>

                    <button
                      onClick={() => navigate("/payslips")}
                      className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-sm border border-orange-200 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Receipt className="w-8 h-8 text-orange-600" />
                        <span className="text-3xl font-bold text-orange-600">{stats.myPayslipsThisYear || 0}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Mis Recibos Este Año</h3>
                      <p className="text-sm text-gray-600 mt-1">Disponibles</p>
                    </button>

                    
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Access Cards */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Acceso Rápido
            </h2>
            <p className="text-gray-600 mb-4">
              Usa el menú lateral para navegar por los diferentes módulos del sistema.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isHR ? (
                <>
                  <button
                    onClick={() => navigate("/employees")}
                    className="p-4 text-left bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-md transition-all border border-green-200"
                  >
                    <Users className="w-6 h-6 text-green-600 mb-2" />
                    <h3 className="font-semibold text-gray-900">Gestionar Empleados</h3>
                    <p className="text-sm text-gray-600 mt-1">Administra el personal</p>
                  </button>
                  
                  <button
                    onClick={() => navigate("/requests")}
                    className="p-4 text-left bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-all border border-purple-200"
                  >
                    <FileText className="w-6 h-6 text-purple-600 mb-2" />
                    <h3 className="font-semibold text-gray-900">Gestionar Solicitudes</h3>
                    <p className="text-sm text-gray-600 mt-1">Revisar y aprobar</p>
                  </button>
                  
                  <button
                    onClick={() => navigate("/chat")}
                    className="p-4 text-left bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all border border-blue-200"
                  >
                    <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                    <h3 className="font-semibold text-gray-900">Chat General</h3>
                    <p className="text-sm text-gray-600 mt-1">Comunicación interna</p>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/chat")}
                    className="p-4 text-left bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all border border-blue-200"
                  >
                    <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                    <h3 className="font-semibold text-gray-900">Chat con RRHH</h3>
                    <p className="text-sm text-gray-600 mt-1">Comunícate directamente</p>
                  </button>
                  
                  <button
                    onClick={() => navigate("/requests")}
                    className="p-4 text-left bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-md transition-all border border-green-200"
                  >
                    <FileText className="w-6 h-6 text-green-600 mb-2" />
                    <h3 className="font-semibold text-gray-900">Mis Solicitudes</h3>
                    <p className="text-sm text-gray-600 mt-1">Gestiona tus solicitudes</p>
                  </button>
                  
                  <button
                    onClick={() => navigate("/documents")}
                    className="p-4 text-left bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-all border border-purple-200"
                  >
                    <Users className="w-6 h-6 text-purple-600 mb-2" />
                    <h3 className="font-semibold text-gray-900">Documentos</h3>
                    <p className="text-sm text-gray-600 mt-1">Accede a tu información</p>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información del Perfil
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Nombre Completo:</span>
                <span className="text-sm text-gray-900">{user.profile.first_name} {user.profile.last_name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Email:</span>
                <span className="text-sm text-gray-900">{user.profile.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">CI:</span>
                <span className="text-sm text-gray-900">{user.profile.ci}</span>
              </div>
              {user.profile.phone && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Teléfono:</span>
                  <span className="text-sm text-gray-900">{user.profile.phone}</span>
                </div>
              )}
              {user.profile.birth_date && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Fecha de Nacimiento:</span>
                  <span className="text-sm text-gray-900">
                    {(() => {
                      const date = new Date(user.profile.birth_date + 'T00:00:00Z');
                      const day = date.getUTCDate().toString().padStart(2, '0');
                      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                      const year = date.getUTCFullYear();
                      return `${day}/${month}/${year}`;
                    })()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Posición:</span>
                <span className="text-sm text-gray-900">{user.profile.position || 'No asignado'}</span>
              </div>
              {user.profile.sede && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-600">Sede:</span>
                  <span className="text-sm text-gray-900">{user.profile.sede}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
