import { X, Star, User, Calendar, FileText } from "lucide-react";
import type { Evaluation } from "@/shared/types";
import { formatDate } from "@/shared/date-utils";

interface EvaluationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: Evaluation & { 
    employee_name?: string; 
    evaluator_name?: string; 
    cycle_title?: string;
  };
}

export default function EvaluationDetailModal({ 
  isOpen, 
  onClose, 
  evaluation 
}: EvaluationDetailModalProps) {
  if (!isOpen) return null;

  const renderStars = (score: number | null) => {
    if (score === null) {
      return <span className="text-gray-400">No calificado</span>;
    }
    
    return (
      <div className="flex items-center space-x-1">
        {Array.from({length: 5}, (_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < score ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-semibold">{score.toFixed(1)}</span>
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SELF_COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MANAGER_COMPLETED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente Autoevaluación';
      case 'SELF_COMPLETED':
        return 'Autoevaluación Completada';
      case 'MANAGER_COMPLETED':
        return 'Pendiente Evaluación Manager';
      case 'COMPLETED':
        return 'Completada';
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Detalle de Evaluación
              </h3>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(evaluation.status)}`}>
                  {getStatusText(evaluation.status)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Información General */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Información General
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Ciclo de Evaluación</p>
                <p className="text-base font-medium text-gray-900">
                  {evaluation.cycle_title || `Evaluación #${evaluation.id}`}
                </p>
              </div>
              {evaluation.employee_name && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Empleado</p>
                  <p className="text-base font-medium text-gray-900 flex items-center">
                    <User className="w-4 h-4 mr-1 text-gray-400" />
                    {evaluation.employee_name}
                  </p>
                </div>
              )}
              {evaluation.evaluator_name && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Evaluador</p>
                  <p className="text-base font-medium text-gray-900 flex items-center">
                    <User className="w-4 h-4 mr-1 text-gray-400" />
                    {evaluation.evaluator_name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1">Fecha de Creación</p>
                <p className="text-base font-medium text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                  {formatDate(evaluation.created_at)}
                </p>
              </div>
              {evaluation.completed_at && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Fecha de Completación</p>
                  <p className="text-base font-medium text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                    {formatDate(evaluation.completed_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Calificaciones */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-200">
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Calificaciones
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600 mb-3">Autoevaluación</p>
                {renderStars(evaluation.self_score ?? null)}
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-600 mb-3">Evaluación del Manager</p>
                {renderStars(evaluation.manager_score ?? null)}
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-purple-200">
                <p className="text-sm font-medium text-purple-700 mb-3">Calificación Final (Manager)</p>
                {renderStars(evaluation.final_score ?? null)}
              </div>
            </div>
          </div>

          {/* Comentarios de Autoevaluación */}
          {evaluation.self_comments && (
            <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
              <h4 className="text-md font-semibold text-blue-900 mb-3 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Comentarios del Empleado
              </h4>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {evaluation.self_comments}
                </p>
              </div>
            </div>
          )}

          {/* Comentarios del Manager */}
          {evaluation.manager_comments && (
            <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
              <h4 className="text-md font-semibold text-purple-900 mb-3 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Comentarios del Manager
              </h4>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {evaluation.manager_comments}
                </p>
              </div>
            </div>
          )}

          {/* Si no hay comentarios aún */}
          {!evaluation.self_comments && !evaluation.manager_comments && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                No hay comentarios disponibles aún.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Los comentarios aparecerán aquí una vez que se complete la evaluación.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
