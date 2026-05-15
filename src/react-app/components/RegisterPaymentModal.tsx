import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, CreditCard, Receipt } from "lucide-react";
import type { LoanInstallment, LoanPaymentMethod } from "@/shared/types";
import { formatDateShort } from "@/shared/date-utils";

interface RegisterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any;
  onPaymentRegistered: () => void;
}

export default function RegisterPaymentModal({ 
  isOpen, 
  onClose, 
  loan,
  onPaymentRegistered
}: RegisterPaymentModalProps) {
  const [pendingInstallments, setPendingInstallments] = useState<LoanInstallment[]>([]);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'PAYROLL' as LoanPaymentMethod,
    reference: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen && loan) {
      fetchPendingInstallments();
      // Reset form
      setPaymentData({
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'PAYROLL',
        reference: ''
      });
      setSelectedInstallmentId(null);
    }
  }, [isOpen, loan]);

  const fetchPendingInstallments = async () => {
    if (!loan) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/loans/${loan.id}/installments?status=pending`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingInstallments(data);
        // Auto-select first pending installment
        if (data.length > 0) {
          setSelectedInstallmentId(data[0].id);
          setPaymentData(prev => ({ 
            ...prev, 
            amount_paid: (data[0].amount_due - data[0].amount_paid).toString()
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching pending installments:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedInstallment = pendingInstallments.find(inst => inst.id === selectedInstallmentId);
  const remainingAmount = selectedInstallment ? selectedInstallment.amount_due - selectedInstallment.amount_paid : 0;
  const paymentAmount = parseFloat(paymentData.amount_paid) || 0;
  const isValidPayment = paymentAmount > 0 && paymentAmount <= remainingAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallmentId || !isValidPayment) return;
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedInstallmentId || !loan) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/loans/${loan.id}/payments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          installment_id: selectedInstallmentId,
          ...paymentData,
          amount_paid: parseFloat(paymentData.amount_paid)
        }),
      });

      if (response.ok) {
        onPaymentRegistered();
        onClose();
        setShowConfirmation(false);
        alert('Pago registrado exitosamente');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error al registrar el pago: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error registering payment:', error);
      alert('Error de conexión al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Registrar Pago de Préstamo</h3>
              <p className="text-sm text-gray-600 mt-1">
                Préstamo #{loan?.id} - {loan?.employee_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Cargando cuotas pendientes...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {/* Pending Installments Selection */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-blue-600" />
                Seleccionar Cuota a Pagar
              </h4>
              
              {pendingInstallments.length === 0 ? (
                <div className="text-center py-6">
                  <CreditCard className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-gray-500 mt-2">No hay cuotas pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInstallments.map((installment) => {
                    const remaining = installment.amount_due - installment.amount_paid;
                    return (
                      <div
                        key={installment.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedInstallmentId === installment.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedInstallmentId(installment.id);
                          setPaymentData(prev => ({ 
                            ...prev, 
                            amount_paid: remaining.toString()
                          }));
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Cuota #{installment.installment_number}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                installment.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : installment.status === 'PARTIALLY_PAID'
                                  ? 'bg-blue-100 text-blue-800'
                                  : installment.status === 'OVERDUE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {installment.status === 'PENDING' ? 'Pendiente' :
                                 installment.status === 'PARTIALLY_PAID' ? 'Pago Parcial' :
                                 installment.status === 'OVERDUE' ? 'Vencido' : installment.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Vencimiento: {formatDateShort(installment.due_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(installment.amount_due)}</p>
                            {installment.amount_paid > 0 && (
                              <p className="text-sm text-gray-600">
                                Pagado: {formatCurrency(installment.amount_paid)}
                              </p>
                            )}
                            <p className="text-sm font-medium text-blue-600">
                              Pendiente: {formatCurrency(remaining)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedInstallment && (
              <div className="space-y-6">
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Datos del Pago
                </h4>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Pagar *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      required
                      min="0.01"
                      max={remainingAmount}
                      step="0.01"
                      value={paymentData.amount_paid}
                      onChange={(e) => setPaymentData({ ...paymentData, amount_paid: e.target.value })}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !isValidPayment && paymentData.amount_paid ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {!isValidPayment && paymentData.amount_paid && (
                    <p className="text-sm text-red-600 mt-1">
                      El monto debe ser mayor a 0 y no puede exceder {formatCurrency(remainingAmount)}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Monto máximo disponible: {formatCurrency(remainingAmount)}
                  </p>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Pago *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago *
                  </label>
                  <select
                    required
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value as LoanPaymentMethod })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PAYROLL">Descuento por Nómina</option>
                    <option value="TRANSFER">Transferencia Bancaria</option>
                    <option value="CASH">Efectivo</option>
                  </select>
                </div>

                {/* Payment Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencia/Comprobante
                  </label>
                  <input
                    type="text"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Número de referencia o comprobante"
                  />
                </div>

                {/* Payment Summary */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Resumen del Pago:</h5>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p>• Cuota: <span className="font-medium">#{selectedInstallment.installment_number}</span></p>
                    <p>• Monto de la cuota: <span className="font-medium">{formatCurrency(selectedInstallment.amount_due)}</span></p>
                    <p>• Monto a pagar ahora: <span className="font-medium">{formatCurrency(paymentAmount)}</span></p>
                    <p>• Saldo restante después del pago: <span className="font-medium">{formatCurrency(remainingAmount - paymentAmount)}</span></p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedInstallmentId || !isValidPayment}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                      selectedInstallmentId && isValidPayment
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Registrar Pago
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedInstallment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Receipt className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirmar Registro de Pago
              </h3>
              <div className="text-sm text-gray-600 space-y-1 mb-6">
                <p><strong>Empleado:</strong> {loan?.employee_name}</p>
                <p><strong>Préstamo:</strong> #{loan?.id}</p>
                <p><strong>Cuota:</strong> #{selectedInstallment.installment_number}</p>
                <p><strong>Monto:</strong> {formatCurrency(paymentAmount)}</p>
                <p><strong>Método:</strong> {
                  paymentData.payment_method === 'PAYROLL' ? 'Descuento por Nómina' :
                  paymentData.payment_method === 'TRANSFER' ? 'Transferencia Bancaria' :
                  'Efectivo'
                }</p>
                <p><strong>Fecha:</strong> {formatDateShort(paymentData.payment_date)}</p>
                {paymentData.reference && <p><strong>Referencia:</strong> {paymentData.reference}</p>}
              </div>
              <p className="text-sm text-gray-500 mb-6">
                ¿Estás seguro de que deseas registrar este pago?
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
