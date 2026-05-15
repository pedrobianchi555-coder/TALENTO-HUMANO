import { User, Calendar, Briefcase, Mail, Phone, Building, IdCard } from "lucide-react";
import type { EnhancedUser, FamilyDependent } from "@/shared/types";
import { useState, useEffect } from "react";

interface UserProfileCardProps {
  user: EnhancedUser;
}

export default function UserProfileCard({ user }: UserProfileCardProps) {
  const [dependents, setDependents] = useState<FamilyDependent[]>([]);
  const [loadingDependents, setLoadingDependents] = useState(true);

  useEffect(() => {
    if (user.profile?.id) {
      fetchDependents();
    }
  }, [user.profile?.id]);

  const fetchDependents = async () => {
    try {
      const response = await fetch(`/api/family-dependents?user_id=${user.profile?.id}`);
      if (response.ok) {
        const data = await response.json();
        setDependents(data);
      }
    } catch (error) {
      console.error('Error fetching dependents:', error);
    } finally {
      setLoadingDependents(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    
    try {
      const date = dateString.includes(' ') || dateString.includes('T') 
        ? new Date(dateString) 
        : new Date(dateString + 'T00:00:00Z');
      
      if (isNaN(date.getTime())) {
        return "Fecha inválida";
      }
      
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const day = date.getUTCDate();
      const month = months[date.getUTCMonth()];
      const year = date.getUTCFullYear();
      
      return `${day} de ${month} de ${year}`;
    } catch {
      return "Fecha inválida";
    }
  };

  const formatBirthday = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    
    try {
      const date = new Date(dateString + 'T00:00:00Z');
      
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const day = date.getUTCDate();
      const month = months[date.getUTCMonth()];
      
      return `${day} de ${month}`;
    } catch {
      return "Fecha inválida";
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'HR' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  if (!user.profile) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">Perfil no configurado</p>
        </div>
      </div>
    );
  }

  const profile = user.profile;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* Header con foto y nombre */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center ring-2 ring-blue-500/20">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={`${profile.first_name} ${profile.last_name}`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : user.google_user_data?.picture ? (
              <img
                src={user.google_user_data.picture}
                alt={`${profile.first_name} ${profile.last_name}`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-blue-600" />
            )}
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {profile.first_name} {profile.last_name}
          </h2>
          <p className="text-gray-600 mb-2">
            {profile.position || 'Sin cargo asignado'}
          </p>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(profile.role)}`}>
              {profile.role === 'HR' ? 'RRHH' : 'Empleado'}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(profile.status)}`}>
              {profile.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de información */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Mail className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-700">Email</p>
            <p className="text-gray-900">{profile.email}</p>
          </div>
        </div>

        {/* CI */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <IdCard className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-700">Carnet de Identidad</p>
            <p className="text-gray-900">{profile.ci}</p>
          </div>
        </div>

        {/* Teléfono */}
        {profile.phone && (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Phone className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Teléfono</p>
              <p className="text-gray-900">{profile.phone}</p>
            </div>
          </div>
        )}

        {/* Fecha de Cumpleaños */}
        <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
          <Calendar className="w-5 h-5 text-pink-600" />
          <div>
            <p className="text-sm font-medium text-gray-700">Fecha de Cumpleaños</p>
            <p className="text-gray-900 font-medium">{formatBirthday(profile.birth_date ?? null)}</p>
            {profile.birth_date && (
              <p className="text-xs text-gray-500">
                Fecha completa: {formatDate(profile.birth_date)}
              </p>
            )}
          </div>
        </div>

        {/* Departamento */}
        {profile.department && (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Building className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Departamento</p>
              <p className="text-gray-900">{profile.department}</p>
            </div>
          </div>
        )}

        {/* Sede */}
        {profile.sede && (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Building className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Sede</p>
              <p className="text-gray-900">{profile.sede}</p>
            </div>
          </div>
        )}

        {/* Posición */}
        {profile.position && (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Briefcase className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Cargo</p>
              <p className="text-gray-900">{profile.position}</p>
            </div>
          </div>
        )}

        {/* Tipo de Nómina */}
        {profile.payroll_type && (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Briefcase className="w-5 h-5 text-teal-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Tipo de Nómina</p>
              <p className="text-gray-900">{profile.payroll_type}</p>
            </div>
          </div>
        )}
      </div>

      {/* Salario Base (solo para HR) */}
      {profile.role === 'HR' && profile.base_salary && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white text-xs">$</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Salario Base</p>
              <p className="text-lg font-bold text-green-700">
                ${profile.base_salary.toLocaleString('es-ES')} USD
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clothing Sizes Section - Always visible */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-500 mb-3">Tallas de Ropa</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Camisa</p>
            <p className="text-sm font-medium text-gray-900">
              {profile.shirt_size || <span className="text-gray-400 italic">No especificada</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pantalón</p>
            <p className="text-sm font-medium text-gray-900">
              {profile.pants_size || <span className="text-gray-400 italic">No especificada</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Botas</p>
            <p className="text-sm font-medium text-gray-900">
              {profile.boots_size || <span className="text-gray-400 italic">No especificada</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Family Dependents Section */}
      {!loadingDependents && dependents.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Carga Familiar</h4>
          <div className="space-y-2">
            {dependents.map((dependent) => (
              <div key={dependent.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{dependent.full_name}</p>
                  <p className="text-xs text-gray-500">{dependent.relationship}</p>
                </div>
                {dependent.birth_date && (
                  <p className="text-xs text-gray-500">
                    {formatDate(dependent.birth_date)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fechas de registro */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">Registrado:</span> {formatDate(profile.created_at)}
          </div>
          <div>
            <span className="font-medium">Actualizado:</span> {formatDate(profile.updated_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
