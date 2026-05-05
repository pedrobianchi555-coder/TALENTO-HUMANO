import { useState, useEffect } from "react";
import { X, User, Mail, Phone, MapPin, Briefcase, DollarSign, Calendar, Building, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import type { UserProfile } from "@/shared/types";
import { useConfirmationModal } from "@/react-app/hooks/useConfirmationModal";
import ConfirmationModal from "@/react-app/components/ConfirmationModal";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: UserProfile;
  onSave: (employee: UserProfile) => void;
}

interface ManagerOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  position?: string;
}

export default function EmployeeEditModal({ 
  isOpen, 
  onClose, 
  employee,
  onSave
}: EmployeeEditModalProps) {
  const { can } = usePermissions();
  const { modalConfig, showAlert, showConfirm, closeModal, handleConfirm } = useConfirmationModal();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    ci: '',
    phone: '',
    department: '',
    position: '',
    payroll_type: '',
    base_salary: '',
    birth_date: '',
    sede: '',
    company_name: '',
    manager_id: '',
    shirt_size: '',
    pants_size: '',
    boots_size: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchManagers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (employee && isOpen) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        ci: employee.ci || '',
        phone: employee.phone || '',
        department: employee.department || '',
        position: employee.position || '',
        payroll_type: employee.payroll_type || '',
        base_salary: employee.base_salary?.toString() || '',
        birth_date: employee.birth_date || '',
        sede: employee.sede || '',
        company_name: employee.company_name || '',
        manager_id: employee.manager_id?.toString() || '',
        shirt_size: employee.shirt_size || '',
        pants_size: employee.pants_size || '',
        boots_size: employee.boots_size || ''
      });
      setErrors({});
    }
  }, [employee, isOpen]);

  const fetchManagers = async () => {
    setLoadingManagers(true);
    try {
      const response = await fetch('/api/employees/managers');
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setLoadingManagers(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'El nombre es obligatorio';
    if (!formData.last_name.trim()) newErrors.last_name = 'El apellido es obligatorio';
    if (!formData.ci.trim()) newErrors.ci = 'La cédula es obligatoria';
    if (!formData.email.trim()) newErrors.email = 'El email es obligatorio';
    
    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          ci: formData.ci,
          phone: formData.phone || null,
          department: formData.department || null,
          position: formData.position || null,
          payroll_type: formData.payroll_type || null,
          base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
          birth_date: formData.birth_date || null,
          sede: formData.sede || null,
          company_name: formData.company_name || null,
          manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
          shirt_size: formData.shirt_size || null,
          pants_size: formData.pants_size || null,
          boots_size: formData.boots_size || null
        }),
      });

      if (response.ok) {
        const updatedEmployee = await response.json();
        onSave(updatedEmployee);
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo actualizar el empleado'}`);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInactivateEmployee = () => {
    showConfirm(
      `Inactivar Empleado: ${employee.first_name} ${employee.last_name}`,
      <>
        <p>¿Estás seguro de que deseas <strong>inactivar</strong> a este empleado?</p>
        <p className="mt-2 text-sm text-gray-500">
          Sus accesos serán suspendidos, pero su información se mantendrá en el sistema. 
          Puedes activarlo nuevamente en cualquier momento.
        </p>
        <textarea
          id="reason-inactivate"
          placeholder="Motivo de la inactividad (opcional)"
          className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          rows={3}
        />
      </>,
      async () => {
        const reason = (document.getElementById('reason-inactivate') as HTMLTextAreaElement)?.value || '';
        try {
          const response = await fetch(`/api/employees/${employee.id}/inactivate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
          });
          if (response.ok) {
            showAlert('Empleado Inactivado', `${employee.first_name} ${employee.last_name} ha sido inactivado exitosamente.`, 'success');
            setTimeout(() => {
              onSave(employee); // Trigger refresh
              onClose();
            }, 1500);
          } else {
            const errorData = await response.json();
            showAlert('Error', errorData.error || 'Error al inactivar empleado.', 'error');
          }
        } catch (error) {
          console.error('Error inactivating employee:', error);
          showAlert('Error', 'Error de conexión al inactivar empleado.', 'error');
        }
      },
      { type: 'warning', confirmButtonText: 'Sí, Inactivar', cancelButtonText: 'Cancelar' }
    );
  };

  const handleActivateEmployee = () => {
    showConfirm(
      `Activar Empleado: ${employee.first_name} ${employee.last_name}`,
      <>
        <p>¿Estás seguro de que deseas <strong>activar</strong> a este empleado?</p>
        <p className="mt-2 text-sm text-gray-500">
          Sus accesos serán restaurados y volverá a aparecer como activo en el sistema.
        </p>
        <textarea
          id="reason-activate"
          placeholder="Motivo de la activación (opcional)"
          className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          rows={3}
        />
      </>,
      async () => {
        const reason = (document.getElementById('reason-activate') as HTMLTextAreaElement)?.value || '';
        try {
          const response = await fetch(`/api/employees/${employee.id}/activate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
          });
          if (response.ok) {
            showAlert('Empleado Activado', `${employee.first_name} ${employee.last_name} ha sido activado exitosamente.`, 'success');
            setTimeout(() => {
              onSave(employee); // Trigger refresh
              onClose();
            }, 1500);
          } else {
            const errorData = await response.json();
            showAlert('Error', errorData.error || 'Error al activar empleado.', 'error');
          }
        } catch (error) {
          console.error('Error activating employee:', error);
          showAlert('Error', 'Error de conexión al activar empleado.', 'error');
        }
      },
      { type: 'confirm', confirmButtonText: 'Sí, Activar', cancelButtonText: 'Cancelar' }
    );
  };

  const handleDeleteEmployee = () => {
    showConfirm(
      `Eliminar Empleado: ${employee.first_name} ${employee.last_name}`,
      <>
        <div className="text-red-700 font-bold mb-3 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          ¡Esta acción es irreversible!
        </div>
        <p className="mb-2">
          Estás a punto de <strong>eliminar permanentemente</strong> a {employee.first_name} {employee.last_name} del sistema.
          Esto borrará todos sus datos asociados.
        </p>
        <p className="mt-2 text-sm text-gray-500 bg-yellow-50 p-3 rounded border border-yellow-200">
          <strong>Nota:</strong> Si el empleado tiene registros históricos importantes (préstamos, solicitudes, quejas), 
          se recomienda <strong>inactivarlo</strong> en su lugar.
        </p>
        <textarea
          id="reason-delete"
          placeholder="Motivo de la eliminación (requerido)"
          className="mt-4 w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
          rows={3}
          required
        />
      </>,
      async () => {
        const reason = (document.getElementById('reason-delete') as HTMLTextAreaElement)?.value || '';
        if (!reason.trim()) {
          showAlert('Motivo Requerido', 'Por favor, proporciona un motivo para la eliminación.', 'warning');
          return;
        }
        try {
          const response = await fetch(`/api/employees/${employee.id}?reason=${encodeURIComponent(reason)}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            showAlert('Empleado Eliminado', `${employee.first_name} ${employee.last_name} ha sido eliminado permanentemente.`, 'success');
            setTimeout(() => {
              onSave(employee); // Trigger refresh
              onClose();
            }, 1500);
          } else {
            const errorData = await response.json();
            let errorMessage = errorData.error || 'Error al eliminar empleado.';
            if (errorMessage.includes('records') || errorMessage.includes('relacionados')) {
              errorMessage = 'No se puede eliminar el empleado porque tiene registros históricos (préstamos, solicitudes, quejas, etc.). Por favor, inactívalo en su lugar.';
            }
            showAlert('Error al Eliminar', errorMessage, 'error');
          }
        } catch (error) {
          console.error('Error deleting employee:', error);
          showAlert('Error', 'Error de conexión al eliminar empleado.', 'error');
        }
      },
      { type: 'error', confirmButtonText: 'Sí, Eliminar Permanentemente', cancelButtonText: 'Cancelar' }
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-6 z-10">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Editar Empleado
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Modifica la información del empleado
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Información Personal */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Información Personal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.first_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Nombre del empleado"
                    />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.last_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Apellido del empleado"
                    />
                    {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Cédula *
                    </label>
                    <input
                      type="text"
                      value={formData.ci}
                      onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.ci ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="V-12345678"
                    />
                    {errors.ci && <p className="text-red-500 text-xs mt-1">{errors.ci}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Información de Contacto */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Información de Contacto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="email@ejemplo.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+58 414 1234567"
                    />
                  </div>
                </div>
              </div>

              {/* Información Laboral */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Información Laboral</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      Posición
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Desarrollador, Analista, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="w-4 h-4 inline mr-1" />
                      Departamento
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tecnología, RRHH, Administración..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Nómina
                    </label>
                    <select
                      value={formData.payroll_type}
                      onChange={(e) => setFormData({ ...formData, payroll_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="OPERARIO">Operario</option>
                      <option value="EMPLEADO">Empleado</option>
                      <option value="CONFIDENCIAL">Confidencial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Salario Base
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_salary}
                      onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Sede
                    </label>
                    <select
                      value={formData.sede}
                      onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="El Pilar">El Pilar</option>
                      <option value="Caracas">Caracas</option>
                      <option value="Sur del Lago">Sur del Lago</option>
                      <option value="Miranda">Miranda</option>
                      <option value="Apure">Apure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Empresa
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Cacao San Jose, C.A."
                    />
                  </div>
                </div>
              </div>

              {/* Tallas de Ropa */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Tallas de Ropa</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Talla de Camisa
                    </label>
                    <input
                      type="text"
                      value={formData.shirt_size}
                      onChange={(e) => setFormData({ ...formData, shirt_size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: M, L, XL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Talla de Pantalón
                    </label>
                    <input
                      type="text"
                      value={formData.pants_size}
                      onChange={(e) => setFormData({ ...formData, pants_size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: 32, 34, 36"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Talla de Botas
                    </label>
                    <input
                      type="text"
                      value={formData.boots_size}
                      onChange={(e) => setFormData({ ...formData, boots_size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: 40, 41, 42"
                    />
                  </div>
                </div>
              </div>

              {/* Manager Assignment */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Asignación de Evaluador</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Manager Directo
                    </label>
                    {loadingManagers ? (
                      <div className="text-sm text-gray-500">Cargando managers...</div>
                    ) : (
                      <select
                        value={formData.manager_id}
                        onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Sin manager asignado</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.first_name} {manager.last_name} 
                            {manager.department && ` - ${manager.department}`}
                            {manager.position && ` (${manager.position})`}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      El manager asignado evaluará a este empleado en los ciclos de evaluación de desempeño.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              {/* Action Buttons (Left side) */}
              <div className="flex space-x-3">
                {can(PERMISSIONS.EMPLOYEE_STATUS_CHANGE) && (
                  <>
                    {employee.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={handleInactivateEmployee}
                        disabled={isSubmitting}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200 disabled:opacity-50 transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Inactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleActivateEmployee}
                        disabled={isSubmitting}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Activar
                      </button>
                    )}
                  </>
                )}
                
                {can(PERMISSIONS.EMPLOYEE_DELETE) && (
                  <button
                    type="button"
                    onClick={handleDeleteEmployee}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Eliminar
                  </button>
                )}
              </div>

              {/* Save/Cancel Buttons (Right side) */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

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
    </>
  );
}
