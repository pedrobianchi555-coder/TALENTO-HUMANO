import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Edit2, X, Save } from "lucide-react";
import type { FamilyDependent } from "@/shared/types";

interface FamilyDependentsManagerProps {
  userId: number;
}

export default function FamilyDependentsManager({ userId }: FamilyDependentsManagerProps) {
  const [dependents, setDependents] = useState<FamilyDependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    relationship: "Hijo/a" as "Cónyuge" | "Hijo/a",
    ci: "",
    birth_date: ""
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    
    try {
      const date = dateString.includes(' ') || dateString.includes('T') 
        ? new Date(dateString) 
        : new Date(dateString + 'T00:00:00Z');
      
      if (isNaN(date.getTime())) {
        return "Fecha inválida";
      }
      
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const day = date.getUTCDate();
      const month = months[date.getUTCMonth()];
      const year = date.getUTCFullYear();
      
      return `${day} de ${month} de ${year}`;
    } catch {
      return "Fecha inválida";
    }
  };

  useEffect(() => {
    fetchDependents();
  }, [userId]);

  const fetchDependents = async () => {
    try {
      const response = await fetch(`/api/family-dependents?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setDependents(data);
      }
    } catch (error) {
      console.error("Error fetching dependents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId 
        ? `/api/family-dependents/${editingId}`
        : `/api/family-dependents`;
      
      const method = editingId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          ...formData
        })
      });

      if (response.ok) {
        fetchDependents();
        resetForm();
      }
    } catch (error) {
      console.error("Error saving dependent:", error);
    }
  };

  const handleEdit = (dependent: FamilyDependent) => {
    setFormData({
      full_name: dependent.full_name,
      relationship: dependent.relationship,
      ci: dependent.ci || "",
      birth_date: dependent.birth_date || ""
    });
    setEditingId(dependent.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este familiar?")) return;
    
    try {
      const response = await fetch(`/api/family-dependents/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        fetchDependents();
      }
    } catch (error) {
      console.error("Error deleting dependent:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      relationship: "Hijo/a",
      ci: "",
      birth_date: ""
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-4">Cargando...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Carga Familiar
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona la información de tus familiares dependientes
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Familiar
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre completo del familiar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parentesco *
              </label>
              <select
                required
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value as "Cónyuge" | "Hijo/a" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Cónyuge">Cónyuge</option>
                <option value="Hijo/a">Hijo/a</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cédula
              </label>
              <input
                type="text"
                value={formData.ci}
                onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="V-12345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X className="w-4 h-4 inline mr-1" />
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4 inline mr-1" />
              {editingId ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {dependents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No hay familiares registrados</p>
          <p className="text-sm mt-1">Haz clic en "Agregar Familiar" para comenzar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dependents.map((dependent) => (
            <div
              key={dependent.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{dependent.full_name}</h4>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {dependent.relationship}
                  </span>
                  {dependent.ci && <span>CI: {dependent.ci}</span>}
                  {dependent.birth_date && (
                    <span>
                      Nacimiento: {formatDate(dependent.birth_date)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(dependent)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(dependent.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
