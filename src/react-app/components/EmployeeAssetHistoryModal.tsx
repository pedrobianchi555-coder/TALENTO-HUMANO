import { useState, useEffect } from "react";
import { X, Package, Clock, Monitor, Laptop, Smartphone, Headphones, Settings } from "lucide-react";
import type { UserProfile } from "@/shared/types";
import { formatDateShort } from "@/shared/date-utils";

interface AssetHistoryItem {
  id: number;
  asset_id: number;
  asset_code: string;
  asset_name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  category_name: string;
  condition_status: string;
  assigned_date: string;
  return_date?: string;
  status: string;
  assignment_notes?: string;
  return_notes?: string;
  assigned_by_name: string;
  duration_days: number;
}

interface EmployeeAssetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: UserProfile;
}

export default function EmployeeAssetHistoryModal({ isOpen, onClose, employee }: EmployeeAssetHistoryModalProps) {
  const [assetHistory, setAssetHistory] = useState<AssetHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employee.id) {
      fetchAssetHistory();
    }
  }, [isOpen, employee.id]);

  const fetchAssetHistory = async () => {
    if (!employee.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}/asset-history`);
      if (response.ok) {
        const data = await response.json();
        setAssetHistory(data);
      } else {
        console.error('Failed to fetch asset history');
      }
    } catch (error) {
      console.error('Error fetching asset history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('laptop') || categoryLower.includes('portátil')) {
      return <Laptop className="w-5 h-5" />;
    } else if (categoryLower.includes('monitor')) {
      return <Monitor className="w-5 h-5" />;
    } else if (categoryLower.includes('teléfono') || categoryLower.includes('móvil')) {
      return <Smartphone className="w-5 h-5" />;
    } else if (categoryLower.includes('audifonos') || categoryLower.includes('headset')) {
      return <Headphones className="w-5 h-5" />;
    } else {
      return <Package className="w-5 h-5" />;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'bg-emerald-100 text-emerald-800';
      case 'GOOD':
        return 'bg-green-100 text-green-800';
      case 'FAIR':
        return 'bg-yellow-100 text-yellow-800';
      case 'POOR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'Excelente';
      case 'GOOD':
        return 'Bueno';
      case 'FAIR':
        return 'Regular';
      case 'POOR':
        return 'Malo';
      default:
        return condition;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800';
      case 'RETURNED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'En Uso';
      case 'RETURNED':
        return 'Devuelto';
      default:
        return status;
    }
  };

  const formatDuration = (days: number) => {
    if (days < 30) {
      return `${Math.floor(days)} días`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      const remainingDays = Math.floor(days % 30);
      return remainingDays > 0 ? `${months} meses, ${remainingDays} días` : `${months} meses`;
    } else {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      if (months > 0) {
        return `${years} años, ${months} meses`;
      }
      return `${years} años`;
    }
  };

  if (!isOpen) return null;

  const activeAssets = assetHistory.filter(item => item.status === 'ACTIVE');
  const returnedAssets = assetHistory.filter(item => item.status === 'RETURNED');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Historial de Activos Tecnológicos
                </h3>
                <p className="text-gray-600">
                  {employee.first_name} {employee.last_name}
                </p>
                <p className="text-sm text-gray-500">
                  {employee.department && `${employee.department} - `}
                  {employee.position}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando historial...</span>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Settings className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total de Activos</p>
                      <p className="text-2xl font-bold text-blue-900">{assetHistory.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Package className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-green-800">En Uso Actual</p>
                      <p className="text-2xl font-bold text-green-900">{activeAssets.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="w-6 h-6 text-gray-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Devueltos</p>
                      <p className="text-2xl font-bold text-gray-900">{returnedAssets.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {assetHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sin Historial de Activos
                  </h3>
                  <p className="text-gray-600">
                    Este empleado no tiene activos tecnológicos asignados.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active Assets */}
                  {activeAssets.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 text-blue-600 mr-2" />
                        Activos Actualmente Asignados ({activeAssets.length})
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {activeAssets.map((item) => (
                          <div key={item.id} className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                  {getCategoryIcon(item.category_name)}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900">{item.asset_name}</h5>
                                  <p className="text-sm text-gray-600">{item.asset_code}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                {getStatusText(item.status)}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Categoría:</span>
                                <span className="font-medium">{item.category_name}</span>
                              </div>
                              {(item.brand || item.model) && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Marca/Modelo:</span>
                                  <span className="font-medium">{item.brand} {item.model}</span>
                                </div>
                              )}
                              {item.serial_number && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Serie:</span>
                                  <span className="font-medium">{item.serial_number}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-600">Condición:</span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(item.condition_status)}`}>
                                  {getConditionText(item.condition_status)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Asignado:</span>
                                <span className="font-medium">{formatDateShort(item.assigned_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Tiempo en uso:</span>
                                <span className="font-medium text-blue-600">{formatDuration(item.duration_days)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Asignado por:</span>
                                <span className="font-medium">{item.assigned_by_name}</span>
                              </div>
                              {item.assignment_notes && (
                                <div className="mt-2 p-2 bg-white rounded text-xs">
                                  <span className="text-gray-600">Notas: </span>
                                  <span>{item.assignment_notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historical Assets */}
                  {returnedAssets.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 text-gray-600 mr-2" />
                        Historial de Activos Devueltos ({returnedAssets.length})
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {returnedAssets.map((item) => (
                          <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center">
                                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                  {getCategoryIcon(item.category_name)}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900">{item.asset_name}</h5>
                                  <p className="text-sm text-gray-600">{item.asset_code}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                {getStatusText(item.status)}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Categoría:</span>
                                <span className="font-medium">{item.category_name}</span>
                              </div>
                              {(item.brand || item.model) && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Marca/Modelo:</span>
                                  <span className="font-medium">{item.brand} {item.model}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-600">Período de uso:</span>
                                <div className="text-right">
                                  <div className="font-medium">
                                    {formatDateShort(item.assigned_date)} - {' '}
                                    {item.return_date ? formatDateShort(item.return_date) : 'Presente'}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    ({formatDuration(item.duration_days)})
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Asignado por:</span>
                                <span className="font-medium">{item.assigned_by_name}</span>
                              </div>
                              {item.return_notes && (
                                <div className="mt-2 p-2 bg-white rounded text-xs">
                                  <span className="text-gray-600">Notas devolución: </span>
                                  <span>{item.return_notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
