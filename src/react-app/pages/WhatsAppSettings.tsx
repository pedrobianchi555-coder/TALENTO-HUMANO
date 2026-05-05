import { useState, useEffect } from "react";
import { useAuth } from "@getmocha/users-service/react";
import { useNavigate } from "react-router";
import { MessageCircle, CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import ConfirmationModal from "@/react-app/components/ConfirmationModal";
import { useConfirmationModal } from "@/react-app/hooks/useConfirmationModal";

export default function WhatsAppSettings() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const { modalConfig, closeModal, handleConfirm } = useConfirmationModal();
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    hasAccessToken: boolean;
    hasPhoneNumberId: boolean;
    hasBusinessAccountId: boolean;
    hasVerifyToken: boolean;
    error?: string;
    advice?: string;
  } | null>(null);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    setLoading(true);
    try {
      // Check which secrets are configured
      const response = await fetch("/api/whatsapp/config-status");
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (error) {
      console.error("Error checking WhatsApp configuration:", error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/whatsapp/test-connection");
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(prev => ({
          ...prev!,
          connected: data.connected,
          error: data.error,
          advice: data.advice,
        }));
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionStatus(prev => ({
        ...prev!,
        connected: false,
        error: "Error al probar la conexión",
      }));
    } finally {
      setTesting(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <MessageCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Configuración de WhatsApp Business
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona la integración de WhatsApp para notificaciones a empleados
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Connection Status */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Estado de Conexión</h2>
            <button
              onClick={testConnection}
              disabled={testing}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Probando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Probar Conexión
                </>
              )}
            </button>
          </div>

          {connectionStatus && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div
                className={`flex items-center p-4 rounded-lg ${
                  connectionStatus.connected
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {connectionStatus.connected ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-green-900">
                        Conexión Exitosa
                      </p>
                      <p className="text-sm text-green-700">
                        WhatsApp Business API está conectado y funcionando correctamente
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600 mr-3" />
                    <div>
                      <p className="font-medium text-red-900">
                        Conexión No Disponible
                      </p>
                      <p className="text-sm text-red-700">
                        {connectionStatus.error || "Verifica la configuración abajo"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Configuration Checklist */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 text-sm">Credenciales Configuradas:</h3>
                
                <div className="flex items-center">
                  {connectionStatus.hasAccessToken ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className="text-sm text-gray-700">Access Token</span>
                </div>

                <div className="flex items-center">
                  {connectionStatus.hasPhoneNumberId ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className="text-sm text-gray-700">Phone Number ID</span>
                </div>

                <div className="flex items-center">
                  {connectionStatus.hasBusinessAccountId ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className="text-sm text-gray-700">Business Account ID</span>
                </div>

                <div className="flex items-center">
                  {connectionStatus.hasVerifyToken ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className="text-sm text-gray-700">Verify Token</span>
                </div>
              </div>

              {connectionStatus.advice && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">{connectionStatus.advice}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cómo Obtener las Credenciales
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm font-bold mr-2">
                  1
                </span>
                Acceso a Meta Business Manager
              </h3>
              <p className="text-sm text-gray-600 ml-8 mb-2">
                Ve a{" "}
                <a
                  href="https://business.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 inline-flex items-center"
                >
                  Meta Business Manager
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>{" "}
                e inicia sesión con tu cuenta de Facebook asociada a tu negocio.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm font-bold mr-2">
                  2
                </span>
                Configura WhatsApp Business API
              </h3>
              <p className="text-sm text-gray-600 ml-8 mb-2">
                En el menú lateral, selecciona "WhatsApp Accounts" y luego tu cuenta de WhatsApp Business.
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-8 space-y-1">
                <li>Verifica que tu número de teléfono esté configurado y verificado</li>
                <li>Asegúrate de tener permisos de administrador en la cuenta</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm font-bold mr-2">
                  3
                </span>
                Obtén el Access Token
              </h3>
              <p className="text-sm text-gray-600 ml-8 mb-2">
                Ve a{" "}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 inline-flex items-center"
                >
                  Facebook Developers
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-8 space-y-1">
                <li>Selecciona tu App de WhatsApp Business</li>
                <li>Ve a "WhatsApp" → "Configuración"</li>
                <li>Genera un Token de Acceso Permanente (Permanent Access Token)</li>
                <li>Copia el token y guárdalo de forma segura</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm font-bold mr-2">
                  4
                </span>
                Obtén Phone Number ID y Business Account ID
              </h3>
              <p className="text-sm text-gray-600 ml-8 mb-2">
                En la misma sección de configuración de WhatsApp:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-8 space-y-1">
                <li>
                  <strong>Phone Number ID:</strong> Lo encuentras en "From" → "Phone number ID"
                </li>
                <li>
                  <strong>Business Account ID:</strong> Lo encuentras en la configuración de tu cuenta de negocio de WhatsApp
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm font-bold mr-2">
                  5
                </span>
                Ingresa las Credenciales
              </h3>
              <p className="text-sm text-gray-600 ml-8 mb-2">
                Cuando se te soliciten en este chat, proporciona:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-8 space-y-1">
                <li>WHATSAPP_ACCESS_TOKEN</li>
                <li>WHATSAPP_BUSINESS_ACCOUNT_ID</li>
              </ul>
              <p className="text-sm text-gray-600 ml-8 mt-2">
                Los otros dos valores (Phone Number ID y Verify Token) ya están configurados.
              </p>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Notas Importantes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>El Access Token debe ser permanente para evitar que expire</li>
                <li>Mantén estas credenciales seguras y no las compartas</li>
                <li>Debes aprobar plantillas de mensajes en Meta antes de usarlas</li>
                <li>WhatsApp Business API tiene costos asociados por conversación</li>
              </ul>
            </div>
          </div>
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
