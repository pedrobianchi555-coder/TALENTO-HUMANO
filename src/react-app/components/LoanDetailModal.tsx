import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, CreditCard, TrendingUp, FileText } from "lucide-react";
import type { LoanInstallment, LoanPayment } from "@/shared/types";
import { formatDateShort } from "@/shared/date-utils";

interface LoanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any;
  isHR: boolean;
  onEdit?: (loan: any) => void;
  onPayment?: (loan: any) => void;
}

export default function LoanDetailModal({ 
  isOpen, 
  onClose, 
  loan,
  isHR,
  onEdit,
  onPayment
}: LoanDetailModalProps) {
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'installments' | 'payments'>('overview');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && loan) {
      fetchLoanDetails();
    }
  }, [isOpen, loan]);

  const fetchLoanDetails = async () => {
    if (!loan) return;
    
    setLoading(true);
    try {
      // Fetch installments
      const installmentsResponse = await fetch(`/api/loans/${loan.id}/installments`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (installmentsResponse.ok) {
        const installmentsData = await installmentsResponse.json();
        setInstallments(installmentsData);
      }

      // Fetch payments
      const paymentsResponse = await fetch(`/api/loans/${loan.id}/payments`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !loan) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'PARTIALLY_PAID':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'PAYROLL':
        return 'bg-blue-100 text-blue-800';
      case 'TRANSFER':
        return 'bg-purple-100 text-purple-800';
      case 'CASH':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-medium text-gray-900">
                Préstamo #{loan.id} - {loan.category}
              </h3>
              {loan.employee_name && (
                <p className="text-sm text-gray-600 mt-1">
                  Empleado: {loan.employee_name}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {isHR && loan.status === 'ACTIVE' && (
                <>
                  <button
                    onClick={() => onEdit?.(loan)}
                    className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onPayment?.(loan)}
                    className="px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Registrar Pago
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('installments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'installments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cuotas ({installments.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Historial de Pagos ({payments.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-blue-600">Monto Original</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(loan.principal_amount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-sm text-orange-600">Saldo Pendiente</p>
                      <p className="text-xl font-bold text-orange-900">
                        {formatCurrency(loan.pending_amount || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <CreditCard className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm text-green-600">Cuota Mensual</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCurrency(loan.monthly_installment)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Calendar className="w-8 h-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm text-purple-600">Cuotas Restantes</p>
                      <p className="text-xl font-bold text-purple-900">
                        {loan.remaining_installments}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white border rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Progreso del Préstamo</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Pagado</span>
                    <span>{loan.total_installments - loan.remaining_installments} / {loan.total_installments} cuotas</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full" 
                      style={{ 
                        width: `${((loan.total_installments - loan.remaining_installments) / loan.total_installments) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span className="font-medium">
                      {Math.round(((loan.total_installments - loan.remaining_installments) / loan.total_installments) * 100)}%
                    </span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div className="bg-white border rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Detalles del Préstamo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Emisión</label>
                    <p className="text-gray-900">{formatDateShort(loan.issue_date)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      loan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                      loan.status === 'PAID_OFF' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {loan.status === 'ACTIVE' ? 'Activo' : 
                       loan.status === 'PAID_OFF' ? 'Pagado' : 'Cancelado'}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Interés</label>
                    <p className="text-gray-900">{loan.interest_rate}%</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total de Cuotas</label>
                    <p className="text-gray-900">{loan.total_installments}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'installments' && (
            <div>
              <div className="mb-4">
                <h4 className="text-lg font-medium text-gray-900">Cronograma de Cuotas</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Estado de las cuotas programadas para este préstamo
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Cargando cuotas...</p>
                </div>
              ) : installments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cuota #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha de Vencimiento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pagado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Saldo Restante
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {installments.map((installment) => (
                        <tr key={installment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {installment.installment_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateShort(installment.due_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(installment.amount_due)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(installment.amount_paid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(installment.status)}`}>
                              {installment.status === 'PAID' ? 'Pagado' :
                               installment.status === 'PENDING' ? 'Pendiente' :
                               installment.status === 'OVERDUE' ? 'Vencido' :
                               'Pago Parcial'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(installment.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cuotas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No se encontraron cuotas para este préstamo.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <div className="mb-4">
                <h4 className="text-lg font-medium text-gray-900">Historial de Pagos</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Registro de todos los pagos realizados para este préstamo
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Cargando pagos...</p>
                </div>
              ) : payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha de Pago
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Método
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Referencia
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registrado por
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateShort(payment.payment_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount_paid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getPaymentMethodColor(payment.payment_method)}`}>
                              {payment.payment_method === 'PAYROLL' ? 'Nómina' :
                               payment.payment_method === 'TRANSFER' ? 'Transferencia' :
                               'Efectivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.reference || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(payment as any).recorded_by_name || 'Sistema'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pagos registrados</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No se han registrado pagos para este préstamo aún.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
