import { useState } from "react";
import { X, FileText, Download, Loader2, Printer } from "lucide-react";
import type { AssetCategory, UserProfile } from "@/shared/types";
import { formatDate } from "@/shared/date-utils";

interface AssetReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AssetCategory[];
  employees: UserProfile[];
}

export default function AssetReportModal({ isOpen, onClose, categories, employees }: AssetReportModalProps) {
  const [reportType, setReportType] = useState<'general' | 'by_employee'>('general');
  const [filters, setFilters] = useState({
    category_id: '',
    condition_status: '',
    operational_status: '',
    department: '',
    employee_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleGeneratePreview = async () => {
    setLoading(true);
    try {
      let url = '/api/reports/assets';
      const params = new URLSearchParams();

      if (reportType === 'general') {
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.condition_status) params.append('condition_status', filters.condition_status);
        if (filters.operational_status) params.append('operational_status', filters.operational_status);
        if (filters.department) params.append('department', filters.department);
      } else {
        if (!filters.employee_id) {
          alert('Por favor selecciona un empleado');
          setLoading(false);
          return;
        }
        url = `/api/reports/assets/by-employee/${filters.employee_id}`;
      }

      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
      const response = await fetch(fullUrl);

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        setShowPreview(true);
      } else {
        alert('Error al generar vista previa del reporte');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error al generar vista previa del reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      let url = '/api/reports/assets/export-csv';
      const params = new URLSearchParams();

      if (reportType === 'general') {
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.condition_status) params.append('condition_status', filters.condition_status);
        if (filters.operational_status) params.append('operational_status', filters.operational_status);
        if (filters.department) params.append('department', filters.department);
      } else {
        if (!filters.employee_id) {
          alert('Por favor selecciona un empleado');
          setLoading(false);
          return;
        }
        params.append('employee_id', filters.employee_id);
      }

      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
      
      // Fetch and download
      const response = await fetch(fullUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `reporte_activos_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        alert('Error al exportar reporte a CSV');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error al exportar reporte a CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      let url = '/api/reports/assets/export-pdf';
      const params = new URLSearchParams();

      if (reportType === 'general') {
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.condition_status) params.append('condition_status', filters.condition_status);
        if (filters.operational_status) params.append('operational_status', filters.operational_status);
        if (filters.department) params.append('department', filters.department);
      } else {
        if (!filters.employee_id) {
          alert('Por favor selecciona un empleado');
          setLoading(false);
          return;
        }
        params.append('employee_id', filters.employee_id);
      }

      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
      
      // Fetch and download
      const response = await fetch(fullUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `reporte_activos_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        alert('Error al exportar reporte a PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al exportar reporte a PDF');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (previewData.length === 0) {
      alert('Primero genera una vista previa del reporte');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportTitle = reportType === 'general' 
      ? 'Reporte General de Activos'
      : `Activos Asignados a ${employees.find(e => e.id === parseInt(filters.employee_id))?.first_name || ''} ${employees.find(e => e.id === parseInt(filters.employee_id))?.last_name || ''}`;

    const currentDate = formatDate(new Date().toISOString());

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              color: #2563eb;
              font-size: 24px;
              margin-bottom: 10px;
            }
            .header-info {
              margin-bottom: 20px;
              font-size: 14px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #f3f4f6;
              padding: 12px 8px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 10px 8px;
              font-size: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:hover {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 30px;
              font-size: 11px;
              color: #9ca3af;
              text-align: center;
            }
            @media print {
              body {
                margin: 0;
                padding: 15px;
              }
              tr {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <div class="header-info">
            <div>Fecha de generación: ${currentDate}</div>
            <div>Total de activos: ${previewData.length}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Condición</th>
                <th>Estado</th>
                ${reportType === 'general' ? '<th>Asignado a</th>' : ''}
                <th>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              ${previewData.map(asset => `
                <tr>
                  <td>${asset.asset_code}</td>
                  <td>${asset.name}</td>
                  <td>${asset.category_name || '-'}</td>
                  <td>${asset.brand || '-'}</td>
                  <td>${asset.model || '-'}</td>
                  <td>${getConditionText(asset.condition_status)}</td>
                  <td>${getStatusText(asset.status)}</td>
                  ${reportType === 'general' ? `<td>${asset.assigned_to_name || '-'}</td>` : ''}
                  <td>${asset.location || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            Reporte generado desde el Sistema de Gestión de Activos
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT': return 'Excelente';
      case 'GOOD': return 'Bueno';
      case 'FAIR': return 'Regular';
      case 'POOR': return 'Malo';
      default: return condition;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Disponible';
      case 'ASSIGNED': return 'Asignado';
      case 'MAINTENANCE': return 'En Mantenimiento';
      case 'RETIRED': return 'Retirado';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Generar Reporte de Activos</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Tipo de Reporte */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Reporte
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setReportType('general');
                  setShowPreview(false);
                }}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  reportType === 'general'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">Listado General de Activos</div>
                <div className="text-sm text-gray-500 mt-1">
                  Con filtros por categoría, condición y estado
                </div>
              </button>
              
              <button
                onClick={() => {
                  setReportType('by_employee');
                  setShowPreview(false);
                }}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  reportType === 'by_employee'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">Activos por Empleado</div>
                <div className="text-sm text-gray-500 mt-1">
                  Ver todos los activos asignados a un empleado específico
                </div>
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Filtros
            </label>
            
            {reportType === 'general' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Categoría</label>
                    <select
                      value={filters.category_id}
                      onChange={(e) => {
                        setFilters({ ...filters, category_id: e.target.value });
                        setShowPreview(false);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todas las categorías</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Estado de Condición</label>
                    <select
                      value={filters.condition_status}
                      onChange={(e) => {
                        setFilters({ ...filters, condition_status: e.target.value });
                        setShowPreview(false);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todas las condiciones</option>
                      <option value="EXCELLENT">Excelente</option>
                      <option value="GOOD">Bueno</option>
                      <option value="FAIR">Regular</option>
                      <option value="POOR">Malo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Estado Operacional</label>
                    <select
                      value={filters.operational_status}
                      onChange={(e) => {
                        setFilters({ ...filters, operational_status: e.target.value });
                        setShowPreview(false);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos los estados</option>
                      <option value="AVAILABLE">Disponible</option>
                      <option value="ASSIGNED">Asignado</option>
                      <option value="MAINTENANCE">En Mantenimiento</option>
                      <option value="RETIRED">Retirado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Departamento</label>
                  <select
                    value={filters.department}
                    onChange={(e) => {
                      setFilters({ ...filters, department: e.target.value });
                      setShowPreview(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los departamentos</option>
                    {Array.from(new Set(employees
                      .filter(emp => emp.department)
                      .map(emp => emp.department)))
                      .sort()
                      .map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-600 mb-2">Seleccionar Empleado</label>
                <select
                  value={filters.employee_id}
                  onChange={(e) => {
                    setFilters({ ...filters, employee_id: e.target.value });
                    setShowPreview(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar empleado...</option>
                  {employees
                    .filter(emp => emp.status === 'ACTIVE')
                    .sort((a, b) => a.first_name.localeCompare(b.first_name))
                    .map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} - {employee.position || 'Sin posición'}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleGeneratePreview}
              disabled={loading || (reportType === 'by_employee' && !filters.employee_id)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Vista Previa
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={!showPreview || previewData.length === 0}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </button>

            <button
              onClick={handleExportCSV}
              disabled={loading || (reportType === 'by_employee' && !filters.employee_id)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar a CSV
            </button>

            <button
              onClick={handleExportPDF}
              disabled={loading || (reportType === 'by_employee' && !filters.employee_id)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar a PDF
            </button>
          </div>

          {/* Vista Previa */}
          {showPreview && previewData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h4 className="text-sm font-medium text-gray-900">
                  Vista Previa del Reporte ({previewData.length} activos)
                </h4>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condición</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      {reportType === 'general' && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignado a</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((asset: any) => (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{asset.asset_code}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{asset.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{asset.category_name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-xs">{getConditionText(asset.condition_status)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-xs">{getStatusText(asset.status)}</span>
                        </td>
                        {reportType === 'general' && (
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {asset.assigned_to_name || '-'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-600">{asset.location || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showPreview && previewData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron activos con los filtros seleccionados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
