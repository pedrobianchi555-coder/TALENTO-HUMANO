import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, CreditCard, Plus, Search, Filter, 
  Eye, Clock, CheckCircle, DollarSign,
  TrendingUp, AlertTriangle, FileText
} from "lucide-react";
import type { EnhancedUser, UserProfile } from "@/shared/types";
import LoanFormModal from "@/react-app/components/LoanFormModal";
import { formatDateShort } from "@/shared/date-utils";
import LoanDetailModal from "@/react-app/components/LoanDetailModal";
import RegisterPaymentModal from "@/react-app/components/RegisterPaymentModal";
import LoanReportModal from "@/react-app/components/LoanReportModal";

interface ExtendedLoan {
  id: number;
  user_id: number;
  principal_amount: number;
  interest_rate: number;
  status: 'ACTIVE' | 'PAID_OFF' | 'CANCELLED';
  issue_date: string;
  category: string;
  monthly_installment: number;
  total_installments: number;
  remaining_installments: number;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  employee_email?: string;
  total_paid?: number;
  pending_amount?: number;
}

export default function Loans() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [isHR, setIsHR] = useState(false);
  const [loans, setLoans] = useState<ExtendedLoan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<ExtendedLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showLoanDetail, setShowLoanDetail] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ExtendedLoan | null>(null);
  const [editingLoan, setEditingLoan] = useState<ExtendedLoan | null>(null);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!authUser) return;

      try {
        setLoading(true);
        console.log('Fetching user profile...');
        
        // Get user profile first
        const userResponse = await fetch("/api/users/me", {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user profile: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        console.log('User data:', userData);
        setUser(userData);
        
        const isHRUser = userData.profile?.role === 'HR';
        setIsHR(isHRUser);
        console.log('User is HR:', isHRUser);

        // Fetch loans
        console.log('Fetching loans...');
        const loansResponse = await fetch("/api/loans/detailed", {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (loansResponse.ok) {
          const loansData = await loansResponse.json();
          console.log('Loans fetched:', loansData.length);
          setLoans(loansData);
          setFilteredLoans(loansData);
        } else {
          console.error('Failed to fetch loans:', loansResponse.status);
        }

        // Fetch employees only if user is HR
        if (isHRUser) {
          await loadEmployees();
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [authUser]);

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    setEmployeesError(null);
    
    try {
      console.log('Fetching employees...');
      const response = await fetch("/api/employees", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Employees response status:', response.status);
      
      if (response.ok) {
        const employeesData = await response.json();
        console.log('Employees fetched:', employeesData.length);
        setEmployees(employeesData);
        setEmployeesError(null);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch employees:', response.status, errorText);
        setEmployeesError(`Error ${response.status}: No se pudieron cargar los empleados`);
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployeesError('Error de conexión al cargar empleados');
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    let filtered = loans;

    if (filterStatus !== "ALL") {
      filtered = filtered.filter(loan => loan.status === filterStatus);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(loan => 
        loan.employee_name?.toLowerCase().includes(searchLower) ||
        loan.category.toLowerCase().includes(searchLower) ||
        loan.status.toLowerCase().includes(searchLower) ||
        loan.id.toString().includes(searchLower)
      );
    }

    setFilteredLoans(filtered);
  }, [loans, searchTerm, filterStatus]);

  if (isPending || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando préstamos...</p>
      </div>
    );
  }

  if (!user?.profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Perfil no configurado</h2>
        <p className="text-gray-600 mb-4">Necesitas completar tu perfil para acceder a los préstamos.</p>
        <button
          onClick={() => navigate('/profile/setup')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Configurar Perfil
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800';
      case 'PAID_OFF':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4" />;
      case 'PAID_OFF':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleLoanCreated = async () => {
    setShowLoanForm(false);
    setEditingLoan(null);
    
    // Refresh loans
    try {
      const loansResponse = await fetch("/api/loans/detailed", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (loansResponse.ok) {
        const loansData = await loansResponse.json();
        setLoans(loansData);
        setFilteredLoans(loansData);
      }
    } catch (error) {
      console.error('Error refreshing loans:', error);
    }
  };

  const handlePaymentRegistered = async () => {
    setShowPaymentForm(false);
    setSelectedLoan(null);
    
    // Refresh loans
    try {
      const loansResponse = await fetch("/api/loans/detailed", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (loansResponse.ok) {
        const loansData = await loansResponse.json();
        setLoans(loansData);
        setFilteredLoans(loansData);
      }
    } catch (error) {
      console.error('Error refreshing loans:', error);
    }
  };

  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const totalLent = activeLoans.reduce((sum, l) => sum + l.principal_amount, 0);
  const totalPending = activeLoans.reduce((sum, l) => sum + (l.pending_amount || 0), 0);
  const completedLoans = loans.filter(l => l.status === 'PAID_OFF').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <CreditCard className="w-8 h-8 mr-3 text-blue-600" />
                {isHR ? 'Gestión de Préstamos' : 'Mis Préstamos'}
              </h1>
              <p className="text-gray-600">
                {isHR ? 'Administra préstamos y pagos de empleados' : 'Consulta el estado de tus préstamos y pagos'}
              </p>
            </div>
            <div className="flex space-x-3">
              {isHR && (
                <>
                  <button 
                    onClick={() => setShowReportModal(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generar Reportes
                  </button>
                  <button 
                    onClick={() => setShowLoanForm(true)}
                    disabled={employeesLoading || employeesError !== null}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Préstamo
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Employee loading status */}
          {isHR && (employeesLoading || employeesError) && (
            <div className="max-w-7xl mx-auto mt-4">
              {employeesLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin mr-2" />
                  <span className="text-blue-800 text-sm">Cargando empleados...</span>
                </div>
              )}
              
              {employeesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                    <span className="text-red-800 text-sm">{employeesError}</span>
                  </div>
                  <button
                    onClick={loadEmployees}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Préstamos Activos</p>
                <p className="text-2xl font-bold text-gray-900">{activeLoans.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Prestado</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalLent)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-gray-900">{completedLoans}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        {isHR && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar por empleado, categoría, estado o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="PAID_OFF">Pagado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Loans List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Lista de Préstamos ({filteredLoans.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredLoans.map((loan) => (
              <div key={loan.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        Préstamo #{loan.id}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(loan.status)}`}>
                        {getStatusIcon(loan.status)}
                        <span className="ml-1">
                          {loan.status === 'ACTIVE' ? 'Activo' : 
                           loan.status === 'PAID_OFF' ? 'Pagado' : 'Cancelado'}
                        </span>
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {loan.category}
                      </span>
                    </div>
                    
                    {isHR && loan.employee_name && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Empleado:</span> {loan.employee_name}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Monto Original</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(loan.principal_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Saldo Pendiente</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(loan.pending_amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cuota Mensual</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(loan.monthly_installment)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Fecha Emisión</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDateShort(loan.issue_date)}
                        </p>
                      </div>
                    </div>
                    
                    {loan.status === 'ACTIVE' && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${((loan.total_installments - loan.remaining_installments) / loan.total_installments) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Progreso: {loan.total_installments - loan.remaining_installments} de {loan.total_installments} cuotas
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <button 
                      onClick={() => {
                        setSelectedLoan(loan);
                        setShowLoanDetail(true);
                      }}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver Detalles
                    </button>
                    
                    {isHR && loan.status === 'ACTIVE' && (
                      <button 
                        onClick={() => {
                          setSelectedLoan(loan);
                          setShowPaymentForm(true);
                        }}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Registrar Pago
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLoans.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No se encontraron préstamos' : 'No hay préstamos'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'Prueba con otros términos de búsqueda.'
                  : isHR 
                    ? 'Los préstamos aparecerán aquí cuando se otorguen.'
                    : 'Tus préstamos aparecerán aquí cuando sean aprobados.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Loan Form Modal */}
      {showLoanForm && isHR && (
        <LoanFormModal
          isOpen={showLoanForm}
          onClose={() => {
            setShowLoanForm(false);
            setEditingLoan(null);
          }}
          onSave={handleLoanCreated}
          employees={employees}
          editingLoan={editingLoan}
        />
      )}

      {/* Loan Detail Modal */}
      {showLoanDetail && selectedLoan && (
        <LoanDetailModal
          isOpen={showLoanDetail}
          onClose={() => {
            setShowLoanDetail(false);
            setSelectedLoan(null);
          }}
          loan={selectedLoan}
          isHR={isHR}
          onEdit={(loan) => {
            setEditingLoan(loan);
            setShowLoanForm(true);
            setShowLoanDetail(false);
          }}
          onPayment={(loan) => {
            setSelectedLoan(loan);
            setShowPaymentForm(true);
            setShowLoanDetail(false);
          }}
        />
      )}

      {/* Payment Registration Modal */}
      {showPaymentForm && selectedLoan && isHR && (
        <RegisterPaymentModal
          isOpen={showPaymentForm}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedLoan(null);
          }}
          loan={selectedLoan}
          onPaymentRegistered={handlePaymentRegistered}
        />
      )}

      {/* Loan Report Modal */}
      {showReportModal && isHR && (
        <LoanReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
