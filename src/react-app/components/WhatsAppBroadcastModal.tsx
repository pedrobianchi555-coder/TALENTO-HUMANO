import { useState } from "react";
import { X, MessageCircle, Send, Loader2, AlertCircle } from "lucide-react";

interface WhatsAppBroadcastModalProps {
  onClose: () => void;
}

export default function WhatsAppBroadcastModal({ onClose }: WhatsAppBroadcastModalProps) {
  const [sending, setSending] = useState(false);
  const [target, setTarget] = useState("ALL");
  const [templateName, setTemplateName] = useState("");
  const [messageType, setMessageType] = useState("announcement");
  const [params, setParams] = useState<string[]>([""]);

  const handleSend = async () => {
    if (!templateName) {
      alert("Por favor selecciona una plantilla de mensaje");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/whatsapp/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target,
          template_name: templateName,
          message_type: messageType,
          params: params.filter(p => p.trim()),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Difusión enviada:\n` +
          `Total: ${result.total}\n` +
          `Enviados: ${result.sent}\n` +
          `Fallidos: ${result.failed}`
        );
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || "Error al enviar difusión");
      }
    } catch (error) {
      console.error("Error sending WhatsApp broadcast:", error);
      alert("Error al enviar difusión por WhatsApp");
    } finally {
      setSending(false);
    }
  };

  const addParam = () => {
    setParams([...params, ""]);
  };

  const updateParam = (index: number, value: string) => {
    const newParams = [...params];
    newParams[index] = value;
    setParams(newParams);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Difusión por WhatsApp
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Warning Notice */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Requisitos para Enviar Mensajes
                </h3>
                <div className="mt-2 text-sm text-yellow-700 space-y-2">
                  <p>
                    • Solo se enviará a empleados que hayan habilitado las notificaciones
                    por WhatsApp y tengan un número registrado.
                  </p>
                  <p>
                    • La plantilla de mensaje debe estar aprobada en tu cuenta de WhatsApp Business.
                  </p>
                  <p>
                    • <strong>Modo de desarrollo:</strong> Si tu cuenta está en modo de desarrollo,
                    los números de teléfono deben estar agregados a la lista de permitidos en Meta Business Manager.
                    Visita <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">business.facebook.com</a> para configurarlos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Target Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinatarios *
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="ALL">Todos los empleados</option>
                <option value="ADMINISTRACION Y FINANZAS">Administración y Finanzas</option>
                <option value="PRODUCCION">Producción</option>
                <option value="TALENTO HUMANO">Talento Humano</option>
                <option value="LOGISTICA DE TRANSPORTE (EXTERNO)">Logística</option>
              </select>
            </div>

            {/* Message Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Mensaje *
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="announcement">Anuncio</option>
                <option value="reminder">Recordatorio</option>
                <option value="event">Evento</option>
                <option value="payslip">Recibo de Pago</option>
              </select>
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Plantilla *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="nombre_de_plantilla_aprobada"
              />
              <p className="mt-2 text-xs text-gray-500">
                Ingresa el nombre exacto de la plantilla aprobada en WhatsApp Business
              </p>
            </div>

            {/* Template Parameters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parámetros de la Plantilla (opcional)
              </label>
              {params.map((param, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    value={param}
                    onChange={(e) => updateParam(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={`Parámetro ${index + 1} (usa {{first_name}} o {{last_name}} para personalizar)`}
                  />
                  {params.length > 1 && (
                    <button
                      onClick={() => removeParam(index)}
                      className="ml-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addParam}
                className="mt-2 text-sm text-green-600 hover:text-green-700"
              >
                + Agregar parámetro
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Los parámetros se usarán para rellenar variables en tu plantilla.
                Usa {`{{first_name}}`} y {`{{last_name}}`} para personalizar con el nombre del empleado.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !templateName}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Difusión
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
