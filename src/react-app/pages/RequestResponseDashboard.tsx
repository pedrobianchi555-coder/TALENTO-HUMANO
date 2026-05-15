import { useEffect, useState } from "react";
import { 
  BarChart, Clock, CheckCircle, XCircle, TrendingUp, 
  Users, Filter, Download, Loader2
} from "lucide-react";
import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RequestReport {
  summary: {
    total_requests: number;
    avg_response_time_minutes: number;
    approved_count: number;
    rejected_count: number;
    approval_rate: number;
  };
  by_resolver: Array<{
    resolver_id: number;
    resolver_name: string;
    total_requests: number;
    approved_count: number;
    rejected_count: number;
    avg_response_time: number;
    approval_rate: number;
  }>;
  by_category: Array<{
    category: string;
    total_requests: number;
    avg_response_time: number;
  }>;
  by_type: Array<{
    type: string;
    total_requests: number;
    avg_response_time: number;
  }>;
  slowest_requests: Array<any>;
  fastest_requests: Array<any>;
  all_requests: Array<any>;
}

export default function RequestResponseDashboard() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<RequestReport | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    category: '',
    resolved_by_id: ''
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.resolved_by_id) params.append('resolved_by_id', filters.resolved_by_id);

      const response = await fetch(`/api/reports/request-response-times?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    const headers = ['Empleado', 'Tipo', 'Categoría', 'Estado', 'Resuelto Por', 'Tiempo de Respuesta (min)', 'Fecha Creación', 'Fecha Resolución'];
    const rows = report.all_requests.map(r => [
      r.employee_name,
      r.type,
      r.category,
      r.status,
      r.resolver_name || 'N/A',
      r.response_time_minutes,
      new Date(r.created_at).toLocaleString('es-ES'),
      new Date(r.updated_at).toLocaleString('es-ES')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-tiempos-respuesta-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Cargando reporte...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error al cargar el reporte</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart className="w-8 h-8 text-blue-600" />
                Dashboard de Tiempos de Respuesta
              </h1>
              <p className="text-gray-600 mt-2">
                Análisis de efectividad en la gestión de solicitudes
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  <option value="Gestión Laboral">Gestión Laboral</option>
                  <option value="Bienestar">Bienestar</option>
                  <option value="Desarrollo">Desarrollo</option>
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                <button
                  onClick={fetchReport}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">
                {formatTime(report.summary.avg_response_time_minutes)}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Tiempo Promedio</h3>
            <p className="text-sm text-gray-600 mt-1">De respuesta general</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-green-600">
                {report.summary.approved_count}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Aprobadas</h3>
            <p className="text-sm text-gray-600 mt-1">
              {report.summary.approval_rate.toFixed(1)}% del total
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-sm border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-red-600" />
              <span className="text-3xl font-bold text-red-600">
                {report.summary.rejected_count}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Rechazadas</h3>
            <p className="text-sm text-gray-600 mt-1">
              {(100 - report.summary.approval_rate).toFixed(1)}% del total
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-3xl font-bold text-purple-600">
                {report.summary.total_requests}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Total Procesadas</h3>
            <p className="text-sm text-gray-600 mt-1">En el período</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance by Resolver */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Desempeño por Especialista
              </h2>
            </div>
            {report.by_resolver.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBar data={report.by_resolver}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="resolver_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value: any) => formatTime(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Bar dataKey="avg_response_time" name="Tiempo Promedio" fill="#3B82F6" />
                </RechartsBar>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
            )}
          </div>

          {/* By Category */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Por Categoría
              </h2>
            </div>
            {report.by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={report.by_category}
                    dataKey="total_requests"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry: any) => `${entry.category}: ${entry.total_requests}`}
                  >
                    {report.by_category.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
            )}
          </div>
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Resolver Performance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Desempeño Detallado por Especialista
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">
                      Especialista
                    </th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">
                      Total
                    </th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">
                      Tiempo Prom.
                    </th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">
                      % Aprobación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_resolver.map((resolver, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {resolver.resolver_name}
                      </td>
                      <td className="text-center py-3 px-3 text-sm text-gray-900">
                        {resolver.total_requests}
                      </td>
                      <td className="text-center py-3 px-3 text-sm text-gray-900">
                        {formatTime(resolver.avg_response_time)}
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          resolver.approval_rate >= 70 ? 'bg-green-100 text-green-700' :
                          resolver.approval_rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {resolver.approval_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slowest Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top 5 Solicitudes Más Lentas
            </h2>
            <div className="space-y-3">
              {report.slowest_requests.slice(0, 5).map((req, idx) => (
                <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {req.employee_name}
                    </span>
                    <span className="text-sm font-bold text-red-600">
                      {formatTime(req.response_time_minutes)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{req.type} - {req.category}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Resuelto por: {req.resolver_name || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
