import { useState, useEffect } from "react";
import { X, User, Wrench, AlertTriangle, Package, Calendar, DollarSign, FileText, Clock, CheckCircle, Users } from "lucide-react";
import { formatDate, formatDateShort } from "@/shared/date-utils";

interface AssetHistoryEvent {
  id: number;
  event_type: 'ASSIGNMENT' | 'MAINTENANCE' | 'INCIDENT';
  // Assignment fields
  assigned_date?: string;
  return_date?: string;
  status?: string;
  assignment_notes?: string;
  return_notes?: string;
  employee_name?: string;
  assigned_by_name?: string;
  // Maintenance fields
  maintenance_date?: string;
  maintenance_type?: string;
  description?: string;
  cost?: number;
  performed_by?: string;
  created_by_name?: string;
  // Incident fields
  incident_date?: string;
  incident_type?: string;
  severity?: string;
  reported_by_name?: string;
  resolution?: string;
  resolved_date?: string;
  resolved_by_name?: string;
  notes?: string;
}

interface Asset {
  id: number;
  asset_code: string;
  name: string;
  category_name?: string;
}

interface AssetHistoryModalProps {
  asset: Asset;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetHistoryModal({ asset, isOpen, onClose }: AssetHistoryModalProps) {
  const [history, setHistory] = useState<AssetHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    incident_type: "",
    description: "",
    incident_date: "",
    severity: "MEDIUM",
    notes: ""
  });

  useEffect(() => {
    if (isOpen && asset.id) {
      fetchHistory();
    }
  }, [isOpen, asset.id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assets/${asset.id}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Error fetching asset history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/asset-incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asset_id: asset.id,
          ...incidentForm,
        }),
      });

      if (response.ok) {
        setShowIncidentForm(false);
        setIncidentForm({
          incident_type: "",
          description: "",
          incident_date: "",
          severity: "MEDIUM",
          notes: ""
        });
        fetchHistory(); // Refresh history
      }
    } catch (error) {
      console.error("Error creating incident:", error);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'ASSIGNMENT':
        return <User className="w-5 h-5 text-blue-600" />;
      case 'MAINTENANCE':
        return <Wrench className="w-5 h-5 text-green-600" />;
      case 'INCIDENT':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventTitle = (event: AssetHistoryEvent) => {
    switch (event.event_type) {
      case 'ASSIGNMENT':
        return event.return_date ? 'Equipo Devuelto' : 'Asignación de Equipo';
      case 'MAINTENANCE':
        return `Mantenimiento ${event.maintenance_type || ''}`;
      case 'INCIDENT':
        return `Incidencia: ${event.incident_type}`;
      default:
        return 'Evento';
    }
  };

  const getEventDate = (event: AssetHistoryEvent) => {
    return event.assigned_date || event.maintenance_date || event.incident_date || '';
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityText = (severity?: string) => {
    switch (severity) {
      case 'HIGH':
        return 'Alta';
      case 'MEDIUM':
        return 'Media';
      case 'LOW':
        return 'Baja';
      default:
        return severity;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Package className="w-6 h-6 mr-3 text-blue-600" />
                Historial de Actividad
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {asset.asset_code} - {asset.name}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowIncidentForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 mr-2 inline" />
                Reportar Incidencia
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                Cargando historial...
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin Actividad Registrada</h3>
              <p className="text-gray-500">Este equipo no tiene actividad registrada aún.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((event, index) => (
                <div key={`${event.event_type}-${event.id}`} className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="bg-white border-2 border-gray-200 rounded-full p-2">
                      {getEventIcon(event.event_type)}
                    </div>
                    {index < history.length - 1 && (
                      <div className="w-px h-16 bg-gray-200 mt-2"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {getEventTitle(event)}
                        </h4>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(getEventDate(event))}
                        </div>
                      </div>
                      {event.event_type === 'INCIDENT' && event.severity && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                          {getSeverityText(event.severity)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Assignment Details */}
                      {event.event_type === 'ASSIGNMENT' && (
                        <>
                          <div className="flex items-center text-sm">
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">Empleado:</span>
                            <span className="ml-2">{event.employee_name}</span>
                          </div>
                          {event.assigned_by_name && (
                            <div className="flex items-center text-sm">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Asignado por:</span>
                              <span className="ml-2">{event.assigned_by_name}</span>
                            </div>
                          )}
                          {event.return_date && (
                            <div className="flex items-center text-sm">
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                              <span className="font-medium">Devuelto el:</span>
                              <span className="ml-2">{formatDateShort(event.return_date)}</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">Estado:</span>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              event.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 
                              event.status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {event.status === 'ACTIVE' ? 'Activa' : 
                               event.status === 'RETURNED' ? 'Devuelta' : event.status}
                            </span>
                          </div>
                          {event.assignment_notes && (
                            <div className="mt-2">
                              <span className="text-sm font-medium">Notas de Asignación:</span>
                              <p className="text-sm text-gray-600 mt-1">{event.assignment_notes}</p>
                            </div>
                          )}
                          {event.return_notes && (
                            <div className="mt-2">
                              <span className="text-sm font-medium">Notas de Devolución:</span>
                              <p className="text-sm text-gray-600 mt-1">{event.return_notes}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Maintenance Details */}
                      {event.event_type === 'MAINTENANCE' && (
                        <>
                          {event.description && (
                            <div>
                              <span className="text-sm font-medium">Descripción:</span>
                              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            </div>
                          )}
                          {event.performed_by && (
                            <div className="flex items-center text-sm">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Realizado por:</span>
                              <span className="ml-2">{event.performed_by}</span>
                            </div>
                          )}
                          {event.cost && (
                            <div className="flex items-center text-sm">
                              <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Costo:</span>
                              <span className="ml-2">Bs. {event.cost.toLocaleString()}</span>
                            </div>
                          )}
                          {event.created_by_name && (
                            <div className="flex items-center text-sm">
                              <FileText className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Registrado por:</span>
                              <span className="ml-2">{event.created_by_name}</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Incident Details */}
                      {event.event_type === 'INCIDENT' && (
                        <>
                          {event.description && (
                            <div>
                              <span className="text-sm font-medium">Descripción:</span>
                              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            </div>
                          )}
                          {event.reported_by_name && (
                            <div className="flex items-center text-sm">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">Reportado por:</span>
                              <span className="ml-2">{event.reported_by_name}</span>
                            </div>
                          )}
                          
                          {event.resolution ? (
                            <>
                              <div className="mt-2">
                                <span className="text-sm font-medium">Resolución:</span>
                                <p className="text-sm text-gray-600 mt-1">{event.resolution}</p>
                              </div>
                              {event.resolved_date && event.resolved_by_name && (
                                <div className="flex items-center text-sm mt-2">
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  <span className="font-medium">Resuelto el:</span>
                                  <span className="ml-2">
                                    {formatDateShort(event.resolved_date)} por {event.resolved_by_name}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center text-sm">
                              <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                              <span className="text-yellow-700 font-medium">Pendiente de resolución</span>
                            </div>
                          )}
                          {event.notes && (
                            <div className="mt-2">
                              <span className="text-sm font-medium">Notas:</span>
                              <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incident Form Modal */}
        {showIncidentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg max-w-md w-full mx-4">
              <div className="p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Reportar Incidencia</h3>
              </div>
              
              <form onSubmit={handleCreateIncident} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Incidencia *
                    </label>
                    <select
                      required
                      value={incidentForm.incident_type}
                      onChange={(e) => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="Daño">Daño</option>
                      <option value="Pérdida">Pérdida</option>
                      <option value="Mal funcionamiento">Mal funcionamiento</option>
                      <option value="Uso inadecuado">Uso inadecuado</option>
                      <option value="Robo">Robo</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={incidentForm.description}
                      onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe detalladamente la incidencia..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de la Incidencia *
                    </label>
                    <input
                      type="date"
                      required
                      value={incidentForm.incident_date}
                      onChange={(e) => setIncidentForm({ ...incidentForm, incident_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Severidad
                    </label>
                    <select
                      value={incidentForm.severity}
                      onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="LOW">Baja</option>
                      <option value="MEDIUM">Media</option>
                      <option value="HIGH">Alta</option>
                    </select>
                  </div>

                  

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas Adicionales
                    </label>
                    <textarea
                      rows={2}
                      value={incidentForm.notes}
                      onChange={(e) => setIncidentForm({ ...incidentForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Información adicional..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowIncidentForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Reportar Incidencia
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
