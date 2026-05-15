import { Clock } from "lucide-react";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onLogout: () => void;
  remainingMinutes: number;
}

export default function SessionTimeoutModal({
  isOpen,
  onContinue,
  onLogout,
  remainingMinutes,
}: SessionTimeoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 mx-4 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sesión por Expirar
          </h3>
          <div className="text-sm text-gray-500 mb-6">
            <p>
              Tu sesión expirará en <strong>{remainingMinutes} minutos</strong> por inactividad.
            </p>
            <p className="mt-2">
              ¿Deseas continuar con tu sesión?
            </p>
          </div>
          
          <div className="flex justify-center space-x-3">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cerrar Sesión
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Continuar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
