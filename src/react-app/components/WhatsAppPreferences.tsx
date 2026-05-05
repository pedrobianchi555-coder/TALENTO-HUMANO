import { useState, useEffect } from "react";
import { MessageCircle, Check, X, Loader2, Info } from "lucide-react";
import { formatDateShort } from "@/shared/date-utils";

export default function WhatsAppPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [optInDate, setOptInDate] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/whatsapp/preferences");
      if (response.ok) {
        const data = await response.json();
        setWhatsappPhone(data.whatsapp_phone || "");
        setWhatsappOptIn(data.whatsapp_opt_in || false);
        setOptInDate(data.whatsapp_opt_in_date);
      }
    } catch (error) {
      console.error("Error fetching WhatsApp preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate phone number if opt-in is enabled
      if (whatsappOptIn && !whatsappPhone) {
        alert("Por favor ingresa tu número de WhatsApp para habilitar las notificaciones");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/whatsapp/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whatsapp_phone: whatsappPhone,
          whatsapp_opt_in: whatsappOptIn,
        }),
      });

      if (response.ok) {
        await fetchPreferences();
        alert("Preferencias de WhatsApp actualizadas exitosamente");
      } else {
        const error = await response.json();
        alert(error.error || "Error al actualizar preferencias");
      }
    } catch (error) {
      console.error("Error saving WhatsApp preferences:", error);
      alert("Error al guardar preferencias");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center mb-6">
        <div className="p-2 bg-green-100 rounded-lg mr-3">
          <MessageCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Notificaciones por WhatsApp
          </h3>
          <p className="text-sm text-gray-600">
            Recibe actualizaciones importantes directamente en WhatsApp
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              ¿Qué notificaciones recibiré?
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Recibos de pago disponibles</li>
                <li>Estado de solicitudes (aprobadas/rechazadas)</li>
                <li>Recordatorios de eventos importantes</li>
                <li>Anuncios de la empresa</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Phone Number Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Número de WhatsApp
        </label>
        <input
          type="tel"
          value={whatsappPhone}
          onChange={(e) => setWhatsappPhone(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="+58 412 1234567"
        />
        <p className="mt-2 text-xs text-gray-500">
          Ingresa tu número en formato internacional (ej: +58 412 1234567)
        </p>
      </div>

      {/* Opt-in Toggle */}
      <div className="mb-6">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`block w-14 h-8 rounded-full transition-colors ${
                whatsappOptIn ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <div
              className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                whatsappOptIn ? "transform translate-x-6" : ""
              }`}
            ></div>
          </div>
          <div className="ml-3">
            <span className="text-sm font-medium text-gray-900">
              {whatsappOptIn ? "Notificaciones habilitadas" : "Notificaciones deshabilitadas"}
            </span>
          </div>
        </label>
        {optInDate && whatsappOptIn && (
          <p className="mt-2 text-xs text-gray-500">
            Habilitado desde: {formatDateShort(optInDate)}
          </p>
        )}
      </div>

      {/* Status Message */}
      {whatsappOptIn && whatsappPhone && (
        <div className="mb-6 flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-sm text-green-700">
            Recibirás notificaciones en {whatsappPhone}
          </span>
        </div>
      )}

      {!whatsappOptIn && (
        <div className="mb-6 flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <X className="w-5 h-5 text-gray-600 mr-2" />
          <span className="text-sm text-gray-700">
            No recibirás notificaciones por WhatsApp
          </span>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || (whatsappOptIn && !whatsappPhone)}
        className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Guardar Preferencias
          </>
        )}
      </button>

      {/* Privacy Notice */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        Tu número de WhatsApp solo se usará para enviarte notificaciones relacionadas
        con tu empleo. Puedes deshabilitarlo en cualquier momento.
      </p>
    </div>
  );
}
