import { useAuth } from "@/react-app/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2, User, Edit3, Save, X, Calendar, Building, Mail, Phone, IdCard } from "lucide-react";
import UserProfileCard from "@/react-app/components/UserProfileCard";
import WhatsAppPreferences from "@/react-app/components/WhatsAppPreferences";
import FamilyDependentsManager from "@/react-app/components/FamilyDependentsManager";
import type { EnhancedUser } from "@/shared/types";

export default function Profile() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    ci: "",
    phone: "",
    birth_date: "",
    department: "",
    position: "",
    payroll_type: "",
    sede: "",
    shirt_size: "",
    pants_size: "",
    boots_size: ""
  });

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return;

      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Initialize form data with current profile data
          if (userData.profile) {
            setFormData({
              first_name: userData.profile.first_name || "",
              last_name: userData.profile.last_name || "",
              ci: userData.profile.ci || "",
              phone: userData.profile.phone || "",
              birth_date: userData.profile.birth_date || "",
              department: userData.profile.department || "",
              position: userData.profile.position || "",
              payroll_type: userData.profile.payroll_type || "",
              sede: userData.profile.sede || "",
              shirt_size: userData.profile.shirt_size || "",
              pants_size: userData.profile.pants_size || "",
              boots_size: userData.profile.boots_size || ""
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Refresh user data
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }
        setEditing(false);
      } else {
        console.error("Error updating profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current profile data
    if (user?.profile) {
      setFormData({
        first_name: user.profile.first_name || "",
        last_name: user.profile.last_name || "",
        ci: user.profile.ci || "",
        phone: user.profile.phone || "",
        birth_date: user.profile.birth_date || "",
        department: user.profile.department || "",
        position: user.profile.position || "",
        payroll_type: user.profile.payroll_type || "",
        sede: user.profile.sede || "",
        shirt_size: user.profile.shirt_size || "",
        pants_size: user.profile.pants_size || "",
        boots_size: user.profile.boots_size || ""
      });
    }
    setEditing(false);
  };

  if (isPending || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Error al cargar el perfil</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <User className="w-8 h-8 mr-3 text-blue-600" />
                Mi Perfil
              </h1>
              <p className="text-gray-600">
                Gestiona tu información personal y profesional
              </p>
            </div>
            {!editing ? (
              <button 
                onClick={() => setEditing(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editar Perfil
              </button>
            ) : (
              <div className="flex space-x-3">
                <button 
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!editing ? (
          /* Modo de visualización */
          <>
            <UserProfileCard user={user} />
            
            {/* WhatsApp Preferences Section */}
            <div className="mt-8">
              <WhatsAppPreferences />
            </div>

            {/* Family Dependents Section */}
            {user.profile && (
              <FamilyDependentsManager userId={user.profile.id} />
            )}
          </>
        ) : (
          /* Modo de edición */
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Editar Información Personal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombres */}
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

              {/* Apellidos */}
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

              {/* Teléfono */}
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

              {/* Fecha de Cumpleaños */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Fecha de Cumpleaños
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Departamento */}
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

              {/* Posición */}
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

              {/* Tipo de Nómina */}
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

              {/* Sede */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="inline w-4 h-4 mr-1" />
                  Sede
                </label>
                <select
                  value={formData.sede}
                  onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar sede</option>
                  <option value="El Pilar">El Pilar</option>
                  <option value="Caracas">Caracas</option>
                  <option value="Sur del Lago">Sur del Lago</option>
                  <option value="Miranda">Miranda</option>
                  <option value="Apure">Apure</option>
                </select>
              </div>
            </div>

            {/* Tallas de Ropa */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Tallas de Ropa</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Talla de Camisa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Talla de Camisa
                  </label>
                  <input
                    type="text"
                    value={formData.shirt_size}
                    onChange={(e) => setFormData({ ...formData, shirt_size: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: M, L, XL"
                  />
                </div>

                {/* Talla de Pantalón */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Talla de Pantalón
                  </label>
                  <input
                    type="text"
                    value={formData.pants_size}
                    onChange={(e) => setFormData({ ...formData, pants_size: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 32, 34, 36"
                  />
                </div>

                {/* Talla de Botas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Talla de Botas
                  </label>
                  <input
                    type="text"
                    value={formData.boots_size}
                    onChange={(e) => setFormData({ ...formData, boots_size: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 40, 41, 42"
                  />
                </div>
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
                      Asegúrate de mantener tu información actualizada. La fecha de cumpleaños 
                      es especialmente importante para las celebraciones corporativas y beneficios del personal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
