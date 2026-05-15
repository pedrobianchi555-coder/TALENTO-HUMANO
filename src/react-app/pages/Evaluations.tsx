import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2, Star, Plus, Calendar, BarChart, CheckCircle, Clock, User, Search, X, AlertCircle } from "lucide-react";
import type { Evaluation, EvaluationCycle, EnhancedUser } from "@/shared/types";
import ManagerEvaluationModal from "@/react-app/components/ManagerEvaluationModal";
import SelfEvaluationModal from "@/react-app/components/SelfEvaluationModal";
import EvaluationDetailModal from "@/react-app/components/EvaluationDetailModal";
import ConfirmationModal from "@/react-app/components/ConfirmationModal";
import { useConfirmationModal } from "@/react-app/hooks/useConfirmationModal";
import { formatDateShort } from "@/shared/date-utils";

interface EvaluationWithDetails extends Evaluation {
  employee_name?: string;
  evaluator_name?: string;
  cycle_title?: string;
  employee_department?: string;
}

export default function Evaluations() {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<EvaluationWithDetails[]>([]);
  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'evaluations' | 'cycles'>('evaluations');
  
  // Modals
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [showManagerEvaluationModal, setShowManagerEvaluationModal] = useState(false);
  const [showSelfEvaluationModal, setShowSelfEvaluationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationWithDetails | null>(null);
  
  // Confirmation modal
  const { modalConfig, showAlert, showConfirm, closeModal, handleConfirm } = useConfirmationModal();
  
  // New cycle form
  const [newCycle, setNewCycle] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    department: ''
  });
  
  // Departments list
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    cycle: '',
    department: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user profile
      const userResponse = await fetch("/api/users/me", {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        if (userResponse.status === 401 || userResponse.status === 403) {
          navigate("/");
          return;
        }
        throw new Error("Error al cargar perfil de usuario");
      }
      
      const userData = await userResponse.json();
      if (!userData.profile) {
        navigate("/profile-setup");
        return;
      }
      setUser(userData);

      // Get evaluations
      const evaluationsResponse = await fetch("/api/evaluations", {
        credentials: 'include'
      });
      
      if (evaluationsResponse.ok) {
        const data = await evaluationsResponse.json();
        setEvaluations(Array.isArray(data) ? data : []);
      }

      // Get cycles if HR
      if (userData.profile.role === 'HR') {
        const cyclesResponse = await fetch("/api/evaluation-cycles", {
          credentials: 'include'
        });
        
        if (cyclesResponse.ok) {
          const data = await cyclesResponse.json();
          setCycles(Array.isArray(data) ? data : []);
        }
        
        // Get departments for cycle creation
        const departmentsResponse = await fetch("/api/chat/departments", {
          credentials: 'include'
        });
        
        if (departmentsResponse.ok) {
          const depts = await departmentsResponse.json();
          setDepartments(Array.isArray(depts) ? depts : []);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCycle.title || !newCycle.start_date || !newCycle.end_date) {
      showAlert("Campos Obligatorios", "Por favor completa todos los campos obligatorios", "warning");
      return;
    }

    if (new Date(newCycle.start_date) >= new Date(newCycle.end_date)) {
      showAlert("Fechas Inválidas", "La fecha de inicio debe ser anterior a la fecha de fin", "error");
      return;
    }

    try {
      const response = await fetch("/api/evaluation-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(newCycle),
      });

      if (response.ok) {
        const createdCycle = await response.json();
        setCycles([createdCycle, ...cycles]);
        setShowNewCycleModal(false);
        setNewCycle({ title: '', description: '', start_date: '', end_date: '', department: '' });
        showAlert("Ciclo Creado", "Ciclo creado exitosamente", "success");
      } else {
        const errorData = await response.json();
        showAlert("Error", errorData.error || 'Error desconocido', "error");
      }
    } catch (error) {
      console.error("Error creating cycle:", error);
      showAlert("Error", "Error al crear el ciclo", "error");
    }
  };

  const handleActivateCycle = async (cycleId: number) => {
    const cycle = cycles.find(c => c.id === cycleId);
    const confirmMessage = cycle?.department 
      ? `¿Activar este ciclo? Se generarán evaluaciones para todos los empleados activos del departamento ${cycle.department}.`
      : "¿Activar este ciclo? Se generarán evaluaciones para todos los empleados activos de la empresa.";
    
    showConfirm(
      "Activar Ciclo",
      confirmMessage,
      async () => {
        try {
          const response = await fetch(`/api/evaluation-cycles/${cycleId}/activate`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
          });

          if (response.ok) {
            const updatedCycle = await response.json();
            setCycles(cycles.map(c => c.id === cycleId ? updatedCycle : c));
            await fetchData(); // Refresh evaluations
            showAlert("Ciclo Activado", "Ciclo activado exitosamente", "success");
          } else {
            const errorData = await response.json();
            showAlert("Error", errorData.error || 'Error desconocido', "error");
          }
        } catch (error) {
          console.error("Error activating cycle:", error);
          showAlert("Error", "Error al activar el ciclo", "error");
        }
      },
      { type: 'confirm', confirmButtonText: 'Activar', cancelButtonText: 'Cancelar' }
    );
  };

  const handleOpenManagerEvaluation = (evaluation: EvaluationWithDetails) => {
    setSelectedEvaluation(evaluation);
    setShowManagerEvaluationModal(true);
  };

  const handleOpenSelfEvaluation = (evaluation: EvaluationWithDetails) => {
    setSelectedEvaluation(evaluation);
    setShowSelfEvaluationModal(true);
  };

  const handleOpenDetail = (evaluation: EvaluationWithDetails) => {
    setSelectedEvaluation(evaluation);
    setShowDetailModal(true);
  };

  const handleSaveEvaluation = (updatedEvaluation: Evaluation) => {
    setEvaluations(prevEvaluations => 
      prevEvaluations.map(e => 
        e.id === updatedEvaluation.id ? { ...e, ...updatedEvaluation } : e
      )
    );
    setShowManagerEvaluationModal(false);
    setShowSelfEvaluationModal(false);
    setSelectedEvaluation(null);
  };

  const renderStars = (score: number | null) => {
    if (score === null) return <span className="text-gray-400">No calificado</span>;
    
    return (
      <div className="flex items-center">
        {Array.from({length: 5}, (_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < score ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{score.toFixed(1)}</span>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pendiente Autoevaluación' },
      SELF_COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: User, label: 'Autoevaluación Completada' },
      MANAGER_COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-800', icon: User, label: 'Pendiente Evaluación Manager' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Completada' },
    };
    
    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.label}
      </span>
    );
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    if (filters.search && evaluation.employee_name) {
      if (!evaluation.employee_name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
    }
    if (filters.status && evaluation.status !== filters.status) return false;
    if (filters.cycle && evaluation.cycle_title !== filters.cycle) return false;
    if (filters.department && evaluation.employee_department !== filters.department) return false;
    return true;
  });

  const uniqueCycles = Array.from(new Set(evaluations.map(e => e.cycle_title).filter(Boolean))).sort();
  const uniqueDepartments = Array.from(new Set(evaluations.map(e => e.employee_department).filter(Boolean))).sort();

  const stats = {
    total: evaluations.length,
    pending: evaluations.filter(e => ['PENDING', 'SELF_COMPLETED', 'MANAGER_COMPLETED'].includes(e.status) && e.status !== 'COMPLETED').length,
    completed: evaluations.filter(e => e.status === 'COMPLETED').length,
    average: evaluations.filter(e => e.final_score).reduce((sum, e) => sum + (e.final_score || 0), 0) / 
             (evaluations.filter(e => e.final_score).length || 1)
  };

  const isHR = user?.profile?.role === 'HR';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-600">Cargando evaluaciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <BarChart className="w-8 h-8 mr-3 text-blue-600" />
                {isHR ? 'Gestionar Evaluaciones' : 'Mis Evaluaciones'}
              </h1>
              <p className="text-gray-600">
                {isHR ? 'Administra ciclos y evaluaciones de desempeño' : 'Consulta tus evaluaciones y calificaciones'}
              </p>
            </div>
            {isHR && (
              <button 
                onClick={() => setShowNewCycleModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Ciclo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs (HR only) */}
        {isHR && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="flex">
              <button
                onClick={() => setSelectedTab('evaluations')}
                className={`flex-1 px-6 py-3 text-sm font-medium rounded-l-lg transition-colors ${
                  selectedTab === 'evaluations'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Evaluaciones
              </button>
              <button
                onClick={() => setSelectedTab('cycles')}
                className={`flex-1 px-6 py-3 text-sm font-medium rounded-r-lg transition-colors ${
                  selectedTab === 'cycles'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Ciclos de Evaluación
              </button>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.average > 0 ? stats.average.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {(!isHR || selectedTab === 'evaluations') && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isHR ? 'Todas las Evaluaciones' : 'Mis Evaluaciones'} ({filteredEvaluations.length})
                </h2>
                {(filters.search || filters.status || filters.cycle || filters.department) && (
                  <button
                    onClick={() => setFilters({ search: '', status: '', cycle: '', department: '' })}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpiar filtros
                  </button>
                )}
              </div>

              {/* Filters (HR only) */}
              {isHR && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar empleado..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los estados</option>
                    <option value="PENDING">Pendiente Autoevaluación</option>
                    <option value="SELF_COMPLETED">Autoevaluación Completada</option>
                    <option value="MANAGER_COMPLETED">Pendiente Evaluación Manager</option>
                    <option value="COMPLETED">Completada</option>
                  </select>

                  <select
                    value={filters.cycle}
                    onChange={(e) => setFilters({ ...filters, cycle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los ciclos</option>
                    {uniqueCycles.map((cycle) => (
                      <option key={cycle} value={cycle}>{cycle}</option>
                    ))}
                  </select>

                  <select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los departamentos</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="divide-y divide-gray-200">
              {filteredEvaluations.map((evaluation) => (
                <div key={evaluation.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {evaluation.cycle_title || `Evaluación #${evaluation.id}`}
                        </h3>
                        {getStatusBadge(evaluation.status)}
                      </div>
                      
                      {isHR && evaluation.employee_name && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Empleado:</span> {evaluation.employee_name}
                        </p>
                      )}
                      
                      {evaluation.evaluator_name && (
                        <p className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Evaluador:</span> {evaluation.evaluator_name}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Autoevaluación</p>
                          {renderStars(evaluation.self_score ?? null)}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Evaluación del Manager</p>
                          {renderStars(evaluation.manager_score ?? null)}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Calificación Final</p>
                          {renderStars(evaluation.final_score ?? null)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-3">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Creada: {formatDateShort(evaluation.created_at)}
                        </span>
                        {evaluation.completed_at && (
                          <span className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completada: {formatDateShort(evaluation.completed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      {/* Self-evaluation button */}
                      {evaluation.status === 'PENDING' && !isHR && user?.profile && 
                       evaluation.employee_id === user.profile.id && evaluation.evaluator_id === user.profile.id && (
                        <button 
                          onClick={() => handleOpenSelfEvaluation(evaluation)}
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors whitespace-nowrap"
                        >
                          Completar Autoevaluación
                        </button>
                      )}
                      
                      {/* Manager evaluation button - MANAGER_COMPLETED means waiting for manager input */}
                      {evaluation.status === 'MANAGER_COMPLETED' && user?.profile && 
                       (isHR || evaluation.evaluator_id === user.profile.id) && 
                       evaluation.employee_id !== evaluation.evaluator_id && (
                        <button 
                          onClick={() => handleOpenManagerEvaluation(evaluation)}
                          className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors whitespace-nowrap"
                        >
                          Evaluar Empleado
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleOpenDetail(evaluation)}
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredEvaluations.length === 0 && (
              <div className="text-center py-12">
                <BarChart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {evaluations.length === 0 ? 'No hay evaluaciones' : 'No se encontraron evaluaciones'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {evaluations.length === 0
                    ? (isHR 
                        ? 'Las evaluaciones aparecerán cuando se activen ciclos.'
                        : 'Tus evaluaciones aparecerán aquí cuando sean asignadas.'
                      )
                    : 'Intenta ajustar los filtros de búsqueda.'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cycles Tab (HR only) */}
        {isHR && selectedTab === 'cycles' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Ciclos de Evaluación ({cycles.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {cycles.map((cycle) => (
                <div key={cycle.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-medium text-gray-900">{cycle.title}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          cycle.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          cycle.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                          cycle.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {cycle.status === 'ACTIVE' ? 'Activo' : 
                           cycle.status === 'COMPLETED' ? 'Completado' :
                           cycle.status === 'DRAFT' ? 'Borrador' : 'Cancelado'}
                        </span>
                      </div>
                      
                      {cycle.description && (
                        <p className="text-sm text-gray-600 mb-3">{cycle.description}</p>
                      )}
                      
                      {cycle.department && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Departamento:</span> {cycle.department}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>Inicio: {formatDateShort(cycle.start_date)}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>Fin: {formatDateShort(cycle.end_date)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      {cycle.status === 'DRAFT' && (
                        <button 
                          onClick={() => handleActivateCycle(cycle.id)}
                          className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors whitespace-nowrap"
                        >
                          Activar Ciclo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cycles.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ciclos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Crea el primer ciclo para comenzar con las evaluaciones.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSelfEvaluationModal && selectedEvaluation && (
        <SelfEvaluationModal
          isOpen={showSelfEvaluationModal}
          onClose={() => {
            setShowSelfEvaluationModal(false);
            setSelectedEvaluation(null);
          }}
          onSave={handleSaveEvaluation}
          evaluation={selectedEvaluation}
        />
      )}

      {showManagerEvaluationModal && selectedEvaluation && (
        <ManagerEvaluationModal
          isOpen={showManagerEvaluationModal}
          onClose={() => {
            setShowManagerEvaluationModal(false);
            setSelectedEvaluation(null);
          }}
          onSave={handleSaveEvaluation}
          evaluation={selectedEvaluation}
        />
      )}

      {showDetailModal && selectedEvaluation && (
        <EvaluationDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEvaluation(null);
          }}
          evaluation={selectedEvaluation}
        />
      )}

      {/* New Cycle Modal */}
      {showNewCycleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Nuevo Ciclo de Evaluación
                </h3>
                <button
                  onClick={() => setShowNewCycleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateCycle} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título del Ciclo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCycle.title}
                    onChange={(e) => setNewCycle({ ...newCycle, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Evaluación Anual 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={newCycle.description}
                    onChange={(e) => setNewCycle({ ...newCycle, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe el propósito y objetivos de este ciclo..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento
                  </label>
                  <select
                    value={newCycle.department}
                    onChange={(e) => setNewCycle({ ...newCycle, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los departamentos</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Selecciona un departamento específico o deja en blanco para incluir a todos los empleados
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      required
                      value={newCycle.start_date}
                      onChange={(e) => setNewCycle({ ...newCycle, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Fin *
                    </label>
                    <input
                      type="date"
                      required
                      value={newCycle.end_date}
                      onChange={(e) => setNewCycle({ ...newCycle, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={newCycle.start_date}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewCycleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Crear Ciclo
                </button>
              </div>
            </form>
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
    </div>
  );
}
