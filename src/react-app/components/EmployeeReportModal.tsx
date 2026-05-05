import { useState } from "react";
import { X, FileText, Download, Loader2, Printer } from "lucide-react";
import { formatDate } from "@/shared/date-utils";

interface EmployeeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmployeeReportModal({ isOpen, onClose }: EmployeeReportModalProps) {
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    payroll_type: '',
    company_name: '',
    sede: ''
  });
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Available departments - will be fetched from unique values in employees
  const departments = ['Administración', 'Operaciones', 'Producción', 'Logística', 'RRHH', 'Finanzas'];
  const companies = ['Cacao San Jose, C.A.', 'Hacienda San Jose, C.A.', 'Agropecuaria Santa Ana, C.A.'];
  const sedes = ['El Pilar', 'Caracas', 'Sur del Lago', 'Miranda', 'Apure'];

  const handleGeneratePreview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.department) params.append('department', filters.department);
      if (filters.payroll_type) params.append('payroll_type', filters.payroll_type);
      if (filters.company_name) params.append('company_name', filters.company_name);
      if (filters.sede) params.append('sede', filters.sede);

      const url = params.toString() ? `/api/reports/employees?${params.toString()}` : '/api/reports/employees';
      const response = await fetch(url);

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
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.department) params.append('department', filters.department);
      if (filters.payroll_type) params.append('payroll_type', filters.payroll_type);
      if (filters.company_name) params.append('company_name', filters.company_name);
      if (filters.sede) params.append('sede', filters.sede);

      const url = params.toString() ? `/api/reports/employees/export-csv?${params.toString()}` : '/api/reports/employees/export-csv';
      
      const response = await fetch(url);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `reporte_empleados_${new Date().toISOString().split('T')[0]}.csv`;
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
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.department) params.append('department', filters.department);
      if (filters.payroll_type) params.append('payroll_type', filters.payroll_type);
      if (filters.company_name) params.append('company_name', filters.company_name);
      if (filters.sede) params.append('sede', filters.sede);

      const url = params.toString() ? `/api/reports/employees/export-pdf?${params.toString()}` : '/api/reports/employees/export-pdf';
      
      const response = await fetch(url);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `reporte_empleados_${new Date().toISOString().split('T')[0]}.pdf`;
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

    const reportTitle = 'Reporte de Empleados';
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
              font-size: 11px;
              font-weight: 600;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 10px 8px;
              font-size: 11px;
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
            <div>Total de empleados: ${previewData.length}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>CI</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Departamento</th>
                <th>Posición</th>
                <th>Tipo Nómina</th>
                <th>Empresa</th>
                <th>Sede</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${previewData.map(employee => `
                <tr>
                  <td>${employee.ci || '-'}</td>
                  <td>${employee.first_name} ${employee.last_name}</td>
                  <td>${employee.email || '-'}</td>
                  <td>${employee.phone || '-'}</td>
                  <td>${employee.department || '-'}</td>
                  <td>${employee.position || '-'}</td>
                  <td>${employee.payroll_type || '-'}</td>
                  <td>${employee.company_name || '-'}</td>
                  <td>${employee.sede || '-'}</td>
                  <td>${employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            Reporte generado desde el Sistema de Gestión de Empleados
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Generar Reporte de Empleados</h3>
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
          {/* Filtros */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Filtros
            </label>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Estado</label>
                  <select
                    value={filters.status}
                    onChange={(e) => {
                      setFilters({ ...filters, status: e.target.value });
                      setShowPreview(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los estados</option>
                    <option value="ACTIVE">Activos</option>
                    <option value="INACTIVE">Inactivos</option>
                  </select>
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
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Tipo de Nómina</label>
                  <select
                    value={filters.payroll_type}
                    onChange={(e) => {
                      setFilters({ ...filters, payroll_type: e.target.value });
                      setShowPreview(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los tipos</option>
                    <option value="OPERARIO">Operario</option>
                    <option value="EMPLEADO">Empleado</option>
                    <option value="CONFIDENCIAL">Confidencial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Empresa</label>
                  <select
                    value={filters.company_name}
                    onChange={(e) => {
                      setFilters({ ...filters, company_name: e.target.value });
                      setShowPreview(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas las empresas</option>
                    {companies.map(company => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Sede</label>
                  <select
                    value={filters.sede}
                    onChange={(e) => {
                      setFilters({ ...filters, sede: e.target.value });
                      setShowPreview(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas las sedes</option>
                    {sedes.map(sede => (
                      <option key={sede} value={sede}>{sede}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleGeneratePreview}
              disabled={loading}
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
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar a CSV
            </button>

            <button
              onClick={handleExportPDF}
              disabled={loading}
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
                  Vista Previa del Reporte ({previewData.length} empleados)
                </h4>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CI</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Nómina</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((employee: any) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.ci}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{employee.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{employee.department || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{employee.position || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{employee.payroll_type || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{employee.company_name || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            employee.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showPreview && previewData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron empleados con los filtros seleccionados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
