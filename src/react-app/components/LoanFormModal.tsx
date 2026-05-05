import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, Users, Calculator, AlertTriangle, Loader2 } from "lucide-react";
import type { UserProfile, RepaymentMethod, PaymentFrequency } from "@/shared/types";

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: any) => void;
  employees: UserProfile[];
  editingLoan?: any;
}

export default function LoanFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  employees, 
  editingLoan 
}: LoanFormModalProps) {
  const [formData, setFormData] = useState({
    user_id: '',
    principal_amount: '',
    category: '',
    issue_date: new Date().toISOString().split('T')[0],
    repayment_method: 'FIXED_INSTALLMENTS' as RepaymentMethod,
    repayment_value: '',
    frequency: 'MONTHLY' as PaymentFrequency,
    start_date: new Date().toISOString().split('T')[0],
  });
  
  const [calculatedInfo, setCalculatedInfo] = useState({
    installment_amount: 0,
    total_installments: 0,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingLoan) {
      setFormData({
        user_id: editingLoan.user_id.toString(),
        principal_amount: editingLoan.principal_amount.toString(),
        category: editingLoan.category || '',
        issue_date: editingLoan.issue_date,
        repayment_method: editingLoan.repayment_plan?.method || 'FIXED_INSTALLMENTS',
        repayment_value: editingLoan.repayment_plan?.value?.toString() || '',
        frequency: editingLoan.repayment_plan?.frequency || 'MONTHLY',
        start_date: editingLoan.repayment_plan?.start_date || new Date().toISOString().split('T')[0],
      });
    } else {
      // Reset form for new loan
      setFormData({
        user_id: '',
        principal_amount: '',
        category: '',
        issue_date: new Date().toISOString().split('T')[0],
        repayment_method: 'FIXED_INSTALLMENTS',
        repayment_value: '',
        frequency: 'MONTHLY',
        start_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [editingLoan, isOpen]);

  useEffect(() => {
    calculateLoanDetails();
  }, [formData.principal_amount, formData.repayment_method, formData.repayment_value, formData.user_id, employees]);

  const calculateLoanDetails = () => {
    const principal = parseFloat(formData.principal_amount) || 0;
    const value = parseFloat(formData.repayment_value) || 0;
    
    if (!principal || !value) {
      setCalculatedInfo({ installment_amount: 0, total_installments: 0 });
      return;
    }

    let installmentAmount = 0;
    let totalInstallments = 0;

    switch (formData.repayment_method) {
      case 'FIXED_INSTALLMENTS':
        // Fixed number of installments
        totalInstallments = Math.floor(value);
        if (totalInstallments > 0) {
          installmentAmount = principal / totalInstallments;
        }
        break;
      
      case 'FIXED_AMOUNT':
        // Fixed amount per installment
        installmentAmount = value;
        totalInstallments = Math.ceil(principal / installmentAmount);
        break;
      
      case 'SALARY_PERCENTAGE':
        // Percentage of salary
        const selectedEmployee = employees.find(e => e.id.toString() === formData.user_id);
        if (selectedEmployee?.base_salary && value > 0 && value <= 100) {
          installmentAmount = (selectedEmployee.base_salary * value) / 100;
          if (installmentAmount > 0) {
            totalInstallments = Math.ceil(principal / installmentAmount);
          }
        }
        break;
    }

    setCalculatedInfo({
      installment_amount: Math.round(installmentAmount * 100) / 100,
      total_installments: totalInstallments,
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.user_id) {
      newErrors.user_id = 'Debe seleccionar un empleado';
    }

    if (!formData.principal_amount || parseFloat(formData.principal_amount) <= 0) {
      newErrors.principal_amount = 'El monto debe ser mayor a 0';
    }

    if (!formData.category) {
      newErrors.category = 'Debe seleccionar una categoría';
    }

    if (!formData.repayment_value || parseFloat(formData.repayment_value) <= 0) {
      newErrors.repayment_value = 'Valor de reintegro requerido';
    }

    if (formData.repayment_method === 'SALARY_PERCENTAGE') {
      const percentage = parseFloat(formData.repayment_value);
      if (percentage > 100) {
        newErrors.repayment_value = 'El porcentaje no puede ser mayor a 100%';
      }
      if (percentage < 1) {
        newErrors.repayment_value = 'El porcentaje debe ser al menos 1%';
      }
    }

    if (formData.repayment_method === 'FIXED_INSTALLMENTS') {
      const installments = parseFloat(formData.repayment_value);
      if (installments < 1 || installments % 1 !== 0) {
        newErrors.repayment_value = 'Debe ser un número entero mayor a 0';
      }
    }

    if (calculatedInfo.installment_amount <= 0 || calculatedInfo.total_installments <= 0) {
      newErrors.calculation = 'Error en el cálculo del préstamo. Revise los valores ingresados';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);

    try {
      const selectedEmployee = employees.find(e => e.id.toString() === formData.user_id);
      
      const loanData = {
        user_id: parseInt(formData.user_id),
        principal_amount: parseFloat(formData.principal_amount),
        category: formData.category,
        issue_date: formData.issue_date,
        repayment_plan: {
          method: formData.repayment_method,
          value: parseFloat(formData.repayment_value),
          frequency: formData.frequency,
          start_date: formData.start_date,
        },
        employee_base_salary: selectedEmployee?.base_salary || 0,
      };

      const url = editingLoan ? `/api/loans/${editingLoan.id}` : '/api/loans';
      const method = editingLoan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanData),
      });

      if (response.ok) {
        const result = await response.json();
        onSave(result);
        onClose();
        setShowConfirmation(false);
        alert(editingLoan ? 'Préstamo actualizado exitosamente' : 'Préstamo creado exitosamente');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error: ${errorData.error || 'No se pudo procesar el préstamo'}`);
      }
    } catch (error) {
      console.error('Error saving loan:', error);
      alert('Error de conexión al procesar el préstamo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedEmployee = employees.find(e => e.id.toString() === formData.user_id);
  const hasEmployees = employees.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              {editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {!hasEmployees && (
          <div className="p-6 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800">No se pudieron cargar los empleados</p>
                <p className="text-sm text-yellow-700">Verifique su conexión e inténtelo nuevamente.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Información Básica
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empleado *
                </label>
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  disabled={!!editingLoan || !hasEmployees}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
                    errors.user_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">
                    {!hasEmployees 
                      ? 'No hay empleados disponibles' 
                      : 'Seleccionar empleado'
                    }
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} - {employee.department || 'Sin dept.'} - {employee.position || 'Sin posición'}
                    </option>
                  ))}
                </select>
                {errors.user_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.user_id}</p>
                )}
                {selectedEmployee?.base_salary && (
                  <p className="text-xs text-gray-500 mt-1">
                    Salario base: $ {selectedEmployee.base_salary.toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto Principal *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={formData.principal_amount}
                    onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.principal_amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.principal_amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.principal_amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="Adelanto">Adelanto de Salario</option>
                  <option value="Personal">Préstamo Personal</option>
                  <option value="Emergencia">Emergencia</option>
                  <option value="Educacion">Educación</option>
                  <option value="Vivienda">Vivienda</option>
                  <option value="Vehiculo">Vehículo</option>
                  <option value="Otros">Otros</option>
                </select>
                {errors.category && (
                  <p className="text-xs text-red-500 mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Emisión *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Repayment Plan */}
            <div className="space-y-6">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-green-600" />
                Plan de Reintegro
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Cálculo *
                </label>
                <select
                  required
                  value={formData.repayment_method}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    repayment_method: e.target.value as RepaymentMethod,
                    repayment_value: '' // Reset value when method changes
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="FIXED_INSTALLMENTS">Número de Cuotas Fijas</option>
                  <option value="FIXED_AMOUNT">Monto Fijo por Cuota</option>
                  <option value="SALARY_PERCENTAGE">Porcentaje del Salario</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.repayment_method === 'FIXED_INSTALLMENTS' && 'Especifica cuántas cuotas pagará el empleado'}
                  {formData.repayment_method === 'FIXED_AMOUNT' && 'Especifica el monto fijo que pagará cada periodo'}
                  {formData.repayment_method === 'SALARY_PERCENTAGE' && 'Especifica qué porcentaje del salario se descontará'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.repayment_method === 'FIXED_INSTALLMENTS' && 'Número de Cuotas *'}
                  {formData.repayment_method === 'FIXED_AMOUNT' && 'Monto por Cuota ($) *'}
                  {formData.repayment_method === 'SALARY_PERCENTAGE' && 'Porcentaje del Salario (%) *'}
                </label>
                <input
                  type="number"
                  required
                  min={formData.repayment_method === 'SALARY_PERCENTAGE' ? '0.1' : '1'}
                  step={formData.repayment_method === 'FIXED_INSTALLMENTS' ? "1" : "0.01"}
                  max={formData.repayment_method === 'SALARY_PERCENTAGE' ? "100" : undefined}
                  value={formData.repayment_value}
                  onChange={(e) => setFormData({ ...formData, repayment_value: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.repayment_value ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={
                    formData.repayment_method === 'FIXED_INSTALLMENTS' ? 'ej. 12' :
                    formData.repayment_method === 'FIXED_AMOUNT' ? 'ej. 1000.00' :
                    'ej. 15'
                  }
                />
                {errors.repayment_value && (
                  <p className="text-xs text-red-500 mt-1">{errors.repayment_value}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frecuencia de Pago *
                </label>
                <select
                  required
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as PaymentFrequency })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="WEEKLY">Semanal</option>
                  <option value="BIWEEKLY">Quincenal</option>
                  <option value="MONTHLY">Mensual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha del Primer Pago *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  min={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Calculated Info */}
              {calculatedInfo.installment_amount > 0 && calculatedInfo.total_installments > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Resumen Calculado:</h5>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p>• Cuota {formData.frequency === 'WEEKLY' ? 'semanal' : formData.frequency === 'BIWEEKLY' ? 'quincenal' : 'mensual'}: 
                      <span className="font-medium"> $ {calculatedInfo.installment_amount.toLocaleString()}</span>
                    </p>
                    <p>• Total de cuotas: <span className="font-medium">{calculatedInfo.total_installments}</span></p>
                    <p>• Total a pagar: <span className="font-medium">$ {(calculatedInfo.installment_amount * calculatedInfo.total_installments).toLocaleString()}</span></p>
                    {formData.repayment_method === 'SALARY_PERCENTAGE' && selectedEmployee?.base_salary && (
                      <p>• Descuento sobre salario: <span className="font-medium">{formData.repayment_value}%</span></p>
                    )}
                  </div>
                </div>
              )}

              {errors.calculation && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{errors.calculation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!hasEmployees || calculatedInfo.installment_amount <= 0 || calculatedInfo.total_installments <= 0}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                hasEmployees && calculatedInfo.installment_amount > 0 && calculatedInfo.total_installments > 0
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {editingLoan ? 'Actualizar Préstamo' : 'Crear Préstamo'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirmar {editingLoan ? 'Actualización' : 'Creación'} de Préstamo
              </h3>
              <div className="text-sm text-gray-600 space-y-1 mb-6">
                <p><strong>Empleado:</strong> {selectedEmployee?.first_name} {selectedEmployee?.last_name}</p>
                <p><strong>Monto:</strong> $ {parseFloat(formData.principal_amount).toLocaleString()}</p>
                <p><strong>Categoría:</strong> {formData.category}</p>
                <p><strong>Cuota {formData.frequency === 'WEEKLY' ? 'semanal' : formData.frequency === 'BIWEEKLY' ? 'quincenal' : 'mensual'}:</strong> $ {calculatedInfo.installment_amount.toLocaleString()}</p>
                <p><strong>Total cuotas:</strong> {calculatedInfo.total_installments}</p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                ¿Estás seguro de que deseas {editingLoan ? 'actualizar' : 'crear'} este préstamo?
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
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
