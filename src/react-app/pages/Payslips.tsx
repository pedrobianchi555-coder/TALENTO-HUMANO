import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, Receipt, Plus, Calendar, Download,
  User, Filter, FileText
} from "lucide-react";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";
import { formatDateShort } from "@/shared/date-utils";
import PayslipUploadModal from "@/react-app/components/PayslipUploadModal";

interface Payslip {
  id: number;
  user_id: number;
  file_url: string;
  title: string;
  month: number;
  year: number;
  uploaded_by_id: number;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  uploaded_by_name?: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Payslips() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { can, isHR, loading: permissionsLoading } = usePermissions();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [filteredPayslips, setFilteredPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) return;

      try {
        const payslipsResponse = await fetch("/api/payslips");
        if (payslipsResponse.ok) {
          const data = await payslipsResponse.json();
          setPayslips(data);
          setFilteredPayslips(data);

          // Extract unique years for filter
          const uniqueYears = Array.from(new Set<number>(data.map((p: Payslip) => p.year)));
          const sortedYears = uniqueYears.sort((a, b) => b - a);
          setAvailableYears(sortedYears);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authUser]);

  useEffect(() => {
    let filtered = payslips;

    if (filterYear !== 'ALL') {
      filtered = filtered.filter(p => p.year === parseInt(filterYear));
    }

    if (filterMonth !== 'ALL') {
      filtered = filtered.filter(p => p.month === parseInt(filterMonth));
    }

    setFilteredPayslips(filtered);
  }, [filterYear, filterMonth, payslips]);

  const refreshPayslips = async () => {
    try {
      const response = await fetch("/api/payslips");
      if (response.ok) {
        const data = await response.json();
        setPayslips(data);
        setFilteredPayslips(data);
        
        const uniqueYears = Array.from(new Set<number>(data.map((p: Payslip) => p.year)));
        const sortedYears = uniqueYears.sort((a, b) => b - a);
        setAvailableYears(sortedYears);
      }
    } catch (error) {
      console.error("Error refreshing payslips:", error);
    }
  };

  if (isPending || loading || permissionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando recibos de pago...</p>
      </div>
    );
  }

  const getMonthName = (month: number) => MONTHS[month - 1];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <Receipt className="w-8 h-8 mr-3 text-blue-600" />
                {isHR ? 'Gestión de Recibos de Pago' : 'Mis Recibos de Pago'}
              </h1>
              <p className="text-gray-600">
                {isHR 
                  ? 'Administra y sube los recibos de pago de los empleados'
                  : 'Consulta y descarga tus recibos de pago mensuales'
                }
              </p>
            </div>
            {isHR && can(PERMISSIONS.PAYSLIP_UPLOAD) && (
              <button 
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Subir Recibo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todos los años</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todos los meses</option>
                {MONTHS.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Recibos</p>
                <p className="text-2xl font-bold text-gray-900">{payslips.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Año Actual</p>
                <p className="text-2xl font-bold text-gray-900">
                  {payslips.filter(p => p.year === new Date().getFullYear()).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mes Actual</p>
                <p className="text-2xl font-bold text-gray-900">
                  {payslips.filter(p => 
                    p.year === new Date().getFullYear() && 
                    p.month === new Date().getMonth() + 1
                  ).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payslips List */}
        {filteredPayslips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No hay recibos de pago disponibles
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {isHR 
                ? 'Comienza subiendo el primer recibo de pago.'
                : 'Los recibos aparecerán aquí cuando estén disponibles.'
              }
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isHR && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empleado
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Subida
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-gray-50">
                    {isHR && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{payslip.employee_name || 'N/A'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {getMonthName(payslip.month)} {payslip.year}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{payslip.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDateShort(payslip.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={async () => {
                          try {
                            // Fetch the file as a blob
                            const response = await fetch(payslip.file_url);
                            if (!response.ok) {
                              throw new Error('Error al descargar el archivo');
                            }
                            
                            const blob = await response.blob();
                            
                            // Create object URL from blob
                            const url = window.URL.createObjectURL(blob);
                            
                            // Create temporary link and trigger download
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `Recibo_de_Pago_${getMonthName(payslip.month)}_${payslip.year}_${payslip.employee_name || 'Empleado'}.pdf`;
                            
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            // Clean up object URL
                            window.URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Error descargando recibo:', error);
                            alert('Error al descargar el recibo de pago');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <PayslipUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={refreshPayslips}
        />
      )}
    </div>
  );
}
