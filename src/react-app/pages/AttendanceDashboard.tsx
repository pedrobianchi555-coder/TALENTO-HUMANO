import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, AlertCircle, CheckCircle, Users, TrendingUp, Download, Filter } from 'lucide-react';

interface AttendanceRecord {
  id: number;
  user_id: number;
  date: string;
  check_in: string;
  check_out: string;
  hours_worked: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE';
  user?: {
    first_name: string;
    last_name: string;
    department: string;
  };
}

interface AttendanceSummary {
  total_employees: number;
  presents: number;
  lates: number;
  absents: number;
  early_leaves: number;
  total_hours_worked: number;
  average_hours: number;
}

export default function AttendanceDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [department, setDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Cargar departamentos
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/attendance/departments');
        const data = await res.json();
        setDepartments(data);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  // Cargar datos de asistencia
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ month: String(month), year: String(year) });
        if (department) params.append('department', department);

        const res = await fetch(`/api/reports/attendance?${params}`);
        const data = await res.json();

        setRecords(data.records || []);
        setSummary(data.stats);

        // Preparar datos para gráficos
        prepareChartData(data.records || []);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [month, year, department]);

  const prepareChartData = (recs: AttendanceRecord[]) => {
    // Agrupar por fecha para gráfico de línea
    const byDate: { [key: string]: { date: string; present: number; late: number; absent: number } } = {};

    recs.forEach(record => {
      if (!byDate[record.date]) {
        byDate[record.date] = { date: record.date, present: 0, late: 0, absent: 0 };
      }
      if (record.status === 'PRESENT') byDate[record.date].present++;
      else if (record.status === 'LATE') byDate[record.date].late++;
      else if (record.status === 'ABSENT') byDate[record.date].absent++;
    });

    const sorted = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    setChartData(sorted);
  };

  const statusColors: { [key: string]: string } = {
    PRESENT: '#10b981',
    LATE: '#f59e0b',
    ABSENT: '#ef4444',
    EARLY_LEAVE: '#3b82f6',
  };

  const statusLabels: { [key: string]: string } = {
    PRESENT: 'Presente',
    LATE: 'Tardanza',
    ABSENT: 'Ausencia',
    EARLY_LEAVE: 'Salida Temprana',
  };

  const pieData = summary ? [
    { name: 'Presente', value: summary.presents, color: '#10b981' },
    { name: 'Tardanza', value: summary.lates, color: '#f59e0b' },
    { name: 'Ausencia', value: summary.absents, color: '#ef4444' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="text-blue-600" size={32} />
            Reporte de Asistencia
          </h1>
          <p className="text-gray-600 mt-2">Monitor de asistencia desde Hikvision</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {new Date(2024, m - 1).toLocaleDateString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                <Download size={18} />
                Descargar CSV
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <KPICard
                title="Total Empleados"
                value={summary?.total_employees || 0}
                icon={<Users className="text-blue-600" />}
                color="blue"
              />
              <KPICard
                title="Presentes"
                value={summary?.presents || 0}
                icon={<CheckCircle className="text-green-600" />}
                color="green"
              />
              <KPICard
                title="Tardanzas"
                value={summary?.lates || 0}
                icon={<AlertCircle className="text-yellow-600" />}
                color="yellow"
              />
              <KPICard
                title="Ausencias"
                value={summary?.absents || 0}
                icon={<AlertCircle className="text-red-600" />}
                color="red"
              />
              <KPICard
                title="Promedio Horas"
                value={summary?.average_hours || 0}
                suffix="h"
                icon={<TrendingUp className="text-purple-600" />}
                color="purple"
              />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Gráfico de línea */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Asistencia</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#10b981" name="Presente" />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Tardanza" />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Ausencia" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla de Registros */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Registros de Asistencia</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Empleado</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Departamento</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Check-in</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Check-out</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Horas</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No hay registros para el período seleccionado
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {record.user?.first_name} {record.user?.last_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{record.user?.department}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(record.date).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {record.check_in ? new Date(record.check_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {record.check_out ? new Date(record.check_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {record.hours_worked ? `${record.hours_worked.toFixed(1)}h` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className="px-3 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: statusColors[record.status] }}
                            >
                              {statusLabels[record.status]}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  suffix = '',
  icon,
  color,
}: {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
}) {
  const bgColors: { [key: string]: string } = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
    purple: 'bg-purple-50',
  };

  return (
    <div className={`${bgColors[color]} rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {suffix}
          </p>
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </div>
  );
}
