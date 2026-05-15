import { useAuth } from "@/react-app/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Users, Shield, FileText, BarChart, Calendar, MessageSquare, Package } from "lucide-react";

export default function Home() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && user) {
      navigate("/dashboard");
    }
  }, [user, isPending, navigate]);

  const handleLogin = async () => {
    try {
      await redirectToLogin();
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const features = [
    {
      icon: Users,
      title: "Gestión de Empleados",
      description: "Administra perfiles, departamentos y información del personal",
      color: "text-blue-600 bg-blue-100"
    },
    {
      icon: FileText,
      title: "Documentos y Políticas",
      description: "Acceso centralizado a manuales, políticas y formularios",
      color: "text-green-600 bg-green-100"
    },
    {
      icon: BarChart,
      title: "Evaluaciones de Desempeño",
      description: "Sistema integral de evaluaciones y seguimiento",
      color: "text-purple-600 bg-purple-100"
    },
    {
      icon: Calendar,
      title: "Calendario de Eventos",
      description: "Gestión de eventos corporativos y capacitaciones",
      color: "text-orange-600 bg-orange-100"
    },
    {
      icon: MessageSquare,
      title: "Buzón de Quejas",
      description: "Canal confidencial para reportes y sugerencias",
      color: "text-red-600 bg-red-100"
    },
    {
      icon: Package,
      title: "Gestión de Activos",
      description: "Control de inventario y asignación de activos",
      color: "text-teal-600 bg-teal-100"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Portal de Talento Humano</h1>
              </div>
            </div>
            
            {!user && !isPending && (
              <button
                onClick={handleLogin}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Shield className="w-4 h-4 mr-2" />
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Plataforma Integral de
              <span className="block text-blue-600">Gestión de Recursos Humanos</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Optimiza la gestión de tu talento humano con nuestra plataforma completa. 
              Desde solicitudes hasta evaluaciones, todo en un solo lugar.
            </p>
            
            {!user && !isPending && (
              <div className="space-y-4">
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Acceder al Portal
                </button>
                <p className="text-sm text-gray-500">
                  Inicia sesión con tu cuenta de Google corporativa
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Funcionalidades Principales
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Una suite completa de herramientas para modernizar la gestión de recursos humanos
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Beneficios para tu Organización
              </h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Automatización de Procesos</h4>
                    <p className="text-gray-600">Reduce el tiempo en tareas administrativas y enfócate en lo estratégico</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Transparencia y Comunicación</h4>
                    <p className="text-gray-600">Mejora la comunicación interna con herramientas centralizadas</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Gestión Integral</h4>
                    <p className="text-gray-600">Todos los procesos de RRHH en una sola plataforma</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Acceso desde Cualquier Lugar</h4>
                    <p className="text-gray-600">Plataforma web accesible desde cualquier dispositivo</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-8 text-white">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold mb-4">¿Listo para comenzar?</h4>
                <p className="text-white/90 mb-6 leading-relaxed">
                  Únete a las organizaciones que ya están transformando su gestión de recursos humanos
                </p>
                {!user && !isPending && (
                  <button
                    onClick={handleLogin}
                    className="inline-flex items-center px-6 py-3 text-lg font-medium text-blue-600 bg-white rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Comenzar Ahora
                    <Shield className="w-5 h-5 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Portal de Talento Humano</span>
            </div>
            <p className="text-gray-400">
              Plataforma integral para la gestión de recursos humanos
            </p>
            <p className="text-gray-500 text-sm mt-4">
              © 2024 Portal de Talento Humano. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
