import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2, ClipboardList, Plus, Filter, Clock, CheckCircle, XCircle, AlertCircle, FileText } from "lucide-react";
import type { Request, EnhancedUser } from "@/shared/types";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";
import ConfirmationModal from "@/react-app/components/ConfirmationModal";
import { useConfirmationModal } from "@/react-app/hooks/useConfirmationModal";
import { formatDateShort } from "@/shared/date-utils";
import RequestReportModal from "@/react-app/components/RequestReportModal";

interface RequestWithUser extends Request {
  first_name?: string;
  last_name?: string;
  email?: string;
  rejection_reason?: string;
}

export default function Requests() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { can, isHR, loading: permissionsLoading } = usePermissions();
  const [requests, setRequests] = useState<RequestWithUser[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setUser] = useState<EnhancedUser | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRequestForRejection, setSelectedRequestForRejection] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: "",
    category: "",
    details: ""
  });
  
  // Confirmation modal
  const { modalConfig, showAlert, showConfirm, closeModal, handleConfirm } = useConfirmationModal();

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserAndRequests = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }

        // Get requests
        const requestsResponse = await fetch("/api/requests");
        if (requestsResponse.ok) {
          const data = await requestsResponse.json();
          setRequests(data);
          setFilteredRequests(data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndRequests();
  }, [authUser]);

  useEffect(() => {
    let filtered = requests;
    
    if (filterStatus !== "ALL") {
      filtered = requests.filter(request => request.status === filterStatus);
    }

    setFilteredRequests(filtered);
  }, [filterStatus, requests]);

  if (isPending || loading || permissionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando solicitudes...</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'APPROVED':
        return 'Aprobada';
      case 'REJECTED':
        return 'Rechazada';
      default:
        return status;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newRequest.type || !newRequest.category || !newRequest.details) {
      showAlert("Campos Obligatorios", "Por favor, completa todos los campos obligatorios.", "warning");
      return;
    }
    
    // Show confirmation with request preview
    const requestPreview = (
      <div className="text-left bg-gray-50 rounded-lg p-4">
        <p className="text-sm"><span className="font-medium">Tipo:</span> {newRequest.type}</p>
        <p className="text-sm"><span className="font-medium">Categoría:</span> {newRequest.category}</p>
        <p className="text-sm"><span className="font-medium">Detalles:</span> {newRequest.details}</p>
      </div>
    );
    
    showConfirm(
      "Confirmar Envío de Solicitud",
      <div>
        <p className="text-sm text-gray-500 mb-4">¿Estás seguro de que deseas enviar esta solicitud? Una vez enviada, no podrás modificarla.</p>
        {requestPreview}
      </div>,
      async () => {
        try {
          const response = await fetch("/api/requests", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newRequest),
          });

          const responseData = await response.json();

          if (response.ok) {
            // Agregar un pequeño delay después del POST para asegurar que el backend
            // ha procesado completamente la solicitud antes de actualizar la UI
            await new Promise(resolve => setTimeout(resolve, 150));
            
            setRequests([responseData, ...requests]);
            setFilteredRequests([responseData, ...filteredRequests]);
            setNewRequest({ type: "", category: "", details: "" });
            setShowForm(false);
            
            // Show success message after ensuring state is updated
            setTimeout(() => {
              showAlert("Éxito", "Tu solicitud ha sido enviada correctamente.", "success");
            }, 100);
          } else {
            console.error("Error creating request:", responseData);
            const errorMsg = typeof responseData.error === 'string' 
              ? responseData.error 
              : (responseData.error?.message || JSON.stringify(responseData.error) || 'Error desconocido');
            showAlert("Error", `Error al crear la solicitud: ${errorMsg}`, "error");
          }
        } catch (error) {
          console.error("Error creating request:", error);
          const errorMsg = error instanceof Error ? error.message : 'Error de conexión';
          showAlert("Error", `Error al crear la solicitud: ${errorMsg}`, "error");
        }
      },
      { type: 'confirm', confirmButtonText: 'Confirmar y Enviar', cancelButtonText: 'Cancelar' }
    );
  };

  const handleApprove = (requestId: number) => {
    const requestData = requests.find(req => req.id === requestId);
    
    if (!requestData) return;
    
    // Show confirmation with request preview
    const requestPreview = (
      <div className="text-left bg-gray-50 rounded-lg p-4">
        <p className="text-sm"><span className="font-medium">Solicitante:</span> {requestData.first_name} {requestData.last_name}</p>
        <p className="text-sm"><span className="font-medium">Tipo:</span> {requestData.type}</p>
        <p className="text-sm"><span className="font-medium">Categoría:</span> {requestData.category}</p>
        <p className="text-sm"><span className="font-medium">Detalles:</span> {requestData.details || 'Sin detalles'}</p>
        <p className="text-sm"><span className="font-medium">Fecha:</span> {formatDateShort(requestData.created_at)}</p>
      </div>
    );
    
    showConfirm(
      'Aprobar Solicitud',
      <div>
        <p className="text-sm text-gray-500 mb-4">
          ¿Estás seguro de que deseas aprobar esta solicitud?
        </p>
        {requestPreview}
      </div>,
      async () => {
        try {
          const response = await fetch(`/api/requests/${requestId}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: 'APPROVED' }),
          });

          if (response.ok) {
            setRequests(requests.map(req => 
              req.id === requestId ? { ...req, status: 'APPROVED' } : req
            ));
            setFilteredRequests(filteredRequests.map(req => 
              req.id === requestId ? { ...req, status: 'APPROVED' } : req
            ));
            showAlert("Éxito", "Solicitud aprobada correctamente", "success");
          } else {
            showAlert("Error", "Error al aprobar la solicitud", "error");
          }
        } catch (error) {
          console.error("Error approving request:", error);
          showAlert("Error", "Error al aprobar la solicitud", "error");
        }
      },
      { 
        type: 'confirm',
        confirmButtonText: 'Aprobar',
        cancelButtonText: 'Cancelar'
      }
    );
  };

  const handleRejectClick = (requestId: number) => {
    setSelectedRequestForRejection(requestId);
    setRejectionReason("");
    setShowRejectionModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedRequestForRejection) return;
    
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      showAlert("Motivo Requerido", "Por favor, proporciona un motivo de rechazo (mínimo 10 caracteres).", "warning");
      return;
    }

    if (rejectionReason.trim().length > 500) {
      showAlert("Motivo muy largo", "El motivo de rechazo no debe exceder 500 caracteres.", "warning");
      return;
    }

    try {
      const response = await fetch(`/api/requests/${selectedRequestForRejection}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim()
        }),
      });

      if (response.ok) {
        setRequests(requests.map(req => 
          req.id === selectedRequestForRejection 
            ? { ...req, status: 'REJECTED', rejection_reason: rejectionReason.trim() } 
            : req
        ));
        setFilteredRequests(filteredRequests.map(req => 
          req.id === selectedRequestForRejection 
            ? { ...req, status: 'REJECTED', rejection_reason: rejectionReason.trim() } 
            : req
        ));
        setShowRejectionModal(false);
        setSelectedRequestForRejection(null);
        setRejectionReason("");
        showAlert("Éxito", "Solicitud rechazada correctamente", "success");
      } else {
        const errorData = await response.json();
        showAlert("Error", errorData.error || "Error al rechazar la solicitud", "error");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      showAlert("Error", "Error al rechazar la solicitud", "error");
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
                <ClipboardList className="w-8 h-8 mr-3 text-blue-600" />
                {isHR ? 'Gestión de Solicitudes' : 'Mis Solicitudes'}
              </h1>
              <p className="text-gray-600">
                {isHR ? 'Gestiona y responde a las solicitudes de los empleados' : 'Crea y da seguimiento a tus solicitudes'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {isHR && (
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generar Reportes
                </button>
              )}
              <button 
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Solicitud
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filtrar por estado:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
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
                  {requests.filter(r => r.status === 'PENDING').length}
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
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === 'APPROVED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rechazadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === 'REJECTED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Lista de Solicitudes ({filteredRequests.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.type}
                          </h3>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {request.category}
                          </span>
                        </div>
                        
                        {isHR && request.first_name && (
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Solicitante:</span> {request.first_name} {request.last_name} ({request.email})
                          </p>
                        )}
                        
                        <p className="text-gray-700 mb-3">
                          {request.details || 'Sin detalles adicionales'}
                        </p>

                        {/* Rejection Reason - Show for both HR and employees */}
                        {request.status === 'REJECTED' && request.rejection_reason && (
                          <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start">
                              <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-900 mb-1">
                                  Motivo de Rechazo:
                                </p>
                                <p className="text-sm text-red-800">
                                  {request.rejection_reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Creada: {formatDateShort(request.created_at)}</span>
                          {request.updated_at !== request.created_at && (
                            <span>Actualizada: {formatDateShort(request.updated_at)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{getStatusText(request.status)}</span>
                        </div>
                        
                        {isHR && can(PERMISSIONS.REQUEST_MANAGE_STATUS) && request.status === 'PENDING' && (
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleApprove(request.id)}
                              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                            >
                              Aprobar
                            </button>
                            <button 
                              onClick={() => handleRejectClick(request.id)}
                              className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {filterStatus === 'ALL' ? 'No hay solicitudes' : `No hay solicitudes ${getStatusText(filterStatus).toLowerCase()}`}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isHR 
                  ? 'Las solicitudes de los empleados aparecerán aquí.' 
                  : 'Comienza creando una nueva solicitud.'
                }
              </p>
            </div>
          )}
        </div>

        {/* New Request Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Nueva Solicitud
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
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Solicitud *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRequest.type}
                      onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Solicitud de Vacaciones, Permiso, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría *
                    </label>
                    <select
                      required
                      value={newRequest.category}
                      onChange={(e) => setNewRequest({ ...newRequest, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecciona una categoría</option>
                      <option value="Gestión Laboral">Gestión Laboral</option>
                      <option value="Bienestar">Bienestar</option>
                      <option value="Desarrollo">Desarrollo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detalles *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={newRequest.details}
                      onChange={(e) => setNewRequest({ ...newRequest, details: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe los detalles de tu solicitud..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newRequest.type || !newRequest.category || !newRequest.details}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Enviar Solicitud
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="bg-white border-b p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 mr-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Rechazar Solicitud
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowRejectionModal(false);
                      setSelectedRequestForRejection(null);
                      setRejectionReason("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Por favor, proporciona un motivo claro y detallado para el rechazo de esta solicitud. 
                  Esta información será visible para el empleado.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de Rechazo *
                  </label>
                  <textarea
                    required
                    rows={5}
                    maxLength={500}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Explica por qué se rechaza esta solicitud (mínimo 10 caracteres)..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {rejectionReason.length} / 500 caracteres
                  </p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectionModal(false);
                      setSelectedRequestForRejection(null);
                      setRejectionReason("");
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRejectSubmit}
                    disabled={!rejectionReason || rejectionReason.trim().length < 10}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Rechazar Solicitud
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Request Report Modal */}
        <RequestReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      </div>
    </div>
  );
}
