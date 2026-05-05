import { useEffect } from "react";
import { useAuth } from "@getmocha/users-service/react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const { exchangeCodeForSessionToken, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
      } catch (error) {
        console.error("Error during auth callback:", error);
        
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Error de autenticación';
        alert(`No se pudo completar el inicio de sesión: ${errorMessage}\n\nPor favor, intenta nuevamente.`);
        
        navigate("/");
      }
    };

    handleAuthCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin mb-4">
            <Loader2 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completando autenticación...
          </h2>
          <p className="text-gray-600 text-center">
            Por favor espera mientras procesamos tu inicio de sesión.
          </p>
        </div>
      </div>
    </div>
  );
}
