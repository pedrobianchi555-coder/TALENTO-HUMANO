import { useState } from "react";
import { X, Star, User } from "lucide-react";
import type { Evaluation } from "@/shared/types";

interface SelfEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (evaluation: Evaluation) => void;
  evaluation: Evaluation & { employee_name?: string; cycle_title?: string };
}

export default function SelfEvaluationModal({ 
  isOpen, 
  onClose, 
  onSave, 
  evaluation 
}: SelfEvaluationModalProps) {
  const [formData, setFormData] = useState({
    self_score: 0,
    self_comments: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.self_score || formData.self_score < 1) {
      newErrors.self_score = 'Debes seleccionar una calificación';
    }
    if (!formData.self_comments.trim()) {
      newErrors.self_comments = 'Los comentarios son obligatorios';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/evaluations/${evaluation.id}/self-evaluation`, {
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
        alert(`Error: ${errorData.error || 'No se pudo guardar la autoevaluación'}`);
      }
    } catch (error) {
      console.error('Error saving self evaluation:', error);
      alert('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (score: number, editable: boolean = false) => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({length: 5}, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={!editable}
            onClick={() => editable && setFormData({ ...formData, self_score: i + 1 })}
            className={`${editable ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`w-6 h-6 ${
                i < score ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {score > 0 && (
          <span className="ml-2 text-sm font-medium">{score.toFixed(1)}</span>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Autoevaluación de Desempeño
              </h3>
              <p className="text-sm text-gray-500 mt-1 flex items-center">
                <User className="w-4 h-4 mr-1" />
                Ciclo: {evaluation.cycle_title}
              </p>
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
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-blue-900 mb-2 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Tu Autoevaluación
              </h4>
              <p className="text-sm text-blue-700">
                Reflexiona sobre tu desempeño durante este período. Tu honestidad y autoreflexión son valiosas para tu desarrollo profesional.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Calificación de Tu Desempeño (1-5 estrellas) *
              </label>
              {renderStars(formData.self_score, true)}
              {formData.self_score > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Calificación seleccionada: {formData.self_score} de 5
                </p>
              )}
              {errors.self_score && (
                <p className="text-red-500 text-xs mt-1">{errors.self_score}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios y Reflexiones *
              </label>
              <textarea
                rows={6}
                value={formData.self_comments}
                onChange={(e) => setFormData({ ...formData, self_comments: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.self_comments ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="• ¿Cuáles fueron tus principales logros?
• ¿Qué desafíos enfrentaste y cómo los superaste?
• ¿En qué áreas sientes que puedes mejorar?
• ¿Qué metas te gustaría alcanzar en el próximo período?"
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe tus logros, desafíos enfrentados, áreas de mejora y objetivos futuros.
              </p>
              {errors.self_comments && (
                <p className="text-red-500 text-xs mt-1">{errors.self_comments}</p>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Star className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Próximos Pasos
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      Una vez que envíes tu autoevaluación, tu evaluador podrá completar su evaluación sobre tu desempeño. 
                      Tu autoevaluación servirá como referencia, y la calificación final será determinada por tu supervisor.
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Guardando...' : 'Enviar Autoevaluación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
