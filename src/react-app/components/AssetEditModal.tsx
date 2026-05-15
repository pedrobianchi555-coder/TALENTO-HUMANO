import { useState, useEffect } from "react";
import { X, Package, Upload, FileText } from "lucide-react";
import type { Asset, AssetCategory } from "@/shared/types";

interface AssetWithDetails extends Asset {
  category_name?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  assignment_count?: number;
  maintenance_count?: number;
}

interface AssetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAsset: AssetWithDetails) => void;
  asset: AssetWithDetails | null;
  categories: AssetCategory[];
}

export default function AssetEditModal({ isOpen, onClose, onSave, asset, categories }: AssetEditModalProps) {
  const [formData, setFormData] = useState({
    asset_code: "",
    name: "",
    description: "",
    category_id: "",
    brand: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_cost: "",
    location: "",
    warranty_expiry_date: "",
    notes: "",
    condition_status: "GOOD" as "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
    status: "AVAILABLE" as "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED",
    invoice_url: ""
  });

  const [loading, setLoading] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  useEffect(() => {
    if (asset) {
      setFormData({
        asset_code: asset.asset_code || "",
        name: asset.name || "",
        description: asset.description || "",
        category_id: asset.category_id?.toString() || "",
        brand: asset.brand || "",
        model: asset.model || "",
        serial_number: asset.serial_number || "",
        purchase_date: asset.purchase_date || "",
        purchase_cost: asset.purchase_cost?.toString() || "",
        location: asset.location || "",
        warranty_expiry_date: asset.warranty_expiry_date || "",
        notes: asset.notes || "",
        condition_status: asset.condition_status || "GOOD",
        status: asset.status || "AVAILABLE",
        invoice_url: asset.invoice_url || ""
      });
    }
  }, [asset]);

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'invoices');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, invoice_url: data.url }));
      } else {
        console.error('Failed to upload invoice');
      }
    } catch (error) {
      console.error('Error uploading invoice:', error);
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          category_id: parseInt(formData.category_id),
          purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        }),
      });

      if (response.ok) {
        const updatedAsset = await response.json();
        onSave(updatedAsset);
        onClose();
      } else {
        console.error('Failed to update asset');
      }
    } catch (error) {
      console.error("Error updating asset:", error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'GOOD':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAIR':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'POOR':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'Excelente';
      case 'GOOD':
        return 'Bueno';
      case 'FAIR':
        return 'Regular';
      case 'POOR':
        return 'Malo';
      default:
        return condition;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Disponible';
      case 'ASSIGNED':
        return 'Asignado';
      case 'MAINTENANCE':
        return 'Mantenimiento';
      case 'RETIRED':
        return 'Retirado';
      default:
        return status;
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Editar Activo: {asset.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Código del Activo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código del Activo *
              </label>
              <input
                type="text"
                required
                value={formData.asset_code}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Nombre del Activo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Activo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría *
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona una categoría</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            {/* Estado de Condición */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de Condición *
              </label>
              <div className="space-y-2">
                {['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].map((condition) => (
                  <label key={condition} className="flex items-center">
                    <input
                      type="radio"
                      name="condition_status"
                      value={condition}
                      checked={formData.condition_status === condition}
                      onChange={(e) => setFormData({ ...formData, condition_status: e.target.value as any })}
                      className="mr-3"
                    />
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getConditionColor(condition)}`}>
                      {getConditionText(condition)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Estado Operacional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado Operacional
              </label>
              <div className="space-y-2">
                {['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED'].map((status) => (
                  <label key={status} className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={formData.status === status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="mr-3"
                      disabled={status === 'ASSIGNED' && Boolean(asset.assigned_to_id)} // Don't allow changing from ASSIGNED if currently assigned
                    />
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </span>
                  </label>
                ))}
              </div>
              {formData.status === 'ASSIGNED' && asset.assigned_to_id && (
                <p className="text-xs text-gray-500 mt-1">
                  Para cambiar de "Asignado", primero debe devolver el activo
                </p>
              )}
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Número de Serie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Serie
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ubicación
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fecha de Compra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Compra
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Costo de Compra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Costo de Compra (USD $)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Vencimiento de Garantía */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vencimiento de Garantía
              </label>
              <input
                type="date"
                value={formData.warranty_expiry_date}
                onChange={(e) => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notas Adicionales */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas Adicionales
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Factura */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Factura de Compra
              </label>
              {formData.invoice_url ? (
                <div className="flex items-center space-x-3">
                  <a
                    href={formData.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Factura Actual
                  </a>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, invoice_url: "" })}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingInvoice ? 'Subiendo...' : 'Subir Factura'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleInvoiceUpload}
                      disabled={uploadingInvoice}
                      className="hidden"
                    />
                  </label>
                  <span className="ml-3 text-xs text-gray-500">PDF, JPG o PNG</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
