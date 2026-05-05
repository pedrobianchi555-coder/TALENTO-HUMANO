import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, AlertCircle, Plus, Search, Filter, 
  Clock, CheckCircle, XCircle, MessageSquare
} from "lucide-react";
import type { Complaint, EnhancedUser } from "@/shared/types";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";
import { formatDateShort } from "@/shared/date-utils";

interface ComplaintWithUser extends Complaint {
  employee_name?: string;
  employee_email?: string;
}

export default function Complaints() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { can, isHR, loading: permissionsLoading } = usePermissions();
  const [complaints, setComplaints] = useState<ComplaintWithUser[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<ComplaintWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setUser] = useState<EnhancedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    category: "",
    details: "",
    is_anonymous: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserAndComplaints = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }

        // Get complaints
        const complaintsResponse = await fetch("/api/complaints");
        if (complaintsResponse.ok) {
          const data = await complaintsResponse.json();
          setComplaints(data);
          setFilteredComplaints(data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndComplaints();
  }, [authUser]);

  useEffect(() => {
    let filtered = complaints;
    
    if (filterStatus !== "ALL") {
      filtered = complaints.filter(complaint => complaint.status === filterStatus);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(complaint => 
        complaint.category.toLowerCase().includes(searchLower) ||
        complaint.details.toLowerCase().includes(searchLower) ||
        complaint.employee_name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredComplaints(filtered);
  }, [filterStatus, complaints, searchTerm]);

  if (isPending || loading || permissionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando buzón de quejas...</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EN_REVISION':
        return 'bg-blue-100 text-blue-800';
      case 'RESUELTO':
        return 'bg-green-100 text-green-800';
      case 'CERRADO':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return <Clock className="w-4 h-4" />;
      case 'EN_REVISION':
        return <AlertCircle className="w-4 h-4" />;
      case 'RESUELTO':
        return <CheckCircle className="w-4 h-4" />;
      case 'CERRADO':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_REVISION':
        return 'En Revisión';
      case 'RESUELTO':
        return 'Resuelto';
      case 'CERRADO':
        return 'Cerrado';
      default:
        return status;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComplaint.category || !newComplaint.details) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newComplaint),
      });

      if (response.ok) {
        const newComplaintData = await response.json();
        
        // Only add to list if not anonymous
        if (!newComplaint.is_anonymous) {
          setComplaints([newComplaintData, ...complaints]);
          setFilteredComplaints([newComplaintData, ...filteredComplaints]);
        }
        
        setNewComplaint({ category: "", details: "", is_anonymous: false });
        setShowForm(false);
        
        if (newComplaint.is_anonymous) {
          alert("Queja/sugerencia anónima enviada exitosamente. No aparecerá en tu historial.");
        } else {
          alert("Queja/sugerencia enviada exitosamente");
        }
      } else {
        const errorData = await response.json();
        alert(`Error al enviar: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error creating complaint:", error);
      alert("Error de conexión al enviar la queja/sugerencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (complaintId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/complaints/${complaintId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setComplaints(complaints.map(complaint => 
          complaint.id === complaintId ? { ...complaint, status: newStatus } : complaint
        ));
        setFilteredComplaints(filteredComplaints.map(complaint => 
          complaint.id === complaintId ? { ...complaint, status: newStatus } : complaint
        ));
      }
    } catch (error) {
      console.error("Error updating complaint status:", error);
    }
  };

  const categories = [
    'Acoso laboral',
    'Condiciones de trabajo', 
    'Discriminación',
    'Salario y beneficios',
    'Ambiente laboral',
    'Seguridad',
    'Sugerencia de mejora',
    'Otro'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <AlertCircle className="w-8 h-8 mr-3 text-blue-600" />
                {isHR ? 'Gestión de Quejas' : 'Buzón de Quejas'}
              </h1>
              <p className="text-gray-600">
                {isHR ? 'Gestiona y da seguimiento a reportes de empleados' : 'Reporta situaciones o comparte sugerencias de manera confidencial'}
              </p>
            </div>
            <div className="flex space-x-3">
              {!isHR && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Queja/Sugerencia
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters (HR only) */}
        {isHR && can(PERMISSIONS.COMPLAINT_VIEW_ALL) && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar por categoría, contenido o empleado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filtrar por estado:</span>
                <div className="flex space-x-2">
                  {['ALL', 'PENDIENTE', 'EN_REVISION', 'RESUELTO', 'CERRADO'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                        filterStatus === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'ALL' ? 'Todas' : getStatusText(status)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{complaints.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complaints.filter(c => c.status === 'PENDIENTE').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En Revisión</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complaints.filter(c => c.status === 'EN_REVISION').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resueltas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complaints.filter(c => c.status === 'RESUELTO').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {isHR ? 'Lista de Quejas y Sugerencias' : 'Mis Envíos'} ({filteredComplaints.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredComplaints.map((complaint) => (
              <div key={complaint.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {complaint.category}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(complaint.status)}`}>
                        {getStatusIcon(complaint.status)}
                        <span className="ml-1">{getStatusText(complaint.status)}</span>
                      </span>
                    </div>
                    
                    {isHR && can(PERMISSIONS.COMPLAINT_VIEW_ALL) && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Reportado por:</span> {complaint.employee_name || 'Anónimo'}
                        {complaint.employee_email && ` (${complaint.employee_email})`}
                        {complaint.is_anonymous && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                            Anónimo
                          </span>
                        )}
                      </p>
                    )}
                    
                    <p className="text-gray-700 mb-3 leading-relaxed">
                      {complaint.details}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Enviado: {formatDateShort(complaint.created_at)}</span>
                      {complaint.updated_at !== complaint.created_at && (
                        <span>Actualizado: {formatDateShort(complaint.updated_at)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {isHR && can(PERMISSIONS.COMPLAINT_MANAGE_STATUS) && ['PENDIENTE', 'EN_REVISION'].includes(complaint.status) && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleStatusUpdate(complaint.id, 'RESUELTO')}
                          className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                        >
                          Marcar Resuelto
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(complaint.id, 'CERRADO')}
                          className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                        >
                          Cerrar Caso
                        </button>
                      </div>
                    )}
                    
                    {isHR && can(PERMISSIONS.COMPLAINT_MANAGE_STATUS) && complaint.status === 'PENDIENTE' && (
                      <button 
                        onClick={() => handleStatusUpdate(complaint.id, 'EN_REVISION')}
                        className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Tomar Caso
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredComplaints.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {filterStatus !== "ALL" ? 'No hay quejas con ese estado' : 'No hay quejas o sugerencias'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isHR 
                  ? 'Las quejas y sugerencias aparecerán aquí cuando sean enviadas.'
                  : 'Tus envíos aparecerán aquí. Úsalo para reportar situaciones o compartir ideas.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Complaint Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Nueva Queja o Sugerencia
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  required
                  value={newComplaint.category}
                  onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  required
                  rows={6}
                  value={newComplaint.details}
                  onChange={(e) => setNewComplaint({ ...newComplaint, details: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe la situación o sugerencia de manera detallada."
                ></textarea>
              </div>

              <div className="mb-6">
                <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newComplaint.is_anonymous}
                    onChange={(e) => setNewComplaint({ ...newComplaint, is_anonymous: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Enviar de forma anónima</span>
                    <p className="text-xs text-gray-600 mt-1">
                      Al marcar esta opción, tu queja será completamente anónima. No quedará ningún registro de tu identidad y la queja no aparecerá en tu historial personal.
                    </p>
                  </div>
                </label>
              </div>

              <div className={`${newComplaint.is_anonymous ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <MessageSquare className={`h-5 w-5 ${newComplaint.is_anonymous ? 'text-amber-400' : 'text-blue-400'}`} />
                  </div>
                  <div className="ml-3">
                    <h4 className={`text-sm font-medium ${newComplaint.is_anonymous ? 'text-amber-800' : 'text-blue-800'}`}>
                      {newComplaint.is_anonymous ? 'Modo Anónimo' : 'Confidencialidad'}
                    </h4>
                    <p className={`mt-1 text-sm ${newComplaint.is_anonymous ? 'text-amber-700' : 'text-blue-700'}`}>
                      {newComplaint.is_anonymous 
                        ? 'Tu queja será enviada de forma completamente anónima. Ni siquiera Recursos Humanos podrá identificarte. No podrás ver el estado de esta queja en tu historial ni recibir respuesta directa sobre ella.'
                        : 'Tu reporte será tratado con la máxima confidencialidad. Solo el equipo de Recursos Humanos tendrá acceso a esta información para poder dar el seguimiento adecuado y mantenerle informado sobre su resolución.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
