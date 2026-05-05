import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2, User, Save, Calendar, Building, Mail, Phone, IdCard } from "lucide-react";
import ConfirmationModal from "@/react-app/components/ConfirmationModal";
import { useConfirmationModal } from "@/react-app/hooks/useConfirmationModal";

export default function ProfileSetup() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { modalConfig, showAlert, closeModal, handleConfirm } = useConfirmationModal();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    ci: "",
    phone: "",
    birth_date: "",
    department: "",
    position: "",
    payroll_type: "",
    role: "EMPLOYEE"
  });

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    if (authUser?.google_user_data) {
      setFormData(prev => ({
        ...prev,
        first_name: authUser.google_user_data.given_name || "",
        last_name: authUser.google_user_data.family_name || "",
      }));
    }
  }, [authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Submitting profile data:', formData);
      
      const response = await fetch("/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      console.log('Profile API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Profile update successful:', result);
        showAlert('Perfil Actualizado', '¡Tu perfil ha sido actualizado exitosamente! Serás redirigido al dashboard.', 'success');
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("Error updating profile - Status:", response.status, "Data:", errorData);
        
        const errorMessage = errorData?.error || 'Error desconocido al actualizar el perfil';
        showAlert('Error al Actualizar Perfil', errorMessage, 'error');
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      showAlert('Error de Conexión', 'Error de conexión. Por favor, verifica tu conexión a internet e inténtalo de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    );
  }

  const departments = [
    "ADMINISTRACION Y FINANZAS",
    "ALMACEN DE SUMINISTRO", 
    "BIENES Y SERVICIOS",
    "CALIDAD Y DESARROLLO DE PERFILES",
    "CENTRO DE BENEFICIO",
    "CENTRO DE PROCESAMIENTO",
    "COMERCIO EXTERIOR",
    "DESARROLLO SOSTENIBLE",
    "HIGIENE",
    "LOGISTICA DE TRANSPORTE (EXTERNO)",
    "MANTENIMIENTO",
    "MATERIA PRIMA",
    "PRODUCCION",
    "RELACIONES INSTITUCIONALES & COMUNICION",
    "SEGURIDAD FISICA",
    "TALENTO HUMANO",
    "TRANSPORTE (INTERNO)"
  ];

  const payrollTypes = [
    { value: "OPERARIO", label: "Operario" },
    { value: "EMPLEADO", label: "Empleado" },
    { value: "CONFIDENCIAL", label: "Confidencial" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-4">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Configuración de Perfil</h1>
                <p className="text-blue-100">Completa tu información para acceder al portal</p>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <img
                src={authUser?.google_user_data?.picture || '/default-avatar.png'}
                alt="Avatar"
                className="w-12 h-12 rounded-full mr-4"
              />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  ¡Bienvenido, {authUser?.google_user_data?.given_name || 'Usuario'}!
                </h2>
                <p className="text-sm text-gray-600">
                  Email: {authUser?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Nombres *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Juan Carlos"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Pérez González"
                />
              </div>

              {/* CI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <IdCard className="inline w-4 h-4 mr-1" />
                  Carnet de Identidad *
                </label>
                <input
                  type="text"
                  required
                  value={formData.ci}
                  onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345678"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+591 70123456"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="inline w-4 h-4 mr-1" />
                  Departamento
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona un departamento</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Position */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="inline w-4 h-4 mr-1" />
                  Cargo/Posición
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Desarrollador Senior, Asistente Administrativo, etc."
                />
              </div>

              {/* Payroll Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Tipo de Nómina
                </label>
                <select
                  value={formData.payroll_type}
                  onChange={(e) => setFormData({ ...formData, payroll_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona el tipo</option>
                  {payrollTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Rol en el Sistema
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EMPLOYEE">Empleado</option>
                  <option value="HR">Administrador de RRHH</option>
                </select>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Información Importante
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Esta información será utilizada para personalizar tu experiencia en el portal y para 
                      procesos administrativos. Puedes actualizar estos datos más tarde desde tu perfil.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-6 py-4 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5 mr-2" />
                    Guardando perfil...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Completar Configuración
                  </>
                )}
              </button>
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
    </div>
  );
}
