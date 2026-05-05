import { User, Calendar, Briefcase } from "lucide-react";
import type { UserProfile } from "@/shared/types";
import { formatBirthday } from "@/shared/date-utils";

interface BirthdayCardProps {
  user: UserProfile;
}

export default function BirthdayCard({ user }: BirthdayCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
      <div className="flex items-center space-x-4">
        {/* Foto de perfil */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center ring-4 ring-blue-500/20">
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-xs text-white">🎂</span>
          </div>
        </div>

        {/* Información del empleado */}
        <div className="flex-1 min-w-0">
          {/* Nombre completo */}
          <h3 className="text-lg font-bold text-gray-900 truncate">
            {user.first_name} {user.last_name}
          </h3>

          {/* Fecha de cumpleaños */}
          <div className="flex items-center text-blue-600 font-semibold mb-1">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatBirthday(user.birth_date)}</span>
          </div>

          {/* Cargo del empleado */}
          <div className="flex items-center text-gray-500 text-sm">
            <Briefcase className="w-4 h-4 mr-1" />
            <span className="truncate">
              {user.position || 'Cargo no especificado'}
            </span>
          </div>

          {/* Departamento */}
          {user.department && (
            <div className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user.department}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Decoración adicional */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center">
          <div className="flex space-x-2">
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0ms' }}>🎉</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '100ms' }}>🎈</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '200ms' }}>🎊</span>
          </div>
        </div>
      </div>
    </div>
  );
}
