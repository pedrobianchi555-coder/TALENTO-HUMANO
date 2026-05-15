import { useState } from "react";
import { X, Star, FileText, User } from "lucide-react";
import type { Evaluation } from "@/shared/types";

interface ManagerEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (evaluation: Evaluation) => void;
  evaluation: Evaluation & { employee_name?: string };
}

export default function ManagerEvaluationModal({ 
  isOpen, 
  onClose, 
  onSave, 
  evaluation 
}: ManagerEvaluationModalProps) {
  const [formData, setFormData] = useState({
    manager_score: 0,
    manager_comments: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.manager_score || formData.manager_score < 1) {
      newErrors.manager_score = 'Debes seleccionar una calificación';
    }
    if (!formData.manager_comments.trim()) {
      newErrors.manager_comments = 'Los comentarios son obligatorios';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/evaluations/${evaluation.id}/manager-evaluation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedEvaluation = await response.json();
        onSave(updatedEvaluation);
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo guardar la evaluación'}`);
      }
    } catch (error) {
      console.error('Error saving manager evaluation:', error);
      alert('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (score: number | null, editable: boolean = false) => {
    if (!editable && score === null) {
      return <span className="text-gray-400">No calificado</span>;
    }
    
    return (
      <div className="flex items-center space-x-1">
        {Array.from({length: 5}, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={!editable}
            onClick={() => editable && setFormData({ ...formData, manager_score: i + 1 })}
            className={`${editable ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`w-6 h-6 ${
                editable 
                  ? (i < formData.manager_score ? 'text-yellow-400 fill-current' : 'text-gray-300')
                  : (i < (score || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300')
              }`}
            />
          </button>
        ))}
        {!editable && score && (
          <span className="ml-2 text-sm font-medium">{score.toFixed(1)}</span>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Evaluación de Desempeño
              </h3>
              {evaluation.employee_name && (
                <p className="text-sm text-gray-500 mt-1 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  Empleado: {evaluation.employee_name}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Employee Self-Evaluation Section */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-md font-semibold text-blue-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Autoevaluación del Empleado
            </h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-blue-800 font-medium mb-2">Calificación:</p>
                {renderStars(evaluation.self_score ?? null, false)}
              </div>
              
              {evaluation.self_comments && (
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-2">Comentarios:</p>
                  <p className="text-sm text-blue-900 bg-white p-3 rounded border border-blue-200">
                    {evaluation.self_comments}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Manager Evaluation Section */}
          <div className="space-y-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center border-b pb-2">
              <Star className="w-5 h-5 mr-2 text-purple-600" />
              Tu Evaluación como {evaluation.employee_name?.includes('Coordinador') ? 'Gerente' : 'Coordinador/Supervisor'}
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Calificación de Desempeño (1-5 estrellas) *
              </label>
              {renderStars(null, true)}
              {formData.manager_score > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Calificación seleccionada: {formData.manager_score} de 5
                </p>
              )}
              {errors.manager_score && (
                <p className="text-red-500 text-xs mt-1">{errors.manager_score}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios de Evaluación *
              </label>
              <textarea
                rows={6}
                value={formData.manager_comments}
                onChange={(e) => setFormData({ ...formData, manager_comments: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.manager_comments ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe el desempeño del empleado, fortalezas, áreas de mejora, recomendaciones..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Proporciona feedback constructivo que ayude al empleado en su desarrollo profesional.
              </p>
              {errors.manager_comments && (
                <p className="text-red-500 text-xs mt-1">{errors.manager_comments}</p>
              )}
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Star className="h-5 w-5 text-purple-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-800">
                    Nota sobre la Calificación Final
                  </h3>
                  <div className="mt-2 text-sm text-purple-700">
                    <p>
                      La calificación final será la calificación que emitas como manager. 
                      La autoevaluación del empleado ({evaluation.self_score?.toFixed(1) || 'N/A'}) se mantiene como referencia 
                      pero no se incluye en el cálculo final. Una vez guardada, la evaluación se marcará como completada.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
