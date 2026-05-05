import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Loader2, Cake, Calendar, Users, PartyPopper } from "lucide-react";
import BirthdayCard from "@/react-app/components/BirthdayCard";
import type { EnhancedUser, UserProfile } from "@/shared/types";

export default function Birthdays() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [, setUser] = useState<EnhancedUser | null>(null);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'month' | 'week'>('month');

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }

        // Get all birthdays
        const birthdaysResponse = await fetch("/api/birthdays?include_inactive=true");
        if (birthdaysResponse.ok) {
          const birthdaysData = await birthdaysResponse.json();
          setEmployees(birthdaysData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authUser, navigate]);

  // Lógica de filtrado de cumpleañeros
  const filteredBirthdays = useMemo(() => {
    if (!employees.length) return [];

    const now = new Date();
    
    return employees
      .filter(employee => {
        // Filtrar empleados activos con fechas de cumpleaños válidas
        if (!employee.birth_date || employee.status !== 'ACTIVE') return false;
        
        // Filtrar strings vacíos
        if (typeof employee.birth_date === 'string' && employee.birth_date.trim() === '') return false;
        
        return true;
      })
      .filter(employee => {
        try {
          // Manejar diferentes formatos de fecha
          let birthDate: Date;
          const birthDateStr = employee.birth_date as string;
          
          // Si ya tiene formato ISO completo (con T o Z), usar directamente
          if (birthDateStr.includes('T') || birthDateStr.includes('Z')) {
            birthDate = new Date(birthDateStr);
          } else {
            // Si es solo fecha (YYYY-MM-DD), añadir tiempo para evitar problemas de zona horaria
            birthDate = new Date(birthDateStr + 'T00:00:00');
          }
          
          // Validar que la fecha sea válida
          if (isNaN(birthDate.getTime())) {
            return false;
          }
          
          if (filter === 'month') {
            // Filtro por mes actual (comparar solo mes, ignorar año)
            return birthDate.getMonth() === now.getMonth();
          } else {
            // Filtro por semana actual
            const startOfWeek = new Date(now);
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio de semana
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0, 0, 0, 0);
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            
            // Crear fecha del cumpleaños en el año actual para comparar con la semana
            const birthDateThisYear = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            
            return birthDateThisYear >= startOfWeek && birthDateThisYear <= endOfWeek;
          }
        } catch (error) {
          console.error('Error parsing birth_date:', employee.birth_date, error);
          return false;
        }
      })
      .sort((a, b) => {
        // Ordenar por día del mes
        try {
          const dateStrA = a.birth_date as string;
          const dateStrB = b.birth_date as string;
          
          let dateA: Date, dateB: Date;
          
          // Manejar diferentes formatos
          if (dateStrA.includes('T') || dateStrA.includes('Z')) {
            dateA = new Date(dateStrA);
          } else {
            dateA = new Date(dateStrA + 'T00:00:00');
          }
          
          if (dateStrB.includes('T') || dateStrB.includes('Z')) {
            dateB = new Date(dateStrB);
          } else {
            dateB = new Date(dateStrB + 'T00:00:00');
          }
          
          return dateA.getDate() - dateB.getDate();
        } catch {
          return 0;
        }
      });
  }, [employees, filter]);

  if (isPending || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando cumpleañeros...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header con gradiente festivo */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="p-3 bg-white/20 rounded-lg mr-4">
                  <Cake className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">🎉 Cumpleañeros</h1>
                  <p className="text-blue-100 mt-1">
                    Celebremos juntos los cumpleaños de nuestros compañeros
                  </p>
                </div>
              </div>

              {/* Controles de filtro */}
              <div className="bg-white/20 backdrop-blur-sm p-1 rounded-lg">
                <div className="flex">
                  <button
                    onClick={() => setFilter('month')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      filter === 'month'
                        ? 'bg-white text-purple-600 shadow-md'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Mes Actual
                  </button>
                  <button
                    onClick={() => setFilter('week')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      filter === 'week'
                        ? 'bg-white text-purple-600 shadow-md'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Esta Semana
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Cumpleaños {filter === 'month' ? 'Este Mes' : 'Esta Semana'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{filteredBirthdays.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-pink-100 rounded-lg">
                <PartyPopper className="w-6 h-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Celebraciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredBirthdays.length > 0 ? '¡Hay fiestas!' : 'Sin fiestas'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de cumpleañeros */}
        {filteredBirthdays.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBirthdays.map((employee) => (
              <BirthdayCard key={employee.id} user={employee} />
            ))}
          </div>
        ) : (
          // Estado sin resultados
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Cake className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay cumpleaños {filter === 'month' ? 'este mes' : 'esta semana'}
              </h3>
              <p className="text-gray-500">
                {filter === 'month' 
                  ? 'Vuelve a revisar el próximo mes para ver las celebraciones.'
                  : 'Prueba cambiar a "Mes Actual" para ver más cumpleañeros.'
                }
              </p>
              <div className="mt-6 flex space-x-2">
                <span className="text-2xl">🎂</span>
                <span className="text-2xl">🎈</span>
                <span className="text-2xl">🎉</span>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje motivacional */}
        {filteredBirthdays.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">💝</span>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">
                  ¡Recuerda felicitar a tus compañeros!
                </h3>
                <p className="text-yellow-700">
                  Un gesto amable puede alegrar el día de alguien. Aprovecha para enviarles un mensaje de felicitación.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
