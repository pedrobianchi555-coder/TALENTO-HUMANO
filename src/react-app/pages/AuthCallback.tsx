import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/react-app/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          console.error("Auth callback error:", error);
          alert(`No se pudo completar el inicio de sesión: ${error.message}\n\nPor favor, intenta nuevamente.`);
          navigate("/");
          return;
        }

        if (data.session) {
          navigate("/dashboard");
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Unexpected error during auth callback:", error);
        navigate("/");
      }
    };

    handleCallback();
  }, [navigate]);

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
